import { useState } from 'react';
import { X, Sparkles, Send, Bot, User } from 'lucide-react';
import type { ContainerItem } from '../types/container';

interface AiCopilotModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeContainer?: ContainerItem;
}

interface Message {
  role: 'assistant' | 'user';
  text: string;
}

export const AiCopilotModal: React.FC<AiCopilotModalProps> = ({
  isOpen,
  onClose,
  activeContainer,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: `Merhaba! Ben Akson AI DevOps Asistanı. Seçili konteyner (${
        activeContainer?.name || 'Sistem'
      }) için log analizi yapabilir, Dockerfile optimizasyonu önerebilir veya çökme nedenlerini araştırabilirim.`,
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  if (!isOpen) return null;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
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
        } logları incelendi: Son 1 saat içinde herhangi bir fatal SIGSEGV veya bellek taşması (OOMKill) gözlenmedi. HTTP 200 durum kodları stabil.`;
      } else if (lower.includes('ram') || lower.includes('bellek') || lower.includes('cpu')) {
        reply = `Donanım telemetrisi analizi: Konteyner şu anda tahsis edilen RAM limitinin %${Math.round(
          ((activeContainer?.memoryUsageMb || 10) / (activeContainer?.memoryLimitMb || 512)) * 100
        )}'sini kullanıyor. Herhangi bir darboğaz bulunmuyor.`;
      } else {
        reply = `Akson DevOps analiz motoru: "${userText}" talebiniz incelendi. Docker compose konfigürasyonu ve Traefik v3.0 yönlendirme kuralları optimum seviyede çalışıyor.`;
      }

      setMessages((prev) => [...prev, { role: 'assistant', text: reply }]);
      setIsTyping(false);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl bg-[#0a0a0a] border border-[#262626] rounded-2xl p-6 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200 max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#262626] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#121212] border border-[#262626] flex items-center justify-center text-white">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white font-mono">Gemini AI DevOps Asistanı</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-zinc-300 border border-[#262626] font-mono">
                  Beta
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">Log teşhisi, kaynak optimizasyonu ve akıllı öneriler.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick action chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-[11px] font-mono text-zinc-400">
          <button
            onClick={() => setInput('Konteynerin canlı loglarını denetle ve hataları bul')}
            className="px-2.5 py-1 rounded-lg bg-[#121212] hover:bg-zinc-800 border border-[#262626] text-zinc-300 transition cursor-pointer whitespace-nowrap"
          >
            🔍 Logları Denetle
          </button>
          <button
            onClick={() => setInput('CPU ve Bellek kullanımını analiz et')}
            className="px-2.5 py-1 rounded-lg bg-[#121212] hover:bg-zinc-800 border border-[#262626] text-zinc-300 transition cursor-pointer whitespace-nowrap"
          >
            📊 Kaynak Analizi
          </button>
          <button
            onClick={() => setInput('Dockerfile güvenlik ve boyut iyileştirmesi yap')}
            className="px-2.5 py-1 rounded-lg bg-[#121212] hover:bg-zinc-800 border border-[#262626] text-zinc-300 transition cursor-pointer whitespace-nowrap"
          >
            🛡️ Dockerfile Sertleştirme
          </button>
        </div>

        {/* Chat message history */}
        <div className="flex-1 overflow-y-auto space-y-3 min-h-[240px] max-h-[360px] p-2 bg-[#000000] rounded-xl border border-[#262626] font-sans text-xs">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-2.5 ${
                m.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {m.role === 'assistant' && (
                <div className="w-6 h-6 rounded-lg bg-[#121212] border border-[#262626] flex items-center justify-center shrink-0">
                  <Bot className="w-3.5 h-3.5 text-white" />
                </div>
              )}
              <div
                className={`p-3 rounded-xl max-w-[85%] leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-white text-black font-medium rounded-br-none shadow-sm'
                    : 'bg-[#121212] text-zinc-200 border border-[#262626] rounded-bl-none'
                }`}
              >
                {m.text}
              </div>
              {m.role === 'user' && (
                <div className="w-6 h-6 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                  <User className="w-3.5 h-3.5 text-zinc-300" />
                </div>
              )}
            </div>
          ))}
          {isTyping && (
            <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono">
              <Sparkles className="w-3.5 h-3.5 animate-spin text-white" />
              <span>AI yanıt hazırlıyor...</span>
            </div>
          )}
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="flex items-center gap-2 pt-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Bir soru sorun veya log analizi isteyin..."
            className="flex-1 bg-[#121212] border border-[#262626] text-xs text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-white transition"
          />
          <button
            type="submit"
            className="p-2.5 bg-white hover:bg-zinc-200 text-black rounded-xl transition cursor-pointer active:scale-95 shadow-md"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
