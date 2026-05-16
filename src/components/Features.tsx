import { motion } from "motion/react";
import { Cpu, Globe, Lock, Rocket, Zap, Database } from "lucide-react";

const features = [
  {
    icon: <Rocket className="w-6 h-6 text-blue-500" />,
    title: "1-Click Deployment",
    description: "Launch your applications instantly with our optimized build pipelines. Support for React, Next.js, and more."
  },
  {
    icon: <Zap className="w-6 h-6 text-blue-500" />,
    title: "Eco-Friendly Power",
    description: "Our data centers run on 100% renewable energy without compromising on high-performance compute."
  },
  {
    icon: <Lock className="w-6 h-6 text-blue-500" />,
    title: "Hardened Security",
    description: "DDoS protection, automatic SSL, and iron-clad firewalls keep your data safe from day one."
  },
  {
    icon: <Globe className="w-6 h-6 text-blue-500" />,
    title: "Edge Network",
    description: "Deliver static assets from 300+ global edge locations for ultra-low latency worldwide."
  },
  {
    icon: <Database className="w-6 h-6 text-blue-500" />,
    title: "Managed Databases",
    description: "Connect to Redis, Postgres, or MongoDB with zero configuration overhead and auto-backups."
  },
  {
    icon: <Cpu className="w-6 h-6 text-blue-500" />,
    title: "Bare Metal Nodes",
    description: "Get the raw power of dedicated hardware with the flexibility of cloud orchestration."
  }
];

export default function Features() {
  return (
    <section id="features" className="py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <div className="max-w-2xl">
            <h2 className="text-3xl md:text-5xl font-bold font-display mb-6 tracking-tight">Built for speed, <br />designed for developers.</h2>
            <p className="text-gray-400 text-lg">Everything you need to build, deploy, and scale your digital products with confidence.</p>
          </div>
          <div className="bg-white/5 border border-white/10 px-6 py-4 rounded-2xl flex items-center gap-4">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium">All systems operational</span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              viewport={{ once: true }}
              className="glass-card p-8 hover:border-blue-500/30 transition-colors group"
            >
              <div className="mb-6 p-3 bg-blue-500/10 rounded-xl w-fit group-hover:bg-blue-500/20 transition-colors">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
              <p className="text-gray-400 leading-relaxed text-sm">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
