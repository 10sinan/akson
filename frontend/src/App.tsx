import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sidebar, type ActiveNavTab } from './components/Sidebar';
import { Header } from './components/Header';
import { ContainerCard } from './components/ContainerCard';
import { ContainerDetail } from './components/ContainerDetail';
import { DeployModal } from './components/DeployModal';
import { AiCopilotDrawer } from './components/AiCopilotDrawer';
import { CommandPalette } from './components/CommandPalette';
import { ToastContainer, type ToastItem } from './components/Toast';
import { ContextMenu, type ContextMenuState } from './components/ContextMenu';
import { PipelineColumn } from './components/dashboard/PipelineColumn';
import { MetricsColumn } from './components/dashboard/MetricsColumn';
import { DeployView } from './components/views/DeployView';
import { StorageView } from './components/views/StorageView';
import { LogsView } from './components/views/LogsView';
import { NetworkView } from './components/views/NetworkView';
import type { ContainerItem } from './types/container';
import { soundManager } from './utils/sound';
import { api } from './api/client';
import { LiveTopologyGraph } from './components/dashboard/LiveTopologyGraph';
import {
  Layers,
  LayoutGrid,
  RotateCw,
  Plus,
  Workflow,
  Activity,
} from 'lucide-react';
import { wiseBouncy, wiseSpring, wiseGentle, snappyEase, snappySpring, staggerContainerVariants } from './utils/motion';

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveNavTab>('dashboard');
  const [containers, setContainers] = useState<ContainerItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'running' | 'stopped'>('all');
  const [isDeployOpen, setIsDeployOpen] = useState(false);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [dockerStatus, setDockerStatus] = useState<'online' | 'demo' | 'checking'>('checking');
  const [isLiveBackend, setIsLiveBackend] = useState<boolean>(false);
  const [dashboardView, setDashboardView] = useState<'topology' | 'columns'>('topology');

  // Ping backend on mount to detect live Docker daemon
  useEffect(() => {
    let isMounted = true;
    const initBackend = async () => {
      try {
        const health = await api.checkHealth();
        if (!isMounted) return;
        const isDockerOk = health.docker === 'ok';
        setIsLiveBackend(true);
        setDockerStatus(isDockerOk ? 'online' : 'demo');
        if (isDockerOk) {
          const liveContainers = await api.fetchContainers();
          if (isMounted) {
            setContainers(liveContainers);
            if (liveContainers.length > 0) {
              setSelectedId(liveContainers[0].id);
            }
          }
        }
      } catch {
        if (isMounted) {
          setIsLiveBackend(false);
          setDockerStatus('demo');
        }
      }
    };
    initBackend();
    return () => {
      isMounted = false;
    };
  }, []);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const addToast = (toast: Omit<ToastItem, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      dismissToast(id);
    }, toast.duration || 3500);
  };

  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    isOpen: false,
    x: 0,
    y: 0,
    container: null,
  });

  const handleOpenContextMenu = (e: React.MouseEvent, container: ContainerItem) => {
    setContextMenu({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
      container,
    });
  };

  const handleCloseContextMenu = () => {
    setContextMenu((prev) => ({ ...prev, isOpen: false }));
  };

  // Filtered containers
  const filteredContainers = useMemo(() => {
    return containers.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.image.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.subtitle.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'running' && c.status === 'running') ||
        (statusFilter === 'stopped' && c.status !== 'running');

      return matchesSearch && matchesStatus;
    });
  }, [containers, searchQuery, statusFilter]);

  // Selected container
  const selectedContainer = useMemo(() => {
    return containers.find((c) => c.id === selectedId) || containers[0] || null;
  }, [containers, selectedId]);

  // Global metrics summary
  const runningCount = containers.filter((c) => c.status === 'running').length;
  const totalCpu = containers.reduce(
    (acc, c) => acc + (c.status === 'running' ? c.cpuPercent : 0),
    0
  );
  const totalMemory = containers.reduce(
    (acc, c) => acc + (c.status === 'running' ? c.memoryUsageMb : 0),
    0
  );

  // Actions
  const handleAction = async (action: 'start' | 'stop' | 'restart' | 'delete', id: string) => {
    const target = containers.find((c) => c.id === id);
    const targetName = target?.name || 'Konteyner';

    // If live Docker daemon is active, call Go backend REST API
    if (isLiveBackend && dockerStatus === 'online') {
      try {
        await api.containerAction(id, action);
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        addToast({
          type: 'error',
          title: 'Docker Hatası',
          description: errMsg || `${targetName} üzerinde işlem başarısız oldu.`,
        });
        return;
      }
    }

    if (action === 'delete') {
      const remaining = containers.filter((c) => c.id !== id);
      setContainers(remaining);
      if (selectedId === id && remaining.length > 0) {
        setSelectedId(remaining[0].id);
      }
      addToast({
        type: 'error',
        title: 'Konteyner Silindi',
        description: `${targetName} sistemden başarıyla kaldırıldı.`,
      });
      return;
    }

    setContainers((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;

        if (action === 'start') {
          return {
            ...c,
            status: 'running',
            statusText: 'Çevrimiçi',
            uptime: 'Az önce başlatıldı',
            cpuPercent: 1.5,
            memoryUsageMb: 40,
            logs: [...c.logs, `[akson] Konteyner kullanıcı tarafından başlatıldı: ${new Date().toLocaleTimeString()}`],
          };
        } else if (action === 'stop') {
          return {
            ...c,
            status: 'stopped',
            statusText: 'Durduruldu',
            uptime: 'Durduruldu',
            cpuPercent: 0,
            memoryUsageMb: 0,
            logs: [...c.logs, `[akson] Konteyner kullanıcı tarafından durduruldu: ${new Date().toLocaleTimeString()}`],
          };
        } else if (action === 'restart') {
          return {
            ...c,
            status: 'running',
            statusText: 'Çevrimiçi',
            restartCount: c.restartCount + 1,
            uptime: 'Az önce yeniden başlatıldı',
            logs: [...c.logs, `[akson] Konteyner sıfır kesintiyle yeniden başlatıldı: ${new Date().toLocaleTimeString()}`],
          };
        }
        return c;
      })
    );

    if (action === 'start') {
      soundManager.playSuccess();
      addToast({
        type: 'success',
        title: 'Konteyner Başlatıldı',
        description: `${targetName} başarıyla ayağa kaldırıldı.`,
      });
    } else if (action === 'stop') {
      soundManager.playPop();
      addToast({
        type: 'warning',
        title: 'Konteyner Durduruldu',
        description: `${targetName} güvenle durduruldu.`,
      });
    } else if (action === 'restart') {
      soundManager.playClick();
      addToast({
        type: 'info',
        title: 'Konteyner Yeniden Başlatıldı',
        description: `${targetName} sıfır kesintiyle yeniden başlatıldı.`,
      });
    }
  };

  const handleRefresh = async () => {
    soundManager.playPop();
    setIsRefreshing(true);

    if (isLiveBackend && dockerStatus === 'online') {
      try {
        const liveList = await api.fetchContainers();
        setContainers(liveList);
        if (liveList.length > 0 && !liveList.some((c) => c.id === selectedId)) {
          setSelectedId(liveList[0].id);
        }
      } catch {
        // Silently continue with local list on network glitch
      }
    } else {
      setContainers((prev) =>
        prev.map((c) => {
          if (c.status !== 'running') return c;
          const delta = (Math.random() - 0.5) * 0.8;
          return {
            ...c,
            cpuPercent: Math.max(0.2, +(c.cpuPercent + delta).toFixed(1)),
          };
        })
      );
    }

    setTimeout(() => {
      setIsRefreshing(false);
      addToast({
        type: 'info',
        title: 'Metrikler Güncellendi',
        description: isLiveBackend ? 'Docker motoru ve konteynerler tazelendi.' : 'Tüm konteyner durumları ve telemetri tazelendi.',
        duration: 2500,
      });
    }, 450);
  };

  const handleDeployNew = (newContainer: ContainerItem) => {
    soundManager.playSuccess();
    setContainers((prev) => [newContainer, ...prev]);
    setSelectedId(newContainer.id);
    setIsDetailOpen(true);
    addToast({
      type: 'success',
      title: 'Konteyner Dağıtıldı',
      description: `${newContainer.name} (${newContainer.image}) başarıyla oluşturuldu.`,
    });
  };

  const handleSelectContainer = (container: ContainerItem) => {
    soundManager.playClick();
    if (selectedId === container.id && isDetailOpen) {
      setIsDetailOpen(false);
    } else {
      setSelectedId(container.id);
      setIsDetailOpen(true);
    }
  };

  const getTabTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'kontrol-paneli';
      case 'deploy':
        return 'yeni-dagitim';
      case 'storage':
        return 'depolama-ve-birimler';
      case 'logs':
        return 'sistem-gunlukleri';
      case 'network':
        return 'ag-ve-traefik-proxy';
      default:
        return 'kontrol-paneli';
    }
  };

  return (
    <div className="bg-[#0c0d10] text-zinc-200 min-h-screen flex selection:bg-white/20 selection:text-white">
      {/* 1. SOL SABİT MENÜ */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          if (tab !== 'dashboard') {
            setIsDetailOpen(false);
          }
        }}
        onOpenAiModal={() => setIsAiOpen((prev) => !prev)}
        isAiOpen={isAiOpen}
        hasRunningContainers={runningCount > 0}
      />

      {/* 2. ANA SARMALAYICI & ÜST BAR */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#0c0d10]">
        {/* Üst Başlık Çubuğu */}
        <Header
          currentTabName={getTabTitle()}
          activeTab={activeTab}
          totalContainers={containers.length}
          runningContainers={runningCount}
          totalCpu={totalCpu}
          totalMemoryMb={totalMemory}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onRefresh={handleRefresh}
          onOpenDeploy={() => setActiveTab('deploy')}
          onOpenAi={() => setIsAiOpen((prev) => !prev)}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          isRefreshing={isRefreshing}
          isAiOpen={isAiOpen}
          dockerStatus={dockerStatus}
        />

        {/* 3. GÖMÜLÜ İÇ KANVAS */}
        <main
          className={`ml-16 mt-14 min-h-[calc(100vh-3.5rem)] bg-black rounded-tl-3xl border-t border-l border-[#262626] p-6 lg:p-8 flex-1 flex flex-col min-w-0 overflow-y-auto transition-all duration-300 ease-in-out relative z-10 ${
            isAiOpen ? '2xl:ml-[444px]' : ''
          }`}
        >
          {/* Sayfalar Arası Akıcı Geçiş (AnimatePresence mode="popLayout" - No Blank Flash) */}
          <AnimatePresence mode="popLayout" initial={false}>
            {/* TAB 1: KONTROL PANELİ & MASTER-DETAIL (1/3 + 2/3) */}
            {activeTab === 'dashboard' && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, transition: { duration: 0.08 } }}
                transition={snappyEase}
                className="flex flex-col flex-1 space-y-5"
              >
                {/* SubHeader Bar */}
                <div className="pb-4 mb-1 flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800">
                  <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3 font-sans">
                      Akson Kontrol Paneli
                    </h1>
                    <p className="text-xs text-zinc-400 mt-0.5 font-sans">
                      İnteraktif servis topolojisi, Traefik ters vekil ve anlık donanım telemetrisi
                    </p>
                  </div>

                  {/* Aksiyon & Görünüm Butonları */}
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <div className="flex items-center bg-zinc-900 p-1 rounded-xl border border-zinc-800 shadow-sm">
                      <button
                        onClick={() => {
                          soundManager.playClick();
                          setDashboardView('topology');
                        }}
                        className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-sans transition cursor-pointer active:scale-95 ${
                          dashboardView === 'topology'
                            ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700 font-semibold'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        <Workflow className="w-3.5 h-3.5 text-white" />
                        <span>Canlı Topoloji Şeması</span>
                      </button>
                      <button
                        onClick={() => {
                          soundManager.playClick();
                          setDashboardView('columns');
                        }}
                        className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-sans transition cursor-pointer active:scale-95 ${
                          dashboardView === 'columns'
                            ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700 font-semibold'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        <LayoutGrid className="w-3.5 h-3.5 text-white" />
                        <span className="hidden sm:inline">3 Sütunlu Görünüm</span>
                      </button>
                    </div>

                    <button
                      onClick={handleRefresh}
                      className="flex items-center space-x-1 px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-medium text-xs rounded-xl border border-zinc-800 shadow-sm transition cursor-pointer active:scale-95 font-sans"
                      title="Metrikleri Yenile"
                    >
                      <RotateCw className={`w-3.5 h-3.5 text-zinc-400 ${isRefreshing ? 'animate-spin text-white' : ''}`} />
                      <span className="hidden sm:inline text-xs">Yenile</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('deploy')}
                      className="flex items-center space-x-1.5 px-4 py-2 bg-white hover:bg-zinc-200 text-black font-semibold text-xs rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.18)] hover:shadow-[0_0_26px_rgba(255,255,255,0.28)] transition active:scale-95 cursor-pointer font-sans"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Yeni Servis Dağıt</span>
                    </button>
                  </div>
                </div>

                {/* GÖRÜNÜM 1: CANLI TOPOLOJİ VE DÜĞÜM AKIŞI (Default) */}
                {dashboardView === 'topology' ? (
                  <div
                    className={`transition-all duration-200 ${
                      isDetailOpen
                        ? 'grid grid-cols-1 xl:grid-cols-12 gap-5 items-start'
                        : 'w-full'
                    }`}
                  >
                    {/* SOL PANEL: Canlı Topoloji & Dağıtım Tüneli */}
                    <div
                      className={`transition-all duration-200 ${
                        isDetailOpen ? 'xl:col-span-7 flex flex-col gap-5' : 'w-full'
                      }`}
                    >
                      <LiveTopologyGraph
                        containers={containers}
                        selectedId={isDetailOpen ? selectedId : null}
                        isDetailOpen={isDetailOpen}
                        onSelectContainer={handleSelectContainer}
                        onAction={handleAction}
                        onDeployClick={() => setActiveTab('deploy')}
                      />
                    </div>

                    {/* SAĞ PANEL: Seçilen Düğümün Canlı Detay Sayfası */}
                    <AnimatePresence mode="wait">
                      {isDetailOpen && (
                        <motion.section
                          key={selectedId || 'node-detail-panel'}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20, transition: { duration: 0.08 } }}
                          transition={snappySpring}
                          className="xl:col-span-5 w-full xl:sticky xl:top-20"
                        >
                          {selectedContainer ? (
                            <ContainerDetail
                              container={selectedContainer}
                              onAction={handleAction}
                              onClose={() => setIsDetailOpen(false)}
                              onOpenAiAnalyze={() => setIsAiOpen(true)}
                            />
                          ) : (
                            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center space-y-4 shadow-xl">
                              <div className="w-12 h-12 rounded-2xl bg-zinc-800 border border-zinc-700 text-zinc-300 flex items-center justify-center mx-auto">
                                <Activity className="w-6 h-6" />
                              </div>
                              <div>
                                <h3 className="text-sm font-bold text-white font-sans">
                                  Servis Detayı Bulunamadı
                                </h3>
                                <p className="text-xs text-zinc-400 font-sans mt-1">
                                  Seçilen servis düğümüne ait telemetri verisi mevcut değil veya servis sistemden kaldırılmış olabilir.
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => setIsDetailOpen(false)}
                                className="px-4 py-2 rounded-xl bg-white text-black font-sans font-semibold text-xs transition active:scale-95 cursor-pointer shadow-md hover:bg-zinc-200"
                              >
                                Görünümü Kapat
                              </button>
                            </div>
                          )}
                        </motion.section>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  /* GÖRÜNÜM 2: 3 SÜTUNLU KLASİK MASTER-DETAIL */
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start transition-all duration-300">
                    {/* 1. SÜTUN: Aktif Servisler */}
                    <motion.section
                      layout
                      transition={wiseSpring}
                      className="space-y-4 bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800 transition-all duration-300 ease-in-out lg:col-span-1"
                    >
                      <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                          <Layers className="w-4 h-4 text-zinc-300" />
                          <h2 className="text-sm font-semibold text-white tracking-tight font-sans">
                            Aktif Servisler ({filteredContainers.length})
                          </h2>
                        </div>

                        {/* Wise-Style Sliding Filter Pills */}
                        <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800 text-[11px] font-sans">
                          <button
                            onClick={() => setStatusFilter('all')}
                            className={`relative px-2.5 py-0.5 rounded transition-colors cursor-pointer select-none ${
                              statusFilter === 'all'
                                ? 'text-white font-semibold'
                                : 'text-zinc-400 hover:text-white'
                            }`}
                          >
                            {statusFilter === 'all' && (
                              <motion.div
                                layoutId="statusFilterPill"
                                className="absolute inset-0 bg-zinc-800 rounded shadow-sm border border-zinc-700"
                                transition={wiseBouncy}
                              />
                            )}
                            <span className="relative z-10">Tümü</span>
                          </button>
                          <button
                            onClick={() => setStatusFilter('running')}
                            className={`relative px-2.5 py-0.5 rounded transition-colors cursor-pointer select-none ${
                              statusFilter === 'running'
                                ? 'text-white font-semibold'
                                : 'text-zinc-400 hover:text-white'
                            }`}
                          >
                            {statusFilter === 'running' && (
                              <motion.div
                                layoutId="statusFilterPill"
                                className="absolute inset-0 bg-zinc-800 rounded shadow-sm border border-zinc-700"
                                transition={wiseBouncy}
                              />
                            )}
                            <span className="relative z-10">Aktif</span>
                          </button>
                          <button
                            onClick={() => setStatusFilter('stopped')}
                            className={`relative px-2.5 py-0.5 rounded transition-colors cursor-pointer select-none ${
                              statusFilter === 'stopped'
                                ? 'text-white font-semibold'
                                : 'text-zinc-400 hover:text-white'
                            }`}
                          >
                            {statusFilter === 'stopped' && (
                              <motion.div
                                layoutId="statusFilterPill"
                                className="absolute inset-0 bg-zinc-800 rounded shadow-sm border border-zinc-700"
                                transition={wiseBouncy}
                              />
                            )}
                            <span className="relative z-10">Pasif</span>
                          </button>
                        </div>
                      </div>

                      {/* Cards List with Staggered Children */}
                      <motion.div
                        variants={staggerContainerVariants}
                        initial="hidden"
                        animate="visible"
                        className="space-y-2.5 max-h-[calc(100vh-280px)] overflow-y-auto pr-1"
                      >
                        {filteredContainers.map((container) => (
                          <ContainerCard
                            key={container.id}
                            container={container}
                            isSelected={isDetailOpen && container.id === selectedContainer?.id}
                            onSelect={handleSelectContainer}
                            isRefreshing={isRefreshing}
                            onContextMenu={handleOpenContextMenu}
                          />
                        ))}
                        {filteredContainers.length === 0 && (
                          <div className="p-8 text-center text-xs text-zinc-500 font-sans bg-zinc-950 rounded-xl border border-zinc-800">
                            Arama kriterlerine uygun konteyner bulunamadı.
                          </div>
                        )}
                      </motion.div>
                    </motion.section>

                    {/* 3 SÜTUN / 1/3+2/3 GEÇİŞİ */}
                    <AnimatePresence mode="popLayout">
                      {!isDetailOpen && (
                        <>
                          {!isAiOpen && (
                            <motion.section
                              key="col-pipeline"
                              layout
                              initial={{ opacity: 0, scale: 0.96, x: -12 }}
                              animate={{ opacity: 1, scale: 1, x: 0 }}
                              exit={{ opacity: 0, scale: 0.96, x: -16 }}
                              transition={wiseGentle}
                              className="lg:col-span-1"
                            >
                              <PipelineColumn
                                containers={containers}
                                onSelectPipeline={(pipeline) => {
                                  const matched = containers.find(
                                    (c) =>
                                        pipeline.name.includes(c.name) ||
                                        pipeline.description.includes(c.name)
                                  );
                                  if (matched) {
                                    setSelectedId(matched.id);
                                  }
                                  setIsDetailOpen(true);
                                }}
                              />
                            </motion.section>
                          )}

                          <motion.section
                            key="col-metrics"
                            layout
                            initial={{ opacity: 0, scale: 0.96, x: -12 }}
                            animate={{ opacity: 1, scale: 1, x: 0 }}
                            exit={{ opacity: 0, scale: 0.96, x: -16 }}
                            transition={wiseGentle}
                            className={isAiOpen ? 'lg:col-span-2' : 'lg:col-span-1'}
                          >
                            <MetricsColumn
                              totalCpu={totalCpu}
                              totalMemoryMb={totalMemory}
                              isRefreshing={isRefreshing}
                            />
                          </motion.section>
                        </>
                      )}

                      {isDetailOpen && selectedContainer && (
                        <motion.section
                          key="detail-view"
                          layout
                          initial={{ opacity: 0, x: 28, scale: 0.98 }}
                          animate={{ opacity: 1, x: 0, scale: 1 }}
                          exit={{ opacity: 0, x: 24, scale: 0.98 }}
                          transition={wiseGentle}
                          className="lg:col-span-2 h-full"
                        >
                          <ContainerDetail
                            container={selectedContainer}
                            onAction={handleAction}
                            onClose={() => setIsDetailOpen(false)}
                            onOpenAiAnalyze={() => setIsAiOpen(true)}
                          />
                        </motion.section>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </motion.div>
            )}

            {/* TAB 2: YENİ DAĞITIM (DEPLOY) */}
            {activeTab === 'deploy' && (
              <motion.div
                key="deploy"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, transition: { duration: 0.08 } }}
                transition={snappyEase}
                className="flex flex-col flex-1"
              >
                <DeployView
                  onDeploySuccess={handleDeployNew}
                  onNavigateDashboard={() => setActiveTab('dashboard')}
                />
              </motion.div>
            )}

            {/* TAB 3: DEPOLAMA & BİRİMLER (STORAGE) */}
            {activeTab === 'storage' && (
              <motion.div
                key="storage"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, transition: { duration: 0.08 } }}
                transition={snappyEase}
                className="flex flex-col flex-1"
              >
                <StorageView containers={containers} />
              </motion.div>
            )}

            {/* TAB 4: SİSTEM GÜNLÜKLERİ (LOGS) */}
            {activeTab === 'logs' && (
              <motion.div
                key="logs"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, transition: { duration: 0.08 } }}
                transition={snappyEase}
                className="flex flex-col flex-1"
              >
                <LogsView containers={containers} />
              </motion.div>
            )}

            {/* TAB 5: AĞ & TRAEFIK PROXY (NETWORK) */}
            {activeTab === 'network' && (
              <motion.div
                key="network"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, transition: { duration: 0.08 } }}
                transition={snappyEase}
                className="flex flex-col flex-1"
              >
                <NetworkView containers={containers} />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Global Modals */}
      <DeployModal
        isOpen={isDeployOpen}
        onClose={() => setIsDeployOpen(false)}
        onDeploy={handleDeployNew}
      />

      <AiCopilotDrawer
        isOpen={isAiOpen}
        onClose={() => setIsAiOpen(false)}
        activeContainer={selectedContainer || undefined}
      />

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        containers={containers}
        onSelectContainer={handleSelectContainer}
        onSelectTab={setActiveTab}
        onOpenDeploy={() => setIsDeployOpen(true)}
        onOpenAi={() => setIsAiOpen(true)}
        onRefresh={handleRefresh}
      />

      {/* Floating Glass Toasts */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Glassmorphic Fast Action Context Menu */}
      <ContextMenu
        state={contextMenu}
        onClose={handleCloseContextMenu}
        onAction={handleAction}
        onSelectContainer={handleSelectContainer}
        onOpenLogs={() => {
          setActiveTab('logs');
        }}
      />
    </div>
  );
}

export default App;
