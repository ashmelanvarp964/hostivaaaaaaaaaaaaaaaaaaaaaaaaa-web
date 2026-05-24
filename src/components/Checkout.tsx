import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../context/AuthContext";
import { plans } from "../lib/plans";
import { Cpu, Database, HardDrive, Shield, Loader2, CreditCard, ArrowRight, AlertCircle, Sparkles, Check } from "lucide-react";

export default function Checkout() {
  const { planId } = useParams<{ planId: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [panelEmail, setPanelEmail] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [couponError, setCouponError] = useState("");
  const [couponSuccess, setCouponSuccess] = useState("");
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState("");

  const plan = plans.find(p => p.id === planId);

  useEffect(() => {
    if (!authLoading && user?.email) {
      setPanelEmail(user.email);
    }
  }, [user, authLoading]);

  if (authLoading || !plan) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  // Cost breakdown
  const basePrice = typeof plan.price === "number" ? plan.price : 0;
  const discountAmount = Math.round(basePrice * (discountPercent / 100));
  const subtotal = basePrice - discountAmount;
  const totalAmount = subtotal;

  const [showSandboxModal, setShowSandboxModal] = useState(false);
  const [sandboxOptions, setSandboxOptions] = useState<any>(null);
  const [sandboxPaymentMode, setSandboxPaymentMode] = useState<"card" | "upi" | "netbanking">("card");

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;

    setIsApplyingCoupon(true);
    setCouponError("");
    setCouponSuccess("");

    try {
      const res = await fetch("/api/validate-coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          code: couponCode.trim(),
          email: panelEmail.trim() || user?.email || ""
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Invalid coupon code");
      }

      setDiscountPercent(data.discount);
      setAppliedCoupon(couponCode.trim().toUpperCase());
      setCouponSuccess(`Coupon applied! You got a ${data.discount}% discount.`);
    } catch (err: any) {
      setCouponError(err.message || "Failed to apply coupon");
      setDiscountPercent(0);
      setAppliedCoupon(null);
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleCheckout = async () => {
    if (!panelEmail.trim()) {
      setPaymentError("A panel email is required to sync your game server.");
      return;
    }

    setIsProcessingPayment(true);
    setPaymentError("");

    try {
      // 1. Create order on the backend list
      const orderRes = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: totalAmount,
          receipt: `rcpt_${plan.id}_${Date.now().toString().slice(-6)}`
        })
      });

      const orderResText = await orderRes.text();
      let orderData: any;
      try {
        orderData = JSON.parse(orderResText);
      } catch (err) {
        console.error("Order creation non-JSON response:", orderResText);
        throw new Error(`Server returned an invalid response (Status ${orderRes.status}). Please try again or use another payment mechanism.`);
      }

      if (!orderRes.ok) {
        throw new Error(orderData.details || orderData.error || "Failed to initialize payment order");
      }

      // 2. Open Razorpay Checkouts
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_live_Ss17z1ouTZ9dZk",
        amount: orderData.amount,
        currency: orderData.currency || "INR",
        name: "Hostiva Solutions",
        description: `Activation of ${plan.name}`,
        order_id: orderData.id,
        prefill: {
          email: user?.email || "",
          contact: ""
        },
        theme: {
          color: "#2563eb"
        },
        handler: async function (response: any) {
          setIsProcessingPayment(true);
          try {
            // 3. Verify Payment
            const verifyRes = await fetch("/api/razorpay/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                planId: plan.id,
                email: panelEmail.trim(), // The Pterodactyl Target Email
                amount: totalAmount,
                userId: user?.uid,
                couponCode: appliedCoupon
              })
            });

            const verifyResText = await verifyRes.text();
            let verifyData: any;
            try {
              verifyData = JSON.parse(verifyResText);
            } catch (err) {
              console.error("Payment verification non-JSON response:", verifyResText);
              throw new Error(`Verification server returned an invalid response (Status ${verifyRes.status}). Please contact support with payment ID: ${response.razorpay_payment_id}`);
            }

            if (!verifyRes.ok) {
              throw new Error(verifyData.message || "Verification failed");
            }

            // Successfully Verified and Provisioned
            navigate(`/success?orderId=${verifyData.orderId}`);
          } catch (verifyError: any) {
            console.error("Verification Error:", verifyError);
            setPaymentError(`Verification Failed: ${verifyError.message || "Please contact support with payment ID " + response.razorpay_payment_id}`);
          } finally {
            setIsProcessingPayment(false);
          }
        },
        modal: {
          ondismiss: function () {
            setIsProcessingPayment(false);
          }
        }
      };

      if (!(window as any).Razorpay) {
        console.warn("Razorpay SDK not loaded in browser environment. Opening interactive simulation.");
        setSandboxOptions(options);
        setShowSandboxModal(true);
        return;
      }

      try {
        const rzpObj = new (window as any).Razorpay(options);
        rzpObj.open();
      } catch (err: any) {
        console.warn("Failed to open standard Razorpay popups. Triggering interactive sandbox.", err);
        setSandboxOptions(options);
        setShowSandboxModal(true);
      }

    } catch (err: any) {
      console.error("Checkout Payment Error:", err);
      setPaymentError(err.message || "An error occurred during payment setup.");
      setIsProcessingPayment(false);
    }
  };

  const executeSimulatedPayment = async () => {
    if (!sandboxOptions) return;
    setShowSandboxModal(false);
    setIsProcessingPayment(true);

    const mockPaymentId = `pay_sandbox_${Math.random().toString(36).slice(2, 11)}`;
    const mockSignature = `sig_sandbox_${Math.random().toString(36).slice(2, 15)}`;

    try {
      await sandboxOptions.handler({
        razorpay_order_id: sandboxOptions.order_id,
        razorpay_payment_id: mockPaymentId,
        razorpay_signature: mockSignature
      });
    } catch (err: any) {
      setPaymentError(err.message || "Simulated payment verification failed.");
      setIsProcessingPayment(false);
    }
  };

  return (
    <div className="pt-24 pb-20 min-h-screen px-4 bg-[#050505] relative">
      <div className="max-w-5xl mx-auto">
        
        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-4 mb-10 max-w-md mx-auto">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 bg-blue-600/20 border border-blue-500/40 rounded-full flex items-center justify-center text-xs font-bold text-blue-400">1</span>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Select</span>
          </div>
          <div className="w-10 h-px bg-white/10" />
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-lg shadow-blue-950">2</span>
            <span className="text-xs font-bold text-white uppercase tracking-wider">Pay / Activate</span>
          </div>
          <div className="w-10 h-px bg-white/10" />
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 bg-white/5 border border-white/10 rounded-full flex items-center justify-center text-xs font-bold text-gray-500">3</span>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Success</span>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Form Info */}
          <div className="lg:col-span-7 space-y-6">
            <h1 className="text-3xl font-bold font-display tracking-tight">Setup Server & Checkout</h1>
            <p className="text-gray-400 text-sm">Please verify your details below. Your game server instance will be provisioned instantly in our high-end datacenter.</p>

            <div className="glass-card p-6 space-y-6">
              <h3 className="font-bold text-lg border-b border-white/5 pb-3">1. Pterodactyl Sync</h3>
              
              <div>
                {!user && (
                  <div className="mb-4 bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-xs text-gray-300">
                    <p className="font-semibold text-blue-400 mb-1">Checking Out as Guest</p>
                    <p className="leading-normal">
                      Since you are not logged in, we will <strong>automatically create a secure Hostiva billing account</strong> for you under this email address. 
                      Your login temporary passcode, server connect specs, and panel links will be shown on the success screen and emailed to you instantly.
                    </p>
                    <p className="mt-2 text-[10px] text-gray-500">
                      Already have an account?{" "}
                      <Link to={`/login?redirect=/checkout/${planId}`} className="text-blue-400 font-bold hover:underline">
                        Sign In Now
                      </Link>{" "}
                      to sync under your current server portfolio.
                    </p>
                  </div>
                )}

                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2 tracking-widest">
                  Target Game Panel Email Address
                </label>
                <input 
                  type="email" 
                  value={panelEmail}
                  onChange={(e) => setPanelEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 px-4 outline-none focus:border-blue-500/50 transition-colors text-white text-sm"
                />
                <p className="text-[10px] text-gray-500 mt-2.5 leading-relaxed">
                  Your server will be allocated instantly to this email inside CP. If you don't have a Pterodactyl account yet, a new account will be auto-generated for you with login details emailed immediately!
                </p>
              </div>
            </div>

            {/* Coupon Application */}
            <div className="glass-card p-6">
              <h3 className="font-bold text-lg border-b border-white/5 pb-3 mb-4">2. Promo Codes</h3>
              <form onSubmit={handleApplyCoupon} className="flex gap-3">
                <input 
                  type="text" 
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder="ENTER COUPON CODE"
                  disabled={isApplyingCoupon}
                  className="flex-grow bg-white/5 border border-white/10 rounded-xl py-3 px-4 outline-none focus:border-blue-500/50 transition-colors text-white text-sm font-mono tracking-wider placeholder:tracking-normal placeholder:font-sans"
                />
                <button 
                  type="submit"
                  disabled={isApplyingCoupon || !couponCode.trim()}
                  className="bg-white/5 hover:bg-white/10 text-white font-bold px-6 py-3 rounded-xl transition-all text-xs uppercase tracking-wider border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isApplyingCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
                </button>
              </form>

              <AnimatePresence mode="wait">
                {couponError && (
                  <motion.p 
                    initial={{ opacity: 0, y: -5 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    exit={{ opacity: 0 }} 
                    className="text-red-400 text-xs mt-3 flex items-center gap-1.5"
                  >
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {couponError}
                  </motion.p>
                )}
                {couponSuccess && (
                  <motion.p 
                    initial={{ opacity: 0, y: -5 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    exit={{ opacity: 0 }} 
                    className="text-green-400 text-xs mt-3 flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5 shrink-0" /> {couponSuccess}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Right Column: Order Summary */}
          <div className="lg:col-span-5 space-y-6">
            <div className="glass-card p-6 border-blue-500/20 bg-[#0a0a0a]">
              <h3 className="font-bold text-lg border-b border-white/5 pb-3 mb-4">Order Summary</h3>
              
              {/* Product Info */}
              <div className="mb-6 flex gap-4 bg-white/5 p-4 rounded-xl border border-white/5 items-center">
                <div className="w-12 h-12 bg-blue-600/10 rounded-xl flex items-center justify-center border border-blue-500/20">
                  <Cpu className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm uppercase tracking-wide">{plan.name}</h4>
                  <p className="text-gray-500 text-xs font-mono">{plan.hardware}</p>
                </div>
              </div>

              {/* Technical Specifications */}
              <div className="grid grid-cols-2 gap-3 mb-6 bg-white/5 p-4 rounded-xl border border-white/5 text-xs text-gray-400">
                <div className="flex items-center gap-2">
                  <Database className="w-3.5 h-3.5 text-green-500 shrink-0" />
                  <span>{plan.specs.ram} Dedicated RAM</span>
                </div>
                <div className="flex items-center gap-2">
                  <Cpu className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span>{plan.specs.cpu} CPU Allocation</span>
                </div>
                <div className="flex items-center gap-2">
                  <HardDrive className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                  <span>{plan.specs.disk} SSD Storage</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                  <span>{plan.specs.backups} Daily Backup Slot</span>
                </div>
              </div>

              {/* Financial Summary */}
              <div className="space-y-3.5 mb-6 text-sm border-t border-b border-white/5 py-4">
                <div className="flex justify-between text-gray-400">
                  <span>Subscription Price</span>
                  <span>₹{basePrice}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-green-400">
                    <span className="flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> Coupon Discount ({discountPercent}%)</span>
                    <span>-₹{discountAmount}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-white text-base pt-2 border-t border-dashed border-white/10">
                  <span>Total Due Today</span>
                  <span className="text-blue-500">₹{totalAmount}</span>
                </div>
              </div>

              {paymentError && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3 text-red-500 text-xs mb-6">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{paymentError}</span>
                </div>
              )}

              {/* Trigger Button */}
              <button 
                onClick={handleCheckout}
                disabled={isProcessingPayment}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-blue-900/10 flex items-center justify-center gap-2 text-sm uppercase tracking-wider"
              >
                {isProcessingPayment ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Completing Activation...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    Pay with Razorpay <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="mt-4 text-center">
                <p className="text-[10px] text-gray-500 tracking-wider uppercase leading-relaxed">
                  256-Bit SSL Encrypted Verification • Instant Activation
                </p>
                <Link to="/" className="text-xs text-gray-600 hover:text-white transition-colors mt-4 block">
                  &larr; Cancel and return
                </Link>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Polish Sandbox Razorpay Gateway IFrame Simulator */}
      <AnimatePresence>
        {showSandboxModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowSandboxModal(false);
                setIsProcessingPayment(false);
              }}
              className="absolute inset-0 bg-[#050505]/95 backdrop-blur-md"
            />

            {/* Gateway UI Content */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md bg-[#0d0d0d] border border-blue-500/20 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            >
              {/* Header */}
              <div className="bg-blue-600 p-5 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/10 rounded-xl">
                    <CreditCard className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm tracking-wide">Razorpay Checkout</h3>
                    <p className="text-[10px] text-white/70 italic">Sandbox Simulation Portal</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-blue-100 uppercase font-bold tracking-wider">Amount Due</p>
                  <p className="text-lg font-bold">₹{totalAmount}</p>
                </div>
              </div>

              {/* Merchant Details */}
              <div className="bg-white/5 border-b border-white/5 px-6 py-3 flex justify-between items-center text-xs text-gray-400">
                <span>Merchant: <strong className="text-white">Hostiva Solutions</strong></span>
                <span>ID: rzp_test_sandbox</span>
              </div>

              {/* Form Body */}
              <div className="p-6 space-y-6 flex-grow">
                <p className="text-[11px] text-gray-400 leading-relaxed text-center">
                  This simulated payment gateway handles order processing right inside the AI Studio preview window. No real money is charged.
                </p>

                {/* Simulated Payment Modes */}
                <div className="grid grid-cols-3 gap-3">
                  <button 
                    onClick={() => setSandboxPaymentMode("card")}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-2 ${
                      sandboxPaymentMode === "card" 
                        ? 'border-blue-500 bg-blue-500/10 text-white' 
                        : 'border-white/10 hover:border-white/20 text-gray-400'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 text-blue-400" />
                    <span>Card</span>
                  </button>
                  <button 
                    onClick={() => setSandboxPaymentMode("upi")}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-2 ${
                      sandboxPaymentMode === "upi" 
                        ? 'border-blue-500 bg-blue-500/10 text-white' 
                        : 'border-white/10 hover:border-white/20 text-gray-400'
                    }`}
                  >
                    <Cpu className="w-4 h-4 text-purple-400" />
                    <span>UPI/QR</span>
                  </button>
                  <button 
                    onClick={() => setSandboxPaymentMode("netbanking")}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-2 ${
                      sandboxPaymentMode === "netbanking" 
                        ? 'border-blue-500 bg-blue-500/10 text-white' 
                        : 'border-white/10 hover:border-white/20 text-gray-400'
                    }`}
                  >
                    <Database className="w-4 h-4 text-emerald-400" />
                    <span>Netbank</span>
                  </button>
                </div>

                {/* Form fields depending on choice */}
                <div className="bg-white/5 border border-white/5 rounded-xl p-4 text-xs space-y-3">
                  {sandboxPaymentMode === "card" && (
                    <div className="space-y-2">
                      <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Card Details</div>
                      <div className="bg-[#111] p-2.5 rounded border border-white/5 font-mono text-gray-300 flex justify-between">
                        <span>4111 2222 3333 4444</span>
                        <span>12/28</span>
                      </div>
                    </div>
                  )}
                  {sandboxPaymentMode === "upi" && (
                    <div className="space-y-2">
                       <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">UPI Virtual Address</div>
                       <div className="bg-[#111] p-2.5 rounded border border-white/5 font-mono text-gray-300">
                         {user?.email ? `${user.email.split('@')[0]}@okhdfcbank` : "customer@razorpay"}
                       </div>
                    </div>
                  )}
                  {sandboxPaymentMode === "netbanking" && (
                    <div className="space-y-2">
                      <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Selected Bank</div>
                      <div className="bg-[#111] p-2.5 rounded border border-white/5 text-gray-300 font-bold">
                        State Bank of India (Sandbox Secure)
                      </div>
                    </div>
                  )}
                  <div className="pt-2 border-t border-white/5 text-[10px] text-gray-500 leading-normal">
                    This will instantly trigger the Razorpay verification and provision an active Minecraft/VPS node under <span className="text-white font-mono">{panelEmail}</span>.
                  </div>
                </div>
              </div>

              {/* Action Panel */}
              <div className="bg-[#141414] p-5 border-t border-white/5 flex gap-3 text-sm font-semibold">
                <button 
                  onClick={() => {
                    setShowSandboxModal(false);
                    setIsProcessingPayment(false);
                    if (sandboxOptions?.modal?.ondismiss) {
                      sandboxOptions.modal.ondismiss();
                    }
                  }}
                  className="flex-grow py-3 px-4 rounded-xl border border-white/10 hover:bg-white/5 transition-all text-center text-gray-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  onClick={executeSimulatedPayment}
                  className="flex-grow py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 transition-all text-center text-white font-bold glow-blue cursor-pointer"
                >
                  Simulate Success
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
