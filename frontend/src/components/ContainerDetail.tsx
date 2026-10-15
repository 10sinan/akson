import { useState } from 'react';
import type { ContainerItem } from '../types/container';
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
} from 'lucide-react';

interface ContainerDetailProps {
  container: ContainerItem;
  onAction: (action: 'start' | 'stop' | 'restart' | 'delete', id: string) => void;
}

type DetailTab = 'overview' | 'logs' | 'env' | 'terminal';

export const ContainerDetail: React.FC<ContainerDetailProps> = ({
  container,
  onAction,
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

  const copyContainerId = () => {
    navigator.clipboard.writeText(container.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const copyLogs = () => {
    navigator.clipboard.writeText(container.logs.join('\n'));
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
    <div className="bg-[#121318] border border-[#26282e] rounded-2xl p-6 flex flex-col gap-6 shadow-2xl h-full">
      {/* Header of Detail View */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-[#26282e]">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-[#1a1b21] border border-[#292a2f] flex items-center justify-center shrink-0 shadow-inner">
            {getIcon()}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-white font-mono tracking-tight">
                {container.name}
              </h2>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono border ${
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
            <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-[#8e9192] font-mono">
              <span className="px-2 py-0.5 rounded bg-[#1a1b21] text-slate-300 border border-[#292a2f]">
                {container.subtitle}
              </span>
              <button
                onClick={copyContainerId}
                title="Konteyner ID'sini Kopyala"
                className="flex items-center gap-1 text-[#8e9192] hover:text-white transition-colors cursor-pointer"
              >
                <span>{container.id}</span>
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
        <div className="flex items-center gap-2">
          {isRunning ? (
            <button
              onClick={() => onAction('stop', container.id)}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#1a1b21] hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 border border-[#292a2f] hover:border-rose-500/40 rounded-xl text-xs font-medium transition cursor-pointer active:scale-95"
            >
              <Square className="w-3.5 h-3.5 fill-rose-300" />
              <span>Durdur</span>
            </button>
          ) : (
            <button
              onClick={() => onAction('start', container.id)}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#1a1b21] hover:bg-emerald-500/20 text-emerald-300 hover:text-emerald-200 border border-[#292a2f] hover:border-emerald-500/40 rounded-xl text-xs font-medium transition cursor-pointer active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-emerald-300" />
              <span>Başlat</span>
            </button>
          )}

          <button
            onClick={() => onAction('restart', container.id)}
            title="Konteyneri Yeniden Başlat"
            className="flex items-center gap-1.5 px-3 py-2 bg-[#1a1b21] hover:bg-[#232736] text-white border border-[#292a2f] rounded-xl text-xs font-medium transition cursor-pointer active:scale-95"
          >
            <RotateCw className="w-3.5 h-3.5 text-blue-400" />
            <span>Yeniden Başlat</span>
          </button>

          <button
            onClick={() => onAction('delete', container.id)}
            title="Konteyneri Sil"
            className="p-2 bg-[#1a1b21] hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 border border-[#292a2f] rounded-xl transition cursor-pointer active:scale-95"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#26282e]">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition cursor-pointer ${
            activeTab === 'overview'
              ? 'border-blue-500 text-white font-semibold'
              : 'border-transparent text-[#8e9192] hover:text-white'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Genel Bakış</span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition cursor-pointer ${
            activeTab === 'logs'
              ? 'border-blue-500 text-white font-semibold'
              : 'border-transparent text-[#8e9192] hover:text-white'
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>Canlı Loglar ({container.logs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('env')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition cursor-pointer ${
            activeTab === 'env'
              ? 'border-blue-500 text-white font-semibold'
              : 'border-transparent text-[#8e9192] hover:text-white'
          }`}
        >
          <Key className="w-4 h-4" />
          <span>Ortam Değişkenleri ({container.env.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('terminal')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition cursor-pointer ${
            activeTab === 'terminal'
              ? 'border-blue-500 text-white font-semibold'
              : 'border-transparent text-[#8e9192] hover:text-white'
          }`}
        >
          <Network className="w-4 h-4" />
          <span>Shell Terminali (PTY)</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Metric Card 1: CPU */}
            <div className="p-4 rounded-xl bg-[#16171d] border border-[#26282e] space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#8e9192] font-mono">CPU Kullanımı</span>
                <span className="text-white font-mono font-bold">{container.cpuPercent.toFixed(1)}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#1a1b21] overflow-hidden">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${Math.min(container.cpuPercent * 10, 100)}%` }}
                />
              </div>
              <p className="text-[11px] text-[#8e9192]">Docker cgroup stats üzerinden gerçek zamanlı hesaplanıyor.</p>
            </div>

            {/* Metric Card 2: Memory */}
            <div className="p-4 rounded-xl bg-[#16171d] border border-[#26282e] space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#8e9192] font-mono">RAM Bellek</span>
                <span className="text-white font-mono font-bold">
                  {container.memoryUsageMb} MB / {container.memoryLimitMb} MB
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#1a1b21] overflow-hidden">
                <div
                  className="h-full rounded-full bg-purple-500 transition-all duration-300"
                  style={{
                    width: `${Math.min(
                      (container.memoryUsageMb / container.memoryLimitMb) * 100,
                      100
                    )}%`,
                  }}
                />
              </div>
              <p className="text-[11px] text-[#8e9192]">Limit: {container.memoryLimitMb} MB (Hard Limit)</p>
            </div>

            {/* Network & Route Info */}
            <div className="p-4 rounded-xl bg-[#16171d] border border-[#26282e] space-y-2.5">
              <h4 className="text-xs font-semibold text-white font-mono uppercase tracking-wider">Ağ & İletişim</h4>
              <div className="space-y-1.5 text-xs font-mono">
                <div className="flex justify-between py-1 border-b border-[#26282e]">
                  <span className="text-[#8e9192]">Docker Ağı:</span>
                  <span className="text-white">{container.network}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#26282e]">
                  <span className="text-[#8e9192]">Dahili IP:</span>
                  <span className="text-white">{container.ipAddress}</span>
                </div>
                {container.traefikRoute && (
                  <div className="flex justify-between py-1 border-b border-[#26282e]">
                    <span className="text-[#8e9192]">Traefik Rotası:</span>
                    <a
                      href={`https://${container.traefikRoute}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-400 hover:underline flex items-center gap-1"
                    >
                      {container.traefikRoute}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Container Details */}
            <div className="p-4 rounded-xl bg-[#16171d] border border-[#26282e] space-y-2.5">
              <h4 className="text-xs font-semibold text-white font-mono uppercase tracking-wider">Konteyner Bilgisi</h4>
              <div className="space-y-1.5 text-xs font-mono">
                <div className="flex justify-between py-1 border-b border-[#26282e]">
                  <span className="text-[#8e9192]">İmaj:</span>
                  <span className="text-white">{container.image}:{container.tag}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#26282e]">
                  <span className="text-[#8e9192]">Çalışma Süresi:</span>
                  <span className="text-white">{container.uptime}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#26282e]">
                  <span className="text-[#8e9192]">Yeniden Başlatma:</span>
                  <span className="text-white">{container.restartCount} kez</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* LOGS TAB */}
        {activeTab === 'logs' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#8e9192] font-mono">
                Docker Engine API stdout/stderr canlı akışı
              </span>
              <button
                onClick={copyLogs}
                className="flex items-center gap-1 text-xs text-[#8e9192] hover:text-white px-2 py-1 rounded bg-[#16171d] border border-[#26282e] transition cursor-pointer"
              >
                {copiedLogs ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLogs ? 'Kopyalandı' : 'Tümünü Kopyala'}</span>
              </button>
            </div>

            <div className="p-4 rounded-xl bg-[#090a0f] border border-[#26282e] font-mono text-xs text-[#c4c7c8] space-y-1.5 max-h-[350px] overflow-y-auto">
              {container.logs.map((log, index) => (
                <div key={index} className="leading-relaxed hover:bg-white/5 px-1 rounded">
                  {log}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ENV TAB */}
        {activeTab === 'env' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#8e9192] font-mono">
                Konteyner ortam değişkenleri (Environment Variables)
              </span>
              <button
                onClick={() => setShowSecrets(!showSecrets)}
                className="flex items-center gap-1 text-xs text-[#8e9192] hover:text-white px-2 py-1 rounded bg-[#16171d] border border-[#26282e] transition cursor-pointer"
              >
                {showSecrets ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showSecrets ? 'Gizle' : 'Gizli Değerleri Göster'}</span>
              </button>
            </div>

            <div className="rounded-xl border border-[#26282e] overflow-hidden font-mono text-xs">
              <table className="w-full text-left">
                <thead className="bg-[#16171d] text-[#8e9192] border-b border-[#26282e]">
                  <tr>
                    <th className="p-3">Anahtar (Key)</th>
                    <th className="p-3">Değer (Value)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#26282e] bg-[#121318]">
                  {container.env.map((e, index) => (
                    <tr key={index} className="hover:bg-white/5">
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
            <div className="p-4 rounded-xl bg-[#090a0f] border border-[#26282e] font-mono text-xs text-emerald-400 space-y-1.5 min-h-[300px] flex flex-col justify-between">
              <div className="space-y-1 overflow-y-auto max-h-[260px]">
                {terminalOutput.map((line, idx) => (
                  <div key={idx} className={line.startsWith('$') ? 'text-white' : 'text-slate-300'}>
                    {line}
                  </div>
                ))}
              </div>

              {/* Terminal Command Input */}
              <form onSubmit={handleTerminalSubmit} className="flex items-center gap-2 pt-2 border-t border-[#26282e]">
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
      </div>
    </div>
  );
};
