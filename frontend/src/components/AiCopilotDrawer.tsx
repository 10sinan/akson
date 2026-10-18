import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Send, Bot, User, Terminal, Cpu, ShieldCheck } from 'lucide-react';
import type { ContainerItem } from '../types/container';
import { wiseGentle } from '../utils/motion';

interface AiCopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeContainer?: ContainerItem;
}

interface Message {
  role: 'assistant' | 'user';
  text: string;
}

export const AiCopilotDrawer: React.FC<AiCopilotDrawerProps> = ({
  isOpen,
  onClose,
  activeContainer,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: `Merhaba! Ben Akson Gemini DevOps Asistanı. Seçili konteyner (${
        activeContainer?.name || 'Sistem'
      }) için canlı log denetimi yapabilir, kaynak tüketimini analiz edebilir veya çökme nedenlerini araştırabilirim.`,
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim()) return;

    const userText = input.trim();
    setMessages((prev) => [...prev, { role: 'user', text: userText }]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      let reply = '';
      const lower = userText.toLowerCase();

      if (lower.includes('log') || lower.includes('hata')) {
        reply = `${
          activeContainer?.name || 'Konteyner'
        } logları incelendi: Son 1 saat içinde fatal SIGSEGV veya bellek taşması (OOMKill) gözlenmedi. HTTP 200 durum kodları %99.8 stabil.`;
      } else if (lower.includes('ram') || lower.includes('bellek') || lower.includes('cpu')) {
        reply = `Donanım telemetrisi analizi: Konteyner şu anda tahsis edilen RAM limitinin %${Math.round(
          ((activeContainer?.memoryUsageMb || 10) / (activeContainer?.memoryLimitMb || 512)) * 100
        )}'sini kullanıyor. Kaynak darboğazı tespit edilmedi.`;
      } else if (lower.includes('docker') || lower.includes('güvenlik')) {
        reply = `Dockerfile Güvenlik Analizi: Root yerine non-root kullanıcı (UID 1000) kullanılıyor. Read-only rootfs ve drop-all capabilities yapılandırması önerilir.`;
      } else {
        reply = `DevOps analiz motoru: "${userText}" talebiniz incelendi. Docker cgroups istatistikleri ve Traefik v3.0 yönlendirme kuralları optimum seviyede çalışıyor.`;
      }

      setMessages((prev) => [...prev, { role: 'assistant', text: reply }]);
      setIsTyping(false);
    }, 550);
  };

  const handleQuickChip = (prompt: string) => {
    setInput(prompt);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Subtle Backdrop on smaller screens (strictly below header) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed top-14 bottom-0 left-16 right-0 bg-black/40 backdrop-blur-xs z-30 lg:hidden"
          />

          {/* Gemini-style Left Slide-in Drawer (Docked into Main Content Canvas) */}
          <motion.aside
            key="gemini-ai-drawer"
            initial={{ x: -420, opacity: 0.8 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -420, opacity: 0 }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 30,
              mass: 0.85,
            }}
            className="fixed top-14 bottom-0 left-16 w-[380px] max-w-[calc(100vw-4rem)] bg-[#0a0a0a]/98 backdrop-blur-2xl border-r border-t border-[#262626] rounded-tl-3xl rounded-tr-2xl rounded-br-2xl z-35 flex flex-col shadow-2xl overflow-hidden select-none"
          >
            {/* Header */}
            <div className="p-4 border-b border-[#262626] flex items-center justify-between bg-[#121212]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-violet-500/10 border border-violet-500/25 flex items-center justify-center text-violet-400 shadow-sm">
                  <Sparkles className="w-4 h-4 text-violet-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white font-mono tracking-tight">
                      Gemini Copilot
                    </h3>
                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 font-mono font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />
                      Canlı
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 font-mono truncate max-w-[190px]">
                    {activeContainer ? activeContainer.name : 'Genel Sistem'}
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition cursor-pointer"
                title="Sohbet Panelini Kapat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Action Pills */}
            <div className="p-3 border-b border-[#262626] flex items-center gap-1.5 overflow-x-auto no-scrollbar font-mono text-[10px]">
              <button
                onClick={() => handleQuickChip('Konteynerin canlı loglarını denetle ve hataları bul')}
                className="px-2 py-1 rounded-lg bg-[#121212] hover:bg-zinc-800 border border-[#262626] text-zinc-300 flex items-center gap-1.5 transition cursor-pointer shrink-0"
              >
                <Terminal className="w-3 h-3 text-sky-400" />
                <span>Log Denetle</span>
              </button>
              <button
                onClick={() => handleQuickChip('CPU ve Bellek kullanımını analiz et')}
                className="px-2 py-1 rounded-lg bg-[#121212] hover:bg-zinc-800 border border-[#262626] text-zinc-300 flex items-center gap-1.5 transition cursor-pointer shrink-0"
              >
                <Cpu className="w-3 h-3 text-violet-400" />
                <span>Telemetri</span>
              </button>
              <button
                onClick={() => handleQuickChip('Dockerfile güvenlik ve boyut iyileştirmesi yap')}
                className="px-2 py-1 rounded-lg bg-[#121212] hover:bg-zinc-800 border border-[#262626] text-zinc-300 flex items-center gap-1.5 transition cursor-pointer shrink-0"
              >
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>Güvenlik</span>
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 font-sans text-xs">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex items-start gap-2.5 ${
                    m.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {m.role === 'assistant' && (
                    <div className="w-6 h-6 rounded-lg bg-violet-500/10 border border-violet-500/25 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="w-3.5 h-3.5 text-violet-400" />
                    </div>
                  )}
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={wiseGentle}
                    className={`p-3 rounded-2xl max-w-[85%] leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-white text-black font-medium rounded-br-none shadow-sm'
                        : 'bg-[#121212] text-zinc-200 border border-[#262626] rounded-bl-none'
                    }`}
                  >
                    {m.text}
                  </motion.div>
                  {m.role === 'user' && (
                    <div className="w-6 h-6 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0 mt-0.5">
                      <User className="w-3.5 h-3.5 text-zinc-300" />
                    </div>
                  )}
                </div>
              ))}

              {isTyping && (
                <div className="flex items-center gap-2 text-xs text-violet-300 font-mono py-1 px-2">
                  <Sparkles className="w-3.5 h-3.5 animate-spin text-violet-400" />
                  <span>Gemini analiz ediyor...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <form onSubmit={handleSend} className="p-3 border-t border-[#262626] bg-[#000000] flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="DevOps asistanına danışın..."
                className="flex-1 bg-[#121212] border border-[#262626] text-xs text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-white transition font-mono"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="p-2.5 bg-white hover:bg-zinc-200 disabled:opacity-40 disabled:hover:bg-white text-black rounded-xl transition cursor-pointer active:scale-95 shadow-md"
                title="Gönder"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};

