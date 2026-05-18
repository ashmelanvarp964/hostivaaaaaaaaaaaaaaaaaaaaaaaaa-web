import { useEffect } from "react";
import { Loader2, ExternalLink } from "lucide-react";

export default function Billing() {
  useEffect(() => {
    // Check if we have a payment verification in the URL
    const params = new URLSearchParams(window.location.search);
    if (params.get("razorpay_payment_id")) {
      window.location.href = "/verify-payment" + window.location.search;
      return;
    }

    // Redirect to external billing panel
    window.location.href = "https://billing.hostivaa.xyz";
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#050505] text-white p-4">
      <div className="glass-card p-12 max-w-md w-full text-center space-y-6 border-blue-500/20">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto" />
        <div>
          <h1 className="text-2xl font-bold font-display mb-2">Redirecting to Billing...</h1>
          <p className="text-gray-400 text-sm italic">Taking you to our secure external billing system.</p>
        </div>
        <a 
          href="https://billing.hostivaa.xyz" 
          className="flex items-center justify-center gap-2 text-blue-400 font-bold hover:text-blue-300 transition-colors pt-4"
        >
          Not redirecting? Click here <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}
