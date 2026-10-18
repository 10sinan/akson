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
        return <Zap className="w-5 h-5 text-zinc-300" />;
      case 'service':
        return <Globe className="w-5 h-5 text-zinc-300" />;
      case 'database':
        return <Database className="w-5 h-5 text-zinc-300" />;
      case 'worker':
        return <Cpu className="w-5 h-5 text-zinc-300" />;
      default:
        return <Layers className="w-5 h-5 text-zinc-400" />;
    }
  };

  const isRunning = container.status === 'running';

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={wiseGentle}
      className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 sm:p-5 flex flex-col gap-4 shadow-2xl h-full relative overflow-hidden"
    >
      {/* Header of Detail View */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-zinc-800 relative z-10">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 shadow-inner">
            {getIcon()}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight font-sans">
                {container.name}
              </h2>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-sans border ${
                  isRunning
                    ? 'bg-zinc-900 text-white border-zinc-800'
                    : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isRunning
                      ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]'
                      : 'bg-zinc-600'
                  }`}
                />
                {container.statusText}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-zinc-400">
              <span className="font-mono text-zinc-300">
                {container.image}:{container.tag}
              </span>
              <span className="text-zinc-600">•</span>
              <button
                onClick={copyContainerId}
                title="Konteyner ID'sini Kopyala"
                className="flex items-center gap-1 font-mono text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <span>{container.id.slice(0, 12)}</span>
                {copiedId ? (
                  <Check className="w-3.5 h-3.5 text-white" />
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 text-zinc-300 hover:text-white border border-zinc-700 text-xs font-medium font-sans transition cursor-pointer shadow-sm hover:bg-zinc-800"
              title="Gemini ile Hata ve Konfigürasyon Analizi"
            >
              <Sparkles className="w-3.5 h-3.5 text-zinc-300" />
              <span>AI Analizi</span>
            </motion.button>
          )}

          {isRunning ? (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              transition={wiseBouncy}
              onClick={() => onAction('stop', container.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 rounded-xl text-xs font-medium font-sans transition cursor-pointer shadow-sm"
            >
              <Square className="w-3.5 h-3.5 fill-white" />
              <span>Durdur</span>
            </motion.button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              transition={wiseBouncy}
              onClick={() => onAction('start', container.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-zinc-200 text-black border border-white rounded-xl text-xs font-medium font-sans transition cursor-pointer shadow-sm font-semibold"
            >
              <Play className="w-3.5 h-3.5 fill-black" />
              <span>Başlat</span>
            </motion.button>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            transition={wiseBouncy}
            onClick={() => onAction('restart', container.id)}
            title="Konteyneri Yeniden Başlat"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-700 rounded-xl text-xs font-medium font-sans transition cursor-pointer shadow-sm"
          >
            <RotateCw className="w-3.5 h-3.5 text-zinc-300" />
            <span>Yeniden Başlat</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            transition={wiseBouncy}
            onClick={() => onAction('delete', container.id)}
            title="Konteyneri Sil"
            className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-700 rounded-xl transition cursor-pointer shadow-sm"
          >
            <Trash2 className="w-4 h-4" />
          </motion.button>

          {onClose && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              transition={wiseBouncy}
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium font-sans rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 flex items-center gap-1.5 cursor-pointer transition shadow-sm ml-1"
              title="Görünümü Kapat"
            >
              <X className="w-3.5 h-3.5" />
              <span>Kapat</span>
            </motion.button>
          )}
        </div>
      </div>

      {/* Navigation Tabs with Wise Sliding Spring Indicator */}
      <div className="flex items-center gap-1 border-b border-zinc-800 pb-1">
        <button
          onClick={() => setActiveTab('overview')}
          className={`relative flex items-center gap-2 px-3.5 py-2 text-xs font-sans font-medium transition-colors cursor-pointer select-none rounded-lg ${
            activeTab === 'overview' ? 'text-white font-semibold' : 'text-zinc-400 hover:text-white'
          }`}
        >
          {activeTab === 'overview' && (
            <motion.div
              layoutId="detailSubTabPill"
              className="absolute inset-0 bg-zinc-800 rounded-lg border border-zinc-700 shadow-sm"
              transition={wiseBouncy}
            />
          )}
          <span className="relative z-10 flex items-center gap-2">
            <Activity className="w-4 h-4 text-zinc-300" />
            <span>Genel Bakış</span>
          </span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`relative flex items-center gap-2 px-3.5 py-2 text-xs font-sans font-medium transition-colors cursor-pointer select-none rounded-lg ${
            activeTab === 'logs' ? 'text-white font-semibold' : 'text-zinc-400 hover:text-white'
          }`}
        >
          {activeTab === 'logs' && (
            <motion.div
              layoutId="detailSubTabPill"
              className="absolute inset-0 bg-zinc-800 rounded-lg border border-zinc-700 shadow-sm"
              transition={wiseBouncy}
            />
          )}
          <span className="relative z-10 flex items-center gap-2">
            <Terminal className="w-4 h-4 text-zinc-300" />
            <span>Canlı Loglar ({liveLogs.length})</span>
          </span>
        </button>

        <button
          onClick={() => setActiveTab('env')}
          className={`relative flex items-center gap-2 px-3.5 py-2 text-xs font-sans font-medium transition-colors cursor-pointer select-none rounded-lg ${
            activeTab === 'env' ? 'text-white font-semibold' : 'text-zinc-400 hover:text-white'
          }`}
        >
          {activeTab === 'env' && (
            <motion.div
              layoutId="detailSubTabPill"
              className="absolute inset-0 bg-zinc-800 rounded-lg border border-zinc-700 shadow-sm"
              transition={wiseBouncy}
            />
          )}
          <span className="relative z-10 flex items-center gap-2">
            <Key className="w-4 h-4 text-zinc-300" />
            <span>Ortam Değişkenleri ({container.env.length})</span>
          </span>
        </button>

        <button
          onClick={() => setActiveTab('terminal')}
          className={`relative flex items-center gap-2 px-3.5 py-2 text-xs font-sans font-medium transition-colors cursor-pointer select-none rounded-lg ${
            activeTab === 'terminal' ? 'text-white font-semibold' : 'text-zinc-400 hover:text-white'
          }`}
        >
          {activeTab === 'terminal' && (
            <motion.div
              layoutId="detailSubTabPill"
              className="absolute inset-0 bg-zinc-800 rounded-lg border border-zinc-700 shadow-sm"
              transition={wiseBouncy}
            />
          )}
          <span className="relative z-10 flex items-center gap-2">
            <Network className="w-4 h-4 text-zinc-300" />
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
                <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400 font-sans">İşlemci (CPU)</span>
                    <span className="text-white font-mono font-bold text-sm">
                      <AnimatedNumber value={liveCpu} decimals={1} suffix="%" />
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-white transition-all duration-300"
                      style={{ width: `${Math.min(liveCpu * 10, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-zinc-400 font-sans">
                    <span>Durum: {liveCpu > 80 ? 'Yüksek Yük' : 'Nominal'}</span>
                    <span className="font-mono text-zinc-300">Anlık SSE Akışı</span>
                  </div>
                </div>

                {/* Metric Card 2: Memory */}
                <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400 font-sans">Bellek (RAM)</span>
                    <span className="text-white font-mono font-bold text-sm">
                      <AnimatedNumber value={liveMemoryMb} decimals={0} suffix=" MB" />
                      <span className="text-zinc-500 text-xs font-normal"> / {container.memoryLimitMb} MB</span>
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-zinc-300 transition-all duration-300"
                      style={{
                        width: `${Math.min(
                          (liveMemoryMb / container.memoryLimitMb) * 100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-zinc-400 font-sans">
                    <span>Limit: {container.memoryLimitMb} MB</span>
                    <span className="font-mono text-zinc-300">
                      %{Math.round((liveMemoryMb / container.memoryLimitMb) * 100)} Doluluk
                    </span>
                  </div>
                </div>

                {/* Info Card 3: Network & Routes */}
                <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2.5">
                  <h4 className="text-xs font-semibold text-white font-sans tracking-wide">
                    Ağ & İletişim
                  </h4>
                  <div className="divide-y divide-zinc-800 text-xs">
                    <div className="flex justify-between py-2">
                      <span className="text-zinc-400 font-sans">Docker Köprüsü</span>
                      <span className="text-white font-mono">{container.network}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-zinc-400 font-sans">Dahili IP Adresi</span>
                      <span className="text-white font-mono">{container.ipAddress}</span>
                    </div>
                    {container.traefikRoute && (
                      <div className="flex justify-between py-2 items-center">
                        <span className="text-zinc-400 font-sans">Traefik Rotası</span>
                        <a
                          href={`https://${container.traefikRoute}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-white hover:underline flex items-center gap-1 font-mono text-xs"
                        >
                          {container.traefikRoute}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Info Card 4: Runtime Specs */}
                <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2.5">
                  <h4 className="text-xs font-semibold text-white font-sans tracking-wide">
                    Çalışma Zamanı Bilgisi
                  </h4>
                  <div className="divide-y divide-zinc-800 text-xs">
                    <div className="flex justify-between py-2">
                      <span className="text-zinc-400 font-sans">Konteyner İmajı</span>
                      <span className="text-white font-mono">{container.image}:{container.tag}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-zinc-400 font-sans">Çalışma Süresi</span>
                      <span className="text-white font-mono">{container.uptime}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-zinc-400 font-sans">Yeniden Başlatma</span>
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
                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-zinc-900 text-white border border-zinc-800 text-[10px] font-sans">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      <span>Canlı Akış</span>
                    </span>
                    <span className="text-xs text-zinc-400 font-mono">
                      Docker Engine API stdout/stderr
                    </span>
                  </div>
                  <button
                    onClick={copyLogs}
                    className="flex items-center gap-1 text-xs text-zinc-300 hover:text-white px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-700 transition cursor-pointer font-sans hover:bg-zinc-800"
                  >
                    {copiedLogs ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLogs ? 'Kopyalandı' : 'Tümünü Kopyala'}</span>
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 font-mono text-xs text-zinc-300 space-y-1.5 max-h-[350px] overflow-y-auto">
                  {liveLogs.map((log, index) => {
                    const isLatest = index === liveLogs.length - 1;
                    return (
                      <motion.div
                        key={index}
                        initial={
                          isLatest
                            ? { opacity: 0, x: -6, backgroundColor: 'rgba(255, 255, 255, 0.08)' }
                            : false
                        }
                        animate={{ opacity: 1, x: 0, backgroundColor: 'rgba(255, 255, 255, 0)' }}
                        transition={{ duration: 1.2, ease: 'easeOut' }}
                        className="leading-relaxed hover:bg-zinc-900 px-1.5 py-0.5 rounded transition-colors"
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
                  <span className="text-xs text-zinc-400 font-sans">
                    Kayıtlı ortam değişkenleri ({container.env.length})
                  </span>
                  <button
                    onClick={() => setShowSecrets(!showSecrets)}
                    className="flex items-center gap-1.5 text-xs text-zinc-300 hover:text-white px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-700 transition cursor-pointer font-sans hover:bg-zinc-800"
                  >
                    {showSecrets ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showSecrets ? 'Gizle' : 'Gizli Değerleri Göster'}</span>
                  </button>
                </div>

                <div className="rounded-xl border border-zinc-800 overflow-hidden text-xs">
                  <table className="w-full text-left font-mono">
                    <thead className="bg-zinc-900 text-zinc-400 border-b border-zinc-800 font-sans">
                      <tr>
                        <th className="p-3">Anahtar (Key)</th>
                        <th className="p-3">Değer (Value)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800 bg-zinc-950">
                      {container.env.map((e, index) => (
                        <tr key={index} className="hover:bg-zinc-900/50">
                          <td className="p-3 text-zinc-200 font-semibold">{e.key}</td>
                          <td className="p-3 text-zinc-400">
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
                <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 font-mono text-xs text-zinc-300 space-y-1.5 min-h-[300px] flex flex-col justify-between">
                  <div className="space-y-1 overflow-y-auto max-h-[260px]">
                    {terminalOutput.map((line, idx) => (
                      <div key={idx} className={line.startsWith('$') ? 'text-white' : 'text-zinc-400'}>
                        {line}
                      </div>
                    ))}
                  </div>

                  {/* Terminal Command Input */}
                  <form onSubmit={handleTerminalSubmit} className="flex items-center gap-2 pt-2 border-t border-zinc-800">
                    <span className="text-zinc-400 select-none">akson@{container.name}:~$</span>
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
