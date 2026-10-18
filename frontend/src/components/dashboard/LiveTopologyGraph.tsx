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
import { snappySpring } from '../../utils/motion';
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

  const getCategoryStyles = (category: ContainerItem['category']) => {
    switch (category) {
      case 'core':
        return {
          icon: <Zap className="w-4 h-4 text-sky-400" />,
          badgeClass: 'bg-sky-500/10 border-sky-500/25 text-sky-400',
          sparkColor: 'blue' as const,
        };
      case 'service':
        return {
          icon: <Globe className="w-4 h-4 text-emerald-400" />,
          badgeClass: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400',
          sparkColor: 'emerald' as const,
        };
      case 'database':
        return {
          icon: <Database className="w-4 h-4 text-amber-400" />,
          badgeClass: 'bg-amber-500/10 border-amber-500/25 text-amber-400',
          sparkColor: 'amber' as const,
        };
      case 'worker':
        return {
          icon: <Cpu className="w-4 h-4 text-violet-400" />,
          badgeClass: 'bg-violet-500/10 border-violet-500/25 text-violet-400',
          sparkColor: 'purple' as const,
        };
      default:
        return {
          icon: <Layers className="w-4 h-4 text-zinc-300" />,
          badgeClass: 'bg-zinc-800 border-zinc-700 text-zinc-300',
          sparkColor: 'zinc' as const,
        };
    }
  };

  const selectedContainer = selectedId ? containers.find((c) => c.id === selectedId) || null : null;

  return (
    <div
      className={`relative w-full rounded-2xl bg-zinc-950 border border-zinc-800 p-4 sm:p-5 ${
        isDetailOpen ? 'lg:p-5' : 'lg:p-6'
      } overflow-hidden shadow-2xl transition-all duration-300`}
    >
      {/* 1. HAFİF MİMARİ IZGARA VE AMBİYANS IŞIĞI (Dot Matrix Architecture Canvas) */}
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />
      <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-sky-500/[0.02] blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-emerald-500/[0.02] blur-[100px] pointer-events-none" />

      {/* 2. TOPOLOJİ BAŞLIĞI VE CANLI DURUM */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]" />
            <h2 className="text-sm sm:text-base font-bold text-white tracking-tight font-sans flex items-center gap-2">
              Canlı Altyapı & Servis Topolojisi
            </h2>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
              Canlı Ağ Akışı
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5 font-sans">
            Trafik akışı, Traefik ters vekil yönlendirmeleri ve bağlı Docker servisleri
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800">
            <span className="text-zinc-400 font-sans">Aktif Düğümler:</span>
            <span className="text-emerald-400 font-bold">{runningCount}</span>
            <span className="text-zinc-500">/</span>
            <span className="text-zinc-300">{containers.length}</span>
          </div>
        </div>
      </div>

      {/* 3. İNTERAKTİF DÜĞÜM AKIŞ ŞEMASI (Interactive Node Flow) */}
      <div className="relative z-10 py-4 sm:py-5">
        <div
          className={`grid items-center gap-3 ${
            isDetailOpen
              ? 'grid-cols-1 sm:grid-cols-3'
              : 'grid-cols-1 lg:grid-cols-12 gap-4'
          }`}
        >
          {/* A. SOL İSTASYON: İNTERNET GİRİŞİ (Ingress Gateway) */}
          <div className={`${isDetailOpen ? '' : 'lg:col-span-3'} flex flex-col items-start space-y-1.5`}>
            <span className="text-[10px] font-mono text-sky-400/90 uppercase tracking-wider font-semibold">
              01. Ingress
            </span>
            <div className={`w-full ${isDetailOpen ? 'p-2.5 sm:p-3' : 'p-3 sm:p-3.5'} rounded-xl bg-zinc-900/90 border border-zinc-800 hover:border-sky-500/40 shadow-md flex items-center gap-3 group transition-all`}>
              <div className={`${isDetailOpen ? 'w-8 h-8' : 'w-9 h-9'} rounded-lg bg-sky-500/10 border border-sky-500/25 flex items-center justify-center shrink-0`}>
                <Globe className="w-4 h-4 text-sky-400" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-bold text-white font-sans truncate">Genel Ağ Girişi</h3>
                <div className="text-[10px] text-zinc-300 font-mono mt-0.5">:80 / :443 HTTPS</div>
                <div className="text-[9px] text-sky-400 font-sans mt-0.5">● Trafik Açık</div>
              </div>
            </div>
          </div>

          {/* B. BAĞLANTI ÇİZGİSİ 1 */}
          {!isDetailOpen && (
            <div className="hidden lg:flex lg:col-span-1 items-center justify-center">
              <div className="w-full h-[2px] bg-gradient-to-r from-sky-500/30 to-emerald-500/30 rounded-full" />
            </div>
          )}

          {/* C. ORTA İSTASYON: TRAEFIK V3 TERS VEKİL (Proxy Hub) */}
          <div className={`${isDetailOpen ? '' : 'lg:col-span-3'} flex flex-col items-start space-y-1.5`}>
            <span className="text-[10px] font-mono text-emerald-400/90 uppercase tracking-wider font-semibold">
              02. SSL / Ters Vekil
            </span>
            <div className={`w-full ${isDetailOpen ? 'p-2.5 sm:p-3' : 'p-3 sm:p-3.5'} rounded-xl bg-zinc-900/90 border border-zinc-800 hover:border-emerald-500/40 shadow-md flex items-center gap-3 group transition-all`}>
              <div className={`${isDetailOpen ? 'w-8 h-8' : 'w-9 h-9'} rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center shrink-0`}>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-bold text-white font-sans truncate">Traefik v3 Hub</h3>
                <div className="text-[10px] text-zinc-300 font-mono mt-0.5">TLS ACME</div>
                <div className="text-[9px] text-emerald-400 font-mono mt-0.5">akson-bridge</div>
              </div>
            </div>
          </div>

          {/* D. BAĞLANTI ÇİZGİSİ 2 */}
          {!isDetailOpen && (
            <div className="hidden lg:flex lg:col-span-1 items-center justify-center">
              <div className="w-full h-[2px] bg-gradient-to-r from-emerald-500/30 to-violet-500/30 rounded-full" />
            </div>
          )}

          {/* E. SAĞ İSTASYON: İZLEME VE TOPLAM YÜK (Cluster Heartbeat) */}
          <div className={`${isDetailOpen ? '' : 'lg:col-span-4'} flex flex-col items-start space-y-1.5`}>
            <span className="text-[10px] font-mono text-violet-400/90 uppercase tracking-wider font-semibold">
              03. İzole Ağ
            </span>
            <div className={`w-full ${isDetailOpen ? 'p-2.5 sm:p-3' : 'p-3 sm:p-3.5'} rounded-xl bg-zinc-900/90 border border-zinc-800 hover:border-violet-500/40 shadow-md flex items-center justify-between gap-3 transition-all`}>
              <div className="flex items-center gap-3 min-w-0">
                <div className={`${isDetailOpen ? 'w-8 h-8' : 'w-9 h-9'} rounded-lg bg-violet-500/10 border border-violet-500/25 flex items-center justify-center shrink-0`}>
                  <Server className="w-4 h-4 text-violet-400" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-bold text-white font-sans truncate">Docker Motoru</h3>
                  <div className="text-[10px] text-zinc-300 font-mono mt-0.5 truncate">cgroups-v2</div>
                  <div className="text-[9px] text-violet-400 font-sans mt-0.5">● Soket Aktif</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4. CANLI BAĞLI SERVİS DÜĞÜMLERİ (Service Nodes Grid) */}
        <div className="mt-5 pt-4 border-t border-zinc-800 space-y-2.5">
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
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-sans font-bold transition shadow-[0_0_20px_rgba(255,255,255,0.18)] hover:shadow-[0_0_26px_rgba(255,255,255,0.28)] active:scale-95 cursor-pointer"
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
              const catStyles = getCategoryStyles(container.category);

              return (
                <motion.div
                  key={container.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`${container.name} servis düğümü. Detay panelini ${
                    isActiveSelection ? 'kapatmak' : 'açmak'
                  } için tıklayın.`}
                  aria-pressed={isActiveSelection}
                  whileHover={{ y: -2, scale: 1.01 }}
                  whileTap={{ scale: 0.985 }}
                  transition={snappySpring}
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
                  className={`relative p-3 sm:p-3.5 rounded-xl border cursor-pointer select-none transition-all duration-200 overflow-hidden group focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black ${
                    isActiveSelection
                      ? 'bg-zinc-900 border-white shadow-xl shadow-black ring-2 ring-white/30'
                      : isSelected
                      ? 'bg-zinc-900 border-zinc-400 ring-1 ring-white/20'
                      : isRunning
                      ? 'bg-zinc-950 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/60 shadow-[0_0_20px_rgba(16,185,129,0.06)]'
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
                        className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${
                          isActiveSelection
                            ? 'bg-zinc-800 border-zinc-700 text-white'
                            : isRunning
                            ? catStyles.badgeClass
                            : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                        }`}
                      >
                        {catStyles.icon}
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

                    <div
                      className={`shrink-0 flex items-center gap-1.5 px-2 py-0.5 rounded-full border ${
                        isRunning
                          ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                      }`}
                    >
                      <span className="relative flex h-2 w-2 items-center justify-center">
                        <span
                          className={`inline-block rounded-full ${
                            isRunning
                              ? 'h-2 w-2 bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]'
                              : 'h-1.5 w-1.5 border border-zinc-500'
                          }`}
                        />
                      </span>
                      <span className="text-[10px] font-sans font-medium">
                        {container.statusText}
                      </span>
                    </div>
                  </div>

                  {/* Middle: Live Sparkline Pulse Wave */}
                  <div className="mt-2.5 relative z-10">
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
                      color={isRunning ? catStyles.sparkColor : 'zinc'}
                      height={18}
                      isLive={isRunning}
                    />
                  </div>

                  {/* Bottom: Port & IP Specs */}
                  <div className="mt-2 pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px] font-mono text-zinc-400 relative z-10">
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
            <div
              className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
                selectedContainer.status === 'running'
                  ? getCategoryStyles(selectedContainer.category).badgeClass
                  : 'bg-zinc-800 border-zinc-700 text-zinc-400'
              }`}
            >
              {getCategoryStyles(selectedContainer.category).icon}
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
                    className="text-sky-400 hover:underline text-xs font-mono flex items-center gap-1"
                  >
                    <span>{selectedContainer.traefikRoute}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                Dahili IP: <span className="text-white">{selectedContainer.ipAddress}</span> • Çalışma Süresi: <span className="text-emerald-400">{selectedContainer.uptime}</span>
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
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-400 hover:bg-emerald-300 text-black border border-emerald-400 rounded-xl text-xs font-sans transition cursor-pointer active:scale-95 font-semibold shadow-[0_0_16px_rgba(52,211,153,0.3)]"
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
