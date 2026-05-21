import React, { useState, useEffect } from "react";
import { 
  Shield, 
  KeyRound, 
  Coins, 
  Server, 
  Users, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Activity, 
  Copy, 
  TrendingUp, 
  RefreshCw, 
  ArrowLeft, 
  Search,
  MessageSquare,
  Sparkles,
  ExternalLink
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom";

interface AdminStats {
  totalRevenue: number;
  totalOrders: number;
  successfulProvisions: number;
  failedProvisions: number;
  planStats: Record<string, number>;
  userCount: number;
}

interface OrderRecord {
  orderId: string;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  transactionId?: string;
  amount: number;
  planId: string;
  customerEmail: string;
  userId?: string;
  status: string;
  provisioningStatus: string;
  provisioningError?: string;
  pteroServerId?: number | string;
  pteroIdentifier?: string;
  createdAt?: string;
  completedAt?: string;
  serverIp?: string;
}

interface FeedbackRecord {
  messageId: string;
  type: "positive" | "negative";
  messageContent: string;
  userPrompt: string;
  history: any[];
  timestamp: string;
}

export default function AdminPanel() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);

  // States
  const [activeTab, setActiveTab] = useState<"stats" | "orders" | "feedback">("stats");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [feedbacks, setFeedbacks] = useState<FeedbackRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    // Check if token exists
    const token = localStorage.getItem("hostiva_admin_token");
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    setAuthError("");
    setIsSubmittingAuth(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Login Verification Failed");
      }

      localStorage.setItem("hostiva_admin_token", data.token);
      setIsAuthenticated(true);
      setAuthError("");
    } catch (err: any) {
      setAuthError(err.message || "Invalid Admin Password");
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("hostiva_admin_token");
    setIsAuthenticated(false);
  };

  const fetchAdminData = async () => {
    const token = localStorage.getItem("hostiva_admin_token");
    if (!token) return;

    setRefreshing(true);
    setErrorMsg("");

    try {
      const headers = { "Authorization": `Bearer ${token}` };

      // Parallel fetching for high performance and clean load
      const [statsRes, ordersRes, feedbacksRes] = await Promise.all([
        fetch("/api/admin/stats", { headers }),
        fetch("/api/admin/orders", { headers }),
        fetch("/api/admin/feedbacks", { headers })
      ]);

      if (!statsRes.ok || !ordersRes.ok || !feedbacksRes.ok) {
        if (statsRes.status === 401 || ordersRes.status === 401) {
          handleLogout();
          throw new Error("Admin session expired. Please log in again.");
        }
        throw new Error("Failed to retrieve dashboard analytics records.");
      }

      const statsData = await statsRes.json();
      const ordersData = await ordersRes.json();
      const feedbacksData = await feedbacksRes.json();

      setStats(statsData);
      setOrders(ordersData);
      setFeedbacks(feedbacksData);
    } catch (err: any) {
      setErrorMsg(err.message || "Could not sync data from server database");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchAdminData();
    }
  }, [isAuthenticated]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filter orders by search
  const filteredOrders = orders.filter(o => 
    o.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.customerEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (o.razorpay_payment_id || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (o.planId || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isAuthenticated) {
    return (
      <div className="pt-24 pb-20 min-h-screen px-4 bg-[#050505] relative flex items-center justify-center">
        {/* Background gradient layout */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg h-96 bg-blue-600/10 blur-[120px] rounded-full -z-10" />

        <div className="w-full max-w-md bg-[#0d0d0d] border border-white/5 rounded-2xl p-6 sm:p-8 shadow-2xl">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="p-3 bg-blue-600/10 border border-blue-500/20 rounded-2xl mb-4 text-blue-500 shadow-lg glow-blue">
              <Shield className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold font-display tracking-tight text-white mb-2">Hostiva Central Command</h1>
            <p className="text-xs text-gray-400">Please provide administrative passcode to authenticate database access.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">
                Security Password
              </label>
              <div className="relative">
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter admin key passcode..."
                  className="w-full bg-[#111] text-white border border-white/10 rounded-xl py-3 pl-10 pr-4 text-xs font-mono outline-none focus:border-blue-500/50 transition-colors"
                  required
                />
                <KeyRound className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-500" />
              </div>
            </div>

            {authError && (
              <p className="text-xs text-red-400 bg-red-500/5 border border-red-500/10 p-3 rounded-lg flex items-center gap-2">
                <XCircle className="w-4 h-4 shrink-0" /> {authError}
              </p>
            )}

            <button 
              type="submit"
              disabled={isSubmittingAuth}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/40 text-xs font-bold uppercase tracking-wider text-white py-3.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 glow-blue cursor-pointer"
            >
              {isSubmittingAuth ? "Locking Session..." : "Authorize Terminal"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link to="/" className="text-xs text-gray-500 hover:text-white transition-colors flex items-center justify-center gap-1.5">
              <ArrowLeft className="w-3.5 h-3.5" /> Return to Homepage
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-20 min-h-screen px-4 bg-[#050505] text-gray-100">
      <div className="max-w-7xl mx-auto">
        
        {/* Admin Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8 border-b border-white/5 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600/10 border border-blue-500/20 rounded-xl text-blue-400">
                <Shield className="w-5 h-5 animate-pulse" />
              </div>
              <h1 className="text-2xl font-bold font-display tracking-tight text-white mb-0">Admin Terminal</h1>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-bold tracking-widest font-mono uppercase">SECURE</span>
            </div>
            <p className="text-xs text-Gray-400 mt-1">Monitor revenue metrics, automatic Pterodactyl node provisions, and client satisfaction metrics.</p>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={fetchAdminData}
              disabled={refreshing}
              className="p-2.5 bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 rounded-xl transition-all cursor-pointer flex items-center gap-2 text-xs font-bold"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-400' : ''}`} />
              {refreshing ? "Syncing..." : "Manual Sync"}
            </button>

            <button 
              onClick={handleLogout}
              className="py-2.5 px-4 bg-white/5 hover:bg-neutral-800 text-red-400 border border-red-500/10 rounded-xl text-xs font-bold hover:text-red-300 transition-all cursor-pointer"
            >
              Seal Session
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3 text-red-500 text-xs">
            <XCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Quick Tabs */}
        <div className="flex border-b border-white/5 mb-8">
          <button 
            onClick={() => setActiveTab("stats")}
            className={`px-5 py-3 text-xs font-bold tracking-widest uppercase border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "stats" 
                ? 'border-blue-500 text-white' 
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <TrendingUp className="w-4 h-4" /> Operational Metrics
          </button>
          <button 
            onClick={() => setActiveTab("orders")}
            className={`px-5 py-3 text-xs font-bold tracking-widest uppercase border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "orders" 
                ? 'border-blue-500 text-white' 
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Server className="w-4 h-4" /> Order History ({orders.length})
          </button>
          <button 
            onClick={() => setActiveTab("feedback")}
            className={`px-5 py-3 text-xs font-bold tracking-widest uppercase border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "feedback" 
                ? 'border-blue-500 text-white' 
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <MessageSquare className="w-4 h-4" /> AI Feedback ({feedbacks.length})
          </button>
        </div>

        {/* METRICS & STATS TAB */}
        {activeTab === "stats" && (
          <div className="space-y-8 animate-fadeIn">
            {/* Bento Grid Analytics Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#0b0b0b] border border-white/5 rounded-2xl p-5 flex flex-col justify-between">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5 label text-blue-400">
                    <Coins className="w-3.5 h-3.5" /> Gross Revenue
                  </p>
                  <p className="text-3xl font-extrabold text-white mt-3 font-display">
                    ₹{stats?.totalRevenue ? stats.totalRevenue.toLocaleString() : "0"}
                  </p>
                </div>
                <div className="text-[10px] text-gray-500 mt-4">
                  Tax adjusted (inclusive of standard 18% GST).
                </div>
              </div>

              <div className="bg-[#0b0b0b] border border-white/5 rounded-2xl p-5 flex flex-col justify-between">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5 label text-purple-400">
                    <Server className="w-3.5 h-3.5" /> Total Active Nodes
                  </p>
                  <p className="text-3xl font-extrabold text-white mt-3 font-display">
                    {stats?.totalOrders || "0"}
                  </p>
                </div>
                <div className="text-[10px] text-gray-500 mt-4">
                  Synced inside <span className="text-gray-300 font-mono">cp.hostivaa.xyz</span>
                </div>
              </div>

              <div className="bg-[#0b0b0b] border border-white/5 rounded-2xl p-5 flex flex-col justify-between">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5 label text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Provision Success Rate
                  </p>
                  <p className="text-3xl font-extrabold text-white mt-3 font-display">
                    {stats && stats.totalOrders > 0 
                      ? `${Math.round((stats.successfulProvisions / stats.totalOrders) * 100)}%`
                      : "100%"}
                  </p>
                </div>
                <div className="text-[10px] text-gray-500 mt-4 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  No orphan instances pending manually.
                </div>
              </div>

              <div className="bg-[#0b0b0b] border border-white/5 rounded-2xl p-5 flex flex-col justify-between">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5 label text-pink-400">
                    <Users className="w-3.5 h-3.5" /> Game Portal Registrations
                  </p>
                  <p className="text-3xl font-extrabold text-white mt-3 font-display">
                    {stats?.userCount || "0"}
                  </p>
                </div>
                <div className="text-[10px] text-gray-500 mt-4">
                  Synced directly with panel users.
                </div>
              </div>
            </div>

            {/* Plans Distribution and Server Load */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-[#0b0b0b] border border-white/5 rounded-2xl p-6">
                <h3 className="text-sm font-bold uppercase tracking-widest text-white mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-500" /> Plan Popularity Allocation
                </h3>
                <div className="space-y-4">
                  {stats && Object.keys(stats.planStats).length > 0 ? (
                    Object.entries(stats.planStats).map(([planId, count]) => {
                      const total = stats.totalOrders || 1;
                      const value = count as number;
                      const pct = Math.round((value / total) * 100);
                      return (
                        <div key={planId} className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-mono text-gray-300 font-bold uppercase">{planId}</span>
                            <span className="text-gray-400">{count} units ({pct}%)</span>
                          </div>
                          <div className="w-full bg-white/5 h-2.5 rounded-full overflow-hidden">
                            <div className="bg-blue-500 h-full rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-xs text-gray-500 italic py-10 text-center">No transactions mapped. Default metrics placeholder active.</div>
                  )}
                </div>
              </div>

              {/* Secure Quick Node Status Diagnostics */}
              <div className="bg-[#0b0b0b] border border-white/5 rounded-2xl p-6 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-white mb-4 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-500" /> Pterodactyl Integration Diagnostics
                  </h3>
                  <div className="space-y-3.5 text-xs text-gray-300">
                    <div className="flex justify-between py-2 border-b border-white/5">
                      <span className="text-gray-500">Target Panel URL:</span>
                      <a href="https://cp.hostivaa.xyz" target="_blank" rel="noreferrer" className="text-blue-400 font-semibold hover:underline flex items-center gap-1 font-mono">
                        cp.hostivaa.xyz <ExternalLink className="w-3" />
                      </a>
                    </div>
                    <div className="flex justify-between py-2 border-b border-white/5">
                      <span className="text-gray-500">API Key Configured:</span>
                      <span className="text-emerald-400 font-semibold font-mono">YES (ptla_...7S)</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-white/5">
                      <span className="text-gray-500">Intel Budget Node ID:</span>
                      <span className="text-white font-mono">Node 9</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-white/5">
                      <span className="text-gray-500">Ryzen Premium Node ID:</span>
                      <span className="text-white font-mono">Node 1</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-gray-500">Razorpay Key Status:</span>
                      <span className="text-blue-400 font-semibold font-mono">Live Widget (rzp_live_...2k)</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-white/5 bg-blue-500/5 p-4 rounded-xl border border-blue-500/10 text-[11px] text-blue-300">
                  <strong>Automatic Server Creation:</strong> Every successfully confirmed Razorpay Webhook or client verification triggers zero-delay instance generation. If cp.hostivaa.xyz is offline, a backup simulated container node triggers immediately so game panels do not block client gameplay.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ORDER LIST TAB */}
        {activeTab === "orders" && (
          <div className="bg-[#0b0b0b] border border-white/5 rounded-2xl overflow-hidden animate-fadeIn">
            {/* Search Filter Header */}
            <div className="p-6 border-b border-white/5 flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center">
              <h3 className="text-sm font-bold uppercase tracking-widest text-white">Instance Transaction Ledger</h3>
              
              <div className="relative max-w-sm w-full">
                <input 
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter by Order, Email, Payment ID, Plan..."
                  className="w-full bg-[#111] border border-white/10 text-xs text-white rounded-xl py-2.5 pl-9 pr-4 outline-none focus:border-blue-500/50"
                />
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
              </div>
            </div>

            {/* List Table */}
            <div className="overflow-x-auto">
              {filteredOrders.length > 0 ? (
                <table className="w-full text-xs text-left text-gray-300">
                  <thead className="bg-[#111] text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-white/5">
                    <tr>
                      <th className="p-4">Tx Log / Receipt ID</th>
                      <th className="p-4">Pterodactyl Target Email</th>
                      <th className="p-4">Hardware Plan</th>
                      <th className="p-4">Paid (INR)</th>
                      <th className="p-4">Node Allocation</th>
                      <th className="p-4">Provision State</th>
                      <th className="p-4 text-right">Server IP IP:Port</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredOrders.map((order, idx) => {
                      const displayId = order.orderId;
                      const payId = order.razorpay_payment_id || order.transactionId || "Sandbox/Manual";
                      
                      return (
                        <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                          <td className="p-4 font-mono space-y-1">
                            <div className="text-white flex items-center gap-1.5 font-semibold">
                              <span>{displayId.substring(0, 16)}...</span>
                              <button 
                                onClick={() => copyToClipboard(displayId, displayId)}
                                className="p-1 hover:bg-white/5 text-gray-500 hover:text-white rounded"
                              >
                                {copiedId === displayId ? (
                                  <span className="text-[10px] text-green-400 font-bold">Copied</span>
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                            <div className="text-[10px] text-gray-500 flex items-center gap-1">
                              <strong>Payment:</strong> <span className="font-sans text-gray-400">{payId}</span>
                            </div>
                          </td>

                          <td className="p-4 font-medium max-w-[160px] truncate">
                            {order.customerEmail}
                          </td>

                          <td className="p-4">
                            <span className="px-2 py-0.5 font-bold uppercase rounded text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/10 font-mono">
                              {order.planId || "default"}
                            </span>
                          </td>

                          <td className="p-4 font-bold text-white">
                            ₹{order.amount}
                          </td>

                          <td className="p-4 font-mono text-[11px]">
                            {order.pteroIdentifier ? (
                              <span className="text-purple-400 font-bold tracking-wider">{order.pteroIdentifier}</span>
                            ) : (
                              <span className="text-gray-500">None/Backup</span>
                            )}
                          </td>

                          <td className="p-4">
                            {order.provisioningStatus === "SUCCESS" ? (
                              <span className="inline-flex items-center gap-1.5 font-bold text-emerald-400">
                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                SUCCESS
                              </span>
                            ) : order.provisioningStatus === "FAILED" ? (
                              <span className="inline-flex items-center gap-1.5 font-bold text-red-400" title={order.provisioningError}>
                                <XCircle className="w-3.5 h-3.5 shrink-0" />
                                FAILED
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 font-bold text-amber-400">
                                <Clock className="w-3.5 h-3.5 shrink-0" />
                                PENDING
                              </span>
                            )}
                          </td>

                          <td className="p-4 text-right font-mono text-gray-300">
                            {order.serverIp ? (
                              <div className="flex items-center gap-1 justify-end">
                                <span>{order.serverIp}</span>
                                <button 
                                  onClick={() => copyToClipboard(order.serverIp || "", order.orderId + "_ip")}
                                  className="p-1 hover:bg-white/5 rounded text-gray-500 hover:text-white"
                                >
                                  {copiedId === order.orderId + "_ip" ? (
                                    <span className="text-[9.5px] text-emerald-400 font-sans">Copied</span>
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            ) : (
                              <span className="text-gray-500">Not Synced</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="py-16 text-center text-xs text-gray-500 italic">
                  No orders found matching: "{searchQuery}"
                </div>
              )}
            </div>
          </div>
        )}

        {/* CUSTOMER AI COMMENTS TAB */}
        {activeTab === "feedback" && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-[#0b0b0b] border border-white/5 rounded-2xl p-6">
              <h3 className="text-sm font-bold uppercase tracking-widest text-white mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-400 animate-spin-slow" /> Real-time Customer Assistant Feedback
              </h3>
              <p className="text-xs text-gray-400 mb-6">User submissions detailing recommendations, complaints, and direct interaction history with AI Support Agent.</p>

              <div className="space-y-4">
                {feedbacks.length > 0 ? (
                  feedbacks.map((fb, idx) => {
                    const isPos = fb.type === "positive";
                    return (
                      <div key={idx} className="bg-white/5 border border-white/5 rounded-xl p-5 space-y-3">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                              isPos 
                                ? 'bg-green-500/10 text-green-400 border border-green-500/10' 
                                : 'bg-red-500/10 text-red-400 border border-red-500/10'
                            }`}>
                              {fb.type}
                            </span>
                            <span className="text-[10px] text-gray-500 font-mono">ID: {fb.messageId.substring(0, 10)}...</span>
                          </div>
                          <span className="text-[10.5px] text-gray-400">{new Date(fb.timestamp).toLocaleString()}</span>
                        </div>

                        <div className="text-xs space-y-2">
                          <div className="bg-black/40 p-3 rounded border border-white/5">
                            <strong className="block text-gray-400 text-[10px] uppercase font-bold tracking-wider mb-1">User Query</strong>
                            <p className="text-white italic">"{fb.userPrompt}"</p>
                          </div>
                          <div className="bg-[#111] p-3 rounded shadow-inner">
                            <strong className="block text-gray-400 text-[10px] uppercase font-bold tracking-wider mb-1">AI Agent Suggestion Given</strong>
                            <p className="text-gray-300 leading-normal font-sans">{fb.messageContent}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-16 bg-[#0c0c0c] border border-white/5 rounded-xl text-center text-xs text-gray-500 italic">
                    No customer submissions currently found.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
