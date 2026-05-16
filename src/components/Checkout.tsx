import { motion, AnimatePresence } from "motion/react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { plans } from "@/src/lib/plans";
import { ShieldCheck, ArrowLeft, Loader2, Sparkles, CreditCard, Database } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "../lib/firebase";
import { doc, setDoc } from "firebase/firestore";

export default function Checkout() {
  const { planId } = useParams();
  const location = useLocation();
  const plan = plans.find(p => p.id === planId);
  const { user, loading: authLoading } = useAuth();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<string>("INITIAL");
  const [couponCode, setCouponCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const navigate = useNavigate();

  const handleDiscordRedirect = () => {
    window.open("https://discord.gg/SkCuzpE53Q", "_blank");
  };

  const finalPrice = location.state?.amount || (plan ? Math.floor(plan.price * (1 - discount / 100)) : 0);
  const isRenewal = location.state?.serviceId;

  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-[#0c0c0c]"><Loader2 className="animate-spin text-blue-500" /></div>;
  if (!plan) return <div className="min-h-screen flex items-center justify-center bg-[#0c0c0c] text-white">Plan not found</div>;

  return (
    <div className="min-h-screen bg-[#0c0c0c] text-white pt-32 pb-24 px-6">
      <div className="max-w-6xl mx-auto">
        <Link to="/pricing" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Pricing
        </Link>
        
        <div className="grid lg:grid-cols-12 gap-12 items-start">
          <div className="lg:col-span-12 max-w-2xl mx-auto w-full">
            <div className="glass-card p-8 space-y-8">
              <div className="text-center">
                <div className="w-20 h-20 bg-blue-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <CreditCard className="w-10 h-10 text-blue-500" />
                </div>
                <h2 className="text-3xl font-bold font-display mb-2">Order Summary</h2>
                <p className="text-gray-400 italic">Manual payment via Discord required temporarily.</p>
              </div>
              
              <div className="bg-white/5 rounded-2xl p-6 border border-white/5 space-y-6">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-white font-bold">{plan.name}</p>
                      <p className="text-gray-500 text-sm">Minecraft Hosting</p>
                    </div>
                  </div>
                  <p className="text-white font-bold">₹{plan.price}/mo</p>
                </div>

                <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                  <p className="text-gray-400">Total Price</p>
                  <p className="text-2xl font-bold text-white">₹{plan.price}</p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-bold text-center">How to Purchase?</h3>
                <ol className="text-sm text-gray-400 space-y-3 list-decimal list-inside px-4">
                  <li>Click the button below to join our official Discord server.</li>
                  <li>Go to the <span className="text-blue-400 font-bold">#billing</span> channel.</li>
                  <li>Open a ticket by typing <span className="text-blue-400 font-bold">/buy</span> or mention our staff.</li>
                  <li>Our team will process your payment manually and provision your server instantly.</li>
                </ol>
              </div>

              <button
                onClick={handleDiscordRedirect}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white py-5 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all glow-blue shadow-xl shadow-blue-600/20 text-lg group"
              >
                <Database className="w-6 h-6 group-hover:scale-110 transition-transform" />
                Join Discord to Purchase
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
