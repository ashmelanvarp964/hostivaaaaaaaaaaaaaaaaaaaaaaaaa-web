import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { Server, Menu, X, User } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#050505]/80 backdrop-blur-md border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl overflow-hidden group-hover:scale-110 transition-transform border border-white/10">
              <img 
                src="https://cdn.discordapp.com/icons/1411203632635969611/b2cd5299c32e7e7424ccb0053b987b68.webp?size=128" 
                alt="Hostiva Logo" 
                loading="lazy"
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-xl font-bold font-display tracking-tight text-blue-500">HOSTIVA</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <a href="/#features" className="text-sm text-gray-400 hover:text-white transition-colors">Features</a>
            <a href="/#pricing" className="text-sm text-gray-400 hover:text-white transition-colors">Pricing</a>
            <Link to="/billing" className="text-sm text-gray-400 hover:text-white transition-colors">Billing</Link>
            <Link to="/support" className="text-sm text-gray-400 hover:text-white transition-colors">Support</Link>
            <a href="/#about" className="text-sm text-gray-400 hover:text-white transition-colors">About</a>
            <Link to="/login" className="px-4 py-2 text-sm font-medium text-blue-500 hover:text-blue-400 transition-colors flex items-center gap-2">
              {user ? <><User className="w-4 h-4" /> Portal</> : "Login"}
            </Link>
            <a href="/#pricing" className="bg-white text-black px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
              Get Started
            </a>
          </div>

          <div className="md:hidden">
            <button onClick={() => setIsOpen(!isOpen)} className="p-2 text-gray-400">
              {isOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden bg-[#050505] border-b border-white/5 px-4 pt-2 pb-6 flex flex-col gap-4"
        >
          <a href="/#features" onClick={() => setIsOpen(false)} className="text-gray-400 py-2">Features</a>
          <a href="/#pricing" onClick={() => setIsOpen(false)} className="text-gray-400 py-2">Pricing</a>
          <Link to="/billing" onClick={() => setIsOpen(false)} className="text-gray-400 py-2">Billing</Link>
          <Link to="/support" onClick={() => setIsOpen(false)} className="text-gray-400 py-2">Support</Link>
          <a href="/#about" onClick={() => setIsOpen(false)} className="text-gray-400 py-2">About</a>
          <Link to="/login" onClick={() => setIsOpen(false)} className="text-gray-400 py-2 flex items-center gap-2">
            {user ? <><User className="w-4 h-4" /> Portal</> : "Login"}
          </Link>
          <a href="/#pricing" onClick={() => setIsOpen(false)} className="bg-white text-black px-4 py-3 rounded-lg text-center font-medium">
            Get Started
          </a>
        </motion.div>
      )}
    </nav>
  );
}
