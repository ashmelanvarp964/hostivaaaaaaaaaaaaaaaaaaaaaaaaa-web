import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MessageSquare, Send, X, Bot, Loader2, User, RotateCcw, Activity, ThumbsUp, ThumbsDown } from "lucide-react";
import { Virtuoso } from "react-virtuoso";

const BASE_SYSTEM_INSTRUCTION = `You are "Hostiva Elite Support AI", an extremely knowledgeable, proactive, and friendly hosting consultant. Your tone is professional, technical yet accessible, and always customer-first.

Your Core Mission:
1. Help users select the PERFECT hosting plan by analyzing their specific needs (game type, player count, modpacks, region).
2. Proactively monitor 'Live Server Load' to ensure users aren't placed on stressed nodes. If a node is at >60% load, recommend a higher-tier plan or mention we are balancing capacity.
3. Educate users on why Single-Threaded performance (GHz) is the king of game hosting.

Live Capabilities:
- You have access to real-time network load data. Use it! 
- If a user asks "How is the network?", summarize the load across Performance vs Budget categories.
- Always include the specific Hardware name (e.g., Ryzen 7 7700X) when explaining performance.

Plan Selection Protocol (INR Pricing):
- < 10 players, Vanilla: Classic (Budget) or Premium Iron (Performance).
- 10-30 players, Light Mods: Epic (Budget) or Premium Gold (Performance).
- 30-50 players, Heavy Mods (ATM9/RLCraft): Premium Emerald (Performance) is our flagship recommendation.
- 50+ players, Network: Premium Netherite or higher.

Response Formatting:
- When you recommend a specific plan, use the tag [PLAN:plan-id] at the end of your recommendation to show a quick-buy card. You can suggest up to 2 plans per message.
- Use bold text for technical specs.
- Use short, punchy paragraphs.

Current Server Network Context (MUST USE THIS FOR LIVE QUERIES):
{NETWORK_LOAD_DATA}

Strict Guidelines:
- Do NOT make up prices. Only use information provided in your instructions or known Hostiva facts.
- If unsure about a technical requirement, ask the user for more details (e.g., "Which modpack are you planning to run?").
- ALWAYS mention that we use NVMe SSDs across the board.`;

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  feedback?: 'positive' | 'negative';
}

interface LoadData {
  id: string;
  name: string;
  load: number;
  status: string;
  latency: number;
  region?: string;
  hardware?: string;
}

