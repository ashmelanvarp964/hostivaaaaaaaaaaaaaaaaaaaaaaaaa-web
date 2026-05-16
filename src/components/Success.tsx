import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { CheckCircle2, Server, Download, ArrowRight } from "lucide-react";

export default function Success() {
  return (
    <div className="pt-40 pb-24 px-4 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", damping: 12 }}
        className="max-w-xl mx-auto"
      >
        <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-8">
          <CheckCircle2 className="w-12 h-12 text-green-500" />
        </div>
        
        <h1 className="text-4xl font-bold font-display mb-4">Payment Successful!</h1>
        <p className="text-gray-400 text-lg mb-10">
          Your hosting account is now being provisioned. <br />
          You'll receive an email with your credentials shortly.
        </p>

        <div className="grid sm:grid-cols-2 gap-4 mb-12">
          <div className="glass-card p-6 flex flex-col items-center gap-3">
            <Server className="w-8 h-8 text-blue-500" />
            <h3 className="font-bold">Access Panel</h3>
            <p className="text-xs text-gray-500">Manage your servers and deployments</p>
            <button className="text-blue-400 text-sm font-medium hover:underline flex items-center gap-1">
              Go to Dashboard <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="glass-card p-6 flex flex-col items-center gap-3">
            <Download className="w-8 h-8 text-blue-500" />
            <h3 className="font-bold">Invoice</h3>
            <p className="text-xs text-gray-500">Download your payment receipt</p>
            <button className="text-blue-400 text-sm font-medium hover:underline flex items-center gap-1">
              Download PDF <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        <Link 
          to="/"
          className="text-gray-500 hover:text-white transition-colors flex items-center justify-center gap-2"
        >
          Return to Home
        </Link>
      </motion.div>
    </div>
  );
}
