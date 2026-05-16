import { motion } from "motion/react";
import { ChevronRight, Shield, Zap, Globe } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative pt-32 pb-20 overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 bg-blue-600/10 blur-[120px] rounded-full -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-6">
            <Zap className="w-3 h-3" />
            Powered by NVMe Gen4
          </span>
          <h1 className="text-5xl md:text-7xl font-bold font-display tracking-tight mb-6 leading-tight">
            Scale your vision <br />
            with <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600 font-black">Hostiva Speed</span>
          </h1>
          <p className="max-w-2xl mx-auto text-xl text-gray-400 mb-10 leading-relaxed">
            High-performance cloud hosting designed for modern developers. 
            Deploy in seconds, scale infinitely, and pay securely.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="#pricing" className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-xl font-semibold flex items-center gap-2 transition-all hover:scale-105 active:scale-95 glow-blue w-full sm:w-auto justify-center">
              Deploy Your App <ChevronRight className="w-4 h-4" />
            </a>
            <a href="#features" className="bg-white/5 hover:bg-white/10 border border-white/10 text-white px-8 py-4 rounded-xl font-semibold transition-all w-full sm:w-auto justify-center">
              Compare Plans
            </a>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div 
          className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 border-t border-white/5 pt-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <div className="text-center">
            <div className="text-2xl font-bold mb-1">99.99%</div>
            <div className="text-sm text-gray-500 uppercase tracking-widest">Uptime Guard</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold mb-1">&lt; 10ms</div>
            <div className="text-sm text-gray-500 uppercase tracking-widest">Global Latency</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold mb-1">256-bit</div>
            <div className="text-sm text-gray-500 uppercase tracking-widest">AES Encryption</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold mb-1">24/7/365</div>
            <div className="text-sm text-gray-500 uppercase tracking-widest">Expert Help</div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
