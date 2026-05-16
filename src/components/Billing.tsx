import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Receipt, Clock, CreditCard, ExternalLink, HelpCircle, AlertCircle, Loader2, LogOut } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { db, auth } from "../lib/firebase";
import { collection, query, where, getDocs, orderBy, doc, setDoc } from "firebase/firestore";

export default function Billing() {
  const { user, loading: authLoading } = useAuth();
  const [fetching, setFetching] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [renewingId, setRenewingId] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleRenew = () => {
    window.open("https://discord.gg/SkCuzpE53Q", "_blank");
  };

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user) return;
      setFetching(true);
      setError("");
      try {
        const q = query(
          collection(db, "orders"),
          where("userId", "==", user.uid),
          orderBy("createdAt", "desc")
        );
        const querySnapshot = await getDocs(q);
        const fetchedOrders = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          // Assign allocated IP based on plan type
          serverIp: (doc.data() as any).status === "PAID" 
            ? `${(doc.data() as any).planId.startsWith('perf') ? 'paid-1' : 'play'}.hostiva.xyz:${25500 + Math.floor(Math.random() * 100)}` 
            : null
        }));
        setOrders(fetchedOrders);
      } catch (err: any) {
        console.error("Error fetching orders:", err);
        setError("Failed to fetch billing history.");
      } finally {
        setFetching(false);
      }
    };

    if (user) {
      fetchOrders();
    }
  }, [user]);

  const activeServices = orders.filter(o => o.status === "PAID");
  const recentOrders = orders;

  if (authLoading || (!user && !error)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="pt-24 pb-20 min-h-screen px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-bold font-display mb-4">Billing Area</h1>
            <p className="text-gray-400">Welcome back, <span className="text-white font-bold">{user?.email}</span></p>
          </div>
          <button 
            onClick={() => auth.signOut()}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-sm text-gray-400 hover:text-white"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Active Services */}
            <div>
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest pl-2 mb-4">Active Services</h3>
              {fetching ? (
                <div className="glass-card p-12 flex flex-col items-center justify-center text-gray-500">
                  <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500" />
                  <p>Loading your services...</p>
                </div>
              ) : activeServices.length === 0 ? (
                <div className="glass-card p-8 border-dashed border-white/5 flex flex-col items-center justify-center text-gray-500 text-center">
                  <p className="text-sm">No active services found.</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                  {activeServices.map((service, idx) => (
                    <motion.div
                      key={service.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.1 }}
                      className="glass-card p-6 border-blue-500/20"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
                          <CreditCard className="w-5 h-5 text-blue-500" />
                        </div>
                        <span className="bg-green-500/10 text-green-400 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">Active</span>
                      </div>
                      <h4 className="font-bold text-lg mb-1">{service.planId.replace('perf-', 'Performance ').replace('budget-', 'Budget ').toUpperCase()}</h4>
                      <div className="flex flex-col gap-1 mb-4">
                        <p className="text-xs text-gray-400 font-mono">{service.serverIp}</p>
                        <p className="text-[10px] text-gray-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Created: {new Date(service.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      
                      <div className="flex gap-2 pt-4 border-t border-white/5">
                        <button 
                          onClick={handleRenew}
                          className="flex-1 bg-white/5 hover:bg-white/10 text-white text-xs font-bold py-2 rounded-lg transition-all flex items-center justify-center gap-2"
                        >
                          Renew
                        </button>
                        <button 
                          onClick={() => {
                            window.location.href = "/#pricing";
                          }}
                          className="flex-1 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 text-xs font-bold py-2 rounded-lg transition-all"
                        >
                          Upgrade
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Invoices / Recent Orders */}
            <div>
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest pl-2 mb-4">Recent Orders</h3>
              {error ? (
                <div className="glass-card p-12 flex flex-col items-center justify-center text-red-500 text-center">
                  <AlertCircle className="w-8 h-8 mb-4 opacity-50" />
                  <p className="mb-4">{error}</p>
                  <button onClick={() => window.location.reload()} className="text-blue-500 font-bold hover:underline">Retry</button>
                </div>
              ) : recentOrders.length === 0 && !fetching ? (
                <div className="glass-card p-12 flex flex-col items-center justify-center text-gray-500 text-center">
                  <Receipt className="w-12 h-12 mb-4 opacity-20" />
                  <h3 className="text-lg font-bold text-white mb-2">No History Found</h3>
                  <p className="text-sm max-w-xs leading-relaxed">
                    You haven't made any purchases yet. Your active services will appear here.
                  </p>
                  <Link to="/#pricing" className="mt-6 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl text-sm font-bold transition-all">
                    Browse Plans
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentOrders.map((order, idx) => (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="glass-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${order.status === 'PAID' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                          {order.status === 'PAID' ? <CreditCard className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold">{order.planId.replace('perf-', 'Performance ').replace('budget-', 'Budget ').toUpperCase()}</h4>
                            {order.isRenewal && (
                              <span className="text-[8px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider border border-blue-500/20">Renew</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                            <span>•</span>
                            <span className="font-mono text-[10px]">{order.orderId}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-6">
                        <div className="text-right">
                          <div className="font-bold text-white">₹{order.amount}</div>
                          <div className={`text-[10px] font-bold uppercase tracking-wider ${order.status === 'PAID' ? 'text-green-400' : 'text-yellow-400'}`}>
                            {order.status || 'PENDING'}
                          </div>
                        </div>
                        {order.status === 'PAID' && (
                          <a 
                            href="https://cp.hostivaa.xyz" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-all"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </motion.div>
                  )) /* end map */} 
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="glass-card p-6">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-blue-500" />
                Need Support?
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                Having issues with a payment or your service? Our team is available 24/7 to help.
              </p>
              <div className="space-y-3">
                <a href="https://discord.gg/SkCuzpE53Q" target="_blank" className="flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all font-bold text-blue-400">
                  <span>Discord Support</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
                <Link to="/support" className="flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all">
                  <span className="text-sm">Web Tickets</span>
                  <ExternalLink className="w-4 h-4 text-gray-500" />
                </Link>
              </div>
            </div>

            <div className="p-6 bg-blue-600/10 rounded-2xl border border-blue-500/20">
              <h4 className="font-bold text-sm mb-2 text-blue-400">Pro Tip</h4>
              <p className="text-xs text-blue-300/70 leading-relaxed">
                Payments are usually processed within 60 seconds. If your status hasn't updated after 5 minutes, please contact support with your Order ID.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-12 text-center">
            <Link to="/login" className="text-sm text-gray-500 hover:text-white transition-colors">
                &larr; Back to Portal
            </Link>
        </div>
      </div>
    </div>
  );
}
