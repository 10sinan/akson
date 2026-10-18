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
import {
  Layers,
  LayoutGrid,
  Database,
  Terminal as TerminalIcon,
  RotateCw,
  Plus,
} from 'lucide-react';
import { wiseBouncy, wiseSpring, wiseGentle, staggerContainerVariants } from './utils/motion';

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
    setSelectedId(container.id);
    setIsDetailOpen(true);
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
    <div className="bg-[#090a0f] text-[#e3e1e9] min-h-screen flex selection:bg-white/20 selection:text-white">
      {/* 1. SOL SABİT MENÜ (Dikişsiz L-Şekilli Ray: bg-[#090a0f] - Sıfır border-r) */}
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
      />

      {/* 2. ANA SARMALAYICI & ÜST BAR */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#090a0f]">
        {/* Üst Başlık Çubuğu (Seamless L-Shaped Header: h-14, pl-20, Sıfır border-b) */}
        <Header
          currentTabName={getTabTitle()}
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

        {/* 3. GÖMÜLÜ İÇ KANVAS (Recessed Canvas: rounded-tl-3xl border-t border-l border-[#26282e] p-8) */}
        <main
          className={`ml-16 mt-14 min-h-[calc(100vh-3.5rem)] bg-[#0d0e13] rounded-tl-3xl border-t border-l border-[#26282e] p-8 flex-1 flex flex-col min-w-0 overflow-y-auto transition-all duration-300 ease-in-out ${
            isAiOpen ? '2xl:ml-[444px]' : ''
          }`}
        >
          {/* Sayfalar Arası Yumuşak Geçiş (AnimatePresence mode="wait") */}
          <AnimatePresence mode="wait">
            {/* TAB 1: KONTROL PANELİ & MASTER-DETAIL (1/3 + 2/3) */}
            {activeTab === 'dashboard' && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
                transition={wiseGentle}
                className="flex flex-col flex-1 space-y-6"
              >
                {/* SubHeader Bar */}
                <div className="pb-6 flex flex-wrap items-center justify-between gap-4 border-b border-[#1e1f25]">
                  <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                      Akson Kontrol Paneli
                    </h1>
                    <p className="text-xs text-[#8e9192] mt-1">
                      Yerel konteyner ortamları, Traefik ters vekil ve anlık donanım telemetrisi
                    </p>
                  </div>

                  {/* Aksiyon & Görünüm Butonları */}
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <div className="flex items-center bg-[#151722] p-1 rounded-xl border border-[#232736] shadow-sm">
                      <button
                        onClick={() => setIsDetailOpen(false)}
                        className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer active:scale-95 ${
                          !isDetailOpen
                            ? 'bg-[#242838] text-white shadow-sm border border-white/5 font-semibold'
                            : 'text-[#8e9192] hover:text-white'
                        }`}
                      >
                        <LayoutGrid className="w-3.5 h-3.5 text-blue-400" />
                        <span className="hidden sm:inline">3 Sütunlu Görünüm</span>
                      </button>
                      <button
                        onClick={() => setActiveTab('storage')}
                        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#8e9192] hover:text-white transition cursor-pointer active:scale-95"
                      >
                        <Database className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Birimler</span>
                      </button>
                      <button
                        onClick={() => setActiveTab('logs')}
                        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#8e9192] hover:text-white transition cursor-pointer active:scale-95"
                      >
                        <TerminalIcon className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Loglar</span>
                      </button>
                    </div>

                    <button
                      onClick={handleRefresh}
                      className="flex items-center space-x-1 px-3 py-2 bg-[#1a1b21] hover:bg-[#232736] text-[#e3e1e9] font-medium text-xs rounded-xl border border-[#292a2f] shadow-sm transition cursor-pointer active:scale-95"
                      title="Metrikleri Yenile"
                    >
                      <RotateCw className={`w-3.5 h-3.5 text-[#8e9192] ${isRefreshing ? 'animate-spin' : ''}`} />
                      <span className="hidden sm:inline text-xs">Yenile</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('deploy')}
                      className="flex items-center space-x-1.5 px-4 py-2 bg-white hover:bg-slate-100 text-slate-900 font-semibold text-xs rounded-xl shadow-lg transition active:scale-95 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Yeni Servis Dağıt</span>
                    </button>
                  </div>
                </div>

                {/* Master-Detail Grid Konteyneri */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start transition-all duration-300">
                  {/* 1. SÜTUN: Aktif Servisler (1/3 Alan - Layout Animasyonu ile) */}
                  <motion.section
                    layout
                    transition={wiseSpring}
                    className="space-y-4 bg-[#1a1b21] p-4 rounded-2xl border border-[#26282e] transition-all duration-300 ease-in-out lg:col-span-1"
                  >
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-blue-400" />
                        <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                          Aktif Servisler ({filteredContainers.length})
                        </h2>
                      </div>

                      {/* Wise-Style Sliding Filter Pills */}
                      <div className="flex items-center gap-1 bg-[#121318] p-1 rounded-lg border border-[#26282e] text-[10px] font-mono">
                        <button
                          onClick={() => setStatusFilter('all')}
                          className={`relative px-2.5 py-0.5 rounded transition-colors cursor-pointer select-none ${
                            statusFilter === 'all'
                              ? 'text-white font-semibold'
                              : 'text-[#8e9192] hover:text-white'
                          }`}
                        >
                          {statusFilter === 'all' && (
                            <motion.div
                              layoutId="statusFilterPill"
                              className="absolute inset-0 bg-[#292a2f] rounded shadow-sm border border-white/5"
                              transition={wiseBouncy}
                            />
                          )}
                          <span className="relative z-10">Tümü</span>
                        </button>
                        <button
                          onClick={() => setStatusFilter('running')}
                          className={`relative px-2.5 py-0.5 rounded transition-colors cursor-pointer select-none ${
                            statusFilter === 'running'
                              ? 'text-emerald-400 font-semibold'
                              : 'text-[#8e9192] hover:text-white'
                          }`}
                        >
                          {statusFilter === 'running' && (
                            <motion.div
                              layoutId="statusFilterPill"
                              className="absolute inset-0 bg-[#292a2f] rounded shadow-sm border border-emerald-500/10"
                              transition={wiseBouncy}
                            />
                          )}
                          <span className="relative z-10">Aktif</span>
                        </button>
                        <button
                          onClick={() => setStatusFilter('stopped')}
                          className={`relative px-2.5 py-0.5 rounded transition-colors cursor-pointer select-none ${
                            statusFilter === 'stopped'
                              ? 'text-rose-400 font-semibold'
                              : 'text-[#8e9192] hover:text-white'
                          }`}
                        >
                          {statusFilter === 'stopped' && (
                            <motion.div
                              layoutId="statusFilterPill"
                              className="absolute inset-0 bg-[#292a2f] rounded shadow-sm border border-rose-500/10"
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
                      className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto pr-1"
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
                        <div className="p-8 text-center text-xs text-[#8e9192] font-mono bg-[#121318] rounded-xl border border-[#26282e]">
                          Arama kriterlerine uygun konteyner bulunamadı.
                        </div>
                      )}
                    </motion.div>
                  </motion.section>

                  {/* 3 SÜTUN / 1/3+2/3 GEÇİŞİ (AnimatePresence mode="popLayout") */}
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
              </motion.div>
            )}

            {/* TAB 2: YENİ DAĞITIM (DEPLOY) */}
            {activeTab === 'deploy' && (
              <motion.div
                key="deploy"
                initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
                transition={wiseGentle}
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
                initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
                transition={wiseGentle}
                className="flex flex-col flex-1"
              >
                <StorageView />
              </motion.div>
            )}

            {/* TAB 4: SİSTEM GÜNLÜKLERİ (LOGS) */}
            {activeTab === 'logs' && (
              <motion.div
                key="logs"
                initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
                transition={wiseGentle}
                className="flex flex-col flex-1"
              >
                <LogsView containers={containers} />
              </motion.div>
            )}

            {/* TAB 5: AĞ & TRAEFIK PROXY (NETWORK) */}
            {activeTab === 'network' && (
              <motion.div
                key="network"
                initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
                transition={wiseGentle}
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
