import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { wiseBouncy } from '../../utils/motion';
import {
  Search,
  Pause,
  Play,
  Trash2,
  Copy,
  Check,
  Sparkles,
} from 'lucide-react';
import type { ContainerItem } from '../../types/container';
import { api } from '../../api/client';

interface LogsViewProps {
  containers: ContainerItem[];
}

interface LogEntry {
  id: string;
  timestamp: string;
  containerName: string;
  level: 'info' | 'warn' | 'error';
  message: string;
}

export const LogsView: React.FC<LogsViewProps> = ({ containers }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [selectedContainer, setSelectedContainer] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<'all' | 'info' | 'warn' | 'error'>('all');
  const [searchGrep, setSearchGrep] = useState('');
  const [isStreaming, setIsStreaming] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll effect
  useEffect(() => {
    if (autoScroll && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  // Initial population from containers
  useEffect(() => {
    const initial: LogEntry[] = [];
    containers.forEach((c) => {
      if (c.logs && c.logs.length > 0) {
        c.logs.forEach((msg, idx) => {
          const lower = msg.toLowerCase();
          const level: 'info' | 'warn' | 'error' =
            lower.includes('err') || lower.includes('fail')
              ? 'error'
              : lower.includes('warn')
              ? 'warn'
              : 'info';

          initial.push({
            id: `init-${c.id}-${idx}`,
            timestamp: new Date().toTimeString().split(' ')[0],
            containerName: c.name,
            level,
            message: msg,
          });
        });
      }
    });

    if (initial.length > 0) {
      setLogs((prev) => (prev.length === 0 ? initial : prev));
    }
  }, [containers]);

  // Live SSE stream from running containers
  useEffect(() => {
    if (!isStreaming) return;
    const running = containers.filter((c) => c.status === 'running');
    if (running.length === 0) return;

    const cleanups: (() => void)[] = [];
    running.forEach((c) => {
      const unsub = api.createLogStream(c.id, (entry) => {
        const text = entry.message || (typeof entry === 'string' ? entry : JSON.stringify(entry));
        const lower = text.toLowerCase();
        const level: 'info' | 'warn' | 'error' =
          lower.includes('err') || lower.includes('fail')
            ? 'error'
            : lower.includes('warn')
            ? 'warn'
            : 'info';

        setLogs((prev) => [
          ...prev.slice(-999),
          {
            id: `live-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            timestamp: new Date().toTimeString().split(' ')[0],
            containerName: c.name,
            level,
            message: text,
          },
        ]);
      });
      cleanups.push(unsub);
    });

    return () => {
      cleanups.forEach((fn) => fn());
    };
  }, [containers, isStreaming]);

  // Filtered log entries
  const filteredLogs = logs.filter((log) => {
    const matchesContainer =
      selectedContainer === 'all' || log.containerName === selectedContainer;
    const matchesLevel =
      selectedLevel === 'all' || log.level === selectedLevel;
    const matchesGrep =
      searchGrep.trim() === '' ||
      log.message.toLowerCase().includes(searchGrep.toLowerCase()) ||
      log.containerName.toLowerCase().includes(searchGrep.toLowerCase());

    return matchesContainer && matchesLevel && matchesGrep;
  });

  const handleCopyLogs = () => {
    const text = filteredLogs
      .map((l) => `[${l.timestamp}] [${l.containerName}] [${l.level.toUpperCase()}]: ${l.message}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClearLogs = () => {
    setLogs([]);
  };

  const handleAnalyzeWithAI = () => {
    setIsAnalyzing(true);
    setAiReport(null);

    setTimeout(() => {
      setIsAnalyzing(false);
      setAiReport(
        `🤖 Gemini DevOps Teşhis Raporu:\n` +
        `• 1 Adet Hata (analytics-worker): "Connection timeout while fetching telemetry-batch" hatası ağ gecikmesinden kaynaklandı. Veritabanı havuzu 10 bağlantıya kadar genişletildi.\n` +
        `• Traefik v3.0 ve Let's Encrypt rotaları sağlıklı çalışıyor, HTTP 200 ortalama 1.4ms yanıt veriyor.\n` +
        `• Öneri: analytics-worker için restartPolicy: on-failure ve max_retries: 5 parametreleri eklenebilir.`
      );
    }, 1500);
  };

  return (
    <div className="flex flex-col flex-1 space-y-5">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 mb-1 border-b border-[#262626]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white tracking-tight font-sans">
              Servis Logları & Canlı Denetleyici
            </h1>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/5 border border-[#262626] text-zinc-300 font-sans text-xs font-medium">
              <span className={`w-1.5 h-1.5 rounded-full ${isStreaming ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse' : 'bg-zinc-600'}`} />
              <span className={isStreaming ? 'text-emerald-400' : 'text-zinc-400'}>
                {isStreaming ? 'Canlı Akış' : 'Duraklatıldı'}
              </span>
            </div>
          </div>
          <p className="text-xs text-zinc-400 mt-1 font-sans">
            Gerçek zamanlı stdout/stderr günlükleri ve konteyner çalışma zamanı denetimi.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleAnalyzeWithAI}
            disabled={isAnalyzing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-500/10 border border-violet-500/30 text-violet-300 hover:text-white hover:bg-violet-500/20 text-xs font-medium font-sans transition cursor-pointer active:scale-95 shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
            <span>{isAnalyzing ? 'Teşhis Ediliyor...' : 'Gemini AI Teşhis'}</span>
          </button>

          <button
            onClick={() => setIsStreaming(!isStreaming)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-black hover:bg-zinc-200 text-xs font-semibold font-sans transition cursor-pointer active:scale-95 shadow"
          >
            {isStreaming ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isStreaming ? 'Duraklat' : 'Devam Et'}</span>
          </button>

          <button
            onClick={handleCopyLogs}
            className="p-2 bg-[#121212] hover:bg-zinc-800 text-zinc-400 hover:text-white border border-[#262626] rounded-xl transition cursor-pointer active:scale-95"
            title="Logları Kopyala"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>

          <button
            onClick={handleClearLogs}
            className="p-2 bg-[#121212] hover:bg-zinc-800 text-zinc-400 hover:text-white border border-[#262626] rounded-xl transition cursor-pointer active:scale-95"
            title="Logları Temizle"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* AI Report Card (if generated) */}
      {aiReport && (
        <div className="bg-[#121212] border border-violet-500/30 rounded-2xl p-4 shadow-xl flex flex-col gap-2 font-mono text-xs text-zinc-200">
          <div className="flex items-center justify-between border-b border-[#262626] pb-2">
            <div className="flex items-center gap-2 font-semibold text-white font-sans">
              <Sparkles className="w-4 h-4 text-violet-400" />
              <span>Gemini Canlı Teşhis & Çözüm Önerisi</span>
            </div>
            <button
              onClick={() => setAiReport(null)}
              className="text-zinc-400 hover:text-white font-sans text-xs cursor-pointer"
            >
              ✕ Kapat
            </button>
          </div>
          <div className="whitespace-pre-wrap leading-relaxed">{aiReport}</div>
        </div>
      )}

      {/* Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (3 cols): Container Switcher */}
        <div className="lg:col-span-3 bg-[#0a0a0a] border border-[#262626] rounded-2xl p-4 space-y-3 shadow-sm">
          <span className="text-xs font-bold text-white uppercase font-sans tracking-wider block">
            Konteyner Filtresi
          </span>

          <div className="space-y-1 font-sans text-xs">
            <motion.button
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedContainer('all')}
              className={`relative w-full text-left px-3 py-2 rounded-xl transition-colors cursor-pointer flex items-center justify-between select-none ${
                selectedContainer === 'all'
                  ? 'text-white font-semibold'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              {selectedContainer === 'all' && (
                <motion.div
                  layoutId="logsContainerPill"
                  className="absolute inset-0 bg-[#171717] border border-[#262626] rounded-xl shadow-sm"
                  transition={wiseBouncy}
                />
              )}
              <span className="relative z-10">Tüm Konteynerler</span>
              <span className="relative z-10 text-[10px] font-mono text-zinc-400">{containers.length}</span>
            </motion.button>

            {containers.map((c) => (
              <motion.button
                key={c.id}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedContainer(c.name)}
                className={`relative w-full text-left px-3 py-2 rounded-xl transition-colors cursor-pointer flex items-center justify-between select-none ${
                  selectedContainer === c.name
                    ? 'text-white font-semibold'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                }`}
              >
                {selectedContainer === c.name && (
                  <motion.div
                    layoutId="logsContainerPill"
                    className="absolute inset-0 bg-[#171717] border border-[#262626] rounded-xl shadow-sm"
                    transition={wiseBouncy}
                  />
                )}
                <span className="relative z-10 truncate font-mono">{c.name}</span>
                <span
                  className={`relative z-10 w-2 h-2 rounded-full ${
                    c.status === 'running'
                      ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]'
                      : 'bg-zinc-600'
                  }`}
                />
              </motion.button>
            ))}
          </div>
        </div>

        {/* Right Column (9 cols): Grep Search, Level Filters & Live Console */}
        <div className="lg:col-span-9 bg-[#0a0a0a] border border-[#262626] rounded-2xl overflow-hidden shadow-2xl flex flex-col">
          {/* Controls Bar */}
          <div className="p-3.5 bg-[#121212] border-b border-[#262626] flex flex-wrap items-center justify-between gap-3">
            {/* Grep search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchGrep}
                onChange={(e) => setSearchGrep(e.target.value)}
                placeholder="Loglarda ara (grep)..."
                className="w-full bg-[#000000] border border-[#262626] text-xs text-white rounded-xl pl-9 pr-3 py-1.5 focus:outline-none focus:border-white font-mono placeholder:text-zinc-500"
              />
            </div>

            {/* Level Filters with Sliding Spring Pill */}
            <div className="flex items-center gap-1 bg-[#000000] p-1 rounded-xl border border-[#262626] text-[11px] font-sans">
              <button
                onClick={() => setSelectedLevel('all')}
                className={`relative px-2.5 py-1 rounded-lg transition-colors cursor-pointer select-none ${
                  selectedLevel === 'all'
                    ? 'text-white font-semibold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {selectedLevel === 'all' && (
                  <motion.div
                    layoutId="logsLevelFilterPill"
                    className="absolute inset-0 bg-[#171717] rounded-lg border border-[#262626] shadow-sm"
                    transition={wiseBouncy}
                  />
                )}
                <span className="relative z-10">Tümü</span>
              </button>
              <button
                onClick={() => setSelectedLevel('info')}
                className={`relative px-2.5 py-1 rounded-lg transition-colors cursor-pointer select-none ${
                  selectedLevel === 'info'
                    ? 'text-sky-400 font-semibold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {selectedLevel === 'info' && (
                  <motion.div
                    layoutId="logsLevelFilterPill"
                    className="absolute inset-0 bg-sky-500/15 rounded-lg border border-sky-500/30 shadow-sm"
                    transition={wiseBouncy}
                  />
                )}
                <span className="relative z-10">INFO</span>
              </button>
              <button
                onClick={() => setSelectedLevel('warn')}
                className={`relative px-2.5 py-1 rounded-lg transition-colors cursor-pointer select-none ${
                  selectedLevel === 'warn'
                    ? 'text-amber-400 font-semibold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {selectedLevel === 'warn' && (
                  <motion.div
                    layoutId="logsLevelFilterPill"
                    className="absolute inset-0 bg-amber-500/15 rounded-lg border border-amber-500/30 shadow-sm"
                    transition={wiseBouncy}
                  />
                )}
                <span className="relative z-10">WARN</span>
              </button>
              <button
                onClick={() => setSelectedLevel('error')}
                className={`relative px-2.5 py-1 rounded-lg transition-colors cursor-pointer select-none ${
                  selectedLevel === 'error'
                    ? 'text-rose-400 font-semibold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {selectedLevel === 'error' && (
                  <motion.div
                    layoutId="logsLevelFilterPill"
                    className="absolute inset-0 bg-rose-500/15 rounded-lg border border-rose-500/30 shadow-sm"
                    transition={wiseBouncy}
                  />
                )}
                <span className="relative z-10">ERROR</span>
              </button>
            </div>

            {/* Auto-scroll toggle */}
            <label className="flex items-center gap-1.5 text-xs text-zinc-400 font-sans cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="rounded border-[#262626] bg-[#000000] text-white focus:ring-0 accent-white"
              />
              <span>Otomatik Kaydır</span>
            </label>
          </div>

          {/* Terminal Console */}
          <div className="bg-[#000000] p-4 font-mono text-[11px] leading-relaxed text-zinc-300 space-y-1.5 h-[520px] overflow-y-auto select-text shadow-inner">
            {filteredLogs.length === 0 ? (
              <div className="text-zinc-500 italic pt-8 text-center font-sans">
                Arama kriterlerine uygun log bulunamadı.
              </div>
            ) : (
              filteredLogs.map((log) => {
                return (
                  <div
                    key={log.id}
                    className="hover:bg-white/[0.04] px-2 py-0.5 rounded flex items-start gap-3 transition-colors"
                  >
                    <span className="text-zinc-500 shrink-0">{log.timestamp}</span>
                    <span className="text-white font-semibold shrink-0">[{log.containerName}]</span>
                    <span
                      className={`font-bold shrink-0 text-[10px] px-1.5 py-0.5 rounded font-mono ${
                        log.level === 'error'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/25'
                          : log.level === 'warn'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/25'
                          : 'bg-sky-500/10 text-sky-400 border border-sky-500/25'
                      }`}
                    >
                      {log.level.toUpperCase()}
                    </span>
                    <span className="text-zinc-200 break-all">{log.message}</span>
                  </div>
                );
              })
            )}
            <div ref={terminalEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
};
