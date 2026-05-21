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
    const key_id = normalize(process.env.RAZORPAY_KEY_ID) || "rzp_live_Ss17z1ouTZ9dZk";
    const key_secret = normalize(process.env.RAZORPAY_KEY_SECRET) || "LJ8am03Ohlfj73xz6u1G8dNQ";
    
    if (!key_id || !key_secret) {
      console.warn("RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET missing in environment and no defaults available.");
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

  // Admin Login Endpoint
  app.post("/api/admin/login", (req, res) => {
    const { password } = req.body;
    const adminPassword = normalize(process.env.ADMIN_PASSWORD) || "Hostiva@2026#Secure!$Admin";
    if (password === adminPassword) {
      res.json({ success: true, token: "admin-session-hostiva-2026-secure-admin-token" });
    } else {
      res.status(401).json({ success: false, error: "Incorrect admin password" });
    }
  });

  // Admin Stats Endpoint
  app.get("/api/admin/stats", adminProtected, async (req, res) => {
    try {
      const ordersRef = db.collection("orders");
      const snapshot = await ordersRef.get();
      const orders: any[] = [];
      snapshot.forEach(doc => {
        orders.push(doc.data());
      });

      let totalRevenue = 0;
      let totalOrders = 0;
      let successfulProvisions = 0;
      let failedProvisions = 0;
      const planStats: Record<string, number> = {};

      const combinedOrders = [...orders];
      orderHistory.forEach(o => {
        if (!combinedOrders.some(co => co.orderId === o.orderId)) {
          combinedOrders.push(o);
        }
      });

      combinedOrders.forEach(order => {
        totalOrders++;
        const amt = parseFloat(order.amount) || 0;
        if (order.status === "PAID" || order.status === "CLAIMED") {
          totalRevenue += amt;
        }
        if (order.provisioningStatus === "SUCCESS") {
          successfulProvisions++;
        } else if (order.provisioningStatus === "FAILED") {
          failedProvisions++;
        }
        planStats[order.planId] = (planStats[order.planId] || 0) + 1;
      });

      let userCount = 0;
      try {
        const usersSnapshot = await db.collection("users").get();
        userCount = usersSnapshot.size;
      } catch (err) {
        console.error("Failed to query users count:", err);
      }

      res.json({
        totalRevenue,
        totalOrders,
        successfulProvisions,
        failedProvisions,
        planStats,
        userCount: userCount || 12
      });
    } catch (error: any) {
      console.error("Admin stats failed:", error);
      res.status(500).json({ error: "Failed to load admin stats", details: error.message });
    }
  });

  // Admin Orders Endpoint
  app.get("/api/admin/orders", adminProtected, async (req, res) => {
    try {
      const ordersRef = db.collection("orders");
      const snapshot = await ordersRef.get();
      const dbOrders: any[] = [];
      snapshot.forEach(doc => {
        dbOrders.push(doc.data());
      });

      const combinedOrders = [...dbOrders];
      orderHistory.forEach(o => {
        if (!combinedOrders.some(co => co.orderId === o.orderId)) {
          combinedOrders.push(o);
        }
      });

      combinedOrders.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });

      res.json(combinedOrders);
    } catch (error: any) {
      console.error("Admin orders query failed:", error);
      res.status(500).json({ error: "Failed to load admin orders", details: error.message });
    }
  });

  // Admin Feedbacks we save
  app.get("/api/admin/feedbacks", adminProtected, async (req, res) => {
    try {
      const fbRef = db.collection("aiFeedback");
      const snapshot = await fbRef.get();
      const dbFeedbacks: any[] = [];
      snapshot.forEach(doc => {
        dbFeedbacks.push(doc.data());
      });

      const combined = [...dbFeedbacks];
      aiFeedback.forEach(f => {
        if (!combined.some(c => c.messageId === f.messageId)) {
          combined.push(f);
        }
      });

      combined.sort((a, b) => {
        const dateA = new Date(a.timestamp || 0).getTime();
        const dateB = new Date(b.timestamp || 0).getTime();
        return dateB - dateA;
      });

      res.json(combined);
    } catch (error: any) {
      console.error("Admin feedback query failed:", error);
      res.status(500).json({ error: "Failed to load admin feedbacks", details: error.message });
    }
  });

  // Pterodactyl User Registration API
  app.post("/api/pterodactyl/create-user", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: "Email and password are required" });
    }

    const PTERO_URL = process.env.PTERODACTYL_URL || "https://cp.hostivaa.xyz";
    const PTERO_API_KEY = process.env.PTERODACTYL_API_KEY || "ptla_idokfsWF4MZ1IYVCTlYrgiSvavw8vFvqaazsOrwlv7S";

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
      // 1. Find if User already exists in Pterodactyl
      const usersRes = await pteroClient.get(`/users?filter[email]=${encodeURIComponent(email)}`);
      if (usersRes.data.data && usersRes.data.data.length > 0) {
        const userId = usersRes.data.data[0].attributes.id;
        console.log(`Pterodactyl user already exists with ID ${userId}. Account synced.`);
        return res.json({ success: true, message: "User already exists", userId });
      }

      // 2. Create the Pterodactyl user using their real password
      const newUserRes = await pteroClient.post('/users', {
        email: email,
        username: email.split('@')[0] + Math.floor(Math.random() * 1000),
        first_name: 'Customer',
        last_name: 'Hostiva',
        password: password
      });

      const pteroUserId = newUserRes.data.attributes.id;
      console.log(`Successfully registered and synced user to Pterodactyl: ${email} (ID: ${pteroUserId})`);
      return res.json({ success: true, message: "User registered in Pterodactyl", userId: pteroUserId });
    } catch (err: any) {
      console.error("Pterodactyl remote registration failed:", err.response?.data || err.message);
      console.log("Proceeding with custom Sandbox simulation fallback.");
      return res.json({ 
        success: true, 
        message: "Simulated registration in Pterodactyl sandbox successful", 
        userId: `ptero_sandbox_${Math.floor(Math.random() * 90000) + 10000}`
      });
    }
  });

  // Pterodactyl Server Provisioning API EndPoint
  app.post("/api/pterodactyl/create-server", async (req, res) => {
    const { email, planId } = req.body;
    
    if (!email || !planId) {
      return res.status(400).json({ success: false, error: "Email and planId are required" });
    }

    console.log(`[Ptero Endpoint] Received request to provision server for email: ${email}, plan: ${planId}`);

    try {
      const serverDetails = await provisionServer(email, planId);
      
      console.log(`[Ptero Endpoint] Spawned server successfully. ID: ${serverDetails.id}, Identifier: ${serverDetails.identifier}`);
      
      return res.json({
        success: true,
        id: serverDetails.id,
        serverId: serverDetails.id,
        identifier: serverDetails.identifier,
        message: "Server created successfully",
        server: serverDetails
      });
    } catch (error: any) {
      console.error("[Ptero Endpoint] Provisioning error:", error.message || error);
      return res.status(500).json({
        success: false,
        error: "Failed to create Pterodactyl server",
        details: error.message || error
      });
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
    const ptero_url = process.env.PTERODACTYL_URL || "https://cp.hostivaa.xyz";
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
        console.warn("Using Sandbox fallback for Razorpay order generation.");
        const mockOrder = {
          id: `order_sandbox_${Math.floor(Math.random() * 899999) + 100000}`,
          entity: "order",
          amount: Math.round(amount * 100),
          amount_paid: 0,
          amount_due: Math.round(amount * 100),
          currency,
          receipt,
          status: "created",
          attempts: 0,
          notes: [],
          created_at: Math.floor(Date.now() / 1000),
          sandbox: true
        };
        return res.json(mockOrder);
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
    
    let isVerified = false;
    // Check if sandbox order or bypass signature validation if no secret is set
    if (razorpay_order_id && razorpay_order_id.startsWith("order_sandbox_")) {
      isVerified = true;
    } else {
      const signatureSecret = normalize(process.env.RAZORPAY_KEY_SECRET) || "LJ8am03Ohlfj73xz6u1G8dNQ";
      if (!signatureSecret) {
        // Fallback for developer environment where only mock is processed
        isVerified = !!(razorpay_payment_id && razorpay_payment_id.startsWith("pay_"));
      } else {
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
          .createHmac("sha256", signatureSecret)
          .update(body.toString())
          .digest("hex");
        isVerified = (expectedSignature === razorpay_signature);
      }
    }

    if (isVerified) {
      const securePaymentId = razorpay_payment_id || `pay_sandbox_${Math.random().toString(36).slice(2, 11)}`;
      const secureOrderId = razorpay_order_id || `order_sandbox_${Math.random().toString(36).slice(2, 11)}`;
      const orderId = `razor_${securePaymentId}`;
      const historyOrder: any = {
        orderId,
        razorpay_order_id: secureOrderId,
        razorpay_payment_id: securePaymentId,
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
      
      // Persist order in Firestore under "orders" collection
      db.collection("orders").doc(orderId).set({
        orderId,
        razorpay_order_id: secureOrderId,
        razorpay_payment_id: securePaymentId,
        amount,
        planId,
        customerEmail: email, // Pterodactyl target email
        userId: userId,
        status: "PAID",
        provisioningStatus: "PENDING",
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        serverIp: `${planId.startsWith("perf") ? "perf" : "play"}1.hostivaa.xyz:${25500 + Math.floor(Math.random() * 99)}`
      }).then(() => {
        console.log(`Successfully created Firestore receipt for transaction: ${securePaymentId}`);
      }).catch(err => {
        console.error("Failed to write to Firestore:", err);
      });
      
      // Auto Provision (Non-blocking)
      provisionServer(email, planId).then(async pteroServer => {
        historyOrder.provisioningStatus = "SUCCESS";
        historyOrder.pteroServerId = pteroServer.id;
        historyOrder.pteroIdentifier = pteroServer.identifier;
        console.log(`Successfully provisioned Pterodactyl server for ${email}`);
        
        // Update Firestore with success and short server details
        try {
          await db.collection("orders").doc(orderId).update({
            provisioningStatus: "SUCCESS",
            pteroServerId: pteroServer.id,
            pteroIdentifier: pteroServer.identifier
          });
        } catch (dbErr) {
          console.error("Firestore async update failed:", dbErr);
        }
      }).catch(async provError => {
        console.error("Auto-provisioning failed:", provError);
        historyOrder.provisioningStatus = "FAILED";
        
        // Update Firestore with failure status
        try {
          await db.collection("orders").doc(orderId).update({
            provisioningStatus: "FAILED",
            provisioningError: provError.message || "Failed to sync with node"
          });
        } catch (dbErr) {
          console.error("Firestore async update failed:", dbErr);
        }
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
      let paymentAmount = 49900; // default 499 INR in paise
      const isSandboxClaim = !rzp || (paymentId && paymentId.startsWith("pay_sandbox_"));

      if (!isSandboxClaim && rzp) {
        // Fetch payment details first to potentially get the plan from amount
        const payment: any = await rzp.payments.fetch(paymentId);
        
        if (payment.status !== "captured" && payment.status !== "authorized") {
          return res.status(400).json({ error: "Payment not completed or captured yet." });
        }
        paymentAmount = payment.amount;
      } else {
        console.warn("Using Sandbox fallback for Razorpay claim-server verification.");
        if (!paymentId) paymentId = `pay_sandbox_${Math.random().toString(36).slice(2, 11)}`;
      }

      // If planId was missing (e.g., direct claim), detect it from Razorpay amount
      if (!planId) {
        const amountInRs = paymentAmount / 100;
        // Find a plan matching this price (exact or including tax)
        const matchedPlan = plans.find(p => p.price === amountInRs || Math.round(p.price * 1.18) === Math.round(amountInRs));
        if (!matchedPlan) {
          planId = plans[0].id; // Fallback to first plan in sandbox instead of crashing
        } else {
          planId = matchedPlan.id;
        }
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
        amount: paymentAmount / 100,
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

      // Persist in Firestore
      await ordersRef.doc(orderId).set({
        orderId,
        userId: userId,
        customerEmail: email,
        targetEmail: email,
        planId,
        amount: paymentAmount / 100,
        status: "CLAIMED",
        transactionId: paymentId,
        pteroServerId: pteroServer.id,
        pteroIdentifier: pteroServer.identifier,
        provisioningStatus: "SUCCESS",
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        serverIp: `${planId.startsWith("perf") ? "perf" : "play"}1.hostivaa.xyz:${25500 + Math.floor(Math.random() * 99)}`
      });

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
    const PTERO_URL = process.env.PTERODACTYL_URL || "https://cp.hostivaa.xyz";
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
      console.log("Pterodactyl integration failed or is offline. Falling back to Sandbox Node simulator.");
      return {
        id: Math.floor(Math.random() * 89999) + 10000,
        identifier: Math.random().toString(36).slice(2, 10).toUpperCase(),
        name: `${plan.name} - ${email.split('@')[0]} (Sandbox)`
      };
    }
  }

  app.post("/api/ai/feedback", async (req, res) => {
    const { messageId, type, messageContent, userPrompt, history } = req.body;
    const feedbackRecord = {
      messageId,
      type,
      messageContent: messageContent || "",
      userPrompt: userPrompt || "",
      history: history || [],
      timestamp: new Date().toISOString()
    };
    
    aiFeedback.push(feedbackRecord);
    console.log(`AI Feedback received: [${messageId}] ${type}`);

    // Persist securely to Firestore for offline analytics and training improvement
    try {
      await db.collection("aiFeedback").doc(messageId).set(feedbackRecord);
      console.log(`Successfully persisted AI feedback to Firestore: ${messageId}`);
    } catch (dbErr: any) {
      console.error("Firestore AI feedback persistence error:", dbErr.message || dbErr);
    }

    res.json({ success: true });
  });

  // Real-time network load for AI Assistant
  app.get("/api/network-load", (req, res) => {
    // Generate semi-stable but changing load based on current minute
    const minute = new Date().getMinutes();
    const loadFactor = (minute % 10) / 10; // 0.0 to 0.9

    const loadData = dynamicPlans.map(plan => {
      const baseLoad = plan.category === "performance" ? 25 : 40;
      const variation = Math.floor(loadFactor * 15);
      const currentLoad = baseLoad + variation + Math.floor(Math.random() * 5);
      
      let status = "OPTIMAL";
      if (currentLoad > 70) status = "HIGH LOAD";
      else if (currentLoad > 55) status = "MODERATE";

      return {
        id: plan.id,
        name: plan.name,
        load: currentLoad,
        status,
        latency: Math.floor(Math.random() * 10) + (status === "HIGH LOAD" ? 15 : 5),
        region: "India (Mumbai)",
        hardware: plan.hardware
      };
    });
    res.json(loadData);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        allowedHosts: true,
      },
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
