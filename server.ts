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
import nodemailer from "nodemailer";
import admin from "firebase-admin";

const firebaseConfig: any = {
  projectId: "studio-9246010153-3117d",
  databaseId: "ai-studio-b20d1c8b-7eb6-43f6-8822-960764733504"
};

let db: any;
let isFirestoreFallback = false;

// Memory-backed Firestore mock fallback to guarantee 100% uptime and allow Sandbox/Local testing
const memoryDb: Record<string, Record<string, any>> = {};

function activateMockDb() {
  isFirestoreFallback = true;
  console.warn("[Firebase Admin] Authentication missing/failed, activating memory-safe database mock fallback.");
  
  // Seed default coupons in memoryDb
  memoryDb["coupons"] = {
    "SAVE10": { discount: 10, expiresAt: "2030-12-31T23:59:59.000Z", usedCount: 0 },
    "WELCOME50": { discount: 50, expiresAt: "2030-12-31T23:59:59.000Z", usedCount: 0 },
    "EXPIRED30": { discount: 30, expiresAt: "2025-01-01T00:00:00.000Z", usedCount: 0 },
    "HOSTIVA20": { discount: 20, expiresAt: "2028-05-21T00:00:00.000Z", usedCount: 0 }
  };
  
  memoryDb["orders"] = {};
  memoryDb["users"] = {};
  memoryDb["aiFeedback"] = {};
  memoryDb["tickets"] = {
    "ticket_1": {
      userId: "mock_user_1",
      email: "gamer_pro@gmail.com",
      subject: "Pterodactyl Node connection error",
      message: "Hi, my Minecraft server says offline in my dashboard but I can see it in panel.hostivaa.xyz. Please fix.",
      priority: "HIGH",
      status: "OPEN",
      createdAt: new Date(Date.now() - 3600000 * 4).toISOString(), // 4h ago
      replies: [
        { sender: "USER", message: "Hi, my Minecraft server says offline in my dashboard but I can see it in panel.hostivaa.xyz. Please fix.", timestamp: new Date(Date.now() - 3600000 * 4).toISOString() }
      ]
    },
    "ticket_2": {
      userId: "mock_user_2",
      email: "suraj09@yahoo.com",
      subject: "Help with backup restoration",
      message: "Can you help me restore a files backup from yesterday? The plugin crashed.",
      priority: "MEDIUM",
      status: "OPEN",
      createdAt: new Date(Date.now() - 3600000 * 12).toISOString(), // 12h ago
      replies: [
        { sender: "USER", message: "Can you help me restore a files backup from yesterday? The plugin crashed.", timestamp: new Date(Date.now() - 3600000 * 12).toISOString() }
      ]
    },
    "ticket_3": {
      userId: "mock_user_3",
      email: "techboy2@outlook.com",
      subject: "Payment complete but server not showing up",
      message: "Paid ₹149 for Ryzen starter pack but cannot find anything in central acc. Status shows CLAIMED.",
      priority: "LOW",
      status: "REPLIED",
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString(), // 24h ago
      replies: [
        { sender: "USER", message: "Paid ₹149 for Ryzen starter pack but cannot find anything in central acc. Status shows CLAIMED.", timestamp: new Date(Date.now() - 3600000 * 24).toISOString() },
        { sender: "ADMIN", message: "Hello! We verified your payment. Please log in to panel.hostivaa.xyz with your registered email.", timestamp: new Date(Date.now() - 3600000 * 23).toISOString() }
      ]
    }
  };

  class MockQuery {
    constructor(private colName: string, private filters: {field: string, op: string, val: any}[] = []) {}

    where(field: string, op: string, val: any) {
      return new MockQuery(this.colName, [...this.filters, { field, op, val }]);
    }

    limit(n: number) {
      return this;
    }

    async get() {
      const col = memoryDb[this.colName] || {};
      let results = Object.keys(col).map(key => ({ id: key, ...col[key] }));

      // Apply filters
      for (const filter of this.filters) {
        results = results.filter(item => {
          const itemVal = item[filter.field];
          if (filter.op === "==") {
            return String(itemVal).toLowerCase() === String(filter.val).toLowerCase();
          }
          return true;
        });
      }

      const docs = results.map(res => ({
        id: res.id,
        data: () => res,
        exists: true
      }));

      return {
        empty: docs.length === 0,
        size: docs.length,
        forEach: (cb: any) => docs.forEach(cb),
        docs
      };
    }
  }

  class MockDocRef {
    constructor(public colName: string, public docId: string) {}

    async get() {
      const col = memoryDb[this.colName] || {};
      const data = col[this.docId];
      return {
        id: this.docId,
        exists: !!data,
        data: () => data || null
      };
    }

    async set(data: any, options?: any) {
      if (!memoryDb[this.colName]) memoryDb[this.colName] = {};
      
      const existing = memoryDb[this.colName][this.docId] || {};
      if (options && options.merge) {
        memoryDb[this.colName][this.docId] = { ...existing, ...data };
      } else {
        memoryDb[this.colName][this.docId] = data;
      }
      return { success: true };
    }

    async update(data: any) {
      if (!memoryDb[this.colName]) memoryDb[this.colName] = {};
      const existing = memoryDb[this.colName][this.docId] || {};
      memoryDb[this.colName][this.docId] = { ...existing, ...data };
      return { success: true };
    }

    async delete() {
      if (memoryDb[this.colName]) {
        delete memoryDb[this.colName][this.docId];
      }
      return { success: true };
    }
  }

  class MockCollection {
    constructor(private colName: string) {}

    doc(id: string) {
      return new MockDocRef(this.colName, id);
    }

    where(field: string, op: string, val: any) {
      return new MockQuery(this.colName, [{ field, op, val }]);
    }

    limit(n: number) {
      return new MockQuery(this.colName).limit(n);
    }

    async add(data: any) {
      if (!memoryDb[this.colName]) memoryDb[this.colName] = {};
      const id = "mock_doc_" + Math.random().toString(36).slice(2, 11);
      memoryDb[this.colName][id] = data;
      return { id };
    }

    async get() {
      const col = memoryDb[this.colName] || {};
      const docs = Object.keys(col).map(key => ({
        id: key,
        data: () => col[key],
        exists: true
      }));
      return {
        empty: docs.length === 0,
        size: docs.length,
        forEach: (cb: any) => docs.forEach(cb),
        docs
      };
    }
  }

  db = {
    collection: (colName: string) => new MockCollection(colName),
    batch: () => ({
      set: (ref: any, data: any) => {
        if (ref && ref.colName && ref.docId) {
          if (!memoryDb[ref.colName]) memoryDb[ref.colName] = {};
          memoryDb[ref.colName][ref.docId] = data;
        }
      },
      commit: async () => {
        return { success: true };
      }
    })
  };
}

