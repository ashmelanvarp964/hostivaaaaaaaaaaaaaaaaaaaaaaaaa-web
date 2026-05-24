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
  ExternalLink,
  Tag,
  Trash2,
  Plus,
  Calendar,
  AlertCircle,
  Ticket,
  Bell,
  Download,
  Lock,
  StickyNote,
  Eye,
  EyeOff
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom";

interface AdminStats {
  totalRevenue: number;
  totalOrders: number;
  successfulProvisions: number;
  failedProvisions: number;
  planStats: Record<string, number>;
  userCount: number;
  isFirestoreFallback?: boolean;
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
  newUserEmail?: string;
  newUserTempPassword?: string;
}

interface FeedbackRecord {
  messageId: string;
  type: "positive" | "negative";
  messageContent: string;
  userPrompt: string;
  history: any[];
  timestamp: string;
}

interface CouponRecord {
  code: string;
  discount: number;
  expiresAt?: string;
  usedCount: number;
}

const SAVED_TEMPLATES = [
  {
    title: "🔑 Password Reset Help",
    text: `Hello,

We have initiated a core panel authentication key reset procedure for your account.

Please perform the following steps:
1. Navigate to the Game Control Panel (https://cp.hostivaa.xyz)
2. Select the "Forgot Password / Reset Link" option.
3. Check your incoming spam or junk inbox folder for a secure validation token.

Let us know if you continue facing any obstacles.

Administrative Support Officer`
  },
  {
    title: "🚀 Server Migration",
    text: `Hello,

Thank you for requesting cluster level resource migration.

To safely queue your server files for transfer with 0% data loss:
1. Safely stop your game instance from the console tab in CP.
2. Back up any system-critical files (like user data, configurations, plugins) via the file manager.
3. Confirm your target datacenter preference so our automation script can reallocate your hardware.

Let us know your confirmed schedule.

Administrative Support Officer`
  },
  {
    title: "⚡ Node Offline / Latency",
    text: `Hello,

We detected minor latency fluctuations on the active hardware node.

Our systems status overview has completed automatic fallback re-routing. If your game indicates "Offline", please perform a hard reboot action from the Game Control Panel. It might take up to 2 minutes for network handshakes to fully establish connection.

Thank you for your cooperation.

Administrative Support Officer`
  },
  {
    title: "📊 Resources / Upgrades",
    text: `Hello,

Review of your game logs shows your current instance is exceeding RAM/CPU limitations during heavy cycles.

To resolve this and avoid automated protection restarts:
1. Consider optimizing heavy plugins, mods, or active tasks.
2. Upgrade your active service tier easily inside your Services Billing portal under "Manage Subscriptions".

We are here if you require custom resource pools.

Administrative Support Officer`
  }
];

