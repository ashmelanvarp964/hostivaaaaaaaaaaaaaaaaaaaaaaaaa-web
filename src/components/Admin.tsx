import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Shield, History, Tag, Box, Loader2, Search, DollarSign, Clock, Cpu, Database, Lock, Key, Server, MapPin, Layers, LayoutDashboard, TrendingUp, CheckCircle2, AlertCircle, MessageSquare, Ticket, Activity, Trash2, Filter, ChevronUp, ChevronDown, X, RotateCcw, Mail } from "lucide-react";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, BarChart, Bar
} from 'recharts';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "../lib/firebase";

export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  
  const [activeTab, setActiveTab] = useState<"dashboard" | "history" | "plans" | "coupons" | "tickets">("dashboard");
  const [history, setHistory] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [plansList, setPlansList] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" | null }>({ message: "", type: null });
  
  const showNotification = (message: string, type: "success" | "error") => {
    setNotification({ message, type });
    setTimeout(() => setNotification({ message: "", type: null }), 5000);
  };
  
  const [replyText, setReplyText] = useState("");
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  
  const [selectedServer, setSelectedServer] = useState<any>(null);
  const [serverLogs, setServerLogs] = useState<string[]>([]);
  const [fetchingLogs, setFetchingLogs] = useState(false);
  const [serverStats, setServerStats] = useState<any>(null);
  const [pollingStats, setPollingStats] = useState(false);

  const COLORS = ['#3b82f6', '#f59e0b', '#ef4444'];

  // For adding new coupon
  const [newCoupon, setNewCoupon] = useState({ code: "", discount: 0, expiresAt: "" });

  // Filtering and sorting states
  const [couponSearch, setCouponSearch] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [couponSortBy, setCouponSortBy] = useState<"code" | "discount" | "expiresAt" | "usedCount">("code");
  const [couponSortOrder, setCouponSortOrder] = useState<"asc" | "desc">("asc");
  const [couponToDelete, setCouponToDelete] = useState<any>(null);
  const [selectedCoupons, setSelectedCoupons] = useState<string[]>([]);
  const [genSettings, setGenSettings] = useState({ length: 8, charSet: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789" });
  const [showGenSettings, setShowGenSettings] = useState(false);

  const filteredCoupons = coupons
    .filter(c => c.code.toLowerCase().includes(couponSearch.toLowerCase()))
    .sort((a, b) => {
      let valA = a[couponSortBy];
      let valB = b[couponSortBy];

      if (couponSortBy === "expiresAt") {
        valA = valA ? new Date(valA).getTime() : 0;
        valB = valB ? new Date(valB).getTime() : 0;
      }

      if (valA < valB) return couponSortOrder === "asc" ? -1 : 1;
      if (valA > valB) return couponSortOrder === "asc" ? 1 : -1;
      return 0;
    });

  const filteredHistory = history.filter(order => {
    const search = historySearch.toLowerCase();
    return (
      order.orderId.toLowerCase().includes(search) ||
      (order.customerEmail || "").toLowerCase().includes(search) ||
      (order.couponCode || "").toLowerCase().includes(search)
    );
  });

  const toggleSort = (field: "code" | "discount" | "expiresAt" | "usedCount") => {
    if (couponSortBy === field) {
      setCouponSortOrder(couponSortOrder === "asc" ? "desc" : "asc");
    } else {
      setCouponSortBy(field);
      setCouponSortOrder("asc");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      setLoginError("Please enter a valid email address.");
      showNotification("Invalid email format.", "error");
      return;
    }

    if (!password.trim()) {
      setLoginError("Password is required.");
      return;
    }

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email: email.trim(),
          password: password.trim() 
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsAuthenticated(true);
        localStorage.setItem("admin_token", data.token);
        showNotification("Successfully authenticated.", "success");
      } else {
        setLoginError(data.message || "Invalid password");
        showNotification("Authentication failed.", "error");
      }
    } catch (err) {
      setLoginError("Login service unavailable");
      showNotification("Could not connect to authentication server.", "error");
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const responses = await Promise.all([
        fetch("/api/admin/history"),
        fetch("/api/admin/coupons"),
        fetch("/api/admin/plans"),
        fetch("/api/admin/pending"),
        fetch("/api/admin/stats")
      ]);

      const [historyData, couponsData, plansData, pendingData, statsData] = await Promise.all(
        responses.map(res => {
          if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
          return res.json();
        })
      );

      setHistory(historyData);
      setCoupons(couponsData);
      setPlansList(plansData);
      setStats(statsData);
    } catch (err) {
      console.error("Fetch Data Error:", err);
      showNotification("Failed to synchronize dashboard data.", "error");
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
      
      const q = query(collection(db, "tickets"));
      onSnapshot(q, (snapshot) => {
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        docs.sort((a: any, b: any) => {
          const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
          const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
          return timeB - timeA;
        });
        setTickets(docs);
      }, (error) => {
        console.error("Admin tickets listener error:", error);
      });
    }
  }, [isAuthenticated]);

  const handleAdminReply = async (ticketId: string) => {
    if (!replyText || !ticketId) return;
    try {
      const ticketRef = doc(db, "tickets", ticketId);
      await updateDoc(ticketRef, {
        replies: arrayUnion({
          sender: "ADMIN",
          message: replyText,
          timestamp: new Date().toISOString()
        }),
        status: "REPLIED"
      });
      setReplyText("");
      showNotification("Reply sent to user.", "success");
    } catch (err) {
      console.error(err);
      showNotification("Failed to send reply via Firestore.", "error");
    }
  };

  const handleCloseTicket = async (ticketId: string) => {
    try {
      const ticketRef = doc(db, "tickets", ticketId);
      await updateDoc(ticketRef, { status: "CLOSED" });
      showNotification("Ticket marked as closed.", "success");
    } catch (err) {
      console.error(err);
      showNotification("Failed to update ticket status.", "error");
    }
  };

  const approveOrder = async (orderId: string) => {
    try {
      const res = await fetch("/api/admin/approve-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showNotification(`Order ${orderId} approved successfully.`, "success");
        fetchData();
      } else {
        showNotification(data.message || "Manual approval failed.", "error");
      }
    } catch (e) {
      showNotification("Network error during order approval.", "error");
    }
  };
 
  const deleteCoupon = async (code: string) => {
    try {
      const res = await fetch(`/api/admin/coupons/${code}`, {
        method: "DELETE"
      });
      if (res.ok) {
        showNotification(`Coupon ${code} deleted successfully.`, "success");
        setCouponToDelete(null);
        setSelectedCoupons(prev => prev.filter(c => c !== code));
        fetchData();
      } else {
        const data = await res.json();
        showNotification(data.message || "Failed to delete coupon.", "error");
      }
    } catch (err) {
      showNotification("Network error deleting coupon.", "error");
    }
  };

  const handleBulkAction = async (action: "delete" | "deactivate") => {
    if (selectedCoupons.length === 0) return;
    
    if (action === "delete") {
      if (!confirm(`Are you sure you want to delete ${selectedCoupons.length} coupons?`)) return;
    }

    try {
      const res = await fetch("/api/admin/coupons/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codes: selectedCoupons, action })
      });
      const data = await res.json();
      if (data.success) {
        showNotification(data.message, "success");
        setSelectedCoupons([]);
        fetchData();
      } else {
        showNotification(data.message || "Bulk action failed.", "error");
      }
    } catch (err) {
      showNotification("Network error performing bulk action.", "error");
    }
  };

  const toggleSelectCoupon = (code: string) => {
    setSelectedCoupons(prev => 
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  const toggleSelectAllCoupons = () => {
    if (selectedCoupons.length === filteredCoupons.length && filteredCoupons.length > 0) {
      setSelectedCoupons([]);
    } else {
      setSelectedCoupons(filteredCoupons.map(c => c.code));
    }
  };
  const generateRandomCode = () => {
    let result = '';
    const characters = genSettings.charSet || "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const charactersLength = characters.length;
    for (let i = 0; i < (genSettings.length || 8); i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    setNewCoupon({ ...newCoupon, code: result });
  };

  const addCoupon = async () => {
    if (!newCoupon.code.trim()) {
      showNotification("Coupon code cannot be empty.", "error");
      return;
    }
    if (isNaN(newCoupon.discount) || newCoupon.discount < 1 || newCoupon.discount > 100) {
      showNotification("Discount must be a number between 1 and 100.", "error");
      return;
    }
    try {
      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCoupon)
      });
      const data = await res.json();
      if (res.ok) {
        setNewCoupon({ code: "", discount: 0, expiresAt: "" });
        showNotification(`Coupon ${newCoupon.code} published.`, "success");
        fetchData();
      } else {
        showNotification(data.message || "Failed to save coupon.", "error");
      }
    } catch (err) {
      showNotification("Network error creating coupon.", "error");
    }
  };

  const fetchServerDetails = async (order: any) => {
    if (!order.serverDetails) {
      showNotification("No data available for this instance.", "error");
      return;
    }
    setSelectedServer(order);
    setFetchingLogs(true);
    setServerLogs([]);
    setServerStats(null);
    try {
      const res = await fetch(`/api/admin/server-logs/${order.orderId}`);
      const data = await res.json();
      if (data.success) {
        setServerLogs(data.logs);
      } else {
        showNotification(data.message || "Could not retrieve instance logs.", "error");
      }
    } catch (err) {
      console.error(err);
      showNotification("Internal server error fetching logs.", "error");
    }
    setFetchingLogs(false);
  };

  useEffect(() => {
    let interval: any;
    if (selectedServer && selectedServer.serverDetails?.identifier) {
      const fetchStats = async () => {
        try {
          const res = await fetch(`/api/admin/server-stats/${selectedServer.serverDetails.identifier}`);
          const data = await res.json();
          if (data.success) {
            setServerStats(data.stats);
          }
        } catch (err) {
          console.error("Polling error:", err);
        }
      };
      
      fetchStats();
      interval = setInterval(fetchStats, 3000);
    }
    return () => clearInterval(interval);
  }, [selectedServer]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black px-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-8 w-full max-w-md text-center"
        >
          <div className="w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Lock className="w-8 h-8 text-blue-500" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Restricted Access</h1>
          <p className="text-gray-400 text-sm mb-8">Authorization required to access Hostiva Control Panel.</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input 
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Admin Email"
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 outline-none focus:border-blue-500 transition-all text-white"
              />
            </div>
            <div className="relative">
              <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter Admin Password"
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 outline-none focus:border-blue-500 transition-all text-white"
              />
            </div>
            {loginError && <p className="text-red-500 text-xs font-bold uppercase tracking-widest">{loginError}</p>}
            <button className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold transition-all shadow-[0_0_20px_-5px_rgba(59,130,246,0.5)]">
              Authenticate
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <NotificationToast {...notification} />
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
        <div>
          <h1 className="text-4xl font-bold font-display flex items-center gap-3">
            <Shield className="text-blue-500" /> Admin Station
          </h1>
          <p className="text-gray-400 mt-2">Control central for Hostiva infrastructure & revenue.</p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full md:w-auto">
          <div className="glass-card p-4 text-center">
            <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-1 leading-none">Revenue</p>
            <p className="text-lg font-bold text-white leading-none">₹{stats?.totalRevenue || 0}</p>
          </div>
          <div className="glass-card p-4 text-center border-blue-500/20">
            <p className="text-[10px] uppercase tracking-widest text-blue-400 font-bold mb-1 leading-none">Net Profit</p>
            <p className="text-lg font-bold text-blue-400 leading-none">₹{Math.floor(stats?.netProfit || 0)}</p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-1 leading-none">Orders</p>
            <p className="text-lg font-bold text-white leading-none">{stats?.paidOrders || 0}</p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-1 leading-none">Pending</p>
            <p className="text-lg font-bold text-yellow-500 leading-none">₹{stats?.pendingAmount || 0}</p>
          </div>
        </div>
        
        <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
          <button 
            onClick={() => setActiveTab("dashboard")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === "dashboard" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"}`}
          >
            <LayoutDashboard className="w-4 h-4" /> Dashboard
          </button>
          <button 
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === "history" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"}`}
          >
            <History className="w-4 h-4" /> History
          </button>
          <button 
            onClick={() => setActiveTab("tickets")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === "tickets" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"}`}
          >
            <MessageSquare className="w-4 h-4" /> Tickets
            {tickets.filter(t => t.status === 'OPEN').length > 0 && (
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            )}
          </button>
          <button 
            onClick={() => setActiveTab("plans")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === "plans" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"}`}
          >
            <Box className="w-4 h-4" /> Plans
          </button>
          <button 
            onClick={() => setActiveTab("coupons")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === "coupons" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"}`}
          >
            <Tag className="w-4 h-4" /> Coupons
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center">
          <Loader2 className="animate-spin w-10 h-10 text-blue-500" />
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card overflow-hidden"
        >
          {activeTab === "dashboard" && (
            <div className="p-8 space-y-8">
              <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-black/20 p-6 rounded-2xl border border-white/5 h-[400px]">
                    <div className="flex items-center justify-between mb-8">
                      <div>
                        <h3 className="font-bold flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-blue-500" /> Revenue Growth
                        </h3>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Weekly Performance (Demo Data)</p>
                      </div>
                      <div className="flex gap-4">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full" />
                          <span className="text-[10px] text-gray-400">Revenue</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={stats?.revenueHistory || []}>
                          <defs>
                            <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                          <XAxis 
                            dataKey="name" 
                            stroke="#ffffff30" 
                            fontSize={10} 
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis 
                            stroke="#ffffff30" 
                            fontSize={10} 
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `₹${value}`}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#121212', 
                              borderColor: '#333', 
                              borderRadius: '12px',
                              fontSize: '12px'
                            }}
                            itemStyle={{ color: '#3b82f6' }}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="revenue" 
                            stroke="#3b82f6" 
                            strokeWidth={3}
                            fillOpacity={1} 
                            fill="url(#colorRev)" 
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                     <div className="bg-black/20 p-6 rounded-2xl border border-white/5 h-[300px]">
                      <h3 className="font-bold text-sm mb-6 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" /> New Signups
                      </h3>
                      <div className="h-48 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={stats?.revenueHistory || []}>
                            <XAxis 
                              dataKey="name" 
                              stroke="#ffffff30" 
                              fontSize={10} 
                              tickLine={false}
                              axisLine={false}
                            />
                            <YAxis 
                              stroke="#ffffff30" 
                              fontSize={10} 
                              tickLine={false}
                              axisLine={false}
                            />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: '#121212', 
                                borderColor: '#333', 
                                borderRadius: '12px',
                                fontSize: '10px'
                              }}
                            />
                            <Line type="monotone" dataKey="signups" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 4 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="bg-black/20 p-6 rounded-2xl border border-white/5 h-[300px]">
                      <h3 className="font-bold text-sm mb-6 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-orange-500" /> Provisioning Status
                      </h3>
                      <div className="h-48 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Tooltip 
                               contentStyle={{ 
                                backgroundColor: '#121212', 
                                borderColor: '#333', 
                                borderRadius: '12px',
                                fontSize: '10px'
                              }}
                            />
                            <Pie
                              data={stats?.provisioningStats || []}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {(stats?.provisioningStats || []).map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-blue-600/10 p-6 rounded-2xl border border-blue-500/20">
                    <h3 className="font-bold text-blue-400 mb-4 text-sm">System Health</h3>
                    <div className="space-y-4">
                      {[
                        { label: 'Website Panel', status: 'Optimal' },
                        { label: 'Discord Bot', status: 'Connected' },
                        { label: 'Auth Service', status: 'Optimal' },
                        { label: 'Database Node', status: 'Healthy' }
                      ].map((item, i) => (
                        <div key={i} className="flex justify-between items-center bg-black/20 p-3 rounded-xl border border-white/5">
                          <span className="text-xs text-gray-400">{item.label}</span>
                          <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded uppercase font-bold">{item.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="glass-card p-6 space-y-4">
                    <h3 className="font-bold text-sm">Recent Activity</h3>
                    <div className="space-y-3">
                      {history.slice(0, 5).map((order, i) => (
                        <div key={i} className="flex gap-3 items-center">
                          <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                            <Clock className="w-4 h-4 text-gray-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-white truncate">{order.customerEmail || 'Guest'}</p>
                            <p className="text-[10px] text-gray-500 truncate">Purchased {order.planId}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "tickets" && (
            <div className="p-0">
               <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <div>
                  <h3 className="font-bold">Support Tickets</h3>
                  <p className="text-xs text-gray-500 mt-1">Manage user technical inquiries.</p>
                </div>
              </div>
              <div className="grid lg:grid-cols-3 min-h-[500px]">
                <div className="border-r border-white/5 overflow-y-auto max-h-[600px]">
                  {tickets.map(t => (
                    <button 
                      key={t.id}
                      onClick={() => setSelectedTicket(t)}
                      className={`w-full text-left p-6 border-b border-white/5 hover:bg-white/[0.02] transition-colors ${selectedTicket?.id === t.id ? 'bg-white/[0.05]' : ''}`}
                    >
                      <div className="flex justify-between mb-2">
                        <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded ${
                          t.status === 'OPEN' ? 'bg-red-500/10 text-red-400' : 'bg-gray-500/10 text-gray-400'
                        }`}>
                          {t.status}
                        </span>
                        <span className="text-[9px] text-gray-500">{new Date(t.createdAt?.toMillis()).toLocaleDateString()}</span>
                      </div>
                      <p className="text-xs font-bold text-white truncate">{t.subject}</p>
                      <p className="text-[10px] text-gray-500 truncate mt-1">{t.email}</p>
                    </button>
                  ))}
                </div>
                <div className="lg:col-span-2 flex flex-col">
                  {selectedTicket ? (
                    <>
                      <div className="p-6 bg-black/20 overflow-y-auto max-h-[400px] flex-1 space-y-4">
                        <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                          <p className="text-xs font-bold text-blue-400 mb-2">Original Message ({selectedTicket.email})</p>
                          <p className="text-sm">{selectedTicket.message}</p>
                        </div>
                        {selectedTicket.replies.map((r: any, i: number) => (
                          <div key={i} className={`p-4 rounded-xl border ${r.sender === 'ADMIN' ? 'bg-blue-600/10 border-blue-500/20 ml-8' : 'bg-white/5 border-white/10 mr-8'}`}>
                            <p className="text-[10px] uppercase font-bold text-gray-500 mb-1">{r.sender}</p>
                            <p className="text-sm">{r.message}</p>
                          </div>
                        ))}
                      </div>
                      <div className="p-6 border-t border-white/5 space-y-4">
                        <textarea 
                          placeholder="Type your reply..."
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm focus:border-blue-500 outline-none resize-none"
                        />
                        <div className="flex gap-4">
                          <button 
                            onClick={() => handleAdminReply(selectedTicket.id)}
                            className="flex-1 bg-blue-600 py-3 rounded-xl font-bold hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20"
                          >
                            Send Reply
                          </button>
                          <button 
                            onClick={() => handleCloseTicket(selectedTicket.id)}
                            className="px-6 py-3 border border-white/10 rounded-xl font-bold hover:bg-white/5"
                          >
                            Close Ticket
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-500">
                      Select a ticket to view conversation
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "history" && (
            <div className="p-0">
               <div className="p-6 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 bg-black/40 backdrop-blur-md z-10">
                <div>
                  <h3 className="font-bold">Transaction Ledger</h3>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Total Orders: {history.length}</p>
                </div>
                
                <div className="relative w-full md:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input 
                    type="text"
                    placeholder="Search ID, Email, or Coupon..."
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm outline-none focus:border-blue-500 transition-all"
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white/5 text-gray-400 uppercase text-[10px] tracking-widest font-black">
                    <tr>
                      <th className="px-6 py-4">Order ID</th>
                      <th className="px-6 py-4">Customer</th>
                      <th className="px-6 py-4">Plan</th>
                      <th className="px-6 py-4">Coupon</th>
                      <th className="px-6 py-4">Revenue</th>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-gray-300">
                    {filteredHistory.map((order, idx) => (
                      <tr key={idx} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 font-mono text-blue-400">{order.orderId}</td>
                        <td className="px-6 py-4">{order.customerEmail || "anonymous@hostiva.xyz"}</td>
                        <td className="px-6 py-4 capitalize">{order.planId.replace("-", " ")}</td>
                        <td className="px-6 py-4 font-mono text-xs text-gray-500">{order.couponCode || "None"}</td>
                        <td className="px-6 py-4 font-bold text-white">₹{order.amount}</td>
                        <td className="px-6 py-4 text-xs text-gray-500">
                          {order.completedAt ? new Date(order.completedAt).toLocaleString() : "Pending"}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-2">
                             <div className="flex items-center gap-2">
                               <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${order.status === 'PAID' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                                {order.status || 'PENDING'}
                               </span>
                               {order.status === 'PENDING' && (
                                 <button 
                                   onClick={() => approveOrder(order.orderId)}
                                   className="text-[10px] text-blue-400 hover:underline font-bold"
                                 >
                                   CONFIRM MANUALLY
                                 </button>
                               )}
                             </div>
                              {order.status === 'PAID' && (
                               <div className="flex items-center gap-2">
                                 <span className="text-[9px] uppercase font-bold tracking-widest text-gray-400">
                                   Status: Manual Deployment
                                 </span>
                                 <button 
                                   onClick={() => fetchServerDetails(order)}
                                   className="text-[9px] text-blue-400 hover:underline font-bold h-4 flex items-center"
                                 >
                                   DETAILS
                                 </button>
                               </div>
                             )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredHistory.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-gray-500">No transactions recorded yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "coupons" && (
            <div className="p-8">
              <div className="grid lg:grid-cols-3 gap-12">
                <div className="lg:col-span-2">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 sticky top-0 bg-black/40 backdrop-blur-md z-10 py-4 -mx-4 px-4 rounded-xl">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                      <Tag className="w-5 h-5 text-blue-500" /> Existing Coupons
                    </h3>
                    
                    <div className="flex items-center gap-3 w-full md:w-auto">
                      {filteredCoupons.length > 0 && (
                        <button 
                          onClick={toggleSelectAllCoupons}
                          className={`p-2 rounded-xl border transition-all flex items-center gap-2 text-xs font-bold ${
                            selectedCoupons.length === filteredCoupons.length 
                              ? "bg-blue-600 border-blue-600 text-white" 
                              : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
                          }`}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          {selectedCoupons.length === filteredCoupons.length ? "Deselect All" : "Select All"}
                        </button>
                      )}
                      <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input 
                          type="text"
                          placeholder="Search coupons..."
                          value={couponSearch}
                          onChange={(e) => setCouponSearch(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm outline-none focus:border-blue-500 transition-all"
                        />
                      </div>
                      <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 shrink-0">
                        <button 
                          onClick={() => toggleSort("code")}
                          className={`p-2 rounded-lg transition-all ${couponSortBy === "code" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"}`}
                          title="Sort by Code"
                        >
                          <Tag className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => toggleSort("discount")}
                          className={`p-2 rounded-lg transition-all ${couponSortBy === "discount" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"}`}
                          title="Sort by Discount"
                        >
                          <DollarSign className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => toggleSort("expiresAt")}
                          className={`p-2 rounded-lg transition-all ${couponSortBy === "expiresAt" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"}`}
                          title="Sort by Expiration"
                        >
                          <Clock className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => toggleSort("usedCount")}
                          className={`p-2 rounded-lg transition-all ${couponSortBy === "usedCount" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"}`}
                          title="Sort by Usage"
                        >
                          <Activity className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {selectedCoupons.length > 0 && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0, y: -10 }}
                        animate={{ height: "auto", opacity: 1, y: 0 }}
                        exit={{ height: 0, opacity: 0, y: -10 }}
                        className="mb-4 overflow-hidden"
                      >
                        <div className="bg-blue-600/10 border border-blue-500/20 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-black">
                              {selectedCoupons.length}
                            </div>
                            <p className="text-sm font-bold text-blue-400">Coupons Selected</p>
                          </div>
                          
                          <div className="flex gap-3 w-full md:w-auto">
                            <button 
                              onClick={() => handleBulkAction("deactivate")}
                              className="flex-1 md:flex-none px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-gray-300 transition-all flex items-center justify-center gap-2"
                            >
                              <Clock className="w-4 h-4" /> Finalize/Expire
                            </button>
                            <button 
                              onClick={() => handleBulkAction("delete")}
                              className="flex-1 md:flex-none px-4 py-2 bg-red-600 hover:bg-red-500 rounded-xl text-xs font-bold text-white transition-all shadow-lg shadow-red-600/20 flex items-center justify-center gap-2"
                            >
                              <Trash2 className="w-4 h-4" /> Delete Permanently
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 scrollbar-hide">
                    {filteredCoupons.map((c, i) => (
                      <div 
                        key={i} 
                        className={`flex items-center justify-between p-4 bg-white/5 border rounded-2xl hover:border-white/20 transition-all group ${
                          selectedCoupons.includes(c.code) ? "border-blue-500/50 bg-blue-500/5 shadow-lg shadow-blue-500/5" : "border-white/5"
                        }`}
                      >
                        <div className="flex gap-4 items-center">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSelectCoupon(c.code);
                            }}
                            className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                              selectedCoupons.includes(c.code) 
                                ? "bg-blue-600 border-blue-600 shadow-lg shadow-blue-600/30" 
                                : "border-white/10 hover:border-white/20"
                            }`}
                          >
                            {selectedCoupons.includes(c.code) && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                          </button>
                          <div className="w-12 h-12 rounded-xl bg-blue-600/10 flex items-center justify-center shrink-0">
                            <Ticket className="w-6 h-6 text-blue-500" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-mono font-bold text-blue-400 text-lg">{c.code}</p>
                              <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded uppercase font-bold tracking-widest">{c.discount}% OFF</span>
                            </div>
                            <div className="flex gap-3 items-center mt-1">
                              {c.usedCount !== undefined && (
                                <span className="flex items-center gap-1 text-[10px] text-gray-500">
                                  <Activity className="w-3 h-3" /> Used: {c.usedCount}
                                </span>
                              )}
                              {c.expiresAt && (
                                <span className={`flex items-center gap-1 text-[10px] font-bold ${new Date(c.expiresAt) < new Date() ? 'text-red-400' : 'text-gray-500'}`}>
                                  <Clock className="w-3 h-3" /> 
                                  {new Date(c.expiresAt) < new Date() ? 'Expired' : `Expires: ${new Date(c.expiresAt).toLocaleDateString()}`}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <button 
                          onClick={() => setCouponToDelete(c)}
                          className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500/50 hover:text-red-500 hover:bg-red-500/20 transition-all flex items-center justify-center"
                          title="Delete Coupon"
                        >
                           <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                    {filteredCoupons.length === 0 && (
                      <div className="p-20 text-center glass-card border-dashed">
                        <Tag className="w-10 h-10 text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-500 font-bold">No coupons found matching your search.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white/5 p-8 rounded-2xl border border-white/10">
                  <h3 className="text-xl font-bold mb-6">Create New Coupon</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-xs uppercase tracking-widest text-gray-500">Coupon Code</label>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setShowGenSettings(!showGenSettings)}
                            className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
                          >
                            <Filter className="w-3 h-3" /> Settings
                          </button>
                          <button 
                            onClick={generateRandomCode}
                            className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
                          >
                            <RotateCcw className="w-3 h-3" /> Generate
                          </button>
                        </div>
                      </div>
                      
                      {showGenSettings && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          className="bg-black/20 rounded-xl p-3 mb-3 border border-white/5 space-y-3 overflow-hidden"
                        >
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] text-gray-500 uppercase mb-1">Length</label>
                              <input 
                                type="number"
                                value={genSettings.length}
                                onChange={(e) => setGenSettings({...genSettings, length: parseInt(e.target.value) || 8})}
                                className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-xs outline-none focus:border-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-gray-500 uppercase mb-1">Preview</label>
                              <div className="text-[10px] text-blue-400 font-mono truncate py-1">
                                {genSettings.charSet.slice(0, 10)}...
                              </div>
                            </div>
                          </div>
                          <div>
                            <label className="block text-[10px] text-gray-500 uppercase mb-1">Character Set</label>
                            <input 
                              type="text"
                              value={genSettings.charSet}
                              onChange={(e) => setGenSettings({...genSettings, charSet: e.target.value})}
                              className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-xs outline-none focus:border-blue-500 font-mono"
                            />
                          </div>
                        </motion.div>
                      )}

                      <input 
                        value={newCoupon.code}
                        onChange={(e) => setNewCoupon({...newCoupon, code: e.target.value})}
                        placeholder="SUMMER2026"
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-blue-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Discount %</label>
                      <input 
                        type="number"
                        value={newCoupon.discount}
                        onChange={(e) => setNewCoupon({...newCoupon, discount: parseInt(e.target.value)})}
                        placeholder="20"
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Expiration Date (Optional)</label>
                      <input 
                        type="date"
                        value={newCoupon.expiresAt}
                        onChange={(e) => setNewCoupon({...newCoupon, expiresAt: e.target.value})}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-blue-500 text-white"
                      />
                    </div>
                    <button 
                      onClick={addCoupon}
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold transition-all mt-4"
                    >
                      Publish Coupon
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "plans" && (
            <div className="p-8">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Box className="w-5 h-5 text-blue-500" /> Active Infrastructure Plans
                </h3>
                <button className="bg-white text-black px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-gray-200">
                  <Box className="w-4 h-4" /> New Plan
                </button>
              </div>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {plansList.map((plan, i) => (
                  <div key={i} className="p-5 bg-white/5 border border-white/5 rounded-2xl hover:border-blue-500/30 transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold">{plan.name}</h4>
                        <span className="text-[10px] bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded uppercase font-bold">{plan.category}</span>
                      </div>
                      <p className="text-xs text-gray-500 mb-4 flex items-center gap-1">
                        <Server className="w-3 h-3" /> {plan.hardware}
                      </p>
                      
                      <div className="grid grid-cols-2 gap-2 mb-4">
                         <div className="bg-black/20 p-2 rounded-lg border border-white/5">
                            <span className="text-[8px] text-gray-500 uppercase block">Nest ID</span>
                            <span className="text-xs font-mono">{plan.specs.nestId || 1}</span>
                         </div>
                         <div className="bg-black/20 p-2 rounded-lg border border-white/5">
                            <span className="text-[8px] text-gray-500 uppercase block">Egg ID</span>
                            <span className="text-xs font-mono">{plan.specs.eggId || 15}</span>
                         </div>
                         <div className="bg-black/20 p-2 rounded-lg border border-white/5">
                            <span className="text-[8px] text-gray-500 uppercase block">Location</span>
                            <span className="text-xs font-mono">{plan.specs.locationId || 1}</span>
                         </div>
                         <div className="bg-black/20 p-2 rounded-lg border border-white/5">
                            <span className="text-[8px] text-gray-500 uppercase block">Node ID</span>
                            <span className="text-xs font-mono">{plan.specs.nodeId || "Auto"}</span>
                         </div>
                         <div className="bg-black/20 p-2 rounded-lg border border-white/5">
                            <span className="text-[8px] text-gray-500 uppercase block">Ports</span>
                            <span className="text-xs font-mono">{plan.specs.ports || 0}</span>
                         </div>
                      </div>

                      <div className="flex items-center gap-4 text-[10px] text-gray-400 mb-4">
                        <div className="flex items-center gap-1"><Cpu className="w-3 h-3 text-blue-400" /> {plan.specs.cpu}</div>
                        <div className="flex items-center gap-1"><Database className="w-3 h-3 text-green-400" /> {plan.specs.ram}</div>
                      </div>
                    </div>
                    <div className="pt-4 border-t border-white/5 flex justify-between items-center">
                      <span className="font-bold text-lg">₹{plan.price}</span>
                      <button className="text-xs text-blue-400 hover:underline">Edit Configuration</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
      <AnimatePresence>
        {couponToDelete && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass-card w-full max-w-md p-8 text-center relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-red-500" />
              <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-10 h-10 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold mb-2 text-white">Delete Coupon?</h2>
              <p className="text-gray-400 text-sm mb-8">
                Are you sure you want to delete <span className="text-blue-400 font-mono font-bold">"{couponToDelete.code}"</span>? 
                This action cannot be undone and users will no longer be able to use this discount.
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setCouponToDelete(null)}
                  className="py-3 rounded-xl font-bold bg-white/5 hover:bg-white/10 text-gray-300 transition-all border border-white/5"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => deleteCoupon(couponToDelete.code)}
                  className="py-3 rounded-xl font-bold bg-red-600 hover:bg-red-500 text-white transition-all shadow-lg shadow-red-600/20"
                >
                  Confirm Delete
                </button>
              </div>

              <button 
                onClick={() => setCouponToDelete(null)}
                className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Server Details Modal */}
      {selectedServer && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
          >
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-blue-600/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600/20 rounded-xl flex items-center justify-center">
                  <Server className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold font-display">Server Management</h2>
                  <p className="text-[10px] text-blue-400 uppercase tracking-widest font-bold">Order ID: {selectedServer.orderId}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedServer(null)}
                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
              >
                <div className="text-xl">&times;</div>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                  <span className="text-[10px] text-gray-500 uppercase font-black block mb-1">Status</span>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-sm font-bold text-white uppercase tracking-widest">Active</span>
                  </div>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                  <span className="text-[10px] text-gray-500 uppercase font-black block mb-1">IP Address</span>
                  <p className="text-sm font-mono text-blue-400">{selectedServer.serverDetails?.ip || "Pending"}:{selectedServer.serverDetails?.port}</p>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                  <span className="text-[10px] text-gray-500 uppercase font-black block mb-1">Created At</span>
                  <p className="text-sm text-white">{new Date(selectedServer.completedAt).toLocaleString()}</p>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                  <span className="text-[10px] text-gray-500 uppercase font-black block mb-1">Ptero ID</span>
                  <p className="text-sm font-mono text-gray-400">#{selectedServer.serverDetails?.id}</p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-green-500" /> Live Resource Usage
                  </div>
                  <span className="text-[10px] text-gray-500 font-mono">Updates every 3s</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(() => {
                    const plan = plansList.find(p => p.id === selectedServer.planId);
                    const totalRamMB = plan ? (plan.specs.ram.includes("GB") ? parseInt(plan.specs.ram) * 1024 : parseInt(plan.specs.ram)) : 2048;
                    const ramUsagePercent = serverStats ? (serverStats.memory_bytes / (1024 * 1024 * totalRamMB)) * 100 : 0;
                    
                    // Simple scaling for network bars to show relative activity
                    const rxPercent = serverStats ? Math.min((serverStats.network_rx_bytes / 1048576) * 10, 100) : 0;
                    const txPercent = serverStats ? Math.min((serverStats.network_tx_bytes / 1048576) * 10, 100) : 0;

                    return (
                      <>
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] text-gray-400 uppercase font-bold">CPU Load</span>
                            <span className="text-xs font-bold text-blue-400">{serverStats ? serverStats.cpu_absolute.toFixed(1) : '---'}%</span>
                          </div>
                          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(serverStats?.cpu_absolute || 0, 100)}%` }}
                              className="h-full bg-blue-500"
                            />
                          </div>
                        </div>
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] text-gray-400 uppercase font-bold">RAM Usage</span>
                            <span className="text-xs font-bold text-green-400">
                              {serverStats ? `${(serverStats.memory_bytes / 1024 / 1024).toFixed(0)} MB` : '--- MB'}
                            </span>
                          </div>
                          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(ramUsagePercent, 100)}%` }}
                              className="h-full bg-green-500"
                            />
                          </div>
                        </div>
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] text-gray-400 uppercase font-bold">Network I/O</span>
                            <div className="flex gap-2">
                              <span className="text-[9px] text-blue-400">↓{(serverStats?.network_rx_bytes / 1024).toFixed(0)}K</span>
                              <span className="text-[9px] text-purple-400">↑{(serverStats?.network_tx_bytes / 1024).toFixed(0)}K</span>
                            </div>
                          </div>
                          <div className="flex gap-1 h-1.5">
                             <div className="flex-1 bg-white/5 rounded-full overflow-hidden">
                               <motion.div 
                                 animate={{ width: `${rxPercent}%` }}
                                 className="h-full bg-blue-400/50" 
                               />
                             </div>
                             <div className="flex-1 bg-white/5 rounded-full overflow-hidden">
                               <motion.div 
                                 animate={{ width: `${txPercent}%` }}
                                 className="h-full bg-purple-400/50" 
                               />
                             </div>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-500" /> Allocated Resources
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  {(() => {
                    const plan = plansList.find(p => p.id === selectedServer.planId);
                    return (
                      <>
                        <div className="glass-card p-4 border-white/5 flex gap-4 items-center">
                          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                            <Cpu className="w-4 h-4 text-blue-400" />
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-500 uppercase font-bold">CPU Core</p>
                            <p className="text-sm font-bold">{plan?.specs?.cpu || "N/A"}</p>
                          </div>
                        </div>
                        <div className="glass-card p-4 border-white/5 flex gap-4 items-center">
                          <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                            <Database className="w-4 h-4 text-green-400" />
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-500 uppercase font-bold">RAM Memory</p>
                            <p className="text-sm font-bold">{plan?.specs?.ram || "N/A"}</p>
                          </div>
                        </div>
                        <div className="glass-card p-4 border-white/5 flex gap-4 items-center">
                          <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                            <Box className="w-4 h-4 text-orange-400" />
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-500 uppercase font-bold">SSD Disk</p>
                            <p className="text-sm font-bold">{plan?.specs?.disk || "N/A"}</p>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-500" /> System Logs
                  </h3>
                  <button className="text-[10px] text-blue-400 font-bold uppercase tracking-widest hover:underline">Download full log</button>
                </div>
                <div className="bg-black/40 rounded-2xl border border-white/10 p-6 font-mono text-[11px] leading-relaxed overflow-x-auto max-h-[300px]">
                  {fetchingLogs ? (
                    <div className="flex items-center gap-2 text-gray-500 italic">
                      <Loader2 className="w-3 h-3 animate-spin" /> Fetching real-time records...
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {serverLogs.map((log, i) => (
                        <p key={i} className={log.includes('Successfully') || log.includes('provisioned') ? 'text-green-400' : 'text-gray-400'}>
                          <span className="opacity-40 font-mono mr-2">[{i+1}]</span> {log}
                        </p>
                      ))}
                      <p className="text-blue-500 animate-pulse mt-2">_ Ready for commands</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-white/10 bg-white/[0.02] flex justify-end gap-4">
              <button 
                onClick={() => setSelectedServer(null)}
                className="px-6 py-2 rounded-xl text-sm font-bold text-gray-400 hover:text-white transition-colors"
              >
                Close View
              </button>
              <button 
                onClick={() => window.open("https://discord.gg/SkCuzpE53Q", "_blank")}
                className="bg-blue-600 px-8 py-2 rounded-xl text-sm font-bold text-white hover:bg-blue-500 shadow-lg shadow-blue-600/20 transition-all font-display"
              >
                Deploy via Discord
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function NotificationToast({ message, type }: { message: string, type: "success" | "error" | null }) {
  if (!type) return null;
  return (
    <motion.div 
      initial={{ x: 100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 100, opacity: 0 }}
      className={`fixed bottom-8 right-8 z-[200] max-w-sm w-full glass-card p-4 border-l-4 shadow-2xl flex items-center gap-4 ${
        type === 'success' ? 'border-green-500 bg-green-500/5' : 'border-red-500 bg-red-500/5'
      }`}
    >
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
        type === 'success' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
      }`}>
        {type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
      </div>
      <div>
        <p className="text-sm font-bold text-white mb-0.5">{type === 'success' ? 'Success' : 'Attention'}</p>
        <p className="text-xs text-gray-400">{message}</p>
      </div>
    </motion.div>
  );
}
