import React from "react";
import { motion } from "motion/react";
import { Info, Shield, Users, Trophy } from "lucide-react";

export default function About() {
  return (
    <section id="about" className="py-24 bg-white/[0.02]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-6">
              <Info className="w-3 h-3" />
              Our Mission
            </div>
            <h2 className="text-3xl md:text-5xl font-bold font-display mb-6 tracking-tight">The future of game hosting is here.</h2>
            <p className="text-gray-400 text-lg leading-relaxed mb-8">
              Hostiva was founded with a single goal: to provide high-performance, cost-effective hosting solutions for gamers and developers in India. We believe that top-tier hardware shouldn't come with a top-tier price tag.
            </p>
            
            <div className="grid sm:grid-cols-2 gap-8">
              <div className="space-y-3">
                <div className="w-10 h-10 bg-blue-600/10 rounded-lg flex items-center justify-center text-blue-500">
                  <Shield className="w-5 h-5" />
                </div>
                <h4 className="font-bold">Trust & Reliability</h4>
                <p className="text-sm text-gray-500">We maintain 99.9% uptime with redundant networking and power systems.</p>
              </div>
              <div className="space-y-3">
                <div className="w-10 h-10 bg-blue-600/10 rounded-lg flex items-center justify-center text-blue-500">
                  <Users className="w-5 h-5" />
                </div>
                <h4 className="font-bold">Community Driven</h4>
                <p className="text-sm text-gray-500">Built by developers, for developers. We listen to our users' feedback above all else.</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="aspect-square bg-gradient-to-br from-blue-600/20 to-transparent rounded-3xl border border-white/5 overflow-hidden flex items-center justify-center">
              <div className="p-12 text-center">
                <Trophy className="w-20 h-20 text-blue-500 mx-auto mb-6 opacity-50" />
                <h3 className="text-6xl font-black text-white/10 mb-2">#1</h3>
                <p className="text-xl font-bold text-gray-400">Budget Performance Provider</p>
              </div>
            </div>
            
            {/* Decorative elements */}
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-blue-500/10 blur-2xl rounded-full" />
            <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-blue-500/5 blur-3xl rounded-full" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
