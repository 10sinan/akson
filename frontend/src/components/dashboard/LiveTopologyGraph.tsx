import React from 'react';
import { motion } from 'framer-motion';
import {
  Globe,
  ShieldCheck,
  Zap,
  Database,
  Cpu,
  Layers,
  Server,
  Play,
  Square,
  RotateCw,
  ExternalLink,
  Activity,
  Plus,
} from 'lucide-react';
import type { ContainerItem } from '../../types/container';
import { wiseBouncy } from '../../utils/motion';
import { soundManager } from '../../utils/sound';
import { MicroSparkline } from '../MicroSparkline';

interface LiveTopologyGraphProps {
  containers: ContainerItem[];
  selectedId: string;
  onSelectContainer: (container: ContainerItem) => void;
  onAction?: (action: 'start' | 'stop' | 'restart' | 'delete', id: string) => void;
  onDeployClick?: () => void;
}

export const LiveTopologyGraph: React.FC<LiveTopologyGraphProps> = ({
  containers,
  selectedId,
  onSelectContainer,
  onAction,
  onDeployClick,
}) => {
  // Group or classify containers
  const runningCount = containers.filter((c) => c.status === 'running').length;

  const getCategoryIcon = (category: ContainerItem['category']) => {
    switch (category) {
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

  const selectedContainer = containers.find((c) => c.id === selectedId) || containers[0] || null;

  return (
    <div className="relative w-full rounded-3xl bg-[#0c0e14] border border-[#1e2230] p-6 lg:p-8 overflow-hidden shadow-2xl">
      {/* 1. HAFİF MİMARİ IZGARA VE AMBİYANS IŞIĞI (Dot Matrix Architecture Canvas) */}
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />
      <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-blue-500/10 blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-emerald-500/10 blur-[100px] pointer-events-none" />

      {/* 2. TOPOLOJİ BAŞLIĞI VE CANLI DURUM */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-lg shadow-emerald-500/50" />
            <h2 className="text-base font-bold text-white tracking-tight font-sans flex items-center gap-2">
              Canlı Altyapı & Servis Topolojisi
            </h2>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
              Canlı Ağ Akışı
            </span>
          </div>
          <p className="text-xs text-[#8e9192] mt-1 font-sans">
            Trafik akışı, Traefik ters vekil yönlendirmeleri ve bağlı Docker servisleri
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/5">
            <span className="text-[#8e9192] font-sans">Aktif Düğümler:</span>
            <span className="text-emerald-400 font-bold">{runningCount}</span>
            <span className="text-[#8e9192]">/</span>
            <span className="text-white">{containers.length}</span>
          </div>
        </div>
      </div>

      {/* 3. İNTERAKTİF DÜĞÜM AKIŞ ŞEMASI (Interactive Node Flow) */}
      <div className="relative z-10 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* A. SOL İSTASYON: İNTERNET GİRİŞİ (Ingress Gateway) */}
          <div className="lg:col-span-3 flex flex-col items-center lg:items-start space-y-3">
            <span className="text-[10px] font-mono text-[#8e9192] uppercase tracking-wider font-semibold">
              01. Dış Dünya (Ingress)
            </span>
            <div className="w-full p-4 rounded-2xl bg-[#121520] border border-[#232838] shadow-lg flex items-center gap-3.5 group hover:border-blue-500/50 transition-all">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center shrink-0">
                <Globe className="w-6 h-6 text-blue-400 animate-spin-slow" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-bold text-white font-sans truncate">Genel Ağ Girişi</h3>
                <div className="text-[11px] text-blue-300 font-mono mt-0.5">:80 / :443 HTTPS</div>
                <div className="text-[10px] text-emerald-400 font-sans mt-0.5">● Trafik Açık</div>
              </div>
            </div>
          </div>

          {/* B. BAĞLANTI OKU 1 */}
          <div className="hidden lg:flex lg:col-span-1 items-center justify-center">
            <div className="relative w-full h-[2px] bg-gradient-to-r from-blue-500 to-indigo-500 overflow-hidden rounded-full">
              <motion.div
                className="absolute top-0 bottom-0 w-8 bg-white"
                animate={{ x: ['-100%', '300%'] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              />
            </div>
          </div>

          {/* C. ORTA İSTASYON: TRAEFIK V3 TERS VEKİL (Proxy Hub) */}
          <div className="lg:col-span-3 flex flex-col items-center lg:items-start space-y-3">
            <span className="text-[10px] font-mono text-[#8e9192] uppercase tracking-wider font-semibold">
              02. SSL / Ters Vekil
            </span>
            <div className="w-full p-4 rounded-2xl bg-[#121520] border border-[#232838] shadow-lg flex items-center gap-3.5 group hover:border-emerald-500/50 transition-all">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6 text-emerald-400" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-bold text-white font-sans truncate">Traefik v3 Hub</h3>
                <div className="text-[11px] text-emerald-300 font-mono mt-0.5">TLS-ALPN-01 ACME</div>
                <div className="text-[10px] text-[#8e9192] font-mono mt-0.5">akson-bridge</div>
              </div>
            </div>
          </div>

          {/* D. BAĞLANTI OKU 2 */}
          <div className="hidden lg:flex lg:col-span-1 items-center justify-center">
            <div className="relative w-full h-[2px] bg-gradient-to-r from-indigo-500 to-emerald-500 overflow-hidden rounded-full">
              <motion.div
                className="absolute top-0 bottom-0 w-8 bg-white"
                animate={{ x: ['-100%', '300%'] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear', delay: 0.4 }}
              />
            </div>
          </div>

          {/* E. SAĞ İSTASYON: İZLEME VE TOPLAM YÜK (Cluster Heartbeat) */}
          <div className="lg:col-span-4 flex flex-col items-center lg:items-start space-y-3">
            <span className="text-[10px] font-mono text-[#8e9192] uppercase tracking-wider font-semibold">
              03. İzole Ağ (172.20.0.0/16)
            </span>
            <div className="w-full p-4 rounded-2xl bg-[#121520] border border-[#232838] shadow-lg flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center shrink-0">
                  <Server className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white font-sans">Docker Motoru</h3>
                  <div className="text-[11px] text-purple-300 font-mono mt-0.5">Linux 6.6 cgroups-v2</div>
                  <div className="text-[10px] text-emerald-400 font-sans mt-0.5">● Soket Aktif</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4. CANLI BAĞLI SERVİS DÜĞÜMLERİ (Service Nodes Grid) */}
        <div className="mt-8 pt-6 border-t border-white/5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-bold text-white uppercase tracking-wider font-sans flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              Bağlı Servis Düğümleri (Düğüm Seçip Detayı İnceleyin)
            </span>
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-sans text-[#8e9192] hidden sm:inline">
                Tıklanan düğüm aşağıda canlı telemetriyle açılır
              </span>
              {onDeployClick && (
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playClick();
                    onDeployClick();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-950 text-xs font-sans font-bold transition shadow-md active:scale-95 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Yeni Servis Dağıt</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pt-2">
            {containers.map((container) => {
              const isSelected = selectedId === container.id;
              const isRunning = container.status === 'running';

              return (
                <motion.div
                  key={container.id}
                  whileHover={{ y: -3, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={wiseBouncy}
                  onClick={() => {
                    soundManager.playClick();
                    onSelectContainer(container);
                  }}
                  className={`relative p-4 rounded-2xl border cursor-pointer select-none transition-all duration-200 overflow-hidden group ${
                    isSelected
                      ? 'bg-[#181d2c] border-emerald-400/80 shadow-xl shadow-emerald-500/15 ring-2 ring-emerald-400/30'
                      : 'bg-[#10131d] border-[#202536] hover:border-white/30 hover:bg-[#141824]'
                  }`}
                >
                  {/* Active selection glow */}
                  {isSelected && (
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-400/10 rounded-full blur-xl pointer-events-none" />
                  )}

                  {/* Top: Icon, Node Name, Status Pulse */}
                  <div className="flex items-center justify-between gap-2 relative z-10">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-[#161a28] border border-[#262c3e] flex items-center justify-center shrink-0">
                        {getCategoryIcon(container.category)}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-white font-sans tracking-tight truncate">
                          {container.name}
                        </h4>
                        <div className="text-[10px] text-[#8e9192] font-mono truncate">
                          {container.image}:{container.tag}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/5">
                      <span className="relative flex h-2 w-2">
                        {isRunning && (
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        )}
                        <span
                          className={`relative inline-flex rounded-full h-2 w-2 ${
                            isRunning ? 'bg-emerald-400' : 'bg-zinc-600'
                          }`}
                        />
                      </span>
                      <span className={`text-[10px] font-sans font-medium ${isRunning ? 'text-emerald-400' : 'text-zinc-500'}`}>
                        {container.statusText}
                      </span>
                    </div>
                  </div>

                  {/* Middle: Live Sparkline Pulse Wave */}
                  <div className="mt-3 relative z-10">
                    <div className="flex items-center justify-between text-[10px] font-mono text-[#8e9192] mb-1">
                      <span>Yük Dalgalanması</span>
                      <span className="text-white font-medium">%{container.cpuPercent} CPU</span>
                    </div>
                    <MicroSparkline
                      data={
                        isRunning
                          ? [
                              Math.max(4, Math.round(container.cpuPercent * 8)),
                              Math.max(6, Math.round(container.cpuPercent * 11)),
                              Math.max(3, Math.round(container.cpuPercent * 7)),
                              Math.max(9, Math.round(container.cpuPercent * 13)),
                              Math.max(5, Math.round(container.cpuPercent * 9)),
                              Math.max(12, Math.round(container.cpuPercent * 14)),
                              Math.max(7, Math.round(container.cpuPercent * 10)),
                            ]
                          : [0, 0, 0, 0, 0, 0, 0]
                      }
                      color={isRunning ? (container.cpuPercent > 50 ? 'amber' : 'emerald') : 'zinc'}
                      height={20}
                      isLive={isRunning}
                    />
                  </div>

                  {/* Bottom: Port & IP Specs */}
                  <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-[#8e9192] relative z-10">
                    <span className="text-blue-400">
                      {container.ports.length > 0
                        ? `:${container.ports[0].hostPort}➔${container.ports[0].containerPort}`
                        : 'Dahili Köprü'}
                    </span>
                    <span className="text-slate-300 font-medium">
                      {container.memoryUsageMb} MB
                    </span>
                  </div>
                </motion.div>
              );
            })}

            {containers.length === 0 && (
              <div className="col-span-full p-8 text-center text-xs font-sans text-[#8e9192] bg-[#121520] rounded-2xl border border-[#232838]">
                Henüz aktif servis düğümü bulunmuyor. Yeni bir servis dağıtarak ağ akışını başlatabilirsiniz.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 5. SEÇİLİ DÜĞÜMÜN CANLI ETKİLEŞİM DÜĞMESİ VE KONTROL KONSOLU */}
      {selectedContainer && (
        <div className="mt-6 pt-6 border-t border-white/5 relative z-10 flex flex-col md:flex-row items-center justify-between gap-4 bg-[#10131d] p-4 rounded-2xl border border-[#202536]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#161a28] border border-[#262c3e] flex items-center justify-center shrink-0">
              {getCategoryIcon(selectedContainer.category)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white font-sans">{selectedContainer.name}</span>
                <span className="text-xs text-blue-400 font-mono">({selectedContainer.image}:{selectedContainer.tag})</span>
                {selectedContainer.traefikRoute && (
                  <a
                    href={`https://${selectedContainer.traefikRoute}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-400 hover:underline text-xs font-mono flex items-center gap-1"
                  >
                    <span>{selectedContainer.traefikRoute}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <div className="text-[11px] text-[#8e9192] font-mono mt-0.5">
                Dahili IP: <span className="text-white">{selectedContainer.ipAddress}</span> • Çalışma Süresi: <span className="text-white">{selectedContainer.uptime}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions for Selected Node */}
          <div className="flex items-center gap-2 shrink-0">
            {selectedContainer.status === 'running' ? (
              <button
                onClick={() => onAction?.('stop', selectedContainer.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/25 rounded-xl text-xs font-sans transition cursor-pointer active:scale-95"
              >
                <Square className="w-3 h-3 fill-rose-300" />
                <span>Durdur</span>
              </button>
            ) : (
              <button
                onClick={() => onAction?.('start', selectedContainer.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/25 rounded-xl text-xs font-sans transition cursor-pointer active:scale-95"
              >
                <Play className="w-3 h-3 fill-emerald-300" />
                <span>Başlat</span>
              </button>
            )}

            <button
              onClick={() => onAction?.('restart', selectedContainer.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl text-xs font-sans transition cursor-pointer active:scale-95"
            >
              <RotateCw className="w-3 h-3 text-blue-400" />
              <span>Yeniden Başlat</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
