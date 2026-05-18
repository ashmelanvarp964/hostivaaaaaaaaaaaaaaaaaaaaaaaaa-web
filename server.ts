import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { plans } from "./src/lib/plans.ts";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { GoogleGenAI } from "@google/genai";
import Razorpay from "razorpay";
import axios from "axios";
import admin from "firebase-admin";

const firebaseConfig = {
  projectId: "studio-9246010153-3117d",
  databaseId: "ai-studio-b20d1c8b-7eb6-43f6-8822-960764733504"
};

if (!admin.apps.length) {
  admin.initializeApp(firebaseConfig);
}

const db = admin.firestore();

async function startServer() {
  const app = express();
  const PORT = 3000;
  
  // Use process.cwd() for path resolution to be safe in bundled CJS
  const rootDir = process.cwd();

  app.use(express.json());

  // In-memory store for demo (Use a DB for production)
  const pendingOrders = new Map<string, any>();
  const orderHistory: any[] = [];
  const coupons = new Map<string, { discount: number; expiresAt?: string; usedCount: number }>();
  const dynamicPlans = [...plans];
  const aiFeedback: any[] = [];

  // Robust environment variable cleanup
  const normalize = (val: string | undefined): string => {
    if (!val) return "";
    return val.trim().replace(/^["']|["']$/g, '').trim();
  };

  const getRazorpay = () => {
    const key_id = normalize(process.env.RAZORPAY_KEY_ID);
    const key_secret = normalize(process.env.RAZORPAY_KEY_SECRET);
    
    if (!key_id || !key_secret) {
      console.warn("RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET missing in environment.");
      return null;
    }
    
    try {
      return new Razorpay({ key_id, key_secret });
    } catch (e) {
      console.error("Razorpay SDK Initialization Error:", e);
      return null;
    }
  };

  // Simple Admin Middleware simulation
  const isAdmin = (req: express.Request): boolean => {
    const authHeader = req.headers["authorization"] || "";
    return authHeader.startsWith("Bearer admin-session-");
  };

  const adminProtected = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (isAdmin(req)) {
      next();
    } else {
      res.status(401).json({ error: "Unauthorized" });
    }
  };

  // Coupon Validation
  app.post("/api/validate-coupon", (req, res) => {
    const { code } = req.body;
    const coupon = coupons.get(code.toUpperCase());
    
    if (coupon) {
      // Check for expiration
      if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
        return res.status(403).json({ success: false, message: "expired" });
      }
      res.json({ success: true, discount: coupon.discount });
    } else {
      res.status(404).json({ success: false, message: "Invalid coupon code" });
    }
  });

  // Health and Introspection
  app.get("/api/health/integrations", async (req, res) => {
    const normalize = (val: string | undefined) => val ? val.trim().replace(/^["']|["']$/g, '') : "";
    
    // Razorpay Check
    const key_id = normalize(process.env.RAZORPAY_KEY_ID);
    const key_secret = normalize(process.env.RAZORPAY_KEY_SECRET);
    const vite_key = normalize(process.env.VITE_RAZORPAY_KEY_ID);
    
    // Ptero Check
    const ptero_url = process.env.PTERODACTYL_URL || "https://cp.hostiva.xyz";
    const ptero_key = process.env.PTERODACTYL_API_KEY;
    
    let ptero_status = "Unknown";
    try {
      if (ptero_key) {
        const pteroRes = await axios.get(`${ptero_url}/api/application/users`, {
          headers: { 'Authorization': `Bearer ${ptero_key}` },
          timeout: 3000
        });
        ptero_status = pteroRes.status === 200 ? "Connected" : `Error ${pteroRes.status}`;
      } else {
        ptero_status = "Key Missing";
      }
    } catch (e: any) {
      ptero_status = `Failed: ${e.message}`;
    }

    res.json({
      razorpay: {
        server_key_id: key_id ? `Present (${key_id.substring(0, 8)}...)` : "Missing",
        server_key_secret: key_secret ? `Present (Length: ${key_secret.length})` : "Missing",
        client_key_id: vite_key ? `Present (${vite_key.substring(0, 8)}...)` : "Missing",
        match: (key_id && vite_key) ? (key_id === vite_key ? "YES" : "NO (ID Mismatch!)") : "N/A",
      },
      pterodactyl: {
        url: ptero_url,
        key: ptero_key ? "Present" : "Missing",
        status: ptero_status
      }
    });
  });

  app.post("/api/razorpay/create-order", async (req, res) => {
    const { amount, currency = "INR", receipt } = req.body;
    try {
      const rzp = getRazorpay();
      if (!rzp) {
        return res.status(500).json({ error: "Razorpay keys are not configured" });
      }

      const order = await rzp.orders.create({
        amount: Math.round(amount * 100), // amount in the smallest currency unit (paise)
        currency,
        receipt,
      });
      res.json(order);
    } catch (error: any) {
      console.error("Razorpay Order Creation Error:", error);
      const errorDetail = error.error?.description || error.message || "Unknown error";
      res.status(500).json({ 
        error: "Failed to create Razorpay order",
        details: errorDetail
      });
    }
  });

  app.post("/api/razorpay/verify-payment", async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId, email, amount, userId } = req.body;
    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const signatureSecret = normalize(process.env.RAZORPAY_KEY_SECRET);
    if (!signatureSecret) {
      return res.status(500).json({ success: false, message: "Server configuration error" });
    }

    const expectedSignature = crypto
      .createHmac("sha256", signatureSecret)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature === razorpay_signature) {
      const orderId = `razor_${razorpay_payment_id}`;
      const historyOrder: any = {
        orderId,
        razorpay_order_id,
        razorpay_payment_id,
        amount,
        planId,
        customerEmail: email,
        userId: userId,
        status: "PAID",
        provisioningStatus: "AUTO",
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString()
      };
      
      orderHistory.push(historyOrder);
      
      // Auto Provision (Non-blocking)
      provisionServer(email, planId).then(pteroServer => {
        historyOrder.provisioningStatus = "SUCCESS";
        historyOrder.pteroServerId = pteroServer.id;
        historyOrder.pteroIdentifier = pteroServer.identifier;
        console.log(`Successfully provisioned Pterodactyl server for ${email}`);
      }).catch(provError => {
        console.error("Auto-provisioning failed:", provError);
        historyOrder.provisioningStatus = "FAILED";
      });

      res.json({ success: true, orderId });
    } else {
      res.status(400).json({ success: false, message: "Invalid payment signature" });
    }
  });

  app.post("/api/razorpay/claim-server", async (req, res) => {
    let { paymentId, email, planId, userId } = req.body;
    
    try {
      const rzp = getRazorpay();
      if (!rzp) return res.status(500).json({ error: "Razorpay keys not configured" });

      // 1. Fetch payment details first to potentially get the plan from amount
      const payment: any = await rzp.payments.fetch(paymentId);
      
      if (payment.status !== "captured" && payment.status !== "authorized") {
        return res.status(400).json({ error: "Payment not completed or captured yet." });
      }

      // If planId was missing (e.g., direct claim), detect it from Razorpay amount
      if (!planId) {
        const amountInRs = payment.amount / 100;
        // Find a plan matching this price (exact or including tax)
        const matchedPlan = plans.find(p => p.price === amountInRs || Math.round(p.price * 1.18) === Math.round(amountInRs));
        if (!matchedPlan) {
          return res.status(400).json({ error: `Could not identify an automatic plan for ₹${amountInRs}. Please contact support.` });
        }
        planId = matchedPlan.id;
      }

      // 2. Query Firestore for existing claim for this transaction
      const ordersRef = db.collection("orders");
      const existing = await ordersRef.where("transactionId", "==", paymentId).get();
      if (!existing.empty) {
        return res.status(400).json({ error: "This payment has already been claimed." });
      }

      // Check in-memory history too
      const alreadyClaimed = orderHistory.find(o => o.razorpay_payment_id === paymentId);
      if (alreadyClaimed) {
        return res.status(400).json({ error: "This payment has already been claimed." });
      }

      // 3. Provision the server
      const pteroServer = await provisionServer(email, planId);

      // 4. Record in history
      const orderId = `claim_${paymentId}`;
      const historyOrder: any = {
        orderId,
        razorpay_payment_id: paymentId,
        amount: payment.amount / 100,
        planId,
        customerEmail: email,
        userId: userId,
        status: "PAID",
        provisioningStatus: "SUCCESS",
        pteroServerId: pteroServer.id,
        pteroIdentifier: pteroServer.identifier,
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString()
      };
      
      orderHistory.push(historyOrder);

      res.json({ success: true, message: "Server provisioned successfully!", order: historyOrder });
    } catch (error: any) {
      console.error("Claim Error:", error.response?.data || error);
      const detail = error.response?.data?.errors?.[0]?.detail || error.message || "Unknown error";
      res.status(500).json({ error: "Failed to claim server", details: detail });
    }
  });

  // AI Assistant Proxy
  app.post("/api/ai/chat", async (req, res) => {
    const { messages, systemInstruction } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Invalid messages format" });
    }

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
      }

      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      // Transform messages for Gemini format
      const contents = messages.map(m => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.content }]
      }));

      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: contents,
        config: {
          systemInstruction: systemInstruction
        }
      });

      res.json({ text: result.text });
    } catch (error: any) {
      console.error("Gemini Error:", error);
      res.status(500).json({ error: error.message || "Failed to process AI request" });
    }
  });

  // Pterodactyl Provisioning Logic
  async function provisionServer(email: string, planId: string) {
    const PTERO_URL = process.env.PTERODACTYL_URL || "https://cp.hostiva.xyz";
    const PTERO_API_KEY = process.env.PTERODACTYL_API_KEY || "ptla_idokfsWF4MZ1IYVCTlYrgiSvavw8vFvqaazsOrwlv7S";
    
    const plan = plans.find(p => p.id === planId);
    if (!plan) throw new Error("Plan not found during provisioning");

    const pteroClient = axios.create({
      baseURL: `${PTERO_URL}/api/application`,
      timeout: 10000,
      headers: {
        'Authorization': `Bearer ${PTERO_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'Application/vnd.pterodactyl.v1+json',
      }
    });

    try {
      // 1. Find or Create User
      let userId;
      try {
        const usersRes = await pteroClient.get(`/users?filter[email]=${email}`);
        if (usersRes.data.data.length > 0) {
          userId = usersRes.data.data[0].attributes.id;
        } else {
          const newUserRes = await pteroClient.post('/users', {
            email: email,
            username: email.split('@')[0] + Math.floor(Math.random() * 1000),
            first_name: 'Customer',
            last_name: 'Hostiva',
          });
          userId = newUserRes.data.attributes.id;
        }
      } catch (err: any) {
        console.error("Ptero User Error:", err.response?.data || err.message);
        throw err;
      }

      // 2. Create Server
      const ram = parseInt(plan.specs.ram) * 1024;
      const disk = parseInt(plan.specs.disk) * 1024;
      const cpu = parseInt(plan.specs.cpu);

      const performanceNode = process.env.PTERODACTYL_PERFORMANCE_NODE_ID || "1";
      const budgetNode = process.env.PTERODACTYL_BUDGET_NODE_ID || "9";
      const nodeId = plan.specs.nodeId || (plan.category === "performance" ? parseInt(performanceNode) : parseInt(budgetNode));
      const locationId = plan.specs.locationId || 1;

      const serverPayload = {
        name: `${plan.name} - ${email.split('@')[0]}`,
        user: userId,
        egg: plan.specs.eggId || 4,
        docker_image: "ghcr.io/pterodactyl/yolks:java_17",
        startup: "java -Xms128M -Xmx{{SERVER_MEMORY}}M -Dterminal.jline=false -Dterminal.ansi=true -jar {{SERVER_JARFILE}}",
        limits: {
          memory: ram,
          swap: 0,
          disk: disk,
          io: 500,
          cpu: cpu,
        },
        feature_limits: {
          databases: plan.specs.databases || 0,
          backups: plan.specs.backups || 1,
          allocations: plan.specs.ports || 1,
        },
        environment: {
            SERVER_JARFILE: "server.jar",
            VANILLA_VERSION: "latest"
        },
        deploy: {
          locations: [locationId], 
          nodes: [nodeId],
          dedicated_ip: false,
          port_range: [],
        }
      };

      const createRes = await pteroClient.post('/servers', serverPayload);
      return createRes.data.attributes;
    } catch (err: any) {
      console.error("Ptero Create Error:", err.response?.data || err.message);
      throw err;
    }
  }

  app.post("/api/ai/feedback", (req, res) => {
    const { messageId, type } = req.body;
    aiFeedback.push({
      messageId,
      type,
      timestamp: new Date().toISOString()
    });
    console.log(`AI Feedback received: [${messageId}] ${type}`);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(rootDir, "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`=========================================`);
    console.log(`HOSTIVA SERVER RUNNING`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Port: ${PORT}`);
    console.log(`URL: http://localhost:${PORT}`);
    console.log(`=========================================`);
    if (process.env.NODE_ENV !== "production") {
      console.log(`WARNING: Running in development mode.`);
    }
  });
}

startServer();
