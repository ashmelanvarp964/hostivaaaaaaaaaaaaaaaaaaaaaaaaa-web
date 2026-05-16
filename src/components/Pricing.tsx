import { motion } from "motion/react";
import { Check, Zap, Wallet, Cpu, Database, HardDrive, Shield } from "lucide-react";
import { plans } from "@/src/lib/plans";
import { Link } from "react-router-dom";
import { useState } from "react";

export default function Pricing() {
  const [category, setCategory] = useState<"budget" | "performance">("performance");

  const filteredPlans = plans.filter(p => p.category === category);

  return (
    <section id="pricing" className="py-24 bg-[#080808]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold font-display mb-6">Choose Your Plan</h2>
          
          {/* Category Switcher */}
          <div className="flex flex-wrap justify-center bg-white/5 p-1 rounded-xl border border-white/10 mb-8 gap-0.5">
            <button 
              onClick={() => setCategory("performance")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] uppercase tracking-wider font-bold transition-all ${category === 'performance' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
            >
              <Zap className="w-3.5 h-3.5" /> Performance
            </button>
            <button 
              onClick={() => setCategory("budget")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] uppercase tracking-wider font-bold transition-all ${category === 'budget' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
            >
              <Wallet className="w-3.5 h-3.5" /> Budget
            </button>
            <div className="relative group">
              <button 
                disabled
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] uppercase tracking-wider font-bold text-gray-700 cursor-not-allowed grayscale"
              >
                <Cpu className="w-3.5 h-3.5" /> VPS
              </button>
              <span className="absolute -top-1.5 -right-1.5 bg-blue-500/20 text-blue-400 text-[7px] font-bold px-1.5 py-0.5 rounded border border-blue-500/30 uppercase tracking-tighter">Soon</span>
            </div>
            <div className="relative group">
              <button 
                disabled
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] uppercase tracking-wider font-bold text-gray-700 cursor-not-allowed grayscale"
              >
                <Database className="w-3.5 h-3.5" /> VDS
              </button>
              <span className="absolute -top-1.5 -right-1.5 bg-blue-500/20 text-blue-400 text-[7px] font-bold px-1.5 py-0.5 rounded border border-blue-500/30 uppercase tracking-tighter">Soon</span>
            </div>
          </div>
          
          <p className="text-gray-400 max-w-xl mx-auto italic text-sm">
            {category === 'performance' 
              ? "High-end Ryzen 7 7700X @ 4.491GHz hardware for maximum performance gaming." 
              : "Affordable hosting on Intel nodes. Perfect for small communities."}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredPlans.map((plan, idx) => (
            <div
              key={plan.id}
              className={`glass-card p-8 flex flex-col hover:border-blue-500/30 transition-all ${plan.recommended ? 'border-blue-500/50 ring-1 ring-blue-500/20 relative scale-[1.02] z-10' : ''}`}
            >
              {plan.recommended && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
                  BEST VALUE
                </div>
              )}
              
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold tracking-tighter">₹{plan.price}</span>
                  <span className="text-gray-500">/mo</span>
                </div>
              </div>

              {/* Specific Specs Grid */}
              <div className="grid grid-cols-2 gap-3 mb-8">
                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                  <div className="flex items-center gap-2 mb-1 text-blue-400">
                    <Cpu className="w-3 h-3" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">CPU</span>
                  </div>
                  <div className="text-sm font-bold">{plan.specs.cpu}</div>
                </div>
                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                  <div className="flex items-center gap-2 mb-1 text-green-400">
                    <Database className="w-3 h-3" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">RAM</span>
                  </div>
                  <div className="text-sm font-bold">{plan.specs.ram}</div>
                </div>
                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                  <div className="flex items-center gap-2 mb-1 text-purple-400">
                    <HardDrive className="w-3 h-3" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">DISK</span>
                  </div>
                  <div className="text-sm font-bold">{plan.specs.disk}</div>
                </div>
                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                  <div className="flex items-center gap-2 mb-1 text-orange-400">
                    <Shield className="w-3 h-3" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">BACKUPS</span>
                  </div>
                  <div className="text-sm font-bold">{plan.specs.backups}</div>
                </div>
              </div>

              <ul className="space-y-3 mb-8 flex-grow">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-xs text-gray-400">
                    <Check className="w-3 h-3 text-blue-500 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              <a
                href="https://discord.gg/SkCuzpE53Q"
                target="_blank"
                rel="noopener noreferrer"
                className={`w-full py-4 rounded-xl font-bold text-center transition-all ${
                  plan.recommended 
                    ? 'bg-blue-600 hover:bg-blue-500 text-white glow-blue shadow-[0_0_20px_-5px_rgba(59,130,246,0.5)]' 
                    : 'bg-white/5 hover:bg-white/10 text-white'
                }`}
              >
                Get Started
              </a>
            </div>
          ))}
        </div>
        
        <div className="mt-20 glass-card p-12 text-center relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-[100px] group-hover:bg-blue-600/20 transition-all" />
          <h3 className="text-2xl font-bold mb-4">Need something custom?</h3>
          <p className="text-gray-400 mb-8 max-w-2xl mx-auto italic">
            Looking for a specific setup? We offer custom hardware configurations for large networks and enterprise clients.
          </p>
          <a href="#" className="inline-flex items-center gap-2 text-blue-400 font-bold hover:text-blue-300 transition-colors">
            Contact Enterprise Support <Shield className="w-4 h-4" />
          </a>
        </div>

        <div className="mt-12 text-center text-[10px] text-gray-500 uppercase tracking-widest leading-relaxed">
          Prices and specifications are subject to change. <br />
          These budget servers will be given in our cheap node so there will be performance issues compared to our premium plan.
        </div>
      </div>
    </section>
  );
}
