import { useState, useMemo } from 'react';
import { Sidebar, type ActiveNavTab } from './components/Sidebar';
import { Header } from './components/Header';
import { ContainerCard } from './components/ContainerCard';
import { ContainerDetail } from './components/ContainerDetail';
import { DeployModal } from './components/DeployModal';
import { AiCopilotModal } from './components/AiCopilotModal';
import { INITIAL_CONTAINERS } from './data/mockContainers';
import type { ContainerItem } from './types/container';
import {
  Layers,
  HardDrive,
  Terminal as TerminalIcon,
  Network as NetworkIcon,
} from 'lucide-react';


export function App() {
  const [activeTab, setActiveTab] = useState<ActiveNavTab>('dashboard');
  const [containers, setContainers] = useState<ContainerItem[]>(INITIAL_CONTAINERS);
  const [selectedId, setSelectedId] = useState<string>(INITIAL_CONTAINERS[0].id);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'running' | 'stopped'>('all');
  const [isDeployOpen, setIsDeployOpen] = useState(false);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

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
    return containers.find((c) => c.id === selectedId) || containers[0];
  }, [containers, selectedId]);

  // Global metrics summary
  const runningCount = containers.filter((c) => c.status === 'running').length;
  const totalCpu = containers.reduce((acc, c) => acc + (c.status === 'running' ? c.cpuPercent : 0), 0);
  const totalMemory = containers.reduce(
    (acc, c) => acc + (c.status === 'running' ? c.memoryUsageMb : 0),
    0
  );

  // Actions
  const handleAction = (action: 'start' | 'stop' | 'restart' | 'delete', id: string) => {
    if (action === 'delete') {
      const remaining = containers.filter((c) => c.id !== id);
      setContainers(remaining);
      if (selectedId === id && remaining.length > 0) {
        setSelectedId(remaining[0].id);
      }
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
            logs: [...c.logs, `[akson] Container started by user at ${new Date().toLocaleTimeString()}`],
          };
        } else if (action === 'stop') {
          return {
            ...c,
            status: 'stopped',
            statusText: 'Durduruldu',
            uptime: 'Durduruldu',
            cpuPercent: 0,
            memoryUsageMb: 0,
            logs: [...c.logs, `[akson] Container stopped by user at ${new Date().toLocaleTimeString()}`],
          };
        } else if (action === 'restart') {
          return {
            ...c,
            status: 'running',
            statusText: 'Çevrimiçi',
            restartCount: c.restartCount + 1,
            uptime: 'Az önce yeniden başlatıldı',
            logs: [...c.logs, `[akson] Container restarted at ${new Date().toLocaleTimeString()}`],
          };
        }
        return c;
      })
    );
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      // Simulate small fluctuation in metrics
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
      setIsRefreshing(false);
    }, 400);
  };

  const handleDeployNew = (newContainer: ContainerItem) => {
    setContainers((prev) => [newContainer, ...prev]);
    setSelectedId(newContainer.id);
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
    <div className="flex h-screen w-screen overflow-hidden bg-[#090a0f] text-[#e3e1e9]">
      {/* 1. Left Sidebar (Icon Rail) */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenAiModal={() => setIsAiOpen(true)}
      />

      {/* 2. Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header
          currentTabName={getTabTitle()}
          totalContainers={containers.length}
          runningContainers={runningCount}
          totalCpu={totalCpu}
          totalMemoryMb={totalMemory}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onRefresh={handleRefresh}
          onOpenDeploy={() => setIsDeployOpen(true)}
          isRefreshing={isRefreshing}
        />

        {/* View Router */}
        <main className="flex-1 overflow-y-auto p-6">
          {/* DASHBOARD VIEW (1/3 + 2/3 Master-Detail Grid) */}
          {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start h-full">
              {/* Left Column (1/3): Containers List */}
              <section className="space-y-4 bg-[#1a1b21]/60 p-4 rounded-2xl border border-[#26282e] lg:col-span-1">
                {/* Section Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-400" />
                    <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                      Konteynerler ({filteredContainers.length})
                    </h2>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1 bg-[#121318] p-1 rounded-lg border border-[#26282e] text-[10px] font-mono">
                    <button
                      onClick={() => setStatusFilter('all')}
                      className={`px-2 py-0.5 rounded transition cursor-pointer ${
                        statusFilter === 'all' ? 'bg-[#292a2f] text-white font-semibold' : 'text-[#8e9192]'
                      }`}
                    >
                      Tümü
                    </button>
                    <button
                      onClick={() => setStatusFilter('running')}
                      className={`px-2 py-0.5 rounded transition cursor-pointer ${
                        statusFilter === 'running' ? 'bg-[#292a2f] text-emerald-400 font-semibold' : 'text-[#8e9192]'
                      }`}
                    >
                      Aktif
                    </button>
                    <button
                      onClick={() => setStatusFilter('stopped')}
                      className={`px-2 py-0.5 rounded transition cursor-pointer ${
                        statusFilter === 'stopped' ? 'bg-[#292a2f] text-rose-400 font-semibold' : 'text-[#8e9192]'
                      }`}
                    >
                      Pasif
                    </button>
                  </div>
                </div>

                {/* Cards List */}
                <div className="space-y-3 max-h-[calc(100vh-210px)] overflow-y-auto pr-1">
                  {filteredContainers.map((container) => (
                    <ContainerCard
                      key={container.id}
                      container={container}
                      isSelected={container.id === selectedContainer?.id}
                      onSelect={(c) => setSelectedId(c.id)}
                    />
                  ))}
                  {filteredContainers.length === 0 && (
                    <div className="p-8 text-center text-xs text-[#8e9192] font-mono bg-[#121318] rounded-xl border border-[#26282e]">
                      Arama kriterlerine uygun konteyner bulunamadı.
                    </div>
                  )}
                </div>
              </section>

              {/* Right Column (2/3): Container Detail Inspection */}
              <section className="lg:col-span-2 h-full">
                {selectedContainer ? (
                  <ContainerDetail
                    container={selectedContainer}
                    onAction={handleAction}
                  />
                ) : (
                  <div className="p-12 text-center text-xs text-[#8e9192] font-mono bg-[#121318] rounded-2xl border border-[#26282e]">
                    İncelemek için sol listeden bir servis seçin.
                  </div>
                )}
              </section>
            </div>
          )}

          {/* STORAGE VIEW */}
          {activeTab === 'storage' && (
            <div className="p-8 bg-[#121318] border border-[#26282e] rounded-2xl space-y-4">
              <div className="flex items-center gap-2 text-white font-mono text-sm font-bold">
                <HardDrive className="w-5 h-5 text-blue-400" />
                <span>Docker Birimleri (Volumes) & Depolama</span>
              </div>
              <p className="text-xs text-[#8e9192]">
                Kalıcı disk alanları, SQLite veritabanı dosyaları ve yedekler burada listelenir.
              </p>
              <div className="rounded-xl border border-[#26282e] overflow-hidden font-mono text-xs">
                <table className="w-full text-left">
                  <thead className="bg-[#16171d] text-[#8e9192] border-b border-[#26282e]">
                    <tr>
                      <th className="p-3">Birim Adı</th>
                      <th className="p-3">Sürücü</th>
                      <th className="p-3">Bağlı Servis</th>
                      <th className="p-3">Boyut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#26282e]">
                    <tr>
                      <td className="p-3 text-white">akson_postgres_data</td>
                      <td className="p-3 text-[#8e9192]">local</td>
                      <td className="p-3 text-emerald-400">postgres-main</td>
                      <td className="p-3 text-slate-300">1.4 GB</td>
                    </tr>
                    <tr>
                      <td className="p-3 text-white">akson_redis_data</td>
                      <td className="p-3 text-[#8e9192]">local</td>
                      <td className="p-3 text-emerald-400">redis-cache</td>
                      <td className="p-3 text-slate-300">128 MB</td>
                    </tr>
                    <tr>
                      <td className="p-3 text-white">traefik_acme_certs</td>
                      <td className="p-3 text-[#8e9192]">local</td>
                      <td className="p-3 text-emerald-400">api-gateway</td>
                      <td className="p-3 text-slate-300">4.2 MB</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* LOGS VIEW */}
          {activeTab === 'logs' && (
            <div className="p-8 bg-[#121318] border border-[#26282e] rounded-2xl space-y-4">
              <div className="flex items-center gap-2 text-white font-mono text-sm font-bold">
                <TerminalIcon className="w-5 h-5 text-purple-400" />
                <span>Birleşik Küme Günlükleri (Cluster Logs)</span>
              </div>
              <p className="text-xs text-[#8e9192]">Tüm konteynerlerin ortak akışı canlı olarak gösterilir.</p>
              <div className="p-4 rounded-xl bg-[#090a0f] border border-[#26282e] font-mono text-xs text-[#c4c7c8] space-y-1 max-h-[500px] overflow-y-auto">
                {containers.flatMap((c) => c.logs).map((l, i) => (
                  <div key={i} className="hover:bg-white/5 px-1 rounded">{l}</div>
                ))}
              </div>
            </div>
          )}

          {/* NETWORK VIEW */}
          {activeTab === 'network' && (
            <div className="p-8 bg-[#121318] border border-[#26282e] rounded-2xl space-y-4">
              <div className="flex items-center gap-2 text-white font-mono text-sm font-bold">
                <NetworkIcon className="w-5 h-5 text-emerald-400" />
                <span>Traefik v3.0 & Docker Bridge Ağı</span>
              </div>
              <p className="text-xs text-[#8e9192]">
                Alt ağ: <code className="text-blue-400">172.20.0.0/16 (akson-bridge)</code>. Otomatik SSL ve DNS yönlendirmeleri devrededir.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-xl bg-[#16171d] border border-[#26282e] space-y-2 font-mono text-xs">
                  <span className="text-[#8e9192]">Giriş Noktası (EntryPoints):</span>
                  <div className="text-white">Port 80 (HTTP) ➔ Otomatik 443 (HTTPS) Yönlendirmesi</div>
                  <div className="text-white">Port 443 (HTTPS) ➔ Let's Encrypt TLS-ALPN-01</div>
                </div>
                <div className="p-4 rounded-xl bg-[#16171d] border border-[#26282e] space-y-2 font-mono text-xs">
                  <span className="text-[#8e9192]">Sertifika Sağlayıcı:</span>
                  <div className="text-white">Let's Encrypt ACME v02 (Otomatik Yenileme Aktif)</div>
                  <div className="text-emerald-400">Durum: Sağlıklı</div>
                </div>
              </div>
            </div>
          )}

          {/* DEPLOY VIEW */}
          {activeTab === 'deploy' && (
            <div className="p-8 bg-[#121318] border border-[#26282e] rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-mono text-sm font-bold">Hızlı Dağıtım Sihirbazı</h3>
                  <p className="text-xs text-[#8e9192]">Yeni bir Docker servisini tek tıkla ayağa kaldırın.</p>
                </div>
                <button
                  onClick={() => setIsDeployOpen(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl transition cursor-pointer"
                >
                  Sihirbazı Aç
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Modals */}
      <DeployModal
        isOpen={isDeployOpen}
        onClose={() => setIsDeployOpen(false)}
        onDeploy={handleDeployNew}
      />

      <AiCopilotModal
        isOpen={isAiOpen}
        onClose={() => setIsAiOpen(false)}
        activeContainer={selectedContainer}
      />
    </div>
  );
}

export default App;
