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
          {/* Subtle Backdrop on smaller screens */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 lg:hidden"
          />

          {/* Gemini-style Left Slide-in Drawer */}
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
            className="fixed top-0 bottom-0 left-16 w-[380px] max-w-[calc(100vw-4rem)] bg-[#0e1017]/95 backdrop-blur-2xl border-r border-[#26282e] z-45 flex flex-col shadow-2xl overflow-hidden select-none"
          >
            {/* Header with Gemini Sparkle Gradient */}
            <div className="p-4 border-b border-[#26282e] flex items-center justify-between bg-gradient-to-b from-blue-950/20 to-transparent">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600/30 to-purple-600/40 border border-blue-500/40 flex items-center justify-center text-blue-300 shadow-sm">
                  <Sparkles className="w-4 h-4 text-blue-400 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white font-mono tracking-tight">
                      Gemini Copilot
                    </h3>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono font-medium">
                      Canlı
                    </span>
                  </div>
                  <p className="text-[11px] text-[#8e9192] font-mono truncate max-w-[190px]">
                    {activeContainer ? activeContainer.name : 'Genel Sistem'}
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-1.5 text-[#8e9192] hover:text-white rounded-lg hover:bg-[#1a1b21] transition cursor-pointer"
                title="Sohbet Panelini Kapat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Action Pills */}
            <div className="p-3 border-b border-[#1e1f25] flex items-center gap-1.5 overflow-x-auto no-scrollbar font-mono text-[10px]">
              <button
                onClick={() => handleQuickChip('Konteynerin canlı loglarını denetle ve hataları bul')}
                className="px-2 py-1 rounded-lg bg-[#16171d] hover:bg-[#1f2029] border border-[#26282e] text-slate-300 flex items-center gap-1 transition cursor-pointer shrink-0"
              >
                <Terminal className="w-3 h-3 text-emerald-400" />
                <span>Log Denetle</span>
              </button>
              <button
                onClick={() => handleQuickChip('CPU ve Bellek kullanımını analiz et')}
                className="px-2 py-1 rounded-lg bg-[#16171d] hover:bg-[#1f2029] border border-[#26282e] text-slate-300 flex items-center gap-1 transition cursor-pointer shrink-0"
              >
                <Cpu className="w-3 h-3 text-blue-400" />
                <span>Telemetri</span>
              </button>
              <button
                onClick={() => handleQuickChip('Dockerfile güvenlik ve boyut iyileştirmesi yap')}
                className="px-2 py-1 rounded-lg bg-[#16171d] hover:bg-[#1f2029] border border-[#26282e] text-slate-300 flex items-center gap-1 transition cursor-pointer shrink-0"
              >
                <ShieldCheck className="w-3 h-3 text-purple-400" />
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
                    <div className="w-6 h-6 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="w-3.5 h-3.5 text-blue-400" />
                    </div>
                  )}
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={wiseGentle}
                    className={`p-3 rounded-2xl max-w-[85%] leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-blue-600 text-white rounded-br-none shadow-md shadow-blue-600/10'
                        : 'bg-[#16171d] text-slate-200 border border-[#26282e] rounded-bl-none'
                    }`}
                  >
                    {m.text}
                  </motion.div>
                  {m.role === 'user' && (
                    <div className="w-6 h-6 rounded-lg bg-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                      <User className="w-3.5 h-3.5 text-slate-300" />
                    </div>
                  )}
                </div>
              ))}

              {isTyping && (
                <div className="flex items-center gap-2 text-xs text-blue-400 font-mono py-1 px-2">
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                  <span>Gemini analiz ediyor...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <form onSubmit={handleSend} className="p-3 border-t border-[#26282e] bg-[#090a0f]/80 flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="DevOps asistanına danışın..."
                className="flex-1 bg-[#16171d] border border-[#26282e] text-xs text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-blue-500 transition font-mono"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="p-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 text-white rounded-xl transition cursor-pointer active:scale-95 shadow-md shadow-blue-600/20"
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