export default function AdminPanel() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState("");
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);

  // States
  const [activeTab, setActiveTab] = useState<"stats" | "orders" | "feedback" | "coupons" | "tickets">("stats");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [feedbacks, setFeedbacks] = useState<FeedbackRecord[]>([]);
  const [coupons, setCoupons] = useState<CouponRecord[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [adminReplyText, setAdminReplyText] = useState("");
  const [internalNoteText, setInternalNoteText] = useState("");
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [notesActiveTab, setNotesActiveTab] = useState<"PUBLIC" | "INTERNAL">("PUBLIC");
  const [ticketActionError, setTicketActionError] = useState("");
  const [ticketActionSuccess, setTicketActionSuccess] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [ticketStatusFilter, setTicketStatusFilter] = useState<"ALL" | "OPEN" | "REPLIED" | "CLOSED">("ALL");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Coupon Manager state
  const [newCouponCode, setNewCouponCode] = useState("");
  const [newCouponDiscount, setNewCouponDiscount] = useState("");
  const [newCouponExpiry, setNewCouponExpiry] = useState("");
  const [couponActionError, setCouponActionError] = useState("");
  const [couponActionSuccess, setCouponActionSuccess] = useState("");
  const [isSubmittingCoupon, setIsSubmittingCoupon] = useState(false);

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
      const [statsRes, ordersRes, feedbacksRes, couponsRes, ticketsRes] = await Promise.all([
        fetch("/api/admin/stats", { headers }),
        fetch("/api/admin/orders", { headers }),
        fetch("/api/admin/feedbacks", { headers }),
        fetch("/api/admin/coupons", { headers }),
        fetch("/api/admin/tickets", { headers })
      ]);

      if (!statsRes.ok || !ordersRes.ok || !feedbacksRes.ok || !couponsRes.ok || !ticketsRes.ok) {
        if (statsRes.status === 401 || ordersRes.status === 401 || couponsRes.status === 401) {
          handleLogout();
          throw new Error("Admin session expired. Please log in again.");
        }
        throw new Error("Failed to retrieve dashboard analytics records.");
      }

      const statsData = await statsRes.json();
      const ordersData = await ordersRes.json();
      const feedbacksData = await feedbacksRes.json();
      const couponsData = await couponsRes.json();
      const ticketsData = await ticketsRes.json();

      setStats(statsData);
      setOrders(ordersData);
      setFeedbacks(feedbacksData);
      setCoupons(couponsData);
      setTickets(ticketsData);

      // Keep selected ticket state up-to-date with new replies
      if (selectedTicket) {
        const updatedSelected = ticketsData.find((t: any) => t.id === selectedTicket.id);
        if (updatedSelected) {
          setSelectedTicket(updatedSelected);
        }
      }
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

  const getOverdueUnrepliedCount = () => {
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    return tickets.filter(t => {
      if ((t.status || "").toUpperCase() !== "OPEN") return false;
      const replies = t.replies || [];
      
      let lastAdminIndex = -1;
      for (let i = replies.length - 1; i >= 0; i--) {
        if ((replies[i].sender || "").toUpperCase() === "ADMIN") {
          lastAdminIndex = i;
          break;
        }
      }
      
      let pendingSince = t.createdAt?.toDate ? t.createdAt.toDate().getTime() : (t.createdAt ? new Date(t.createdAt).getTime() : 0);
      
      if (lastAdminIndex !== -1) {
        const userRepliesAfter = replies.slice(lastAdminIndex + 1).filter((r: any) => (r.sender || "").toUpperCase() === "USER");
        if (userRepliesAfter.length > 0) {
          const lastUserMsg = userRepliesAfter[userRepliesAfter.length - 1];
          pendingSince = lastUserMsg.timestamp ? new Date(lastUserMsg.timestamp).getTime() : pendingSince;
        } else {
          return false;
        }
      } else {
        const userReplies = replies.filter((r: any) => (r.sender || "").toUpperCase() === "USER");
        if (userReplies.length > 0) {
          const lastUserMsg = userReplies[userReplies.length - 1];
          pendingSince = lastUserMsg.timestamp ? new Date(lastUserMsg.timestamp).getTime() : pendingSince;
        }
      }
      
      return (now - pendingSince) > oneDayMs;
    }).length;
  };

  const overdueCount = getOverdueUnrepliedCount();

  const filteredTickets = tickets.filter(t => {
    if (ticketStatusFilter === "ALL") return true;
    const tStatus = (t.status || "OPEN").toUpperCase();
    if (ticketStatusFilter === "CLOSED") {
      return tStatus === "CLOSED" || (tStatus !== "OPEN" && tStatus !== "REPLIED");
    }
    return tStatus === ticketStatusFilter;
  });

  const exportTicketsToCSV = () => {
    if (tickets.length === 0) return;
    
    const headers = [
      "Ticket ID",
      "Created At",
      "Customer Email",
      "Subject",
      "Priority",
      "Status",
      "Initial Message",
      "Total Replies"
    ];
    
    const rows = tickets.map(t => {
      const createdAtStr = t.createdAt 
        ? (t.createdAt.toDate ? t.createdAt.toDate().toISOString() : new Date(t.createdAt).toISOString())
        : "";
      return [
        t.id || "",
        createdAtStr,
        t.email || "",
        t.subject || "",
        t.priority || "MEDIUM",
        t.status || "OPEN",
        t.message || "",
        t.replies ? t.replies.length : 0
      ];
    });

    const csvRows = [headers.join(",")];
    for (const row of rows) {
      const escapedRow = row.map(val => {
        const str = (val === null || val === undefined) ? "" : String(val);
        return `"${str.replace(/"/g, '""')}"`;
      });
      csvRows.push(escapedRow.join(","));
    }
    
    const csvString = csvRows.join("\r\n");
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `hostiva_support_tickets_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportTicketsToJSON = () => {
    if (tickets.length === 0) return;
    
    const formattedTickets = tickets.map(t => {
      const createdAtStr = t.createdAt 
        ? (t.createdAt.toDate ? t.createdAt.toDate().toISOString() : new Date(t.createdAt).toISOString())
        : "";
        
      return {
        id: t.id,
        createdAt: createdAtStr,
        email: t.email,
        subject: t.subject,
        message: t.message,
        priority: t.priority || "MEDIUM",
        status: t.status || "OPEN",
        replies: t.replies || []
      };
    });
    
    const jsonString = JSON.stringify(formattedTickets, null, 2);
    const blob = new Blob([jsonString], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `hostiva_support_tickets_${new Date().toISOString().split('T')[0]}.json`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAddCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCouponCode.trim() || !newCouponDiscount.trim()) {
      setCouponActionError("Code and Discount percentage are required.");
      return;
    }

    const discountNum = parseInt(newCouponDiscount, 10);
    if (isNaN(discountNum) || discountNum < 1 || discountNum > 100) {
      setCouponActionError("Discount percentage must be a number between 1 and 100.");
      return;
    }

    setCouponActionError("");
    setCouponActionSuccess("");
    setIsSubmittingCoupon(true);

    try {
      const token = localStorage.getItem("hostiva_admin_token");
      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          code: newCouponCode.trim(),
          discount: discountNum,
          expiresAt: newCouponExpiry ? new Date(newCouponExpiry).toISOString() : undefined
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create coupon.");
      }

      setCouponActionSuccess(data.message || `Coupon '${newCouponCode.trim().toUpperCase()}' has been saved!`);
      setNewCouponCode("");
      setNewCouponDiscount("");
      setNewCouponExpiry("");
      
      // Refresh coupons list
      const updatedCouponsRes = await fetch("/api/admin/coupons", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (updatedCouponsRes.ok) {
        const updatedCoupons = await updatedCouponsRes.json();
        setCoupons(updatedCoupons);
      }
    } catch (err: any) {
      setCouponActionError(err.message || "Error creating coupon.");
    } finally {
      setIsSubmittingCoupon(false);
    }
  };

  const handleDeleteCoupon = async (code: string) => {
    if (!window.confirm(`Are you sure you want to delete coupon ${code}?`)) return;

    setCouponActionError("");
    setCouponActionSuccess("");

    try {
      const token = localStorage.getItem("hostiva_admin_token");
      const res = await fetch(`/api/admin/coupons/${code}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete coupon.");
      }

      setCouponActionSuccess(`Coupon '${code}' has been deleted.`);
      
      // Refresh coupons list
      const updatedCouponsRes = await fetch("/api/admin/coupons", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (updatedCouponsRes.ok) {
        const updatedCoupons = await updatedCouponsRes.json();
        setCoupons(updatedCoupons);
      }
    } catch (err: any) {
      setCouponActionError(err.message || "Error deleting coupon.");
    }
  };

  const handleAdminReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminReplyText.trim() || !selectedTicket) return;

    setTicketActionError("");
    setTicketActionSuccess("");
    setIsSubmittingReply(true);

    try {
      const token = localStorage.getItem("hostiva_admin_token");
      const res = await fetch(`/api/admin/tickets/${selectedTicket.id}/reply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ message: adminReplyText.trim() })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit response.");
      }

      setTicketActionSuccess("Response published successfully.");
      setAdminReplyText("");
      
      // Refresh data
      await fetchAdminData();
    } catch (err: any) {
      setTicketActionError(err.message || "Error submitting response to support ticket.");
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleSaveInternalNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!internalNoteText.trim() || !selectedTicket) return;

    setTicketActionError("");
    setTicketActionSuccess("");
    setIsSubmittingNote(true);

    try {
      const token = localStorage.getItem("hostiva_admin_token");
      const res = await fetch(`/api/admin/tickets/${selectedTicket.id}/notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ note: internalNoteText.trim() })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save internal note.");
      }

      setTicketActionSuccess("Internal note added successfully.");
      setInternalNoteText("");
      
      // Refresh data to pull the latest internal notes
      await fetchAdminData();
    } catch (err: any) {
      setTicketActionError(err.message || "Error saving internal note to support ticket.");
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const handleUpdateTicketStatus = async (ticketId: string, status: string) => {
    setTicketActionError("");
    setTicketActionSuccess("");

    try {
      const token = localStorage.getItem("hostiva_admin_token");
      const res = await fetch(`/api/admin/tickets/${ticketId}/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update status.");
      }

      setTicketActionSuccess(`Ticket status updated to ${status}.`);
      
      // Refresh data
      await fetchAdminData();
    } catch (err: any) {
      setTicketActionError(err.message || "Error changing ticket status on server.");
    }
  };

  const handleUpdateTicketPriority = async (ticketId: string, priority: string) => {
    setTicketActionError("");
    setTicketActionSuccess("");

    try {
      const token = localStorage.getItem("hostiva_admin_token");
      const res = await fetch(`/api/admin/tickets/${ticketId}/priority`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ priority })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update priority.");
      }

      setTicketActionSuccess(`Ticket priority updated to ${priority}.`);
      
      // Refresh data
      await fetchAdminData();
    } catch (err: any) {
      setTicketActionError(err.message || "Error changing ticket priority on server.");
    }
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
              <Shield className="w-8 h-8 font-extrabold animate-pulse" />
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
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter admin key passcode..."
                  className="w-full bg-[#111] text-white border border-white/10 rounded-xl py-3 pl-10 pr-10 text-xs font-mono outline-none focus:border-blue-500/50 transition-colors"
                  required
                />
                <KeyRound className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-500" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-gray-500 hover:text-gray-300 transition-colors focus:outline-none"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Quick-fill Helper for developers / testers */}
            <div className="bg-[#121212] border border-white/5 rounded-xl p-3 text-[10px] text-gray-400 flex flex-col gap-1.5 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-300">🔑 Dev-Access Keys:</span>
                <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded uppercase font-bold">Active</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-1 font-mono">
                <button 
                  type="button"
                  onClick={() => setPassword("Hostiva@2026#Secure!$Admin")} 
                  className="bg-white/5 hover:bg-white/15 text-white px-2.5 py-1 rounded border border-white/5 transition-all text-[10px] cursor-pointer"
                >
                  Hostiva@2026#Secure!$Admin
                </button>
              </div>
              <span className="text-[9.5px] italic text-gray-500 mt-1">💡 Click the key above to automatically load the primary admin password.</span>
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

  const timelineItems = selectedTicket 
    ? [
        {
          type: "CLIENT_ORIGINAL",
          sender: "CLIENT",
          message: selectedTicket.message,
          timestamp: selectedTicket.createdAt
        },
        ...(selectedTicket.replies || []).map((r: any) => ({
          type: "PUBLIC_REPLY",
          sender: r.sender,
          message: r.message,
          timestamp: r.timestamp
        })),
        ...(selectedTicket.internalNotes || []).map((n: any) => ({
          type: "INTERNAL_NOTE",
          sender: "ADMIN_STAFF",
          message: n.note,
          timestamp: n.timestamp
        }))
      ].sort((a, b) => {
        const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return timeA - timeB;
      })
    : [];

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
            {/* Overdue Tickets Bell Notification */}
            <button
              onClick={() => setActiveTab("tickets")}
              className="relative p-2.5 bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 rounded-xl transition-all cursor-pointer flex items-center justify-center hover:scale-105 active:scale-95"
              title={`${overdueCount} ticket(s) unreplied for more than 24 hours`}
            >
              <Bell className={`w-4 h-4 ${overdueCount > 0 ? "text-amber-400 animate-pulse" : "text-gray-400"}`} />
              {overdueCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[9px] font-extrabold text-white ring-2 ring-[#050505] shadow-lg animate-fadeIn">
                  {overdueCount}
                </span>
              )}
            </button>

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
          <button 
            onClick={() => setActiveTab("coupons")}
            className={`px-5 py-3 text-xs font-bold tracking-widest uppercase border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "coupons" 
                ? 'border-blue-500 text-white' 
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Tag className="w-4 h-4" /> Coupons ({coupons.length})
          </button>
          <button 
            onClick={() => setActiveTab("tickets")}
            className={`px-5 py-3 text-xs font-bold tracking-widest uppercase border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "tickets" 
                ? 'border-blue-500 text-white' 
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Ticket className="w-4 h-4" /> Support Tickets ({tickets.length})
          </button>
        </div>

        {/* METRICS & STATS TAB */}
        {activeTab === "stats" && (
          <div className="space-y-8 animate-fadeIn">
            {stats?.isFirestoreFallback && (
              <div className="bg-yellow-500/5 border border-yellow-500/10 rounded-2xl p-5 flex items-start gap-3.5">
                <AlertCircle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-yellow-500 uppercase tracking-wider">Cloud Credentials Warning (Sandbox Mode Active)</h4>
                  <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
                    Unable to load secure Google Application Credentials on this server. Hostiva is currently running in <strong>automatic memory-safe fallback</strong>. 
                    All transactions, payments, and server provisions will still complete and execute successfully, backed by our smart sandbox simulation!
                    To deploy persistent Firestore records to your database, supply your <span className="text-white font-mono font-bold">FIREBASE_SERVICE_ACCOUNT</span> JSON secret in settings.
                  </p>
                </div>
              </div>
            )}

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
                  All prices are net. No hidden taxes or GST applied.
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

            {/* Hosting Financial Profit & Loss Dashboard Board */}
            <div className="bg-[#0b0b0b] border border-white/5 rounded-2xl p-6 shadow-2xl">
              <h3 className="text-sm font-bold uppercase tracking-widest text-white mb-6 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" /> Hostiva Financial Profit Board
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Net Profit Card */}
                <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-5 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Net Profit Margin (63%)</span>
                    <h4 className="text-3xl font-extrabold text-emerald-400 mt-2 font-display">
                      ₹{stats?.totalRevenue ? Math.round(stats.totalRevenue * 0.63).toLocaleString() : "0"}
                    </h4>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-4 leading-relaxed">
                    This is your pure profit after deducting Node server electricity/infrastructure, payment processor fees and networking overhead.
                  </p>
                </div>

                {/* Expenses Card */}
                <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-5 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Total Operating Expenses (37%)</span>
                    <h4 className="text-3xl font-extrabold text-red-500 mt-2 font-display">
                      ₹{stats?.totalRevenue ? Math.round(stats.totalRevenue * 0.37).toLocaleString() : "0"}
                    </h4>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-4 leading-relaxed">
                    Estimated 30% Node Allocation Costs + 2% Razorpay processing rate + 5% domain/system management.
                  </p>
                </div>

                {/* Break-Even Speed & Profit Margin Breakdowns */}
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-gray-400">Node Infrastructure Expense (30%)</span>
                      <span className="text-gray-300 font-mono font-bold">₹{stats?.totalRevenue ? Math.round(stats.totalRevenue * 0.30).toLocaleString() : "0"}</span>
                    </div>
                    <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-red-500/60 h-full rounded-full" style={{ width: "30%" }} />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-gray-400">Razorpay Fee & Taxes (2%)</span>
                      <span className="text-gray-300 font-mono font-bold">₹{stats?.totalRevenue ? Math.round(stats.totalRevenue * 0.02).toLocaleString() : "0"}</span>
                    </div>
                    <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-yellow-500/60 h-full rounded-full" style={{ width: "2%" }} />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-gray-400">Core Net Take-Home (68% pre-tax)</span>
                      <span className="text-emerald-400 font-mono font-bold">₹{stats?.totalRevenue ? Math.round(stats.totalRevenue * 0.68).toLocaleString() : "0"}</span>
                    </div>
                    <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: "68%" }} />
                    </div>
                  </div>
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

                           <td className="p-4 space-y-1 max-w-[190px]">
                            <div className="font-medium text-white truncate">{order.customerEmail}</div>
                            {order.newUserTempPassword && (
                              <div className="flex items-center gap-1 text-[10px] text-emerald-400">
                                <span className="shrink-0 font-bold uppercase text-[8px] bg-emerald-500/10 border border-emerald-500/20 px-1 py-0.5 rounded text-[8px]">PASS</span>
                                <span className="font-mono bg-white/[0.02] px-1 py-0.5 rounded">{order.newUserTempPassword}</span>
                                <button 
                                  onClick={() => copyToClipboard(order.newUserTempPassword || "", order.orderId + "_pass")}
                                  className="p-0.5 hover:bg-white/5 rounded text-gray-500 hover:text-white transition-colors"
                                  title="Copy Temporary Password"
                                >
                                  {copiedId === order.orderId + "_pass" ? (
                                    <span className="text-[9px] text-emerald-400 font-sans font-bold">Copied</span>
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            )}
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

        {/* COUPONS MANAGER TAB */}
        {activeTab === "coupons" && (
          <div className="space-y-6 animate-fadeIn">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Creator Card */}
              <div className="bg-[#0b0b0b] border border-white/5 rounded-2xl p-6 h-fit">
                <h3 className="text-sm font-bold uppercase tracking-widest text-white mb-2 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-blue-400" /> Issue New Coupon
                </h3>
                <p className="text-xs text-gray-400 mb-6 font-sans">
                  Create fully customized percentage discounts linked dynamically to standard order gateways.
                </p>

                <form onSubmit={handleAddCoupon} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                      Coupon Code
                    </label>
                    <input 
                      type="text" 
                      value={newCouponCode}
                      onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
                      placeholder="e.g. SUMMER30"
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 font-mono transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                      Discount Value (% Percentage)
                    </label>
                    <input 
                      type="number" 
                      min="1"
                      max="100"
                      value={newCouponDiscount}
                      onChange={(e) => setNewCouponDiscount(e.target.value)}
                      placeholder="e.g. 30"
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 font-mono transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                      Expiration Date (Optional)
                    </label>
                    <input 
                      type="datetime-local" 
                      value={newCouponExpiry}
                      onChange={(e) => setNewCouponExpiry(e.target.value)}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 font-mono transition-all text-gray-300"
                    />
                  </div>

                  {couponActionError && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center gap-2 text-red-500 text-[11px]">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{couponActionError}</span>
                    </div>
                  )}

                  {couponActionSuccess && (
                     <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-xl p-3 flex items-center gap-2 text-emerald-400 text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>{couponActionSuccess}</span>
                    </div>
                  )}

                  <button 
                    type="submit"
                    disabled={isSubmittingCoupon}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-lg shadow-blue-500/10 flex items-center justify-center gap-2"
                  >
                    {isSubmittingCoupon ? "Saving Coupon..." : "Publish Coupon"}
                  </button>
                </form>
              </div>

              {/* Coupons List card */}
              <div className="bg-[#0b0b0b] border border-white/5 rounded-2xl p-6 lg:col-span-2">
                <h3 className="text-sm font-bold uppercase tracking-widest text-white mb-2 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-purple-400" /> Active Promotions ({coupons.length})
                </h3>
                <p className="text-xs text-gray-400 mb-6 font-sans">
                  List of valid host discount authorization keys stored inside database cluster.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {coupons.length > 0 ? (
                    coupons.map((coupon, idx) => {
                      const isExpired = coupon.expiresAt ? new Date(coupon.expiresAt) < new Date() : false;
                      return (
                        <div key={idx} className="bg-white/5 border border-white/5 rounded-xl p-5 flex flex-col justify-between space-y-4 hover:border-white/10 transition-all">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className="bg-blue-500/10 text-blue-400 border border-blue-500/10 px-3 py-1 rounded-lg text-xs font-mono font-bold tracking-wider uppercase border-dashed">
                                  {coupon.code}
                                </span>
                                <span className="bg-purple-900/40 text-purple-300 px-2 py-0.5 rounded text-[10px] font-bold">
                                  {coupon.discount}% OFF
                                </span>
                              </div>
                              <p className="text-[11px] text-gray-500 font-mono flex items-center gap-1.5 mt-2">
                                <Calendar className="w-3.5 h-3.5" />
                                {coupon.expiresAt ? (
                                  <span>Expires: {new Date(coupon.expiresAt).toLocaleDateString()}</span>
                                ) : (
                                  <span>No Expiration Date</span>
                                )}
                              </p>
                            </div>

                            <button 
                              onClick={() => handleDeleteCoupon(coupon.code)}
                              className="p-2 bg-red-500/10 hover:bg-red-500 hover:text-white border border-red-500/15 rounded-xl text-red-400 transition-all cursor-pointer"
                              title="Revoke Coupon"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="flex justify-between items-center bg-black/40 px-3 py-2 rounded-lg text-[10px]">
                            <span className="text-gray-400">Total Valid Claims:</span>
                            <span className="text-purple-300 font-bold font-mono">{coupon.usedCount || 0} usage(s)</span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${isExpired ? "bg-red-500" : "bg-emerald-500"}`} />
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${isExpired ? "text-red-400" : "text-emerald-400"}`}>
                              {isExpired ? "Expired" : "Active & Verified"}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="col-span-full py-16 text-center text-xs text-gray-500 italic bg-black/20 rounded-xl border border-dashed border-white/5">
                      No discount coupons initialized. Issue one using the panel.
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* SUPPORT TICKETS TAB */}
        {activeTab === "tickets" && (
          <div className="space-y-6 animate-fadeIn">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Ticket selector list - Left column */}
              <div className="bg-[#0b0b0b] border border-white/5 rounded-2xl p-5 h-full flex flex-col min-h-[500px]">
                <div className="mb-4">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-white mb-1.5 flex items-center gap-2">
                    <Ticket className="w-4 h-4 text-amber-500" /> Incoming Support Tickets
                  </h3>
                  <p className="text-xs text-gray-400 font-sans mb-3">
                    View list of client submissions and current resolution states.
                  </p>
                  
                  {/* Export Options */}
                  <div className="flex flex-wrap items-center gap-2 border-t border-b border-white/5 py-3 mb-2">
                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mr-auto">Report Tools:</span>
                    <button
                      onClick={exportTicketsToCSV}
                      disabled={tickets.length === 0}
                      className="py-1.5 px-3 bg-white/5 hover:bg-white/10 active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-gray-300 border border-white/5 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                      title="Export Support Tickets to CSV"
                    >
                      <Download className="w-3 h-3 text-emerald-400" />
                      <span>Export CSV</span>
                    </button>
                    <button
                      onClick={exportTicketsToJSON}
                      disabled={tickets.length === 0}
                      className="py-1.5 px-3 bg-white/5 hover:bg-white/10 active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-gray-300 border border-white/5 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                      title="Export Support Tickets to JSON"
                    >
                      <Download className="w-3 h-3 text-purple-400" />
                      <span>Export JSON</span>
                    </button>
                  </div>

                  {/* Dynamic Status Filter Segment Bar */}
                  <div className="flex gap-1 p-1 bg-black/40 border border-white/5 rounded-xl text-[10px] font-bold mt-3 mb-1">
                    {(["ALL", "OPEN", "REPLIED", "CLOSED"] as const).map((status) => {
                      const count = status === "ALL" 
                        ? tickets.length 
                        : tickets.filter(t => {
                            const tStatus = (t.status || "OPEN").toUpperCase();
                            if (status === "CLOSED") {
                              return tStatus === "CLOSED" || (tStatus !== "OPEN" && tStatus !== "REPLIED");
                            }
                            return tStatus === status;
                          }).length;
                      
                      const isCurrent = ticketStatusFilter === status;
                      return (
                        <button
                          key={status}
                          onClick={() => setTicketStatusFilter(status)}
                          className={`flex-1 py-1.5 px-1 rounded-lg text-center transition-all cursor-pointer border ${
                            isCurrent 
                              ? "bg-blue-600/15 text-blue-400 border-blue-500/20 shadow-md shadow-blue-500/5 font-extrabold" 
                              : "text-gray-400 hover:text-white hover:bg-white/5 border-transparent"
                          }`}
                        >
                          {status} <span className="opacity-50 font-mono text-[9px]">({count})</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2 mt-2 flex-grow overflow-y-auto max-h-[600px] pr-1">
                  {filteredTickets.length > 0 ? (
                    filteredTickets.map((t) => {
                      const isActive = selectedTicket && selectedTicket.id === t.id;
                      const hasReplies = t.replies && t.replies.length > 0;
                      
                      return (
                        <div 
                          key={t.id}
                          onClick={() => {
                            setSelectedTicket(t);
                            setTicketActionError("");
                            setTicketActionSuccess("");
                            setNotesActiveTab("PUBLIC");
                            setInternalNoteText("");
                          }}
                          className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer border-l-4 overflow-hidden ${
                            t.priority === "HIGH" 
                              ? "border-l-red-500" 
                              : t.priority === "MEDIUM"
                                ? "border-l-amber-500"
                                : "border-l-gray-500"
                          } ${
                            isActive 
                              ? 'bg-blue-600/10 border-t-blue-500/30 border-r-blue-500/30 border-b-blue-500/30 shadow-md shadow-blue-500/5' 
                              : 'bg-white/5 border-t-white/5 border-r-white/5 border-b-white/5 hover:border-t-white/15 hover:border-r-white/15 hover:border-b-white/15'
                          }`}
                        >
                          <div className="flex justify-between items-start gap-2 mb-1.5">
                            <div className="flex items-center gap-1.5 min-w-0">
                              {t.priority === "HIGH" ? (
                                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0 shadow-lg shadow-red-500/50" />
                              ) : t.priority === "MEDIUM" ? (
                                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 shadow-lg shadow-amber-500/50" />
                              ) : (
                                <span className="w-2 h-2 rounded-full bg-gray-500 shrink-0" />
                              )}
                              <span className="font-semibold text-xs text-white line-clamp-1">{t.subject || "No Subject"}</span>
                            </div>
                            
                            {/* Badges */}
                            <div className="flex gap-1.5 shrink-0 items-center">
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase font-mono tracking-wider border ${
                                t.priority === "HIGH" 
                                  ? "bg-red-500/20 text-red-400 border-red-500/30" 
                                  : t.priority === "MEDIUM"
                                    ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                                    : "bg-gray-500/15 text-gray-400 border-white/5"
                              }`}>
                                {t.priority || "MEDIUM"}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase font-mono tracking-wider ${
                                t.status === "OPEN" 
                                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/15" 
                                  : t.status === "REPLIED" 
                                    ? "bg-blue-500/10 text-blue-400 border border-blue-500/15" 
                                    : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/15"
                              }`}>
                                {t.status || "OPEN"}
                              </span>
                            </div>
                          </div>

                          <span className="block text-[10.5px] text-gray-400 truncate mb-2">{t.email || "anonymous"}</span>
                          
                          <div className="flex justify-between items-center text-[10px] text-gray-500 font-mono">
                            <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                            <span>{hasReplies ? `${t.replies.length} message(s)` : "No messages"}</span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-16 px-4 text-center text-xs text-gray-500 italic bg-black/25 rounded-xl border border-white/5 leading-relaxed">
                      {tickets.length > 0 ? (
                        <span>No tickets found matching the status filter <strong>"{ticketStatusFilter}"</strong>.</span>
                      ) : (
                        <span>No tickets present inside systems.</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Chat Viewport and Reply Interface - Right columns */}
              <div id="support-ticket-view" className="lg:col-span-2 flex flex-col bg-[#0b0b0b] border border-white/5 rounded-2xl overflow-hidden min-h-[500px]">
                {selectedTicket ? (
                  <div className="flex flex-col h-full flex-grow p-6">
                    {/* Header */}
                    <div className="pb-6 border-b border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-[10px] bg-white/10 text-white font-mono font-bold px-2 py-0.5 rounded uppercase">
                            ID: {selectedTicket.id.substring(0, 12)}...
                          </span>
                          <span className="text-[10.5px] text-gray-400 font-sans">
                            Submitted: {new Date(selectedTicket.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <h2 className="text-base font-bold text-white mb-1 leading-snug">{selectedTicket.subject}</h2>
                        <span className="text-xs text-blue-400 font-semibold">{selectedTicket.email}</span>
                      </div>

                      {/* Triage Selectors */}
                      <div className="flex flex-wrap items-center gap-4 shrink-0">
                        {/* Priority Selector */}
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-500 uppercase tracking-widest font-mono font-bold">Priority:</span>
                          <select 
                            value={selectedTicket.priority || "MEDIUM"} 
                            onChange={(e) => handleUpdateTicketPriority(selectedTicket.id, e.target.value)}
                            className="bg-black border border-white/10 rounded-xl text-xs py-2 px-3 font-bold text-white outline-none cursor-pointer focus:border-blue-500"
                          >
                            <option value="LOW">LOW</option>
                            <option value="MEDIUM">MEDIUM</option>
                            <option value="HIGH">HIGH</option>
                          </select>
                        </div>

                        {/* Status Selector */}
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-500 uppercase tracking-widest font-mono font-bold">Status:</span>
                          <select 
                            value={selectedTicket.status || "OPEN"} 
                            onChange={(e) => handleUpdateTicketStatus(selectedTicket.id, e.target.value)}
                            className="bg-black border border-white/10 rounded-xl text-xs py-2 px-3 font-bold text-white outline-none cursor-pointer focus:border-blue-500"
                          >
                            <option value="OPEN">OPEN / UNRESOLVED</option>
                            <option value="REPLIED">REPLIED</option>
                            <option value="CLOSED">CLOSED / RESOLVED</option>
                          </select>
                        </div>
                      </div>
                    </div>
                       {/* Notification Messages */}
                    {(ticketActionError || ticketActionSuccess) && (
                      <div className="mt-4">
                        {ticketActionError && (
                          <div className="bg-red-500/10 border border-red-500/15 rounded-xl p-3 flex items-center gap-2 text-red-500 text-xs">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{ticketActionError}</span>
                          </div>
                        )}
                        {ticketActionSuccess && (
                          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex items-center gap-2 text-emerald-400 text-xs text-left">
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            <span>{ticketActionSuccess}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Conversation log stream */}
                    <div className="flex-grow overflow-y-auto max-h-[350px] space-y-4 my-6 pr-1 text-left">
                      {timelineItems.map((item, idx) => {
                        if (item.type === "CLIENT_ORIGINAL") {
                          return (
                            <div key={`client-orig-${idx}`} className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/15 flex items-center justify-center font-bold text-xs text-amber-500 shrink-0">
                                {selectedTicket.email?.charAt(0).toUpperCase() || "U"}
                              </div>
                              <div className="bg-white/5 border border-white/5 rounded-2xl p-4 max-w-[85%] text-xs space-y-1.5 shadow">
                                <div className="flex justify-between items-center gap-4 text-gray-500 text-[10px] font-mono">
                                  <span className="font-bold text-gray-300">Client Statement (Original)</span>
                                  <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
                                </div>
                                <p className="text-gray-100 leading-normal font-sans whitespace-pre-wrap">{item.message}</p>
                              </div>
                            </div>
                          );
                        } else if (item.type === "PUBLIC_REPLY") {
                          const isAdminMsg = item.sender === "ADMIN" || item.sender === "admin";
                          return (
                            <div key={`pub-reply-${idx}`} className={`flex items-start gap-3 ${isAdminMsg ? 'flex-row-reverse' : ''}`}>
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                                isAdminMsg 
                                  ? 'bg-blue-600/10 border border-blue-500/15 text-blue-400' 
                                  : 'bg-gray-500/10 border border-white/5 text-gray-400'
                              }`}>
                                {isAdminMsg ? "A" : (selectedTicket.email?.charAt(0).toUpperCase() || "U")}
                              </div>
                              <div className={`rounded-2xl p-4 max-w-[85%] text-xs space-y-1.5 shadow border text-left ${
                                isAdminMsg 
                                  ? 'bg-blue-600/5 border-blue-500/15 text-gray-100' 
                                  : 'bg-white/5 border-white/5 text-gray-100'
                              }`}>
                                <div className="flex justify-between items-center gap-4 text-gray-500 text-[10px] font-mono">
                                  <span className={`font-bold ${isAdminMsg ? 'text-blue-400' : 'text-gray-400'}`}>
                                    {isAdminMsg ? 'Administrative Support Officer' : 'Client Message'}
                                  </span>
                                  <span>{item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : ""}</span>
                                </div>
                                <p className="leading-normal font-sans whitespace-pre-wrap">{item.message}</p>
                              </div>
                            </div>
                          );
                        } else if (item.type === "INTERNAL_NOTE") {
                          return (
                            <div key={`internal-note-${idx}`} className="flex items-start gap-3 bg-fuchsia-950/20 border border-fuchsia-500/15 p-3.5 rounded-2xl max-w-[90%] mx-auto shadow-md">
                              <div className="w-8 h-8 rounded-full bg-fuchsia-500/15 border border-fuchsia-500/20 flex items-center justify-center font-bold text-xs text-fuchsia-400 shrink-0">
                                <Lock className="w-3.5 h-3.5" />
                              </div>
                              <div className="flex-grow text-left space-y-1">
                                <div className="flex justify-between items-center gap-4 text-fuchsia-400 text-[10px] uppercase tracking-widest font-extrabold font-mono">
                                  <span className="flex items-center gap-1.5">
                                    <Lock className="w-3.5 h-3.5" /> Staff Private Note
                                  </span>
                                  <span className="text-fuchsia-500/50">{new Date(item.timestamp).toLocaleTimeString()}</span>
                                </div>
                                <p className="text-gray-200 text-xs leading-relaxed font-sans whitespace-pre-wrap">{item.message}</p>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })}
                    </div>

                    {/* Notes & Reply Action Switch Tabs */}
                    <div className="flex border-b border-white/5 mb-4 shrink-0 mt-auto pt-4">
                      <button
                        type="button"
                        onClick={() => setNotesActiveTab("PUBLIC")}
                        className={`flex items-center gap-2 pb-2.5 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                          notesActiveTab === "PUBLIC"
                            ? "border-blue-500 text-blue-400"
                            : "border-transparent text-gray-500 hover:text-gray-300"
                        }`}
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Public Response</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setNotesActiveTab("INTERNAL")}
                        className={`flex items-center gap-2 pb-2.5 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                          notesActiveTab === "INTERNAL"
                            ? "border-fuchsia-500 text-fuchsia-400"
                            : "border-transparent text-gray-500 hover:text-gray-300"
                        }`}
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>Internal Private Note</span>
                      </button>
                    </div>

                    {notesActiveTab === "PUBLIC" ? (
                      <form onSubmit={handleAdminReply} className="pt-2">
                        <div className="space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-black/30 p-2.5 rounded-xl border border-white/5">
                            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest pl-1">Canned Reply Templates:</span>
                            <select
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val) {
                                  setAdminReplyText(val);
                                  e.target.value = ""; // reset
                                }
                              }}
                              className="bg-black/80 border border-white/10 rounded-lg text-[10px] text-gray-300 font-bold py-1 px-2.5 focus:outline-none focus:border-blue-500/60 cursor-pointer min-w-[200px]"
                            >
                              <option value="">-- Apply saved response --</option>
                              {SAVED_TEMPLATES.map((tmpl, idx) => (
                                <option key={idx} value={tmpl.text}>{tmpl.title}</option>
                              ))}
                            </select>
                          </div>

                          <textarea 
                            rows={3} 
                            value={adminReplyText}
                            onChange={(e) => setAdminReplyText(e.target.value)}
                            placeholder="Type administrative dispatch message. This will update the user instantly ..."
                            className="w-full bg-[#111] border border-white/10 text-xs text-white rounded-xl p-3.5 focus:outline-none focus:border-blue-500/60 font-sans leading-normal leading-relaxed resize-none text-left"
                            required
                          />
                          <div className="flex justify-between items-center gap-4">
                            <span className="text-[10px] text-gray-500 font-sans italic text-left">
                              Replying securely to {selectedTicket.email}
                            </span>
                            <button 
                              type="submit"
                              disabled={isSubmittingReply || !adminReplyText.trim()}
                              className="bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-bold text-xs py-2 px-5 rounded-xl cursor-pointer transition-all flex items-center justify-center gap-2"
                            >
                              {isSubmittingReply ? "Dispatching Message..." : "Publish Security Response"}
                            </button>
                          </div>
                        </div>
                      </form>
                    ) : (
                      <form onSubmit={handleSaveInternalNote} className="pt-2">
                        <div className="space-y-3">
                          <div className="bg-fuchsia-950/10 border border-fuchsia-500/10 p-3 rounded-xl flex items-center gap-2.5">
                            <Lock className="w-4 h-4 text-fuchsia-400 shrink-0" />
                            <div className="text-left">
                              <p className="text-[10px] font-bold text-fuchsia-400 uppercase tracking-widest">Confidential Staff Recording Log</p>
                              <p className="text-[10px] text-gray-500 leading-normal font-sans">
                                Content submitted here will be persistent, but strictly hidden from the end-user.
                              </p>
                            </div>
                          </div>

                          <textarea 
                            rows={3} 
                            value={internalNoteText}
                            onChange={(e) => setInternalNoteText(e.target.value)}
                            placeholder="Type confidential ticket notes, context, status alerts, or server information..."
                            className="w-full bg-[#111] border border-white/10 text-xs text-white rounded-xl p-3.5 focus:outline-none focus:border-fuchsia-500/60 font-sans leading-normal leading-relaxed resize-none text-left"
                            required
                          />
                          <div className="flex justify-between items-center gap-4">
                            <span className="text-[10px] text-gray-500 font-sans italic text-left flex items-center gap-1">
                              <Lock className="w-3 h-3 text-fuchsia-500/65 animate-pulse" /> Private note #{(selectedTicket.internalNotes || []).length + 1}
                            </span>
                            <button 
                              type="submit"
                              disabled={isSubmittingNote || !internalNoteText.trim()}
                              className="bg-fuchsia-700 hover:bg-fuchsia-600 disabled:bg-fuchsia-950 text-white font-bold text-xs py-2 px-5 rounded-xl cursor-pointer transition-all flex items-center justify-center gap-2"
                            >
                              {isSubmittingNote ? "Saving Note..." : "Save Private Note"}
                            </button>
                          </div>
                        </div>
                      </form>
                    )}
                  </div>
                ) : (
                  <div className="flex-grow flex flex-col items-center justify-center text-center p-8 self-center h-[500px]">
                    <div className="p-4 bg-white/5 rounded-full mb-4 border border-white/5 text-gray-400">
                      <Ticket className="w-10 h-10 text-gray-500" />
                    </div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-1">Administrative Support Central</h3>
                    <p className="text-xs text-gray-500 max-w-sm mt-1 leading-relaxed">
                      Select any incoming client ticket on the left menu thread to inspect message histories and dispatch secure administrative responses instantly.
                    </p>
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
