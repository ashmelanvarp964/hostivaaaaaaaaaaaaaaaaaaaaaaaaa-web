import { Server, Github, Twitter, Linkedin, Mail } from "lucide-react";
import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="bg-[#050505] border-t border-white/5 pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-12 mb-16">
          <div className="col-span-1 md:col-span-1">
            <Link to="/" className="flex items-center gap-3 mb-6 group">
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
            <p className="text-gray-500 text-sm leading-relaxed mb-6">
              Next-generation cloud infrastructure for the ambitious developer. 
              Built for speed, secured by default.
            </p>
            <div className="flex gap-4">
              <a href="#" className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                <Twitter className="w-4 h-4 text-gray-400" />
              </a>
              <a href="#" className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                <Github className="w-4 h-4 text-gray-400" />
              </a>
              <a href="#" className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                <Linkedin className="w-4 h-4 text-gray-400" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-bold mb-6 text-sm uppercase tracking-widest text-gray-300">Services</h4>
            <ul className="space-y-4 text-sm text-gray-500">
              <li><a href="https://panel.hostivaa.xyz" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors">Game Panel</a></li>
              <li><Link to="/billing" className="hover:text-blue-400 transition-colors">Billing Area</Link></li>
              <li><a href="#pricing" className="hover:text-blue-400 transition-colors">Minecraft Hosting</a></li>
              <li><a href="#pricing" className="hover:text-blue-400 transition-colors">VDS Hosting</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-6 text-sm uppercase tracking-widest text-gray-300">Resources</h4>
            <ul className="space-y-4 text-sm text-gray-500">
              <li><a href="#" className="hover:text-blue-400 transition-colors">Documentation</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors">API Reference</a></li>
              <li><Link to="/admin" className="hover:text-blue-400 transition-colors">Admin Terminal</Link></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors">System Status</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-6 text-sm uppercase tracking-widest text-gray-300">Support</h4>
            <ul className="space-y-4 text-sm text-gray-500">
              <li><Link to="/support" className="hover:text-blue-400 transition-colors">Web Tickets</Link></li>
              <li><a href="https://discord.gg/YqUGrF9S" className="hover:text-blue-400 transition-colors">Discord Tickets</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors">Community</a></li>
              <li><a href="https://discord.gg/YqUGrF9S" className="hover:text-blue-400 transition-colors">Contact Sales</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-600 text-xs text-center">
            &copy; {new Date().getFullYear()} Hostiva Hosting Solutions. All rights reserved. 
          </p>
          <div className="flex gap-8 text-xs text-gray-600">
            <a href="#" className="hover:text-gray-400 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-gray-400 transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-gray-400 transition-colors">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
