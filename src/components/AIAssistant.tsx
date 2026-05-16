import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MessageSquare, Send, X, Bot, Loader2, User, RotateCcw, Activity } from "lucide-react";
import { GoogleGenAI } from "@google/genai";
import { Virtuoso } from "react-virtuoso";

const BASE_SYSTEM_INSTRUCTION = `You are "Hostiva AI Assistant", a friendly and professional support expert for Hostiva. Your goal is to help users find the best hosting plan and answer questions about Hostiva's services.

About Hostiva:
- We provide premium and budget-friendly game server hosting.
- We use high-performance hardware including Ryzen 7 7700X @ 4.491GHz (Performance) and Intel Xeon (Budget).
- All plans feature NVMe/SSD storage, low latency network, and easy-to-use Pterodactyl control panel.
- Pricing is in INR (Indian Rupee).

Plan Performance & Recommendations:

Recommendation Logic by Use-Case:
- Vanilla Minecraft SMP (1-10 players): Classic Plan (Budget) or Premium Iron (Performance). Even budget plans handle vanilla well, but Premium Iron offers faster chunk loading.
- Modded Minecraft (1-10 players): Premium Emerald (Performance). 24GB RAM is the sweet spot for modpacks like "All The Mods 9" or "RLCraft" to prevent memory leaks and stuttering.
- Large Community SMP (30+ players): Premium Gold or Obsidian. Ryzen 7 7700X core speed is vital here to keep TPS at 20.0 as entities and terrain loading increase.
- BungeeCord/Velocity Proxy: Classic or Premium Iron. Proxies don't need much RAM, but benefit from low latency.
- Competitive CS2/Rust: Premium Gold. Higher CPU clock speed directly translates to lower server-side input lag.

Detailed Plan Breakdown:
Performance Plans (Ryzen 7 7700X @ 4.491GHz - Best for Modded/Demanding Servers):
- Premium Iron (8GB): Perfect for 20-40 players, light modpacks.
- Premium Gold (16GB): Handle 50+ players or medium sized modpacks with ease.
- Premium Emerald (24GB): Our recommended choice for all-around performance. handle large modpacks like ATM9 smoothly.
- Premium Obsidian (32GB): For large communities (100+ players) or heavy forge modpacks.
- Premium Netherite (48GB): Ultimate power for bungee networks or massive servers.
- Premium Gladiator (64GB): The beast. For the most demanding networks.

Budget Plans (Intel Xeon - Solid for Casual Play/SMPs):
- Classic Plan (6GB): Good for 5-10 friends playing vanilla or light plugins.
- Epic Plan (10GB): Solid for 15-20 players on a budget.
- Pro Plan (16GB): Great value for small communities.
- Power Plan (24GB): High capacity at an affordable price.
- Mega Plan (32GB): For larger budget-conscious communities.

Current Network Status (LIVE DATA):
{NETWORK_LOAD_DATA}

Common Questions:
- "How many members can I have?" -> We don't limit slots, but player count is determined by RAM and CPU. For vanilla, rule of thumb is 200MB per player. For modded, 500MB+ per player.
- "Why use Performance plans?" -> Minecraft and most game servers are "Single-Threaded" by nature. Imagine a 100-car race where only one lane is open. It doesn't matter if you have 64 lanes (cores), only the speed of that ONE lane (Single-core GHz) determines how fast the race finishes. Our Ryzen 7 7700X nodes @ 4.491GHz provide the extreme speed needed for that "one lane" to prevent lag even with complex modpacks.

Technical Hardware Guidance:
- CPU Core Speed vs. Core Count (The Most Important Choice):
  - Single-Core Speed (GHz/IPC): This is the "Engine Power". Essential for 90% of game servers. Minecraft's "Tick" logic (calculating entities, physics, redstone) runs sequentially. It MUST finish calculating the current tick before starting the next. If the core is too slow, the server "falls behind" (TPS drops). Our Performance nodes use high-frequency Ryzen 7700X cores (@ 4.491GHz) to ensure ticks complete instantly.
  - Core Count: This is like "Number of Engines". Useful only if you run MULTIPLE servers or heavy parallel tasks like BlueMap/Dynmap rendering in the background. For a single game instance, a CPU with 2 fast cores is significantly better than one with 20 slow cores.
- RAM (Memory): This is the "Workspace".
  - Vanilla SMP: 4-8GB is usually plenty for friend groups.
  - Modded Servers: Need 8-16GB minimum. Large packs like ATM9 or RLcraft are memory-intensive due to thousands of added items and entities.
- Storage (NVMe SSD): All our plans use NVMe storage which is up to 10x faster than traditional SSDs, ensuring lightning-fast world saving and chunk loading.

Guidelines:
- Be concise and helpful.
- If a user asks for a recommendation, always suggest a plan based on their needs and CURRENT LOAD (if high, recommend a slightly larger plan).
- Mention that Performance plans have much higher single-core speed which is critical for Minecraft.
- Keep responses short but useful. Use bullet points for stats.`;

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface LoadData {
  id: string;
  name: string;
  load: number;
  status: string;
  latency: number;
}

export function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: "1", role: "assistant", content: "Hi! I'm Hostiva's AI Assistant. How can I help you choose the perfect hosting plan today?" }
  ]);
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
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const chat = ai.chats.create({
        model: "gemini-3-flash-preview",
        config: {
          systemInstruction: getSystemInstruction(),
        },
      });

      const response = await chat.sendMessage({ 
        message: inputValue.trim() 
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.text || "I'm sorry, I couldn't process that request.",
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
                      <div className={`p-3 rounded-2xl text-sm leading-relaxed ${
                        msg.role === 'user' 
                          ? 'bg-blue-600 text-white rounded-tr-none' 
                          : 'bg-white/5 text-gray-200 border border-white/5 rounded-tl-none whitespace-pre-wrap'
                      }`}>
                        {msg.content}
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
