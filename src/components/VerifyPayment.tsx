import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ShieldCheck, Loader2, AlertCircle, CheckCircle2, Ticket } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { db, auth } from "../lib/firebase";
import { collection, query, where, getDocs, orderBy, doc, setDoc } from "firebase/firestore";

export default function VerifyPayment() {
  const { user, loading: authLoading } = useAuth();
  const [transactionId, setTransactionId] = useState("");
  const [targetEmail, setTargetEmail] = useState("");
  const [isClaiming, setIsClaiming] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const [queryParams] = useState(() => new URLSearchParams(window.location.search));

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const paymentId = queryParams.get("razorpay_payment_id");
    if (paymentId) {
      setTransactionId(paymentId);
    }
    if (user?.email) {
      setTargetEmail(user.email);
    }
  }, [queryParams, user]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transactionId || !targetEmail || !user) return;

    setIsClaiming(true);
    setError("");
    try {
      const response = await fetch("/api/razorpay/claim-server", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId: transactionId,
          email: targetEmail,
          userId: user.uid
        })
      });

      const responseText = await response.text();
      let data: any;
      try {
        data = JSON.parse(responseText);
      } catch (err) {
        console.error("Non-JSON claim-server response:", responseText);
        throw new Error(`Server returned an invalid response (Status ${response.status}).`);
      }

      if (!response.ok) {
        throw new Error(data.details || data.error || "Verification failed");
      }

      // Create record in Firestore for historical tracking
      await setDoc(doc(db, "orders", `claim_${transactionId}`), {
        userId: user.uid,
        customerEmail: user.email,
        targetEmail: targetEmail,
        planId: data.order.planId,
        amount: data.order.amount,
        status: "CLAIMED",
        transactionId,
        pteroServerId: data.order.pteroServerId,
        createdAt: new Date().toISOString(),
        claimedAt: new Date().toISOString()
      });
      
      setSuccess(true);
    } catch (err: any) {
      console.error("Verification Error:", err);
      setError(err.message);
    } finally {
      setIsClaiming(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="pt-24 pb-20 min-h-screen px-4 flex items-center justify-center">
      <div className="max-w-md w-full">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-8 border-blue-500/20 bg-[#0c0c0c]"
        >
          {success ? (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">Payment Verified!</h2>
                <p className="text-gray-400 text-sm">Your server has been successfully provisioned. You can now manage it from the Game Panel.</p>
              </div>
              <div className="flex flex-col gap-3">
                <a 
                  href="https://panel.hostivaa.xyz" 
                  target="_blank" 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all block"
                >
                  Go to Game Panel
                </a>
                <Link to="/support" className="text-gray-500 text-sm hover:text-white transition-colors">
                  Need help? Contact Support
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-blue-600/20 rounded-2xl">
                  <ShieldCheck className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold font-display">Payment Verification</h1>
                  <p className="text-gray-500 text-xs">Claim your server after buying via link.</p>
                </div>
              </div>

              <form onSubmit={handleVerify} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2 ml-1 tracking-widest">Panel Email Address</label>
                  <input 
                    type="email" 
                    required
                    value={targetEmail}
                    onChange={(e) => setTargetEmail(e.target.value)}
                    placeholder="Your Pterodactyl Email"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 outline-none focus:border-blue-500/50 transition-colors text-white text-sm"
                  />
                  <p className="text-[10px] text-gray-500 mt-2">The server will be assigned to this email in our Game Panel.</p>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2 ml-1 tracking-widest">Razorpay Payment ID</label>
                  <input 
                    type="text" 
                    required
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder="pay_P1oC..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 outline-none focus:border-blue-500/50 transition-colors text-white text-sm font-mono"
                  />
                  <p className="text-[10px] text-gray-500 mt-2 italic">Found in your Razorpay confirmation email or SMS.</p>
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3 text-red-500 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold mb-1">Verification Error</p>
                      <p className="opacity-80">{error}</p>
                    </div>
                  </div>
                )}

                <button 
                  type="submit"
                  disabled={isClaiming}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  {isClaiming ? <Loader2 className="w-5 h-5 animate-spin" /> : <><ShieldCheck className="w-5 h-5" /> Verify & Activate</>}
                </button>

                <div className="text-center pt-4 border-t border-white/5">
                  <p className="text-[10px] text-gray-500 mb-4 flex items-center justify-center gap-2">
                    <Ticket className="w-3 h-3" /> Still facing issues? 
                    <Link to="/support" className="text-blue-500 font-bold hover:underline ml-1">Open a Ticket</Link>
                  </p>
                  <Link to="/" className="text-xs text-gray-600 hover:text-white transition-colors">
                    &larr; Back to Home
                  </Link>
                </div>
              </form>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
