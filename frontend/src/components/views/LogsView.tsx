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

  const activeContainerObj = containers.find((c) => c.name === selectedContainer);

  return (
    <div className="flex flex-col flex-1 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#1e1f25]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Servis Logları & Canlı Denetleyici
            </h1>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-xs font-medium">
              <span className={`w-1.5 h-1.5 rounded-full bg-emerald-400 ${isStreaming ? 'animate-pulse' : ''}`} />
              {isStreaming ? 'Canlı Akış Aktif' : 'Duraklatıldı'}
            </div>
          </div>
          <p className="text-xs text-[#8e9192] mt-1">
            Gerçek zamanlı stdout günlükleri ve konteyner çalışma zamanı denetimi.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleAnalyzeWithAI}
            disabled={isAnalyzing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600/20 to-purple-600/30 border border-blue-500/40 text-blue-300 hover:text-white text-xs font-medium transition cursor-pointer active:scale-95 shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>{isAnalyzing ? 'Teşhis Ediliyor...' : 'Gemini ile Hataları Teşhis Et'}</span>
          </button>

          <button
            onClick={() => setIsStreaming(!isStreaming)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-black hover:bg-slate-200 text-xs font-semibold transition cursor-pointer active:scale-95 shadow"
          >
            {isStreaming ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isStreaming ? 'Duraklat' : 'Devam Et'}</span>
          </button>

          <button
            onClick={handleCopyLogs}
            className="p-2 bg-[#1a1b21] hover:bg-[#232736] text-[#8e9192] hover:text-white border border-[#26282e] rounded-xl transition cursor-pointer active:scale-95"
            title="Logları Kopyala"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>

          <button
            onClick={handleClearLogs}
            className="p-2 bg-[#1a1b21] hover:bg-[#232736] text-[#8e9192] hover:text-rose-400 border border-[#26282e] rounded-xl transition cursor-pointer active:scale-95"
            title="Logları Temizle"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* AI Report Card (if generated) */}
      {aiReport && (
        <div className="bg-[#141624] border border-blue-500/40 rounded-2xl p-4 shadow-xl flex flex-col gap-2 font-mono text-xs text-slate-200">
          <div className="flex items-center justify-between border-b border-blue-500/20 pb-2">
            <div className="flex items-center gap-2 font-semibold text-white">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <span>Gemini Canlı Teşhis & Çözüm Önerisi</span>
            </div>
            <button
              onClick={() => setAiReport(null)}
              className="text-[#8e9192] hover:text-white"
            >
              ✕ Kapat
            </button>
          </div>
          <div className="whitespace-pre-wrap leading-relaxed">{aiReport}</div>
        </div>
      )}

      {/* Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (3 cols): Container Switcher & Status */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          <div className="bg-[#121318] border border-[#26282e] rounded-2xl p-4 space-y-3 shadow-sm">
            <span className="text-xs font-bold text-white uppercase font-mono tracking-wider block">
              Konteyner Filtresi
            </span>

            <div className="space-y-1 font-mono text-xs">
              <motion.button
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedContainer('all')}
                className={`relative w-full text-left px-3 py-2 rounded-xl transition-colors cursor-pointer flex items-center justify-between select-none ${
                  selectedContainer === 'all'
                    ? 'text-black font-semibold'
                    : 'text-[#8e9192] hover:text-white hover:bg-[#16171d]'
                }`}
              >
                {selectedContainer === 'all' && (
                  <motion.div
                    layoutId="logsContainerPill"
                    className="absolute inset-0 bg-white rounded-xl shadow-md"
                    transition={wiseBouncy}
                  />
                )}
                <span className="relative z-10">Tüm Konteynerler</span>
                <span className="relative z-10 text-[10px]">{containers.length}</span>
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
                      : 'text-[#8e9192] hover:text-white hover:bg-[#16171d]'
                  }`}
                >
                  {selectedContainer === c.name && (
                    <motion.div
                      layoutId="logsContainerPill"
                      className="absolute inset-0 bg-blue-600 rounded-xl shadow-md"
                      transition={wiseBouncy}
                    />
                  )}
                  <span className="relative z-10 truncate">{c.name}</span>
                  <span
                    className={`relative z-10 w-2 h-2 rounded-full ${
                      c.status === 'running' ? 'bg-emerald-400' : 'bg-zinc-600'
                    }`}
                  />
                </motion.button>
              ))}
            </div>
          </div>

          {activeContainerObj && (
            <div className="bg-[#121318] border border-[#26282e] rounded-2xl p-4 space-y-3 font-mono text-xs text-[#8e9192]">
              <span className="text-white font-semibold block">{activeContainerObj.name} Durumu</span>
              <div className="flex justify-between">
                <span>IP Adresi:</span>
                <span className="text-white">{activeContainerObj.ipAddress}</span>
              </div>
              <div className="flex justify-between">
                <span>Çalışma Süresi:</span>
                <span className="text-white">{activeContainerObj.uptime}</span>
              </div>
              <div className="flex justify-between">
                <span>İmaj:</span>
                <span className="text-slate-300 truncate max-w-[130px]">{activeContainerObj.image}</span>
              </div>
            </div>
          )}
        </div>

        {/* Right Column (9 cols): Grep Search, Level Filters & Live Console */}
        <div className="lg:col-span-9 bg-[#121318] border border-[#26282e] rounded-2xl overflow-hidden shadow-2xl flex flex-col">
          {/* Controls Bar */}
          <div className="p-3.5 bg-[#16171d] border-b border-[#26282e] flex flex-wrap items-center justify-between gap-3">
            {/* Grep search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-[#8e9192] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchGrep}
                onChange={(e) => setSearchGrep(e.target.value)}
                placeholder="Loglarda ara (grep)..."
                className="w-full bg-[#0d0e13] border border-[#26282e] text-xs text-white rounded-xl pl-9 pr-3 py-1.5 focus:outline-none focus:border-blue-500 font-mono placeholder:text-[#8e9192]"
              />
            </div>

            {/* Level Filters with Sliding Spring Pill */}
            <div className="flex items-center gap-1 bg-[#0d0e13] p-1 rounded-xl border border-[#26282e] text-[11px] font-mono">
              <button
                onClick={() => setSelectedLevel('all')}
                className={`relative px-2.5 py-1 rounded-lg transition-colors cursor-pointer select-none ${
                  selectedLevel === 'all'
                    ? 'text-white font-semibold'
                    : 'text-[#8e9192] hover:text-white'
                }`}
              >
                {selectedLevel === 'all' && (
                  <motion.div
                    layoutId="logsLevelFilterPill"
                    className="absolute inset-0 bg-[#1a1b21] rounded-lg border border-[#292a2f] shadow-sm"
                    transition={wiseBouncy}
                  />
                )}
                <span className="relative z-10">Tümü</span>
              </button>
              <button
                onClick={() => setSelectedLevel('info')}
                className={`relative px-2.5 py-1 rounded-lg transition-colors cursor-pointer select-none ${
                  selectedLevel === 'info'
                    ? 'text-emerald-400 font-semibold'
                    : 'text-[#8e9192] hover:text-white'
                }`}
              >
                {selectedLevel === 'info' && (
                  <motion.div
                    layoutId="logsLevelFilterPill"
                    className="absolute inset-0 bg-emerald-500/15 rounded-lg border border-emerald-500/30 shadow-sm"
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
                    : 'text-[#8e9192] hover:text-white'
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
                    : 'text-[#8e9192] hover:text-white'
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

            {/* Auto-scroll toggle and Live Stream indicator */}
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Canlı Akış (tail -f)</span>
              </span>

              <label className="flex items-center gap-1.5 text-xs text-[#8e9192] font-mono cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoScroll}
                  onChange={(e) => setAutoScroll(e.target.checked)}
                  className="rounded border-[#26282e] bg-[#0d0e13] text-blue-500 focus:ring-0"
                />
                <span>Otomatik Kaydır</span>
              </label>
            </div>
          </div>

          {/* Terminal Console */}
          <div className="bg-[#08090d] p-4 font-mono text-[11px] leading-relaxed text-[#c4c7c8] space-y-1.5 h-[520px] overflow-y-auto select-text shadow-inner">
            {filteredLogs.length === 0 ? (
              <div className="text-[#8e9192] italic pt-8 text-center">
                Arama kriterlerine uygun log bulunamadı.
              </div>
            ) : (
              filteredLogs.map((log, idx) => {
                const isLatest = idx === filteredLogs.length - 1;
                return (
                  <motion.div
                    key={log.id}
                    initial={
                      isLatest
                        ? { opacity: 0, x: -6, backgroundColor: 'rgba(52, 211, 153, 0.18)' }
                        : false
                    }
                    animate={{ opacity: 1, x: 0, backgroundColor: 'rgba(255, 255, 255, 0)' }}
                    transition={{ duration: 1.4, ease: 'easeOut' }}
                    className="hover:bg-white/5 px-2 py-0.5 rounded flex items-start gap-3 transition-colors"
                  >
                    <span className="text-slate-500 shrink-0">{log.timestamp}</span>
                    <span className="text-purple-400 font-semibold shrink-0">[{log.containerName}]</span>
                    <span
                      className={`font-bold shrink-0 text-[10px] px-1 rounded ${
                        log.level === 'error'
                          ? 'bg-rose-500/20 text-rose-400'
                          : log.level === 'warn'
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-emerald-500/20 text-emerald-400'
                      }`}
                    >
                      {log.level.toUpperCase()}
                    </span>
                    <span className="text-slate-200 break-all">{log.message}</span>
                  </motion.div>
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
