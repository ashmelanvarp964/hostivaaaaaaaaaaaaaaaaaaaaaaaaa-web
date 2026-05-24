import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../context/AuthContext";
import { auth, db } from "../lib/firebase";
import { collection, query, where, orderBy, getDocs, addDoc, serverTimestamp, doc, updateDoc, arrayUnion, onSnapshot } from "firebase/firestore";
import { MessageSquare, Send, Loader2, Plus, Clock, CheckCircle2, Ticket, ShieldCheck } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export default function Support() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  
  const [newTicket, setNewTicket] = useState({ subject: "", message: "", priority: "MEDIUM" });
  const [reply, setReply] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/login");
      return;
    }

    const path = "tickets";
    const q = query(
      collection(db, path),
      where("userId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort in memory because Firestore requires composite indexes for where + orderBy
      docs.sort((a: any, b: any) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      });
      setTickets(docs);
      setLoading(false);
    }, (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (err) {
        console.error("Support listener failed", err);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, authLoading, navigate]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newTicket.subject || !newTicket.message) return;

    setLoading(true);
    const path = "tickets";
    try {
      await addDoc(collection(db, path), {
        userId: user.uid,
        email: user.email,
        subject: newTicket.subject,
        message: newTicket.message,
        priority: newTicket.priority,
        status: "OPEN",
        createdAt: serverTimestamp(),
        replies: []
      });
      setIsCreating(false);
      setNewTicket({ subject: "", message: "", priority: "MEDIUM" });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply || !selectedTicket) return;

    const path = `tickets/${selectedTicket.id}`;
    try {
      const ticketRef = doc(db, "tickets", selectedTicket.id);
      await updateDoc(ticketRef, {
        replies: arrayUnion({
          sender: "USER",
          message: reply,
          timestamp: new Date().toISOString()
        }),
        status: "OPEN" // Re-open if closed or marked as replied
      });
      setReply("");
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] pt-28 pb-20 px-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold font-display">Support Tickets</h1>
            <p className="text-gray-400 mt-2">Get technical help from the Hostiva experts.</p>
          </div>
          <button 
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20"
          >
            <Plus className="w-5 h-5" /> New Ticket
          </button>
        </div>

        <div className="grid lg:grid-cols-12 gap-8">
          {/* Ticket List */}
          <div className="lg:col-span-12">
            <div className="glass-card overflow-hidden">
              <div className="grid lg:grid-cols-3 min-h-[600px]">
                <div className="border-r border-white/5 overflow-y-auto max-h-[600px]">
                  {tickets.length === 0 ? (
                    <div className="p-8 text-center">
                      <Ticket className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                      <p className="text-gray-500 text-sm">No tickets found.</p>
                    </div>
                  ) : (
                    tickets.map(ticket => (
                      <button 
                        key={ticket.id}
                        onClick={() => setSelectedTicket(ticket)}
                        className={`w-full text-left p-6 border-b border-white/5 transition-all hover:bg-white/[0.02] ${selectedTicket?.id === ticket.id ? 'bg-white/[0.05] border-l-4 border-l-blue-500' : ''}`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex gap-2 items-center">
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono border ${
                              ticket.priority === 'HIGH' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                              ticket.priority === 'MEDIUM' ? 'bg-amber-500/10 text-amber-505 border-amber-500/20' :
                              'bg-gray-500/10 text-gray-400 border-white/5'
                            }`}>
                              {ticket.priority || 'MEDIUM'}
                            </span>
                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                              ticket.status === 'OPEN' ? 'bg-blue-500/10 text-blue-400' :
                              ticket.status === 'REPLIED' ? 'bg-green-500/10 text-green-400' :
                              'bg-gray-500/10 text-gray-400'
                            }`}>
                              {ticket.status}
                            </span>
                          </div>
                          <span className="text-[10px] text-gray-500 font-mono">
                            {ticket.createdAt?.toDate().toLocaleDateString()}
                          </span>
                        </div>
                        <h4 className="font-bold text-sm text-white truncate">{ticket.subject}</h4>
                        <p className="text-xs text-gray-500 truncate mt-1">{ticket.message}</p>
                      </button>
                    ))
                  )}
                </div>

                <div className="lg:col-span-2 flex flex-col bg-black/20">
                  {selectedTicket ? (
                    <>
                      <div className="p-6 border-b border-white/5 flex items-center justify-between">
                        <div>
                          <h3 className="font-bold">{selectedTicket.subject}</h3>
                          <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Ticket ID: {selectedTicket.id}</p>
                        </div>
                        <CheckCircle2 className={`w-5 h-5 ${selectedTicket.status === 'CLOSED' ? 'text-gray-500' : 'text-blue-500'}`} />
                      </div>

                      <div className="flex-1 p-6 overflow-y-auto max-h-[400px] space-y-6">
                        {/* Initial Message */}
                        <div className="flex flex-col items-start max-w-[80%]">
                          <div className="bg-white/5 p-4 rounded-2xl rounded-tl-none border border-white/10">
                            <p className="text-sm text-gray-300">{selectedTicket.message}</p>
                          </div>
                          <span className="text-[10px] text-gray-500 mt-2 font-mono">You • {selectedTicket.createdAt?.toDate().toLocaleString()}</span>
                        </div>

                        {/* Replies */}
                        {selectedTicket.replies.map((r: any, i: number) => (
                          <div key={i} className={`flex flex-col ${r.sender === 'ADMIN' ? 'items-end' : 'items-start'} max-w-[80%] ${r.sender === 'ADMIN' ? 'ml-auto' : ''}`}>
                            <div className={`p-4 rounded-2xl ${r.sender === 'ADMIN' ? 'bg-blue-600/10 border-blue-500/20' : 'bg-white/5 border-white/10'} border`}>
                              <p className="text-sm text-gray-300">{r.message}</p>
                            </div>
                            <span className="text-[10px] text-gray-500 mt-2 font-mono">
                              {r.sender === 'ADMIN' ? 'Staff' : 'You'} • {new Date(r.timestamp).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>

                      {selectedTicket.status !== 'CLOSED' && (
                        <form onSubmit={handleReply} className="p-6 border-t border-white/5 flex gap-4">
                          <input 
                            type="text" 
                            placeholder="Type your response..."
                            value={reply}
                            onChange={(e) => setReply(e.target.value)}
                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none"
                          />
                          <button className="bg-blue-600 p-3 rounded-xl hover:bg-blue-500 transition-all">
                            <Send className="w-5 h-5" />
                          </button>
                        </form>
                      )}
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-12 space-y-4">
                      <MessageSquare className="w-12 h-12 text-blue-500/20" />
                      <div>
                        <h3 className="font-bold text-gray-400">No ticket selected</h3>
                        <p className="text-sm text-gray-600">Select a ticket from the list or create a new one.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Payment Claim Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-8 border-blue-500/20 bg-blue-500/5 mt-8"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-blue-600 rounded-2xl">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Payment Issues?</h3>
              <p className="text-gray-400 text-sm">If you paid but didn't get your server, use our verification tool.</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Link 
              to="/verify-payment" 
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all"
            >
              Verify Payment
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {isCreating && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreating(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-xl glass-card p-8 shadow-2xl"
            >
              <h2 className="text-2xl font-bold mb-6">Open New Ticket</h2>
              <form onSubmit={handleCreateTicket} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Subject</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Server Setup Issue"
                    value={newTicket.subject}
                    onChange={(e) => setNewTicket({...newTicket, subject: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Priority (LOW / MEDIUM / HIGH)</label>
                  <select
                    value={newTicket.priority}
                    onChange={(e) => setNewTicket({...newTicket, priority: e.target.value})}
                    className="w-full bg-black border border-white/10 rounded-xl px-4 py-4 focus:border-blue-500 outline-none transition-all cursor-pointer text-sm text-gray-300"
                  >
                    <option value="LOW" className="bg-[#111]">LOW</option>
                    <option value="MEDIUM" className="bg-[#111]">MEDIUM</option>
                    <option value="HIGH" className="bg-[#111]">HIGH</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Message</label>
                  <textarea 
                    required
                    rows={4}
                    placeholder="Describe your issue in detail..."
                    value={newTicket.message}
                    onChange={(e) => setNewTicket({...newTicket, message: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 focus:border-blue-500 outline-none transition-all resize-none"
                  />
                </div>
                <div className="flex gap-4">
                  <button 
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="flex-1 py-4 rounded-xl font-bold bg-white/5 hover:bg-white/10 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-4 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 transition-all glow-blue shadow-lg shadow-blue-600/20"
                  >
                    Submit Ticket
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