export function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem("hostiva_chat_history");
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (err) {
      console.error("Failed to load chat history from local storage:", err);
    }
    return [
      { id: "1", role: "assistant", content: "Hi! I'm Hostiva's AI Assistant. How can I help you choose the perfect hosting plan today?" }
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem("hostiva_chat_history", JSON.stringify(messages));
    } catch (err) {
      console.error("Failed to save chat history to local storage:", err);
    }
  }, [messages]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [networkLoad, setNetworkLoad] = useState<LoadData[]>([]);
  const virtuosoRef = useRef<any>(null);

  useEffect(() => {
    const fetchLoad = async () => {
      try {
        const res = await fetch("/api/network-load");
        if (res.ok) {
          const data = await res.json();
          setNetworkLoad(data);
        }
      } catch (err) {
        console.error("Failed to fetch load data:", err);
      }
    };

    fetchLoad();
    const interval = setInterval(fetchLoad, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, []);

  const getSystemInstruction = () => {
    const loadSummary = networkLoad.length > 0 
      ? networkLoad.map(item => `- ${item.name}: ${item.load}% load, ${item.latency}ms latency (${item.status})`).join("\n")
      : "Network data is currently synchronizing...";
    
    return BASE_SYSTEM_INSTRUCTION.replace("{NETWORK_LOAD_DATA}", loadSummary);
  };

  const handleClearHistory = () => {
    setMessages([
      { id: Date.now().toString(), role: "assistant", content: "Hi! I've cleared our chat. How can I help you from here?" }
    ]);
  };

  const handleFeedback = async (messageId: string, type: 'positive' | 'negative') => {
    // Find the message in chat history to extract details
    const msgIndex = messages.findIndex(msg => msg.id === messageId);
    if (msgIndex === -1) return;

    const assistantMsg = messages[msgIndex];

    // Optimistic update
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, feedback: type } : msg
    ));

    // Look back for the closest user prompt to provide complete conversation context
    let userPrompt = "";
    for (let i = msgIndex - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        userPrompt = messages[i].content;
        break;
      }
    }

    try {
      await fetch("/api/ai/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          messageId, 
          type,
          messageContent: assistantMsg.content,
          userPrompt,
          history: messages.slice(0, msgIndex + 1).map(m => ({ role: m.role, content: m.content }))
        })
      });
    } catch (error) {
      console.error("Failed to submit feedback:", error);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          systemInstruction: getSystemInstruction()
        })
      });

      if (!response.ok) {
        throw new Error("Failed to get AI response");
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.text || "I'm sorry, I couldn't process that request.",
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("AI Error:", error);
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: "assistant", content: "Sorry, I encountered an error. Please try again later or contact our human support." }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessageContent = (msg: Message) => {
    if (msg.role === 'user') return msg.content;

    // Parse for [PLAN:id] tags
    const planRegex = /\[PLAN:([a-zA-Z0-9-]+)\]/g;
    const planIds: string[] = [];
    let cleanText = msg.content.replace(planRegex, (_, id) => {
      planIds.push(id);
      return '';
    });

    return (
      <div className="space-y-3">
        <div className="whitespace-pre-wrap">{cleanText.trim()}</div>
        {planIds.length > 0 && (
          <div className="grid gap-2 mt-2">
            {planIds.map(id => {
              // We'd ideally fetch plan details here, for now we map to names
              const planName = id.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
              return (
                <a 
                  key={id}
                  href={`#pricing`}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-between p-3 bg-blue-600/10 border border-blue-500/20 rounded-xl hover:bg-blue-600/20 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
                      <Activity className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">Recommended Plan</p>
                      <p className="text-sm font-bold text-white">{planName}</p>
                    </div>
                  </div>
                  <div className="text-blue-400 group-hover:translate-x-1 transition-transform">→</div>
                </a>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100]">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="absolute bottom-20 right-0 w-[380px] h-[550px] bg-[#0c0c0c] border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden glass-card"
          >
            {/* Header */}
            <div className="p-4 border-b border-white/5 bg-blue-600/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Hostiva AI</h3>
                  <div className="flex items-center gap-3 mt-0.5">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-[10px] text-gray-400 font-medium">Online</span>
                    </div>
                    {networkLoad.length > 0 && (
                      <div className="flex items-center gap-1 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/10">
                        <Activity className="w-2.5 h-2.5 text-blue-400" />
                        <span className="text-[9px] text-blue-400 font-bold uppercase tracking-wider">
                          Load: {Math.round(networkLoad.reduce((acc, curr) => acc + curr.load, 0) / networkLoad.length)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleClearHistory}
                  title="Clear Conversation"
                  className="w-8 h-8 rounded-full hover:bg-white/5 flex items-center justify-center text-gray-400 hover:text-blue-400 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-full hover:bg-white/5 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 min-h-0 bg-transparent flex flex-col">
              <Virtuoso
                ref={virtuosoRef}
                data={messages}
                followOutput="auto"
                initialTopMostItemIndex={messages.length - 1}
                className="flex-1 scrollbar-hide"
                itemContent={(index, msg) => (
                  <div className={`p-4 pt-1 flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center ${
                        msg.role === 'assistant' ? 'bg-blue-500/20 text-blue-400' : 'bg-white/10 text-gray-400'
                      }`}>
                        {msg.role === 'assistant' ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}
                      </div>
                      <div className="flex flex-col gap-1 w-full">
                        <div className={`p-3 rounded-2xl text-sm leading-relaxed transition-all duration-300 ${
                          msg.role === 'user' 
                            ? 'bg-blue-600 text-white rounded-tr-none' 
                            : `bg-white/5 text-gray-200 border rounded-tl-none ${
                                msg.feedback === 'positive' 
                                  ? 'border-green-500/20 shadow-[0_0_15px_-3px_rgba(34,197,94,0.12)] bg-green-500/[0.02]' 
                                  : msg.feedback === 'negative'
                                  ? 'border-red-500/20 bg-red-500/[0.02]'
                                  : 'border-white/5'
                              }`
                        }`}>
                          {renderMessageContent(msg)}
                        </div>
                        {msg.role === 'assistant' && (
                          <div className="flex items-center justify-between gap-2 mt-1 px-1">
                            <div className="flex items-center gap-1.5">
                              <motion.button
                                whileHover={{ scale: 1.15 }}
                                whileTap={{ scale: 0.85 }}
                                onClick={() => handleFeedback(msg.id, 'positive')}
                                className={`p-1 rounded hover:bg-white/5 transition-colors duration-200 cursor-pointer ${
                                  msg.feedback === 'positive' 
                                    ? 'text-green-400 bg-green-500/10' 
                                    : 'text-gray-500 hover:text-green-400'
                                }`}
                                title="Helpful"
                              >
                                <ThumbsUp className="w-3.5 h-3.5" />
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.15 }}
                                whileTap={{ scale: 0.85 }}
                                onClick={() => handleFeedback(msg.id, 'negative')}
                                className={`p-1 rounded hover:bg-white/5 transition-colors duration-200 cursor-pointer ${
                                  msg.feedback === 'negative' 
                                    ? 'text-red-400 bg-red-500/10' 
                                    : 'text-gray-500 hover:text-red-400'
                                }`}
                                title="Not helpful"
                              >
                                <ThumbsDown className="w-3.5 h-3.5" />
                              </motion.button>
                            </div>
                            <AnimatePresence>
                              {msg.feedback && (
                                <motion.span
                                  initial={{ opacity: 0, x: -6 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={{ opacity: 0 }}
                                  className="text-[10px] text-gray-500 font-medium italic select-none"
                                >
                                  {msg.feedback === 'positive' ? "Liked! Thanks" : "Sending to engineers"}
                                </motion.span>
                              )}
                            </AnimatePresence>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                components={{
                  Footer: () => isLoading ? (
                    <div className="p-4 pt-1 flex justify-start">
                      <div className="flex gap-3 max-w-[85%]">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                          <Bot className="w-5 h-5" />
                        </div>
                        <div className="bg-white/5 p-3 rounded-2xl border border-white/5 rounded-tl-none flex items-center gap-2">
                          <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                          <span className="text-xs text-gray-400 font-medium italic">Hostiva AI is thinking...</span>
                        </div>
                      </div>
                    </div>
                  ) : <div className="h-4" />
                }}
              />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-white/5 bg-white/5">
              <div className="relative">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Ask about our plans or hardware..."
                  className="w-full bg-[#151515] border border-white/10 rounded-2xl pl-4 pr-12 py-3 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-colors placeholder:text-gray-600"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={isLoading || !inputValue.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 rounded-lg flex items-center justify-center text-white transition-all hover:scale-105 active:scale-95"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[9px] text-center text-gray-500 mt-2 font-medium uppercase tracking-wider">
                Powered by Gemini 3 Flash
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-500/20 flex items-center justify-center transition-all relative overflow-hidden group"
        id="ai-assistant-toggle"
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity" />
        {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
      </motion.button>
    </div>
  );
}
