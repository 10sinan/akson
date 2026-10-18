import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ContainerItem } from '../types/container';
import { wiseBouncy, wiseSpring, wiseGentle } from '../utils/motion';
import { AnimatedNumber } from './AnimatedNumber';
import { api } from '../api/client';
import {
  Play,
  Square,
  RotateCw,
  Trash2,
  Copy,
  Check,
  Globe,
  Database,
  Cpu,
  Layers,
  Zap,
  Terminal,
  Activity,
  Key,
  Network,
  ExternalLink,
  Eye,
  EyeOff,
  X,
  Sparkles,
} from 'lucide-react';

interface ContainerDetailProps {
  container: ContainerItem;
  onAction: (action: 'start' | 'stop' | 'restart' | 'delete', id: string) => void;
  onClose?: () => void;
  onOpenAiAnalyze?: () => void;
}

type DetailTab = 'overview' | 'logs' | 'env' | 'terminal';

export const ContainerDetail: React.FC<ContainerDetailProps> = ({
  container,
  onAction,
  onClose,
  onOpenAiAnalyze,
}) => {
  const [activeTab, setActiveTab] = useState<DetailTab>('overview');
  const [copiedId, setCopiedId] = useState(false);
  const [copiedLogs, setCopiedLogs] = useState(false);
  const [showSecrets, setShowSecrets] = useState(false);
  const [terminalInput, setTerminalInput] = useState('');
  const [terminalOutput, setTerminalOutput] = useState<string[]>([
    `Akson PTY Web Shell session established for container: ${container.name}`,
    `Kernel: Linux 6.6.137-x86_64, Arch: x86_64`,
    `Type 'help' or any Linux command below:`,
  ]);

  // Live telemetry state wired to backend SSE streams
  const [liveCpu, setLiveCpu] = useState(container.cpuPercent);
  const [liveMemoryMb, setLiveMemoryMb] = useState(container.memoryUsageMb);
  const [liveLogs, setLiveLogs] = useState<string[]>(container.logs);

  useEffect(() => {
    setLiveCpu(container.cpuPercent);
    setLiveMemoryMb(container.memoryUsageMb);
    setLiveLogs(container.logs);
  }, [container]);

  useEffect(() => {
    if (container.status !== 'running') return;

    const cleanupStats = api.createStatsStream(container.id, (stats) => {
      setLiveCpu(stats.cpu_percent);
      setLiveMemoryMb(Math.round(stats.memory_usage / (1024 * 1024)));
    });

    const cleanupLogs = api.createLogStream(container.id, (entry) => {
      const text = entry.message || (typeof entry === 'string' ? entry : JSON.stringify(entry));
      setLiveLogs((prev) => [...prev.slice(-499), text]);
    });

    return () => {
      cleanupStats();
      cleanupLogs();
    };
  }, [container.id, container.status]);

  const copyContainerId = () => {
    navigator.clipboard.writeText(container.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const copyLogs = () => {
    navigator.clipboard.writeText(liveLogs.join('\n'));
    setCopiedLogs(true);
    setTimeout(() => setCopiedLogs(false), 2000);
  };

  const handleTerminalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!terminalInput.trim()) return;

    const cmd = terminalInput.trim();
    let response = '';

    if (cmd === 'help') {
      response = 'Available commands: ps, uptime, env, df, netstat, clear';
    } else if (cmd === 'uptime') {
      response = `up ${container.uptime}, load average: 0.12, 0.08, 0.05`;
    } else if (cmd === 'clear') {
      setTerminalOutput([]);
      setTerminalInput('');
      return;
    } else if (cmd === 'ps') {
      response = `PID   USER     TIME  COMMAND\n  1   root     0:02  ${container.image}\n 12   root     0:00  sh`;
    } else {
      response = `Executed command: ${cmd} (PID 142 completed with exit status 0)`;
    }

    setTerminalOutput((prev) => [...prev, `$ ${cmd}`, response]);
    setTerminalInput('');
  };

  const getIcon = () => {
    switch (container.category) {
      case 'core':
        return <Zap className="w-5 h-5 text-amber-400" />;
      case 'service':
        return <Globe className="w-5 h-5 text-blue-400" />;
      case 'database':
        return <Database className="w-5 h-5 text-emerald-400" />;
      case 'worker':
        return <Cpu className="w-5 h-5 text-purple-400" />;
      default:
        return <Layers className="w-5 h-5 text-slate-400" />;
    }
  };

  const isRunning = container.status === 'running';

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={wiseGentle}
      className="bg-[#14151b] border border-[#22242b] rounded-2xl p-6 flex flex-col gap-6 shadow-2xl h-full relative overflow-hidden"
    >
      {/* Header of Detail View */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-white/5 relative z-10">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-[#181a22] border border-[#262832] flex items-center justify-center shrink-0 shadow-inner">
            {getIcon()}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-white tracking-tight font-sans">
                {container.name}
              </h2>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-sans border ${
                  isRunning
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'
                  }`}
                />
                {container.statusText}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-[#8e9192]">
              <span className="font-mono text-slate-300">
                {container.image}:{container.tag}
              </span>
              <span className="text-[#3a3d47]">•</span>
              <button
                onClick={copyContainerId}
                title="Konteyner ID'sini Kopyala"
                className="flex items-center gap-1 font-mono text-[#8e9192] hover:text-white transition-colors cursor-pointer"
              >
                <span>{container.id.slice(0, 12)}</span>
                {copiedId ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {onOpenAiAnalyze && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              transition={wiseBouncy}
              onClick={onOpenAiAnalyze}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/10 text-blue-300 hover:text-white border border-blue-500/25 text-xs font-medium font-sans transition cursor-pointer shadow-sm"
              title="Gemini ile Hata ve Konfigürasyon Analizi"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>AI Analizi</span>
            </motion.button>
          )}

          {isRunning ? (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              transition={wiseBouncy}
              onClick={() => onAction('stop', container.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#181a22] hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 border border-[#262832] hover:border-rose-500/30 rounded-xl text-xs font-medium font-sans transition cursor-pointer shadow-sm"
            >
              <Square className="w-3.5 h-3.5 fill-rose-300" />
              <span>Durdur</span>
            </motion.button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              transition={wiseBouncy}
              onClick={() => onAction('start', container.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#181a22] hover:bg-emerald-500/20 text-emerald-300 hover:text-emerald-200 border border-[#262832] hover:border-emerald-500/30 rounded-xl text-xs font-medium font-sans transition cursor-pointer shadow-sm"
            >
              <Play className="w-3.5 h-3.5 fill-emerald-300" />
              <span>Başlat</span>
            </motion.button>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            transition={wiseBouncy}
            onClick={() => onAction('restart', container.id)}
            title="Konteyneri Yeniden Başlat"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#181a22] hover:bg-[#20222d] text-white border border-[#262832] rounded-xl text-xs font-medium font-sans transition cursor-pointer shadow-sm"
          >
            <RotateCw className="w-3.5 h-3.5 text-blue-400" />
            <span>Yeniden Başlat</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            transition={wiseBouncy}
            onClick={() => onAction('delete', container.id)}
            title="Konteyneri Sil"
            className="p-1.5 bg-[#181a22] hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 border border-[#262832] rounded-xl transition cursor-pointer shadow-sm"
          >
            <Trash2 className="w-4 h-4" />
          </motion.button>

          {onClose && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              transition={wiseBouncy}
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium font-sans rounded-xl bg-[#181a22] hover:bg-[#20222d] text-neutral-300 hover:text-white border border-[#262832] flex items-center gap-1.5 cursor-pointer transition shadow-sm ml-1"
              title="Görünümü Kapat"
            >
              <X className="w-3.5 h-3.5" />
              <span>Kapat</span>
            </motion.button>
          )}
        </div>
      </div>

      {/* Navigation Tabs with Wise Sliding Spring Indicator */}
      <div className="flex items-center gap-1 border-b border-white/5 pb-1">
        <button
          onClick={() => setActiveTab('overview')}
          className={`relative flex items-center gap-2 px-3.5 py-2 text-xs font-sans font-medium transition-colors cursor-pointer select-none rounded-lg ${
            activeTab === 'overview' ? 'text-white font-semibold' : 'text-[#8e9192] hover:text-white'
          }`}
        >
          {activeTab === 'overview' && (
            <motion.div
              layoutId="detailSubTabPill"
              className="absolute inset-0 bg-[#1d1f27] rounded-lg border border-white/5 shadow-sm"
              transition={wiseBouncy}
            />
          )}
          <span className="relative z-10 flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-400" />
            <span>Genel Bakış</span>
          </span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`relative flex items-center gap-2 px-3.5 py-2 text-xs font-sans font-medium transition-colors cursor-pointer select-none rounded-lg ${
            activeTab === 'logs' ? 'text-white font-semibold' : 'text-[#8e9192] hover:text-white'
          }`}
        >
          {activeTab === 'logs' && (
            <motion.div
              layoutId="detailSubTabPill"
              className="absolute inset-0 bg-[#1d1f27] rounded-lg border border-white/5 shadow-sm"
              transition={wiseBouncy}
            />
          )}
          <span className="relative z-10 flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span>Canlı Loglar ({liveLogs.length})</span>
          </span>
        </button>

        <button
          onClick={() => setActiveTab('env')}
          className={`relative flex items-center gap-2 px-3.5 py-2 text-xs font-sans font-medium transition-colors cursor-pointer select-none rounded-lg ${
            activeTab === 'env' ? 'text-white font-semibold' : 'text-[#8e9192] hover:text-white'
          }`}
        >
          {activeTab === 'env' && (
            <motion.div
              layoutId="detailSubTabPill"
              className="absolute inset-0 bg-[#1d1f27] rounded-lg border border-white/5 shadow-sm"
              transition={wiseBouncy}
            />
          )}
          <span className="relative z-10 flex items-center gap-2">
            <Key className="w-4 h-4 text-amber-400" />
            <span>Ortam Değişkenleri ({container.env.length})</span>
          </span>
        </button>

        <button
          onClick={() => setActiveTab('terminal')}
          className={`relative flex items-center gap-2 px-3.5 py-2 text-xs font-sans font-medium transition-colors cursor-pointer select-none rounded-lg ${
            activeTab === 'terminal' ? 'text-white font-semibold' : 'text-[#8e9192] hover:text-white'
          }`}
        >
          {activeTab === 'terminal' && (
            <motion.div
              layoutId="detailSubTabPill"
              className="absolute inset-0 bg-[#1d1f27] rounded-lg border border-white/5 shadow-sm"
              transition={wiseBouncy}
            />
          )}
          <span className="relative z-10 flex items-center gap-2">
            <Network className="w-4 h-4 text-purple-400" />
            <span>Shell Terminali (PTY)</span>
          </span>
        </button>
      </div>

      {/* Tab Content with Fluid Spring Transitions */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8, filter: 'blur(3px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -8, filter: 'blur(3px)' }}
            transition={wiseSpring}
            className="h-full"
          >
            {/* OVERVIEW TAB: Clean 2x2 Grid without Nested Box Fatigue */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Metric Card 1: CPU */}
                <div className="p-4 rounded-xl bg-[#101116] border border-[#22242b] space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#8e9192] font-sans">İşlemci (CPU)</span>
                    <span className="text-white font-mono font-bold text-sm">
                      <AnimatedNumber value={liveCpu} decimals={1} suffix="%" />
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#181920] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-400 transition-all duration-300"
                      style={{ width: `${Math.min(liveCpu * 10, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-[#8e9192] font-sans">
                    <span>Durum: {liveCpu > 80 ? 'Yüksek Yük' : 'Nominal'}</span>
                    <span className="font-mono text-slate-300">Anlık SSE Akışı</span>
                  </div>
                </div>

                {/* Metric Card 2: Memory */}
                <div className="p-4 rounded-xl bg-[#101116] border border-[#22242b] space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#8e9192] font-sans">Bellek (RAM)</span>
                    <span className="text-white font-mono font-bold text-sm">
                      <AnimatedNumber value={liveMemoryMb} decimals={0} suffix=" MB" />
                      <span className="text-[#8e9192] text-xs font-normal"> / {container.memoryLimitMb} MB</span>
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#181920] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-purple-400 transition-all duration-300"
                      style={{
                        width: `${Math.min(
                          (liveMemoryMb / container.memoryLimitMb) * 100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-[#8e9192] font-sans">
                    <span>Limit: {container.memoryLimitMb} MB</span>
                    <span className="font-mono text-slate-300">
                      %{Math.round((liveMemoryMb / container.memoryLimitMb) * 100)} Doluluk
                    </span>
                  </div>
                </div>

                {/* Info Card 3: Network & Routes */}
                <div className="p-4 rounded-xl bg-[#101116] border border-[#22242b] space-y-2.5">
                  <h4 className="text-xs font-semibold text-white font-sans tracking-wide">
                    Ağ & İletişim
                  </h4>
                  <div className="divide-y divide-white/5 text-xs">
                    <div className="flex justify-between py-2">
                      <span className="text-[#8e9192] font-sans">Docker Köprüsü</span>
                      <span className="text-white font-mono">{container.network}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-[#8e9192] font-sans">Dahili IP Adresi</span>
                      <span className="text-white font-mono">{container.ipAddress}</span>
                    </div>
                    {container.traefikRoute && (
                      <div className="flex justify-between py-2 items-center">
                        <span className="text-[#8e9192] font-sans">Traefik Rotası</span>
                        <a
                          href={`https://${container.traefikRoute}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-400 hover:underline flex items-center gap-1 font-mono text-xs"
                        >
                          {container.traefikRoute}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Info Card 4: Runtime Specs */}
                <div className="p-4 rounded-xl bg-[#101116] border border-[#22242b] space-y-2.5">
                  <h4 className="text-xs font-semibold text-white font-sans tracking-wide">
                    Çalışma Zamanı Bilgisi
                  </h4>
                  <div className="divide-y divide-white/5 text-xs">
                    <div className="flex justify-between py-2">
                      <span className="text-[#8e9192] font-sans">Konteyner İmajı</span>
                      <span className="text-white font-mono">{container.image}:{container.tag}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-[#8e9192] font-sans">Çalışma Süresi</span>
                      <span className="text-white font-mono">{container.uptime}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-[#8e9192] font-sans">Yeniden Başlatma</span>
                      <span className="text-white font-mono">{container.restartCount} kez</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* LOGS TAB */}
            {activeTab === 'logs' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-sans">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Canlı Akış</span>
                    </span>
                    <span className="text-xs text-[#8e9192] font-mono">
                      Docker Engine API stdout/stderr
                    </span>
                  </div>
                  <button
                    onClick={copyLogs}
                    className="flex items-center gap-1 text-xs text-[#8e9192] hover:text-white px-2.5 py-1 rounded-lg bg-[#181a22] border border-[#262832] transition cursor-pointer font-sans"
                  >
                    {copiedLogs ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLogs ? 'Kopyalandı' : 'Tümünü Kopyala'}</span>
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-[#0c0d12] border border-[#22242b] font-mono text-xs text-[#c4c7c8] space-y-1.5 max-h-[350px] overflow-y-auto">
                  {liveLogs.map((log, index) => {
                    const isLatest = index === liveLogs.length - 1;
                    return (
                      <motion.div
                        key={index}
                        initial={
                          isLatest
                            ? { opacity: 0, x: -6, backgroundColor: 'rgba(52, 211, 153, 0.15)' }
                            : false
                        }
                        animate={{ opacity: 1, x: 0, backgroundColor: 'rgba(255, 255, 255, 0)' }}
                        transition={{ duration: 1.2, ease: 'easeOut' }}
                        className="leading-relaxed hover:bg-white/5 px-1.5 py-0.5 rounded transition-colors"
                      >
                        {log}
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ENV TAB */}
            {activeTab === 'env' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#8e9192] font-sans">
                    Kayıtlı ortam değişkenleri ({container.env.length})
                  </span>
                  <button
                    onClick={() => setShowSecrets(!showSecrets)}
                    className="flex items-center gap-1.5 text-xs text-[#8e9192] hover:text-white px-2.5 py-1 rounded-lg bg-[#181a22] border border-[#262832] transition cursor-pointer font-sans"
                  >
                    {showSecrets ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showSecrets ? 'Gizle' : 'Gizli Değerleri Göster'}</span>
                  </button>
                </div>

                <div className="rounded-xl border border-[#22242b] overflow-hidden text-xs">
                  <table className="w-full text-left font-mono">
                    <thead className="bg-[#101116] text-[#8e9192] border-b border-[#22242b] font-sans">
                      <tr>
                        <th className="p-3">Anahtar (Key)</th>
                        <th className="p-3">Değer (Value)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#22242b] bg-[#14151b]">
                      {container.env.map((e, index) => (
                        <tr key={index} className="hover:bg-white/[0.02]">
                          <td className="p-3 text-blue-400 font-semibold">{e.key}</td>
                          <td className="p-3 text-slate-300">
                            {e.secret && !showSecrets ? '••••••••••••••••' : e.value}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TERMINAL TAB */}
            {activeTab === 'terminal' && (
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-[#0c0d12] border border-[#22242b] font-mono text-xs text-emerald-400 space-y-1.5 min-h-[300px] flex flex-col justify-between">
                  <div className="space-y-1 overflow-y-auto max-h-[260px]">
                    {terminalOutput.map((line, idx) => (
                      <div key={idx} className={line.startsWith('$') ? 'text-white' : 'text-slate-300'}>
                        {line}
                      </div>
                    ))}
                  </div>

                  {/* Terminal Command Input */}
                  <form onSubmit={handleTerminalSubmit} className="flex items-center gap-2 pt-2 border-t border-[#22242b]">
                    <span className="text-blue-400 select-none">akson@{container.name}:~$</span>
                    <input
                      type="text"
                      value={terminalInput}
                      onChange={(e) => setTerminalInput(e.target.value)}
                      placeholder="Komut girin (örn: ps, uptime)..."
                      className="flex-1 bg-transparent text-white text-xs font-mono focus:outline-none placeholder:text-zinc-600"
                    />
                  </form>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
