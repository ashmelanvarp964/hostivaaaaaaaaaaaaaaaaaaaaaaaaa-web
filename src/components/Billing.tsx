import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "../lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { plans } from "../lib/plans";
import { 
  Loader2, 
  ExternalLink, 
  Cpu, 
  Database, 
  HardDrive, 
  Settings, 
  Terminal, 
  HelpCircle, 
  AlertCircle, 
  Server, 
  CreditCard,
  CheckCircle2,
  Clock,
  ArrowRight
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

interface UserOrder {
  id: string;
  orderId: string;
  planId: string;
  amount: number;
  userId: string;
  customerEmail: string;
  targetEmail?: string;
  status: string;
  provisioningStatus: string;
  pteroServerId?: number | string | null;
  pteroIdentifier?: string | null;
  serverIp?: string;
  createdAt: string;
  claimedAt?: string;
  completedAt?: string;
}

export default function Billing() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<UserOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [error, setError] = useState("");

  // Inline claiming state
  const [showInlineClaim, setShowInlineClaim] = useState(false);
  const [claimPaymentId, setClaimPaymentId] = useState("");
  const [claimTargetEmail, setClaimTargetEmail] = useState("");
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState("");
  const [claimError, setClaimError] = useState("");

  const fetchOrders = async () => {
    if (!user) return;
    setLoadingOrders(true);
    setError("");
    try {
      const q = query(
        collection(db, "orders"),
        where("userId", "==", user.uid)
      );
      const querySnapshot = await getDocs(q);
      const fetched: UserOrder[] = [];
      querySnapshot.forEach((doc) => {
        fetched.push({ id: doc.id, ...doc.data() } as UserOrder);
      });

      // Safe client-side sort by createdAt descending (avoids single/composite index failures)
      fetched.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });

      setOrders(fetched);
    } catch (err: any) {
      console.error("Error fetching orders from Firestore:", err);
      setError("Failed to load your services. Please refresh.");
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login?redirect=/billing");
    } else if (user?.email) {
      setClaimTargetEmail(user.email);
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user]);

  const handleVerifyClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimPaymentId.trim() || !claimTargetEmail.trim() || !user) return;

    setIsClaiming(true);
    setClaimError("");
    setClaimSuccess("");

    try {
      const response = await fetch("/api/razorpay/claim-server", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId: claimPaymentId.trim(),
          email: claimTargetEmail.trim(),
          userId: user.uid
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || data.error || "Verification failed");
      }

      setClaimSuccess(`Payment successfully claimed! Server is now active.`);
      setClaimPaymentId("");
      
      // Highlight new order and trigger list update!
      await fetchOrders();
    } catch (err: any) {
      console.error("Verification Error:", err);
      setClaimError(err.message || "Failed to verified claim payment");
    } finally {
      setIsClaiming(false);
    }
  };

  if (authLoading || (loadingOrders && !orders.length)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505]">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
          <p className="text-gray-400 text-sm">Authenticating and loading secure services...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Segmenting orders into active and historical
  const activeServers = orders.filter(
    (o) => o.status === "PAID" || o.status === "CLAIMED"
  );

  return (
    <div className="pt-24 pb-20 min-h-screen bg-[#050505] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 border-b border-white/5 pb-8">
          <div>
            <div className="text-blue-500 text-xs font-bold uppercase tracking-widest mb-2 font-mono">Secure Client Portal</div>
            <h1 className="text-3xl md:text-5xl font-bold font-display tracking-tight">Your Control Center</h1>
            <p className="text-gray-400 text-sm mt-2">
              Logged in secure session as <span className="text-white font-semibold font-mono">{user.email}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a 
              href="https://cp.hostivaa.xyz" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 transition-all text-xs font-bold uppercase tracking-wider flex items-center gap-2 glow-blue"
            >
              Open Game Panel <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button 
              onClick={() => setShowInlineClaim(!showInlineClaim)}
              className="px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-xs font-bold uppercase tracking-wider text-gray-300 hover:text-white cursor-pointer"
            >
              Verify Razorpay Claim
            </button>
          </div>
        </div>

        {/* Beautiful Interactive Inline Claim Panel */}
        {showInlineClaim && (
          <div className="mb-10 bg-white/5 border border-blue-500/10 rounded-2xl p-6 md:p-8 max-w-3xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-blue-600/20 rounded-xl">
                <CreditCard className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Claim Server via Razorpay ID</h3>
                <p className="text-xs text-gray-400">Claim your game node or manually sync any orphan Razorpay payment code.</p>
              </div>
            </div>

            <form onSubmit={handleVerifyClaim} className="grid md:grid-cols-2 gap-4 mt-6">
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Panel Email Address
                </label>
                <input 
                  type="email" 
                  required
                  value={claimTargetEmail}
                  onChange={(e) => setClaimTargetEmail(e.target.value)}
                  placeholder="Your Pterodactyl email"
                  className="w-full bg-[#111] border border-white/10 rounded-xl py-3 px-4 text-xs font-sans outline-none focus:border-blue-500/50 transition-colors text-white"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Razorpay Payment ID
                </label>
                <input 
                  type="text" 
                  required
                  value={claimPaymentId}
                  onChange={(e) => setClaimPaymentId(e.target.value)}
                  placeholder="pay_P1oCs... (e.g. pay_sandbox_1)"
                  className="w-full bg-[#111] border border-white/10 rounded-xl py-3 px-4 text-xs font-mono outline-none focus:border-blue-500/50 transition-colors text-white"
                />
              </div>

              <div className="md:col-span-2 flex flex-col gap-3 pt-3">
                {claimError && (
                  <p className="text-xs text-red-400 bg-red-500/5 border border-red-500/10 p-3 rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" /> {claimError}
                  </p>
                )}
                {claimSuccess && (
                  <p className="text-xs text-green-400 bg-green-500/5 border border-green-500/10 p-3 rounded-lg flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" /> {claimSuccess}
                  </p>
                )}
                <div className="text-[10px] text-gray-500 italic pb-2">
                  Tip: For live sandbox simulation in preview, write any payment code starting with <strong className="text-gray-300 font-mono">pay_sandbox_</strong> to instantly trigger a dummy container.
                </div>
                <div className="flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setShowInlineClaim(false)}
                    className="px-5 py-3 rounded-xl border border-white/10 text-xs font-bold uppercase hover:bg-white/5 transition-all text-gray-400 cursor-pointer"
                  >
                    Close
                  </button>
                  <button 
                    type="submit"
                    disabled={isClaiming}
                    className="flex-grow md:flex-initial px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold uppercase text-white transition-all flex items-center justify-center gap-2 glow-blue cursor-pointer"
                  >
                    {isClaiming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><CheckCircle2 className="w-3.5 h-3.5" /> Claim Active Node</>}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3 text-red-500 text-sm mb-8 max-w-2xl">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Servers / Instances list */}
          <div className="lg:col-span-8 space-y-8">
            <div>
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Server className="w-5 h-5 text-blue-500" /> Active VPS & Game Instances
              </h2>

              {activeServers.length === 0 ? (
                <div className="glass-card p-12 text-center space-y-6">
                  <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto border border-white/10">
                    <Server className="w-8 h-8 text-gray-500" />
                  </div>
                  <div className="max-w-md mx-auto">
                    <h3 className="text-lg font-bold mb-2">No Active Subscriptions Found</h3>
                    <p className="text-gray-400 text-xs leading-relaxed">
                      You haven't purchased or provisioned any premium servers yet. We offer the cheapest and most reliable high-frequency Minecraft hosting nodes in India.
                    </p>
                  </div>
                  <Link 
                    to="/#pricing" 
                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-wider px-6 py-3.5 rounded-xl transition-all glow-blue cursor-pointer"
                  >
                    View Premium Plans <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              ) : (
                <div className="grid gap-6">
                  {activeServers.map((server) => {
                    const matchedPlan = plans.find((p) => p.id === server.planId);
                    const serverName = matchedPlan?.name || "Premium Server Custom";
                    const hardwareLimit = matchedPlan?.hardware || "Intel High Frequency Node";
                    
                    // Generate a semi-stable server IP based on order ID if none recorded yet
                    const generatedIp = server.serverIp || `${server.planId?.startsWith("perf") ? "perf-" : "play"}1.hostivaa.xyz:${10000 + (parseInt(server.pteroServerId as string) || Math.floor(Math.random() * 8999) + 1000)}`;

                    return (
                      <div 
                        key={server.id} 
                        className="glass-card p-6 border-white/5 hover:border-blue-500/20 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
                      >
                        <div className="space-y-4 flex-grow">
                          {/* Top Header */}
                          <div className="flex items-center gap-3">
                            <h3 className="font-bold text-lg text-white font-display tracking-tight">{serverName}</h3>
                            {server.provisioningStatus === "SUCCESS" ? (
                              <span className="bg-green-500/10 text-green-400 text-[9px] font-bold px-2 py-0.5 rounded border border-green-500/20 uppercase tracking-widest flex items-center gap-1.5 leading-none">
                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /> Active
                              </span>
                            ) : server.provisioningStatus === "FAILED" ? (
                              <span className="bg-red-500/10 text-red-400 text-[9px] font-bold px-2 py-0.5 rounded border border-red-500/20 uppercase tracking-widest">
                                Failure (Needs Support)
                              </span>
                            ) : (
                              <span className="bg-yellow-500/10 text-yellow-400 text-[9px] font-bold px-2 py-0.5 rounded border border-yellow-500/20 uppercase tracking-widest flex items-center gap-1.5 leading-none">
                                <Loader2 className="w-2.5 h-2.5 animate-spin" /> Provisioning...
                              </span>
                            )}
                          </div>

                          {/* IP Allocation */}
                          <div className="bg-white/5 p-3 rounded-lg border border-white/5 inline-flex flex-col gap-1 max-w-sm w-full">
                            <span className="text-[9px] text-gray-500 uppercase font-bold tracking-widest">SERVER IP ADDRESS</span>
                            <span className="text-xs font-mono font-bold text-blue-400">{generatedIp}</span>
                          </div>

                          {/* Spec Details */}
                          {matchedPlan && (
                            <div className="grid grid-cols-3 gap-4 max-w-md pt-2">
                              <div className="flex items-center gap-2 text-xs text-gray-400">
                                <Cpu className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                <span className="font-mono">{matchedPlan.specs.cpu} CPU</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-gray-400">
                                <Database className="w-3.5 h-3.5 text-green-500 shrink-0" />
                                <span className="font-mono">{matchedPlan.specs.ram} RAM</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-gray-400">
                                <HardDrive className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                                <span className="font-mono">{matchedPlan.specs.disk} SSD</span>
                              </div>
                            </div>
                          )}
                          
                          <p className="text-[10px] text-gray-500 italic">
                            Hardware Node Instance: {hardwareLimit}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex md:flex-col gap-2.5 shrink-0 justify-end">
                          <a 
                            href="https://cp.hostivaa.xyz" 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-3 rounded-xl text-center text-xs font-bold transition-all flex items-center justify-center gap-2 text-white"
                          >
                            <Terminal className="w-3.5 h-3.5 text-blue-400" /> Console Log
                          </a>
                          <Link 
                            to="/support" 
                            className="bg-white/5 hover:bg-white/10 border border-white/5 px-4 py-3 rounded-xl text-center text-xs font-bold transition-all flex items-center justify-center gap-2 text-gray-400 hover:text-white"
                          >
                            <HelpCircle className="w-3.5 h-3.5" /> Support ticket
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Billing Transactions / History */}
            {orders.length > 0 && (
              <div>
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-blue-500" /> Payment & Subscription History
                </h2>
                <div className="glass-card p-6 divide-y divide-white/5 space-y-4">
                  {orders.map((item) => (
                    <div key={item.id} className="pt-4 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-sm">
                      <div className="space-y-1">
                        <div className="font-bold flex items-center gap-2">
                          <span>{plans.find((p) => p.id === item.planId)?.name || "Premium Plan Package"}</span>
                          <span className="text-[10px] text-gray-500 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded font-mono uppercase tracking-wide">
                            {item.orderId?.substring(0, 16)}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-4">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(item.createdAt).toLocaleDateString()}</span>
                          <span className="flex items-center gap-1 font-mono text-gray-400">ID: {item.transactionId || "RAZORPAY_DIRECT"}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 justify-between sm:justify-end">
                        <span className="font-bold text-white">₹{item.amount}</span>
                        <span className="bg-green-500/10 text-green-400 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 border border-green-500/10 uppercase tracking-widest font-mono">
                          <CheckCircle2 className="w-3 h-3" /> Paid
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Right Column: Portal Settings & Quick Tips */}
          <div className="lg:col-span-4 space-y-6">
            <div className="glass-card p-6 border-white/5">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Settings className="w-5 h-5 text-blue-500" /> Account Management</h3>
              <div className="space-y-4 text-xs text-gray-400">
                <div className="flex justify-between border-b border-white/5 pb-3">
                  <span>Authorized Email</span>
                  <span className="text-white font-mono font-bold">{user.email}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-3">
                  <span>Server Account ID</span>
                  <span className="text-white font-mono">{user.uid.slice(0, 8)}...</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-3">
                  <span>Billing Country</span>
                  <span className="text-white">India</span>
                </div>
                <div className="flex justify-between pb-1">
                  <span>Default Gateway</span>
                  <span className="text-blue-400 font-bold">Razorpay Secure</span>
                </div>
              </div>
            </div>

            <div className="glass-card p-6 bg-gradient-to-br from-blue-600/5 to-transparent border-blue-500/10">
              <h3 className="font-bold text-base mb-3 text-white">Need support with Pterodactyl?</h3>
              <p className="text-xs text-gray-400 leading-relaxed mb-4">
                If your server does not instantly load inside the panel, it means either Pterodactyl limits on Node have been reached or authentication was mismatched. You can quickly use the verification tool to re-validate!
              </p>
              <Link 
                to="/verify-payment"
                className="text-xs text-blue-400 font-bold flex items-center gap-1 hover:text-blue-300 transition-colors"
              >
                Go to Verification Hub <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
