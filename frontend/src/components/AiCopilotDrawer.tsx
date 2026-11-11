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

const ERROR_PATTERN = /err|fail|fatal|panic|exception/i;

// Builds a short answer from what the panel actually knows about the container. Nothing here is invented.
function buildReply(question: string, c?: ContainerItem): string {
  if (!c) {
    return 'Önce panelden bir konteyner seçin; sonra durumunu ve loglarını özetleyebilirim.';
  }
  const q = question.toLowerCase();
  const errorLines = c.logs.filter((l) => ERROR_PATTERN.test(l));

  if (q.includes('log') || q.includes('hata')) {
    if (c.logs.length === 0) return `${c.name} için henüz log satırı yok.`;
    if (errorLines.length === 0) {
      return `${c.name}: son ${c.logs.length} log satırında hata görünmüyor.`;
    }
    return `${c.name}: ${c.logs.length} log satırının ${errorLines.length} tanesi hata içeriyor. Sonuncusu:\n${errorLines[errorLines.length - 1]}`;
  }
  if (q.includes('ram') || q.includes('bellek') || q.includes('cpu') || q.includes('telemetri')) {
    return c.status === 'running'
      ? `${c.name} çalışıyor. Anlık CPU ve bellek değerleri için servis detayındaki canlı grafiklere bakın.`
      : `${c.name} durdurulmuş, kaynak kullanmıyor.`;
  }
  const ports = c.ports.length
    ? c.ports.map((p) => (p.hostPort ? `${p.hostPort}→${p.containerPort}` : `${p.containerPort}`)).join(', ')
    : 'yok';
  return [
    `${c.name} (${c.image}:${c.tag})`,
    `Durum: ${c.statusText} • ${c.uptime}`,
    `Portlar: ${ports}`,
    `Yeniden başlatma: ${c.restartCount}`,
    c.traefikRoute ? `Rota: ${c.traefikRoute}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

export const AiCopilotDrawer: React.FC<AiCopilotDrawerProps> = ({
  isOpen,
  onClose,
  activeContainer,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: 'Seçili konteynerin durumunu, portlarını ve son log satırlarını özetleyebilirim. Bu bir yapay zeka modeli değil, panelde görünen verilerden hazır özetler üretir.',
    },
  ]);
  const [input, setInput] = useState('');
  const messagesBoxRef = useRef<HTMLDivElement>(null);

  // Auto scroll to latest message
  useEffect(() => {
    // Scroll only the message list, never the page behind the drawer.
    const box = messagesBoxRef.current;
    if (box) box.scrollTo({ top: box.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim()) return;

    const userText = input.trim();
    setMessages((prev) => [...prev, { role: 'user', text: userText }]);
    setInput('');

    const reply = buildReply(userText, activeContainer);
    setMessages((prev) => [...prev, { role: 'assistant', text: reply }]);

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

          {/* Left slide-in assistant drawer */}
          <motion.aside
            key="assistant-drawer"
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
                <div className="w-8 h-8 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300 shadow-sm">
                  <Sparkles className="w-4 h-4 text-zinc-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white font-mono tracking-tight">
                      Asistan
                    </h3>
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
                onClick={() => handleQuickChip('Loglarda hata var mı?')}
                className="px-2 py-1 rounded-lg bg-[#121212] hover:bg-zinc-800 border border-[#262626] text-zinc-300 flex items-center gap-1.5 transition cursor-pointer shrink-0"
              >
                <Terminal className="w-3 h-3 text-sky-400" />
                <span>Log Denetle</span>
              </button>
              <button
                onClick={() => handleQuickChip('CPU ve bellek durumu')}
                className="px-2 py-1 rounded-lg bg-[#121212] hover:bg-zinc-800 border border-[#262626] text-zinc-300 flex items-center gap-1.5 transition cursor-pointer shrink-0"
              >
                <Cpu className="w-3 h-3 text-zinc-300" />
                <span>Kaynak</span>
              </button>
              <button
                onClick={() => handleQuickChip('Konteyner özeti')}
                className="px-2 py-1 rounded-lg bg-[#121212] hover:bg-zinc-800 border border-[#262626] text-zinc-300 flex items-center gap-1.5 transition cursor-pointer shrink-0"
              >
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>Özet</span>
              </button>
            </div>

            {/* Chat Messages */}
            <div ref={messagesBoxRef} className="flex-1 overflow-y-auto p-4 space-y-3 font-sans text-xs">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex items-start gap-2.5 ${
                    m.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {m.role === 'assistant' && (
                    <div className="w-6 h-6 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="w-3.5 h-3.5 text-zinc-300" />
                    </div>
                  )}
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={wiseGentle}
                    className={`p-3 rounded-2xl max-w-[85%] leading-relaxed whitespace-pre-line ${
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

            </div>

            {/* Input Bar */}
            <form onSubmit={handleSend} className="p-3 border-t border-[#262626] bg-[#000000] flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Bir soru yazın..."
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

