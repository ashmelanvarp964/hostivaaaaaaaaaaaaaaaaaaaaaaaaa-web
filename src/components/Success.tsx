import { motion } from "motion/react";
import { Link, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { CheckCircle2, Server, ArrowRight, Mail, Lock, Copy, Check, Eye, EyeOff, ShieldCheck } from "lucide-react";

export default function Success() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("orderId");
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!orderId) return;

    const fetchOrder = async () => {
      setLoading(true);
      try {
        const orderSnap = await getDoc(doc(db, "orders", orderId));
        if (orderSnap.exists()) {
          setOrderDetails(orderSnap.data());
        }
      } catch (err) {
        console.error("Error loading order detail:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  const copyToClipboard = (text: string, type: "email" | "pass") => {
    navigator.clipboard.writeText(text);
    if (type === "email") {
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    } else {
      setCopiedPass(true);
      setTimeout(() => setCopiedPass(false), 2000);
    }
  };

  const hasGeneratedCredentials = orderDetails?.newUserEmail && orderDetails?.newUserTempPassword;

  return (
    <div className="pt-32 pb-24 px-4 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", damping: 12 }}
        className="max-w-xl mx-auto"
      >
        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10 text-green-500" />
        </div>
        
        <h1 className="text-3 tracking-tight font-extrabold font-display mb-3 text-3xl md:text-4xl text-white">
          Order Provisioned Successfully!
        </h1>
        <p className="text-gray-400 text-sm max-w-md mx-auto mb-8">
          Thank you for choosing Hostiva. Your high-performance game instance is activated and synced to the Node cluster.
        </p>

        {/* LOADING ORDER DATA DETAILS PLACEHOLDER */}
        {loading && (
          <div className="py-6 text-xs text-gray-500 italic">Syncing live server provisions from datacenter...</div>
        )}

        {/* GORGEOUS GENERATED ACCOUNT CREDENTIALS ACCESS DEPLOY CARD */}
        {hasGeneratedCredentials && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-6 border-green-500/20 bg-gradient-to-b from-[#0e1610] to-[#0a0a0a] text-left mb-8 max-w-md mx-auto shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <ShieldCheck className="w-16 h-16 text-green-500" />
            </div>

            <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-3">
              <span className="p-1.5 bg-green-500/10 rounded-lg text-green-400">
                <ShieldCheck className="w-4 h-4" />
              </span>
              <h3 className="font-bold text-sm text-white uppercase tracking-wider">Client Billing Account Created</h3>
            </div>

            <p className="text-xs text-gray-400 mb-4 leading-relaxed">
              We generated a secure billing account for you. Use these credentials to login to our Client Portal to query invoices and open support tickets.
            </p>

            <div className="space-y-3.5 mb-5 select-none">
              {/* EMAIL FIELD */}
              <div>
                <span className="block text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 pl-1">Email Username</span>
                <div className="flex bg-black/60 rounded-xl border border-white/5 p-2.5 items-center justify-between">
                  <span className="text-xs font-mono text-gray-200 truncate pr-3">{orderDetails.newUserEmail}</span>
                  <button
                    onClick={() => copyToClipboard(orderDetails.newUserEmail, "email")}
                    className="p-1.5 hover:bg-white/5 rounded text-gray-400 hover:text-white transition-colors cursor-pointer"
                    title="Copy Email"
                  >
                    {copiedEmail ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* PASSWORD FIELD */}
              <div>
                <span className="block text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 pl-1">Temporary Password</span>
                <div className="flex bg-black/60 rounded-xl border border-white/5 p-2.5 items-center justify-between relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    readOnly
                    value={orderDetails.newUserTempPassword}
                    className="bg-transparent text-xs font-mono text-gray-200 outline-none w-full pr-12 select-all cursor-text"
                  />
                  <div className="flex items-center gap-1 select-none">
                    <button
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-1.5 hover:bg-white/5 rounded text-gray-400 hover:text-white transition-colors cursor-pointer"
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => copyToClipboard(orderDetails.newUserTempPassword, "pass")}
                      className="p-1.5 hover:bg-white/5 rounded text-gray-400 hover:text-white transition-colors cursor-pointer"
                      title="Copy Password"
                    >
                      {copiedPass ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <Link
              to="/login"
              className="block text-center w-full py-2.5 bg-green-600 hover:bg-green-505 text-white font-bold text-xs rounded-xl transition-all shadow-lg shadow-green-950/20 uppercase tracking-wider"
            >
              Sign In to Your New Client Portal
            </Link>
          </motion.div>
        )}

        <div className="max-w-md mx-auto mb-10">
          <div className="glass-card p-6 flex flex-col items-center gap-4">
            <div className="w-14 h-14 bg-blue-500/10 rounded-full flex items-center justify-center">
              <Server className="w-7 h-7 text-blue-500" />
            </div>
            
            <div className="text-center">
              <h3 className="font-bold text-lg text-white font-display mb-1">Pterodactyl Game Panel</h3>
              <p className="text-xs text-gray-500 max-w-sm leading-relaxed">
                Your server files and console access are ready on CP. Log in to start configuring plugins.
              </p>
            </div>

            <a 
              href="https://cp.hostivaa.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition-all shadow-lg shadow-blue-500/15 flex items-center justify-center gap-2 uppercase tracking-wider cursor-pointer"
            >
              Go to Game Control Panel <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>

        <div className="flex items-center justify-center gap-4 text-xs font-semibold">
          <Link 
            to="/billing"
            className="text-blue-500 hover:underline"
          >
            My Services Dashboard
          </Link>
          <span className="text-gray-700">•</span>
          <Link 
            to="/"
            className="text-gray-500 hover:text-white transition-colors"
          >
            Return to Home
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
