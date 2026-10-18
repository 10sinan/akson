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
  selectedId: string | null;
  isDetailOpen?: boolean;
  onSelectContainer: (container: ContainerItem) => void;
  onAction?: (action: 'start' | 'stop' | 'restart' | 'delete', id: string) => void;
  onDeployClick?: () => void;
}

export const LiveTopologyGraph: React.FC<LiveTopologyGraphProps> = ({
  containers,
  selectedId,
  isDetailOpen = false,
  onSelectContainer,
  onAction,
  onDeployClick,
}) => {
  // Group or classify containers
  const runningCount = containers.filter((c) => c.status === 'running').length;

  const getCategoryIcon = (category: ContainerItem['category']) => {
    switch (category) {
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

  const selectedContainer = selectedId ? containers.find((c) => c.id === selectedId) || null : null;

  return (
    <div
      className={`relative w-full rounded-3xl bg-zinc-950 border border-zinc-800 p-5 sm:p-6 ${
        isDetailOpen ? 'lg:p-6' : 'lg:p-8'
      } overflow-hidden shadow-2xl transition-all duration-300`}
    >
      {/* 1. HAFİF MİMARİ IZGARA VE AMBİYANS IŞIĞI (Dot Matrix Architecture Canvas) */}
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />
      <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-white/[0.015] blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-white/[0.015] blur-[100px] pointer-events-none" />

      {/* 2. TOPOLOJİ BAŞLIĞI VE CANLI DURUM */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse shadow-sm" />
            <h2 className="text-base font-bold text-white tracking-tight font-sans flex items-center gap-2">
              Canlı Altyapı & Servis Topolojisi
            </h2>
            <span className="text-[11px] font-mono text-zinc-300 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-full">
              Canlı Ağ Akışı
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1 font-sans">
            Trafik akışı, Traefik ters vekil yönlendirmeleri ve bağlı Docker servisleri
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800">
            <span className="text-zinc-400 font-sans">Aktif Düğümler:</span>
            <span className="text-white font-bold">{runningCount}</span>
            <span className="text-zinc-500">/</span>
            <span className="text-zinc-300">{containers.length}</span>
          </div>
        </div>
      </div>

      {/* 3. İNTERAKTİF DÜĞÜM AKIŞ ŞEMASI (Interactive Node Flow) */}
      <div className="relative z-10 py-6 sm:py-8">
        <div
          className={`grid items-center gap-4 ${
            isDetailOpen
              ? 'grid-cols-1 md:grid-cols-3'
              : 'grid-cols-1 lg:grid-cols-12 gap-6'
          }`}
        >
          {/* A. SOL İSTASYON: İNTERNET GİRİŞİ (Ingress Gateway) */}
          <div className={`${isDetailOpen ? '' : 'lg:col-span-3'} flex flex-col items-center lg:items-start space-y-2.5`}>
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider font-semibold">
              01. Dış Dünya (Ingress)
            </span>
            <div className="w-full p-3.5 sm:p-4 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-lg flex items-center gap-3.5 group hover:border-zinc-700 transition-all">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                <Globe className="w-5 h-5 sm:w-6 sm:h-6 text-zinc-300 animate-spin-slow" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-bold text-white font-sans truncate">Genel Ağ Girişi</h3>
                <div className="text-[11px] text-zinc-300 font-mono mt-0.5">:80 / :443 HTTPS</div>
                <div className="text-[10px] text-zinc-400 font-sans mt-0.5">● Trafik Açık</div>
              </div>
            </div>
          </div>

          {/* B. BAĞLANTI OKU 1 */}
          {!isDetailOpen && (
            <div className="hidden lg:flex lg:col-span-1 items-center justify-center">
              <div className="relative w-full h-[2px] bg-zinc-800 overflow-hidden rounded-full">
                <motion.div
                  className="absolute top-0 bottom-0 w-8 bg-white"
                  animate={{ x: ['-100%', '300%'] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                />
              </div>
            </div>
          )}

          {/* C. ORTA İSTASYON: TRAEFIK V3 TERS VEKİL (Proxy Hub) */}
          <div className={`${isDetailOpen ? '' : 'lg:col-span-3'} flex flex-col items-center lg:items-start space-y-2.5`}>
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider font-semibold">
              02. SSL / Ters Vekil
            </span>
            <div className="w-full p-3.5 sm:p-4 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-lg flex items-center gap-3.5 group hover:border-zinc-700 transition-all">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-zinc-300" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-bold text-white font-sans truncate">Traefik v3 Hub</h3>
                <div className="text-[11px] text-zinc-300 font-mono mt-0.5">TLS-ALPN-01 ACME</div>
                <div className="text-[10px] text-zinc-400 font-mono mt-0.5">akson-bridge</div>
              </div>
            </div>
          </div>

          {/* D. BAĞLANTI OKU 2 */}
          {!isDetailOpen && (
            <div className="hidden lg:flex lg:col-span-1 items-center justify-center">
              <div className="relative w-full h-[2px] bg-zinc-800 overflow-hidden rounded-full">
                <motion.div
                  className="absolute top-0 bottom-0 w-8 bg-white"
                  animate={{ x: ['-100%', '300%'] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'linear', delay: 0.4 }}
                />
              </div>
            </div>
          )}

          {/* E. SAĞ İSTASYON: İZLEME VE TOPLAM YÜK (Cluster Heartbeat) */}
          <div className={`${isDetailOpen ? '' : 'lg:col-span-4'} flex flex-col items-center lg:items-start space-y-2.5`}>
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider font-semibold">
              03. İzole Ağ (172.20.0.0/16)
            </span>
            <div className="w-full p-3.5 sm:p-4 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-lg flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                  <Server className="w-5 h-5 sm:w-6 sm:h-6 text-zinc-300" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white font-sans">Docker Motoru</h3>
                  <div className="text-[11px] text-zinc-300 font-mono mt-0.5">Linux 6.6 cgroups-v2</div>
                  <div className="text-[10px] text-zinc-400 font-sans mt-0.5">● Soket Aktif</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4. CANLI BAĞLI SERVİS DÜĞÜMLERİ (Service Nodes Grid) */}
        <div className="mt-8 pt-6 border-t border-zinc-800 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-bold text-white uppercase tracking-wider font-sans flex items-center gap-2">
              <Activity className="w-4 h-4 text-white" />
              Bağlı Servis Düğümleri
            </span>
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-sans text-zinc-400 hidden sm:inline">
                {isDetailOpen
                  ? 'Düğüm detayları sağ panelde açıktır (Kapatmak için seçili düğüme tekrar tıklayın)'
                  : 'Tıklanan düğüm sağ panelde canlı detay görünümünü açar'}
              </span>
              {onDeployClick && (
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playClick();
                    onDeployClick();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-sans font-bold transition shadow-sm active:scale-95 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Yeni Servis Dağıt</span>
                </button>
              )}
            </div>
          </div>

          <div
            className={`grid gap-3.5 pt-2 ${
              isDetailOpen
                ? 'grid-cols-1 sm:grid-cols-2'
                : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
            }`}
          >
            {containers.map((container) => {
              const isSelected = selectedId === container.id;
              const isRunning = container.status === 'running';
              const isActiveSelection = isSelected && isDetailOpen;

              return (
                <motion.div
                  key={container.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`${container.name} servis düğümü. Detay panelini ${
                    isActiveSelection ? 'kapatmak' : 'açmak'
                  } için tıklayın.`}
                  aria-pressed={isActiveSelection}
                  whileHover={{ y: -3, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={wiseBouncy}
                  onClick={() => {
                    soundManager.playClick();
                    onSelectContainer(container);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      soundManager.playClick();
                      onSelectContainer(container);
                    }
                  }}
                  className={`relative p-4 rounded-2xl border cursor-pointer select-none transition-all duration-200 overflow-hidden group focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black ${
                    isActiveSelection
                      ? 'bg-zinc-900 border-white shadow-xl shadow-black ring-2 ring-white/30'
                      : isSelected
                      ? 'bg-zinc-900 border-zinc-400 ring-1 ring-white/20'
                      : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/60'
                  }`}
                >
                  {/* Active selection glow */}
                  {isActiveSelection && (
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/[0.04] rounded-full blur-2xl pointer-events-none" />
                  )}

                  {/* Top: Icon, Node Name, Status Pulse */}
                  <div className="flex items-center justify-between gap-2 relative z-10">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 transition-colors ${
                          isActiveSelection
                            ? 'bg-zinc-800 border-zinc-700 text-white'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-300'
                        }`}
                      >
                        {getCategoryIcon(container.category)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-bold text-white font-sans tracking-tight truncate">
                            {container.name}
                          </h4>
                          {isActiveSelection && (
                            <span className="shrink-0 text-[9px] font-sans font-bold text-black bg-white px-1.5 py-0.2 rounded-full">
                              Açık
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-zinc-400 font-mono truncate">
                          {container.image}:{container.tag}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800">
                      <span className="relative flex h-2 w-2 items-center justify-center">
                        <span
                          className={`inline-block rounded-full ${
                            isRunning ? 'h-2 w-2 bg-white' : 'h-1.5 w-1.5 border border-zinc-500'
                          }`}
                        />
                      </span>
                      <span
                        className={`text-[10px] font-sans font-medium ${
                          isRunning ? 'text-white' : 'text-zinc-500'
                        }`}
                      >
                        {container.statusText}
                      </span>
                    </div>
                  </div>

                  {/* Middle: Live Sparkline Pulse Wave */}
                  <div className="mt-3 relative z-10">
                    <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 mb-1">
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
                      color={isRunning ? 'white' : 'zinc'}
                      height={20}
                      isLive={isRunning}
                    />
                  </div>

                  {/* Bottom: Port & IP Specs */}
                  <div className="mt-2.5 pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px] font-mono text-zinc-400 relative z-10">
                    <span className="text-zinc-300 truncate max-w-[120px]">
                      {container.ports.length > 0
                        ? `:${container.ports[0].hostPort}➔${container.ports[0].containerPort}`
                        : container.ipAddress || 'Dahili Köprü'}
                    </span>
                    <span className="text-zinc-300 font-medium shrink-0">
                      {container.memoryUsageMb} MB
                    </span>
                  </div>
                </motion.div>
              );
            })}

            {containers.length === 0 && (
              <div className="col-span-full p-8 text-center text-xs font-sans text-zinc-500 bg-zinc-950 rounded-2xl border border-zinc-800">
                Henüz aktif servis düğümü bulunmuyor. Yeni bir servis dağıtarak ağ akışını başlatabilirsiniz.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 5. SEÇİLİ DÜĞÜMÜN HIZLI ALT ÇUBUĞU (Yalnızca detay paneli kapalıyken alt bilgi olarak gösterilir) */}
      {!isDetailOpen && selectedContainer && (
        <div className="mt-6 pt-6 border-t border-zinc-800 relative z-10 flex flex-col md:flex-row items-center justify-between gap-4 bg-zinc-900 p-4 rounded-2xl border border-zinc-800">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
              {getCategoryIcon(selectedContainer.category)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white font-sans">{selectedContainer.name}</span>
                <span className="text-xs text-zinc-400 font-mono">({selectedContainer.image}:{selectedContainer.tag})</span>
                {selectedContainer.traefikRoute && (
                  <a
                    href={`https://${selectedContainer.traefikRoute}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-white hover:underline text-xs font-mono flex items-center gap-1"
                  >
                    <span>{selectedContainer.traefikRoute}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                Dahili IP: <span className="text-white">{selectedContainer.ipAddress}</span> • Çalışma Süresi: <span className="text-white">{selectedContainer.uptime}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions for Selected Node */}
          <div className="flex items-center gap-2 shrink-0">
            {selectedContainer.status === 'running' ? (
              <button
                onClick={() => onAction?.('stop', selectedContainer.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 rounded-xl text-xs font-sans transition cursor-pointer active:scale-95"
              >
                <Square className="w-3 h-3 fill-white" />
                <span>Durdur</span>
              </button>
            ) : (
              <button
                onClick={() => onAction?.('start', selectedContainer.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-zinc-200 text-black border border-white rounded-xl text-xs font-sans transition cursor-pointer active:scale-95 font-semibold"
              >
                <Play className="w-3 h-3 fill-black" />
                <span>Başlat</span>
              </button>
            )}

            <button
              onClick={() => onAction?.('restart', selectedContainer.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 rounded-xl text-xs font-sans transition cursor-pointer active:scale-95"
            >
              <RotateCw className="w-3 h-3 text-zinc-300" />
              <span>Yeniden Başlat</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
