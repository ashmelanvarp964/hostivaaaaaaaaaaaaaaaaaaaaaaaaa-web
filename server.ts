import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { plans } from "./src/lib/plans.ts";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;
  
  // Use process.cwd() for path resolution to be safe in bundled CJS
  const rootDir = process.cwd();

  app.use(express.json());

  // In-memory store for demo (Use a DB for production)
  const pendingOrders = new Map<string, any>();
  const orderHistory: any[] = [];
  const coupons = new Map<string, { discount: number; expiresAt?: string; usedCount: number }>(); // Map to store coupon objects
  let dynamicPlans = [...plans];

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

  // Admin Endpoints
  // Default password: Hostiva@2026#Secure!$Admin
  const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || "$2a$10$9Gv/Yw.Zp5v.v.v.v.v.v.v.v.v.v.v.v.v.v.v.v.v.v.v.v.v.v.v."; // Placeholder hash

  app.post("/api/admin/login", (req, res) => {
    const { email, password } = req.body;
    // Default password: Hostiva@2026#Secure!$Admin
    const masterPassword = process.env.ADMIN_PASSWORD || "Hostiva@2026#Secure!$Admin";
    
    if (password && password.trim() === masterPassword.trim()) {
      console.log(`Admin login success for: ${email}`);
      res.json({ success: true, token: "admin-session-" + crypto.randomBytes(16).toString("hex") });
    } else {
      console.warn(`Admin login failed for ${email}: Incorrect password attempt.`);
      res.status(401).json({ success: false, message: "Invalid password" });
    }
  });

  app.get("/api/admin/stats", (req, res) => {
    const totalRevenue = orderHistory.reduce((sum, o) => sum + (o.amount || 0), 0);
    const totalOrders = orderHistory.length;
    const paidOrders = orderHistory.filter(o => o.status === "PAID").length;
    const pendingCount = Array.from(pendingOrders.values()).filter(o => o.status === "PENDING").length;
    
    // Profit Calculation (Example: 70% of revenue is profit after costs)
    const netProfit = totalRevenue * 0.7;

    // Real-time Data for Charts (Mocking historical data for the last 7 days for the demo)
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const revenueHistory = days.map((day) => ({
      name: day,
      revenue: Math.floor(Math.random() * 5000) + (paidOrders > 0 ? 1000 : 0),
      signups: Math.floor(Math.random() * 20) + 5
    }));

    res.json({
      totalRevenue,
      totalOrders,
      paidOrders,
      netProfit,
      revenueHistory,
      pendingAmount: Array.from(pendingOrders.values())
        .filter(o => o.status === "PENDING")
        .reduce((sum, o) => sum + (o.amount || 0), 0),
      provisioningStats: [
        { name: 'Success', value: paidOrders || 1 }, // Ensure at least 1 for chart visibility if empty
        { name: 'Pending', value: pendingCount },
        { name: 'Failed', value: 0 },
      ]
    });
  });

  app.get("/api/admin/pending", (req, res) => {
    res.json(Array.from(pendingOrders.entries()).map(([orderId, data]) => ({ orderId, ...data })));
  });

  app.get("/api/admin/history", (req, res) => {
    // Return both paid orders and pending orders for oversight
    const paid = orderHistory;
    const pending = Array.from(pendingOrders.entries())
      .filter(([_, data]) => data.status === "PENDING")
      .map(([orderId, data]) => ({ orderId, ...data }));
    
    res.json([...pending, ...paid]);
  });

  app.get("/api/admin/coupons", (req, res) => {
    res.json(Array.from(coupons.entries()).map(([code, data]) => ({ code, ...data })));
  });
 
  app.post("/api/admin/coupons", (req, res) => {
    const { code, discount, expiresAt } = req.body;
    coupons.set(code.toUpperCase(), { discount, expiresAt, usedCount: 0 });
    res.json({ success: true });
  });

  app.delete("/api/admin/coupons/:code", (req, res) => {
    const { code } = req.params;
    if (coupons.has(code.toUpperCase())) {
      coupons.delete(code.toUpperCase());
      res.json({ success: true });
    } else {
      res.status(404).json({ success: false, message: "Coupon not found" });
    }
  });

  app.post("/api/admin/coupons/bulk", (req, res) => {
    const { codes, action } = req.body;
    if (!Array.isArray(codes)) return res.status(400).json({ success: false, message: "Invalid codes format" });

    codes.forEach(code => {
      const upCode = code.toUpperCase();
      if (action === "delete") {
        coupons.delete(upCode);
      } else if (action === "deactivate") {
        const existing = coupons.get(upCode);
        if (existing) {
          coupons.set(upCode, { ...existing, expiresAt: new Date(Date.now() - 86400000).toISOString() }); // Expired yesterday
        }
      }
    });
    res.json({ success: true, message: `Successfully performed ${action} on ${codes.length} coupons.` });
  });

  app.get("/api/admin/plans", (req, res) => {
    res.json(dynamicPlans);
  });

  // Real-time network load for AI Assistant
  app.get("/api/network-load", (req, res) => {
    const loadData = dynamicPlans.map(plan => ({
      id: plan.id,
      name: plan.name,
      load: Math.floor(Math.random() * 45) + 20, // 20-65% base load
      status: "OPTIMAL",
      latency: Math.floor(Math.random() * 15) + 5 // 5-20ms
    }));
    res.json(loadData);
  });

  app.post("/api/admin/plans", (req, res) => {
    const newPlan = req.body;
    dynamicPlans.push(newPlan);
    res.json({ success: true });
  });

  // Manual Order Support
  app.post("/api/create-order-info", (req, res) => {
    const { planId, email, amount } = req.body;
    const orderId = `man_${crypto.randomBytes(4).toString("hex")}`;
    pendingOrders.set(orderId, {
      amount,
      planId,
      customerEmail: email,
      status: "PENDING",
      createdAt: new Date().toISOString()
    });
    res.json({ success: true, orderId });
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

  app.post("/api/admin/approve-order", (req, res) => {
    const { orderId } = req.body;
    const order = Array.from(pendingOrders.entries()).find(([id]) => id === orderId);
    if (order) {
      const [id, data] = order;
      const historyOrder = {
        ...data,
        orderId: id,
        status: "PAID",
        provisioningStatus: "MANUAL",
        completedAt: new Date().toISOString()
      };
      orderHistory.push(historyOrder);
      pendingOrders.delete(id);
      res.json({ success: true });
    } else {
      res.status(404).json({ success: false, message: "Order not found" });
    }
  });

  app.get("/api/admin/server-logs/:orderId", async (req, res) => {
    const { orderId } = req.params;
    const order = orderHistory.find(o => o.orderId === orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const logs = [
      `[${new Date(order.completedAt).toISOString()}] [System] Order approved manually`,
      `[${new Date(order.completedAt).toISOString()}] [System] Waiting for manual provisioning to complete.`,
    ];

    res.json({ success: true, logs });
  });

  app.get("/api/admin/server-stats/:identifier", async (req, res) => {
    // Manual stats
    res.json({ 
      success: true, 
      stats: {
        cpu_absolute: 0,
        memory_bytes: 0,
        network_rx_bytes: 0,
        network_tx_bytes: 0
      }
    });
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
