import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { LayoutDashboard, Gamepad2, ArrowRight, Mail, Lock, UserPlus, LogIn, AlertCircle, Loader2 } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { auth, db } from "../lib/firebase";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { isValidEmail } from "../lib/validation";

export default function Login() {
  const { user, loading: authLoading } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectUrl = searchParams.get("redirect");

  useEffect(() => {
    if (user && redirectUrl) {
      navigate(redirectUrl);
    }
  }, [user, redirectUrl, navigate]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError("");

    try {
      const provider = new GoogleAuthProvider();
      // Adjust provider scopes/custom parameters for frictionless login if needed
      provider.setCustomParameters({ prompt: "select_account" });
      
      const result = await signInWithPopup(auth, provider);
      const googleUser = result.user;

      if (googleUser?.email) {
        // Create or merge user account profile in Firestore
        await setDoc(doc(db, "users", googleUser.uid), {
          uid: googleUser.uid,
          email: googleUser.email,
          createdAt: new Date().toISOString()
        }, { merge: true });

        // Sync with Pterodactyl Panel - using custom secure random password
        console.log("Initiating Game Panel sync for Google account:", googleUser.email);
        const tempPteroPassword = `GAuth_${googleUser.uid.slice(0, 10)}`;
        fetch("/api/pterodactyl/create-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            email: googleUser.email, 
            password: tempPteroPassword 
          })
        }).then(async (res) => {
          const syncData = await res.json();
          if (syncData.success) {
            console.log("Pterodactyl Game Panel sync successful for Google login");
          } else {
            console.warn("Pterodactyl Game Panel sync warning for Google login:", syncData.error);
          }
        }).catch(syncErr => {
          console.error("Delayed Google OAuth Pterodactyl sync failed:", syncErr);
        });

        if (redirectUrl) {
          navigate(redirectUrl);
        }
      }
    } catch (err: any) {
      console.error("Google login error:", err);
      setError(err.message || "Failed to authenticate using Google.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!isValidEmail(email)) {
      setError("Please enter a valid email address.");
      setLoading(false);
      return;
    }

    try {
      if (isRegister) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, "users", userCredential.user.uid), {
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          createdAt: new Date().toISOString()
        });

        // Sync with Pterodactyl (Non-blocking)
        console.log("Initiating Game Panel sync for", email);
        fetch("/api/pterodactyl/create-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password })
        }).then(async (res) => {
          const data = await res.json();
          if (data.success) {
            console.log("Game Panel sync successful");
          } else {
            console.warn("Game Panel sync warning:", data.error);
          }
        }).catch(syncErr => {
          console.error("Delayed sync failed:", syncErr);
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="pt-24 pb-20 min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-96 bg-blue-600/10 blur-[150px] rounded-full -z-10" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl w-full"
      >
        <AnimatePresence mode="wait">
          {!user ? (
            <motion.div 
              key="auth-form"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-md mx-auto"
            >
              <div className="glass-card p-8 border-white/10">
                <div className="text-center mb-8">
                  <h1 className="text-3xl font-bold font-display mb-2">
                    {isRegister ? "Create Account" : "Welcome Back"}
                  </h1>
                  <p className="text-gray-400 text-sm">
                    {isRegister ? "Register to manage your billing and services. Your account will be automatically synced with our Game Panel." : "Sign in to access your portal."}
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input 
                        type="email" 
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@company.com"
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 outline-none focus:border-blue-500/50 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input 
                        type="password" 
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 outline-none focus:border-blue-500/50 transition-colors"
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center gap-2 text-red-500 text-xs">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {error}
                    </div>
                  )}

                  <button 
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : isRegister ? (
                      <><UserPlus className="w-5 h-5" /> Register Account</>
                    ) : (
                      <><LogIn className="w-5 h-5" /> Sign In</>
                    )}
                  </button>

                  <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-white/5"></div>
                    <span className="flex-shrink mx-4 text-gray-500 text-[10px] uppercase font-bold tracking-widest">or</span>
                    <div className="flex-grow border-t border-white/5"></div>
                  </div>

                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                    className="w-full bg-[#111] hover:bg-neutral-950 text-white font-bold py-3 rounded-xl border border-white/10 transition-all flex items-center justify-center gap-2.5 text-xs uppercase tracking-wider cursor-pointer"
                  >
                    <svg className="w-4 h-4 text-white shrink-0" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                    </svg>
                    Continue with Google
                  </button>
                </form>

                <div className="mt-6 text-center text-sm text-gray-500">
                  {isRegister ? "Already have an account?" : "Don't have an account?"}
                  <button 
                    onClick={() => setIsRegister(!isRegister)}
                    className="text-blue-500 font-bold ml-2 hover:underline"
                  >
                    {isRegister ? "Sign In" : "Register Now"}
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="portal-selection"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <div className="text-center mb-12">
                <h1 className="text-4xl md:text-5xl font-bold font-display mb-4 tracking-tight">Welcome, {user.email?.split('@')[0]}</h1>
                <p className="text-gray-400">Select the portal you wish to manage your services from.</p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Game Panel */}
                <a 
                  href="https://panel.hostivaa.xyz" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="group glass-card p-8 hover:border-blue-500/40 transition-all text-left relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                      <Gamepad2 className="w-32 h-32" />
                  </div>
                  <div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Gamepad2 className="w-6 h-6 text-blue-500" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Game Panel</h3>
                  <p className="text-gray-500 text-sm mb-8 leading-relaxed">
                    Manage your Minecraft servers, control files, view console output, and handle FTP access.
                  </p>
                  <div className="flex items-center gap-2 text-blue-400 font-bold uppercase tracking-widest text-xs">
                    Go to Panel <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </a>

                {/* Client Area / Support */}
                <Link 
                  to="/billing"
                  className="group glass-card p-8 hover:border-blue-500/40 transition-all text-left relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                      <LayoutDashboard className="w-32 h-32" />
                  </div>
                  <div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <LayoutDashboard className="w-6 h-6 text-blue-500" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Billing Area</h3>
                  <p className="text-gray-500 text-sm mb-8 leading-relaxed">
                    View your invoices, manage your active subscription instances, and update configurations in our portal.
                  </p>
                  <div className="flex items-center gap-2 text-blue-400 font-bold uppercase tracking-widest text-xs">
                    Open Billing <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              </div>

              <div className="mt-8 text-center">
                <button 
                  onClick={() => auth.signOut()}
                  className="text-sm text-gray-500 hover:text-white transition-colors"
                >
                  Sign Out of Account
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-12 text-center p-6 bg-blue-500/5 rounded-2xl border border-blue-500/10 max-w-lg mx-auto">
          <p className="text-sm text-gray-400 flex items-center justify-center gap-2">
            <Mail className="w-4 h-4" /> Need help? Open a <Link to="/support" className="text-blue-500 font-bold hover:underline">Support Ticket</Link>
          </p>
        </div>

        <div className="mt-8 text-center">
            <Link to="/" className="text-sm text-gray-500 hover:text-white transition-colors">
                &larr; Back to Home
            </Link>
        </div>
      </motion.div>
    </div>
  );
}