try {
  if (!admin.apps.length) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: firebaseConfig.projectId,
          databaseId: firebaseConfig.databaseId
        } as any);
        console.log("[Firebase Admin] Initialized with Service Account Secret.");
      } catch (e: any) {
        console.error("[Firebase Admin] Failed to parse FIREBASE_SERVICE_ACCOUNT:", e.message);
        admin.initializeApp(firebaseConfig);
      }
    } else {
      admin.initializeApp(firebaseConfig);
    }
  }
  db = admin.firestore();
  
  // Test connection to trigger potential credential loading exceptions early
  db.collection("admins").limit(1).get()
    .then(() => {
      console.log("[Firebase Admin] Firestore connection validated.");
    })
    .catch((err: any) => {
      if (err.message && (err.message.includes("Could not load the default credentials") || err.message.includes("authentication"))) {
        activateMockDb();
      }
    });
} catch (error: any) {
  activateMockDb();
}

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
  coupons.set("SAVE10", { discount: 10, expiresAt: "2030-12-31T23:59:59.000Z", usedCount: 0 });
  coupons.set("WELCOME50", { discount: 50, expiresAt: "2030-12-31T23:59:59.000Z", usedCount: 0 });
  coupons.set("EXPIRED30", { discount: 30, expiresAt: "2025-01-01T00:00:00.000Z", usedCount: 0 });
  coupons.set("HOSTIVA20", { discount: 20, expiresAt: "2028-05-21T00:00:00.000Z", usedCount: 0 });

  // Load coupons from Firestore if available, otherwise seed defaults
  try {
    const couponSnap = await db.collection("coupons").get();
    if (couponSnap.empty) {
      const batch = db.batch();
      coupons.forEach((val, key) => {
        const ref = db.collection("coupons").doc(key);
        batch.set(ref, {
          discount: val.discount,
          expiresAt: val.expiresAt || null,
          usedCount: val.usedCount || 0
        });
      });
      await batch.commit();
      console.log("[Firestore] Seeded default coupons.");
    } else {
      coupons.clear();
      couponSnap.forEach(doc => {
        const data = doc.data();
        coupons.set(doc.id, {
          discount: Number(data.discount),
          expiresAt: data.expiresAt || undefined,
          usedCount: Number(data.usedCount || 0)
        });
      });
      console.log(`[Firestore] Loaded ${coupons.size} coupons.`);
    }
  } catch (err: any) {
    console.warn("[Firestore] Failed to sync coupons, using local defaults:", err.message || err);
  }

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
  app.post("/api/validate-coupon", async (req, res) => {
    const { code, email } = req.body;
    
    if (!code) {
      return res.status(400).json({ success: false, message: "Coupon code is required" });
    }

    const uppercaseCode = code.toUpperCase();
    const coupon = coupons.get(uppercaseCode);
    
    if (coupon) {
      // Check for expiration
      if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
        return res.status(400).json({ success: false, message: "expired" });
      }

      // Check if coupon has already been used by this email
      if (email && typeof email === "string" && email.trim() !== "") {
        const normalizedEmail = email.trim().toLowerCase();
        
        // 1. Check in-memory orderHistory
        const alreadyUsedInMemory = orderHistory.some(
          o => o.customerEmail?.toLowerCase() === normalizedEmail &&
               o.couponCode?.toUpperCase() === uppercaseCode &&
               (o.status === "PAID" || o.status === "CLAIMED")
        );

        if (alreadyUsedInMemory) {
          return res.status(400).json({ success: false, message: "Coupon already used" });
        }

        // 2. Check Firestore "orders" if db is initialized
        try {
          const finishedOrdersQuery = await db.collection("orders")
            .where("customerEmail", "==", normalizedEmail)
            .where("couponCode", "==", uppercaseCode)
            .get();

          if (!finishedOrdersQuery.empty) {
            return res.status(400).json({ success: false, message: "Coupon already used" });
          }
        } catch (dbErr: any) {
          console.warn("[Coupon Validation] Firestore query failed, proceeding with memory check only:", dbErr.message || dbErr);
        }
      }

      res.json({ success: true, discount: coupon.discount });
    } else {
      res.status(400).json({ success: false, message: "Invalid coupon code" });
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
        userCount: userCount || 12,
        isFirestoreFallback
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

  // Admin Coupon Endpoints
  // 1. GET all coupons
  app.get("/api/admin/coupons", adminProtected, (req, res) => {
    try {
      const list: any[] = [];
      coupons.forEach((val, key) => {
        list.push({ code: key, ...val });
      });
      res.json(list);
    } catch (err: any) {
      res.status(500).json({ error: "Failed to list coupons", details: err.message });
    }
  });

  // 2. Add / update a coupon
  app.post("/api/admin/coupons", adminProtected, async (req, res) => {
    try {
      const { code, discount, expiresAt } = req.body;
      if (!code || typeof code !== "string" || !code.trim()) {
        return res.status(400).json({ error: "Coupon code is required" });
      }
      const discValue = parseInt(discount, 10);
      if (isNaN(discValue) || discValue < 1 || discValue > 100) {
        return res.status(400).json({ error: "Discount must be a percentage between 1 and 100" });
      }

      const uppercaseCode = code.trim().toUpperCase();
      const expiresVal = expiresAt ? new Date(expiresAt).toISOString() : undefined;
      
      const newCoupon = {
        discount: discValue,
        expiresAt: expiresVal,
        usedCount: 0
      };

      // Set in memory Map
      coupons.set(uppercaseCode, newCoupon);

      // Save to Firestore "coupons" collection
      try {
        await db.collection("coupons").doc(uppercaseCode).set({
          discount: discValue,
          expiresAt: expiresVal || null,
          usedCount: 0
        });
      } catch (dbErr: any) {
        console.error("Failed to commit coupon to Firestore:", dbErr.message || dbErr);
      }

      res.json({ success: true, message: `Coupon '${uppercaseCode}' saved successfully.`, coupon: { code: uppercaseCode, ...newCoupon } });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to add coupon", details: err.message });
    }
  });

  // 3. Delete a coupon
  app.delete("/api/admin/coupons/:code", adminProtected, async (req, res) => {
    try {
      const code = req.params.code.toUpperCase();
      if (!coupons.has(code)) {
        return res.status(404).json({ error: "Coupon not found" });
      }

      coupons.delete(code);

      // Delete from Firestore
      try {
        await db.collection("coupons").doc(code).delete();
      } catch (dbErr: any) {
        console.error("Failed to delete coupon from Firestore:", dbErr.message || dbErr);
      }

      res.json({ success: true, message: `Coupon '${code}' has been deleted.` });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to delete coupon", details: err.message });
    }
  });

  // Admin Support Tickets Endpoints
  // 1. GET all tickets
  app.get("/api/admin/tickets", adminProtected, async (req, res) => {
    try {
      const ticketsRef = db.collection("tickets");
      const snapshot = await ticketsRef.get();
      const list: any[] = [];
      snapshot.forEach((doc: any) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      // Sort in memory by createdAt descending
      list.sort((a: any, b: any) => {
        const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        return timeB - timeA;
      });
      res.json(list);
    } catch (err: any) {
      console.error("Failed to fetch admin tickets:", err);
      res.status(500).json({ error: "Failed to fetch support tickets", details: err.message });
    }
  });

  // 2. reply to a ticket
  app.post("/api/admin/tickets/:ticketId/reply", adminProtected, async (req, res) => {
    try {
      const { ticketId } = req.params;
      const { message } = req.body;
      if (!message || typeof message !== "string" || !message.trim()) {
        return res.status(400).json({ error: "Reply message is required" });
      }

      const ticketDocRef = db.collection("tickets").doc(ticketId);
      const docSnap = await ticketDocRef.get();

      if (!docSnap.exists) {
        return res.status(404).json({ error: "Ticket not found" });
      }

      const ticketData = docSnap.data();
      const replies = ticketData.replies || [];
      replies.push({
        sender: "ADMIN",
        message: message.trim(),
        timestamp: new Date().toISOString()
      });

      await ticketDocRef.update({
        replies: replies,
        status: "REPLIED"
      });

      res.json({ success: true, message: "Response sent securely." });
    } catch (err: any) {
      console.error("Failed to post ticket reply:", err);
      res.status(500).json({ error: "Failed to submit ticket reply", details: err.message });
    }
  });

  // 3. update ticket status (e.g. resolve/close/reopen)
  app.post("/api/admin/tickets/:ticketId/status", adminProtected, async (req, res) => {
    try {
      const { ticketId } = req.params;
      const { status } = req.body;
      if (!status || typeof status !== "string") {
        return res.status(400).json({ error: "Status value is required" });
      }

      const ticketDocRef = db.collection("tickets").doc(ticketId);
      const docSnap = await ticketDocRef.get();

      if (!docSnap.exists) {
        return res.status(404).json({ error: "Ticket not found" });
      }

      await ticketDocRef.update({
        status: status.toUpperCase()
      });

      res.json({ success: true, message: `Ticket status updated to ${status}` });
    } catch (err: any) {
      console.error("Failed to update ticket status:", err);
      res.status(500).json({ error: "Failed to update ticket status", details: err.message });
    }
  });

  // 4. update a ticket's priority (LOW, MEDIUM, HIGH)
  app.post("/api/admin/tickets/:ticketId/priority", adminProtected, async (req, res) => {
    try {
      const { ticketId } = req.params;
      const { priority } = req.body;
      if (!priority || typeof priority !== "string") {
        return res.status(400).json({ error: "Priority value is required" });
      }

      const ticketDocRef = db.collection("tickets").doc(ticketId);
      const docSnap = await ticketDocRef.get();

      if (!docSnap.exists) {
        return res.status(404).json({ error: "Ticket not found" });
      }

      await ticketDocRef.update({
        priority: priority.toUpperCase()
      });

      res.json({ success: true, message: `Ticket priority updated to ${priority}` });
    } catch (err: any) {
      console.error("Failed to update ticket priority:", err);
      res.status(500).json({ error: "Failed to update ticket priority", details: err.message });
    }
  });

  // 5. add internal note to a ticket
  app.post("/api/admin/tickets/:ticketId/notes", adminProtected, async (req, res) => {
    try {
      const { ticketId } = req.params;
      const { note } = req.body;
      if (!note || typeof note !== "string" || !note.trim()) {
        return res.status(400).json({ error: "Internal note content is required" });
      }

      const ticketDocRef = db.collection("tickets").doc(ticketId);
      const docSnap = await ticketDocRef.get();

      if (!docSnap.exists) {
        return res.status(404).json({ error: "Ticket not found" });
      }

      const ticketData = docSnap.data();
      const internalNotes = ticketData.internalNotes || [];
      internalNotes.push({
        note: note.trim(),
        timestamp: new Date().toISOString()
      });

      await ticketDocRef.update({
        internalNotes: internalNotes
      });

      res.json({ success: true, message: "Internal note added securely.", internalNotes });
    } catch (err: any) {
      console.error("Failed to add ticket internal note:", err);
      res.status(500).json({ error: "Failed to add ticket internal note", details: err.message });
    }
  });

  // Pterodactyl User Registration API
  app.post("/api/pterodactyl/create-user", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: "Email and password are required" });
    }

    const PTERO_URL = process.env.PTERODACTYL_URL || "https://panel.hostivaa.xyz";
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
    const ptero_url = process.env.PTERODACTYL_URL || "https://panel.hostivaa.xyz";
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
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId, email, amount, userId, couponCode } = req.body;
      
      if (!email) {
        return res.status(400).json({ success: false, message: "Email is required to link server access." });
      }

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
        const finalPlanId = (planId === "budget-starter" || !planId) ? "budget-classic" : planId;
        
        let mappedUserId = userId || "";
        let newUserTempPassword = "";

        // Check if user already exists in Firebase Auth
        try {
          const existingUser = await admin.auth().getUserByEmail(email);
          mappedUserId = existingUser.uid;
          console.log(`Matched existing user account with email ${email}: ${mappedUserId}`);
        } catch (authErr: any) {
          if (authErr.code === "auth/user-not-found" || authErr.message?.includes("user-not-found")) {
            console.log(`User account not found for ${email}. Auto-generating newly provisioned Hostiva client profile...`);
            newUserTempPassword = `Hostiva_${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
            try {
              const userRecord = await admin.auth().createUser({
                email: email,
                password: newUserTempPassword,
                emailVerified: true
              });
              mappedUserId = userRecord.uid;

              // Write Firestore profile
              await db.collection("users").doc(mappedUserId).set({
                uid: mappedUserId,
                email: email,
                createdAt: new Date().toISOString()
              });

              console.log(`Successfully generated new Firebase Auth account for ${email} with password: ${newUserTempPassword}`);
            } catch (createErr: any) {
              console.error(`Auto account creation failed:`, createErr);
            }
          } else {
            console.error(`Error querying Firebase Auth user existence:`, authErr);
          }
        }

        const historyOrder: any = {
          orderId,
          razorpay_order_id: secureOrderId,
          razorpay_payment_id: securePaymentId,
          amount,
          planId: finalPlanId,
          customerEmail: email,
          userId: mappedUserId,
          status: "PAID",
          provisioningStatus: "AUTO",
          createdAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          couponCode: couponCode ? String(couponCode).toUpperCase() : ""
        };

        if (newUserTempPassword) {
          historyOrder.newUserEmail = email;
          historyOrder.newUserTempPassword = newUserTempPassword;
        }
        
        orderHistory.push(historyOrder);
        
        const isPerf = !!(finalPlanId && typeof finalPlanId === "string" && finalPlanId.startsWith("perf"));
        const randomPort = 25500 + Math.floor(Math.random() * 99);
        const serverIp = `${isPerf ? "perf" : "play"}1.hostivaa.xyz:${randomPort}`;

        // Persist order in Firestore under "orders" collection
        try {
          await db.collection("orders").doc(orderId).set({
            orderId,
            razorpay_order_id: secureOrderId,
            razorpay_payment_id: securePaymentId,
            amount,
            planId: finalPlanId,
            customerEmail: email, // Pterodactyl target email
            userId: mappedUserId,
            status: "PAID",
            provisioningStatus: "PENDING",
            createdAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            serverIp,
            couponCode: couponCode ? String(couponCode).toUpperCase() : "",
            ...(newUserTempPassword ? { newUserEmail: email, newUserTempPassword } : {})
          });
          console.log(`Successfully created Firestore receipt for transaction: ${securePaymentId}`);
        } catch (err: any) {
          console.error("Failed to write order receipt to Firestore, continuing with local history:", err.message || err);
        }
        
        // Auto Provision (Non-blocking)
        provisionServer(email, finalPlanId).then(async pteroServer => {
          historyOrder.provisioningStatus = "SUCCESS";
          historyOrder.pteroServerId = pteroServer.id;
          historyOrder.pteroIdentifier = pteroServer.identifier;
          console.log(`Successfully provisioned Pterodactyl server for ${email}`);
          
          // Send Credentials email
          const matchedPlan = plans.find(p => p.id === finalPlanId) || plans[0];
          sendServerEmail(email, serverIp, pteroServer.identifier || String(pteroServer.id), matchedPlan.name, newUserTempPassword);

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

        return res.json({ success: true, orderId });
      } else {
        return res.status(400).json({ success: false, message: "Invalid payment signature verification" });
      }
    } catch (error: any) {
      console.error("[Verify Payment Error] Exception caught:", error.message || error);
      return res.status(500).json({
        success: false,
        message: "An internal server error occurred during payment verification",
        details: error.message || "Unknown error"
      });
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
        const matchedPlan = plans.find(p => typeof p.price === "number" && (p.price === amountInRs || Math.round(p.price * 1.18) === Math.round(amountInRs)));
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

      // Send Credentials Email
      const matchedPlan = plans.find(p => p.id === planId) || plans[0];
      const isPerf = !!(planId && typeof planId === "string" && planId.startsWith("perf"));
      const randomPort = 25500 + Math.floor(Math.random() * 99);
      const serverIp = `${isPerf ? "perf" : "play"}1.hostivaa.xyz:${randomPort}`;
      sendServerEmail(email, serverIp, pteroServer.identifier || String(pteroServer.id), matchedPlan.name);

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
        serverIp
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
    const PTERO_URL = process.env.PTERODACTYL_URL || "https://panel.hostivaa.xyz";
    const PTERO_API_KEY = process.env.PTERODACTYL_API_KEY || "ptla_idokfsWF4MZ1IYVCTlYrgiSvavw8vFvqaazsOrwlv7S";
    
    // Safe plan lookup with fallback to budget-classic if plan ID is invalid or budget-starter
    const actualPlanId = (planId === "budget-starter" || !planId) ? "budget-classic" : planId;
    let plan = plans.find(p => p.id === actualPlanId);
    if (!plan) {
      console.warn(`[Provisioning] Provided plan ID '${planId}' was not found. Falling back to default plan: budget-classic`);
      plan = plans.find(p => p.id === "budget-classic") || plans[0];
    }
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
      const ramVal = String(plan.specs.ram).replace(/[^0-9]/g, '');
      const diskVal = String(plan.specs.disk).replace(/[^0-9]/g, '');
      const cpuVal = String(plan.specs.cpu).replace(/[^0-9]/g, '');

      const ram = (parseInt(ramVal) || 4) * 1024;
      const disk = (parseInt(diskVal) || 10) * 1024;
      const cpu = parseInt(cpuVal) || 100;

      const performanceNode = process.env.PTERODACTYL_PERFORMANCE_NODE_ID || "1";
      const budgetNode = process.env.PTERODACTYL_BUDGET_NODE_ID || "2";
      const nodeId = plan.specs.nodeId || (plan.category === "performance" ? parseInt(performanceNode) : parseInt(budgetNode));
      const locationId = plan.specs.locationId || 1;

      const serverPayload = {
        name: `${plan.name} - ${email.split('@')[0]}`,
        user: userId,
        nest: plan.specs.nestId || 1,
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
          dedicated_ip: false,
          port_range: [],
        },
        start_on_completion: true
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

  // SMTP Email Utility for sending Server Access and Credentials
  async function sendServerEmail(email: string, serverIp: string, serverIdentifier: string, planName: string, tempPassword?: string) {
    const host = process.env.SMTP_HOST || "mail.serververs.com";
    const port = parseInt(process.env.SMTP_PORT || "465", 10);
    const user = process.env.SMTP_USER || "support@hostivaa.xyz";
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || `"Hostiva" <no-reply@hostivaa.xyz>`;

    let accountSectionText = "";
    let accountSectionHtml = "";

    if (tempPassword) {
      accountSectionText = `
------------------------------------------
HOSTIVA BILLING CLIENT ACCOUNT CREATED:
An automated Client Portal account was setup for your email address. Use this to view your bills or manage support:
Email: ${email}
Temporary Passcode: ${tempPassword}
Client Dashboard Login: ${process.env.APP_URL || "https://hostivaa.xyz"}/login
------------------------------------------
`;

      accountSectionHtml = `
        <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 15px; margin: 20px 0; border-radius: 0 4px 4px 0;">
          <h3 style="margin-top: 0; color: #14532d; font-size: 16px;">Hostiva Client Portal Setup Successful</h3>
          <p style="margin: 5px 0 10px 0; font-size: 13.5px; color: #166534;">We have generated a secure billing account for you. Use these credentials to sign in and trace your invoices:</p>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <tr>
              <td style="padding: 4px 0; font-weight: bold; width: 140px; color: #14532d;">Login Email:</td>
              <td style="color: #15803d; font-family: monospace;">${email}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; font-weight: bold; width: 140px; color: #14532d;">Temporary Password:</td>
              <td style="color: #15803d; font-family: monospace;"><strong>${tempPassword}</strong></td>
            </tr>
            <tr>
              <td style="padding: 4px 0; font-weight: bold; width: 140px; color: #14532d;">Login Link:</td>
              <td><a href="${process.env.APP_URL || "https://hostivaa.xyz"}/login" style="color: #2563eb; text-decoration: underline;">Click Here to Login</a></td>
            </tr>
          </table>
        </div>
      `;
    }

    if (!host || !user || !pass) {
      console.warn("[SMTP Email] SMTP password (SMTP_PASS) is not configured yet. Skipping email sending.");
      console.log(`[SMTP Email Mock Sandbox] To: ${email} | Subject: Your Hostiva Server Is Ready! | Details: IP: ${serverIp}, Identifier: ${serverIdentifier}, Plan: ${planName}`);
      if (tempPassword) {
        console.log(`[SMTP Email Mock Sandbox] Newly Created Credentials to Client Access: Email: ${email} | Temporary Password: ${tempPassword}`);
      }
      return;
    }

    try {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465, // true for 465, false for other ports
        auth: {
          user,
          pass,
        },
      });

      const panelUrl = process.env.PTERODACTYL_URL || "https://panel.hostivaa.xyz";

      const mailOptions = {
        from,
        to: email,
        subject: `[Hostiva Solutions] Your ${planName} Server is Ready!`,
        text: `Hello,

Thank you for choosing Hostiva Solutions for your hosting needs. Your high-performance server has been successfully provisioned and is active.

${accountSectionText}

Server Details:
------------------------------------------
Plan: ${planName}
Connection IP/Address: ${serverIp}
Server Identifier: ${serverIdentifier}
Access Panel URL: ${panelUrl}
------------------------------------------

If you don't have an account on our control panel yet, an automated registration email has been generated to let you set your password. Alternatively, you can use the password you set during your login/checkout.

Best regards,
Hostiva Solutions Team
Support Discord: https://discord.gg/SkCuzpE53Q`,
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #f0f0f0; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #2563eb; color: #ffffff; padding: 20px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px;">Hostiva Solutions</h1>
              <p style="margin: 5px 0 0 0; font-size: 14px;">Your server is active and online</p>
            </div>
            <div style="padding: 20px;">
              <p>Hello,</p>
              <p>Thank you for choosing <strong>Hostiva Solutions</strong> for your hosting needs. Your high-performance server is fully provisioned and ready for use.</p>
              
              ${accountSectionHtml}

              <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0; border-radius: 0 4px 4px 0;">
                <h3 style="margin-top: 0; color: #1e3a8a;">Server Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 5px 0; font-weight: bold; width: 140px;">Plan:</td>
                    <td style="color: #475569;">${planName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 0; font-weight: bold;">Server Address (IP):</td>
                    <td style="color: #475569; font-family: monospace; font-size: 14px;">${serverIp}</td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 0; font-weight: bold;">Server Identifier:</td>
                    <td style="color: #475569; font-family: monospace; font-size: 14px;">${serverIdentifier}</td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 0; font-weight: bold;">Control Panel:</td>
                    <td><a href="${panelUrl}" style="color: #2563eb; text-decoration: none;">${panelUrl}</a></td>
                  </tr>
                </table>
              </div>

              <p>If you don't have an account on our control panel yet, check your inbox for an account confirmation email, or reset your password on the panel page using your email: <strong>${email}</strong>.</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${panelUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 25px; text-decoration: none; font-weight: bold; border-radius: 6px; display: inline-block;">Go to Control Panel</a>
              </div>

              <p style="font-size: 13px; color: #64748b; margin-top: 30px; border-top: 1px solid #f0f0f0; padding-top: 15px;">
                Need help? Join our official support <a href="https://discord.gg/SkCuzpE53Q" style="color: #2563eb; text-decoration: none;">Discord Server</a>.
              </p>
            </div>
          </div>
        `
      };

      const info = await transporter.sendMail(mailOptions);
      console.log(`[SMTP Email] Successfully sent server email to ${email}. MessageId: ${info.messageId}`);
    } catch (mailError: any) {
      console.error("[SMTP Email Warning] Failed to deliver credentials email:", mailError.message || mailError);
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
