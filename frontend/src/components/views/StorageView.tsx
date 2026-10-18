import React, { useState } from 'react';
import { motion } from 'framer-motion';
import type { ContainerItem } from '../../types/container';
import {
  Database,
  Search,
  Copy,
  Check,
  Plus,
  Camera,
  HardDrive,
  TrendingUp,
} from 'lucide-react';

interface VolumeItem {
  id: string;
  name: string;
  size: string;
  service: string;
  mountPath: string;
  hostPath: string;
  driver: string;
  format: string;
  status: 'active' | 'unused';
  fileCount: number;
}

interface StorageViewProps {
  containers?: ContainerItem[];
}

export const StorageView: React.FC<StorageViewProps> = ({ containers = [] }) => {
  const volumes: VolumeItem[] = React.useMemo(() => {
    const list: VolumeItem[] = [
      {
        id: 'vol-sqlite-wal',
        name: 'akson_sqlite_wal',
        size: '12.4 MB',
        service: 'akson-backend',
        mountPath: '/data/akson.db',
        hostPath: './data/akson.db',
        driver: 'local',
        format: 'SQLite 3 (WAL mode)',
        status: 'active',
        fileCount: 3,
      },
    ];

    containers.forEach((c, idx) => {
      list.push({
        id: `vol-${c.id || idx}`,
        name: `${c.name}_storage`,
        size: `${Math.max(1, Math.round(c.memoryUsageMb * 1.5))} MB`,
        service: c.name,
        mountPath: '/var/lib/data',
        hostPath: `/var/lib/docker/volumes/${c.name}_storage/_data`,
        driver: 'local',
        format: 'overlay2 / ext4',
        status: c.status === 'running' ? 'active' : 'unused',
        fileCount: c.status === 'running' ? 24 : 0,
      });
    });

    return list;
  }, [containers]);

  const [selectedVolume, setSelectedVolume] = useState<VolumeItem>(volumes[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedPath, setCopiedPath] = useState(false);
  const [snapshotName, setSnapshotName] = useState<string | null>(null);

  const filteredVolumes = volumes.filter(
    (v) =>
      v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.service.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCopyPath = () => {
    navigator.clipboard.writeText(selectedVolume.hostPath);
    setCopiedPath(true);
    setTimeout(() => setCopiedPath(false), 2000);
  };

  const handleCreateSnapshot = () => {
    const name = `snapshot_${selectedVolume.name}_${Date.now().toString().slice(-4)}`;
    setSnapshotName(name);
    setTimeout(() => setSnapshotName(null), 3000);
  };

  return (
    <div className="flex flex-col flex-1 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-[#262626]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white tracking-tight font-sans">
              Kalıcı Depolama & Birim Yönetimi
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/5 border border-[#262626] text-zinc-300 font-sans text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              {volumes.length} Birim Aktif
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1 font-sans">
            Docker hacimleri, kalıcı bağlama noktaları ve NVMe disk telemetrisi.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2.5 text-xs text-zinc-400 bg-[#121212] border border-[#262626] px-3.5 py-2 rounded-xl font-sans">
            <HardDrive className="w-4 h-4 text-white" />
            <span className="text-white font-mono">128.4 / 500 GB (%25.6)</span>
            <span className="text-zinc-600">•</span>
            <span className="text-zinc-300 font-medium">NVMe RAID-1</span>
          </div>

          <button
            onClick={() => alert('Yeni Docker Volume sihirbazı başlatıldı.')}
            className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-zinc-200 text-black font-semibold text-xs rounded-xl shadow transition cursor-pointer active:scale-95 font-sans"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Yeni Birim Oluştur</span>
          </button>
        </div>
      </div>

      {/* Breathable 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (5 cols): Volume List with Search */}
        <div className="lg:col-span-5 bg-[#0a0a0a] border border-[#262626] rounded-2xl overflow-hidden shadow-sm flex flex-col">
          <div className="p-4 border-b border-[#262626] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-white" />
                <h2 className="text-xs font-bold text-white uppercase tracking-wider font-sans">
                  Aktif Hacimler
                </h2>
              </div>
              <span className="text-[11px] font-sans text-zinc-400">
                {filteredVolumes.length} Birim
              </span>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Birim adı veya servis ara..."
                className="w-full bg-[#121212] border border-[#262626] text-xs text-white rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:border-white transition-colors font-sans placeholder:text-zinc-500"
              />
            </div>
          </div>

          <motion.div
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: {
                  staggerChildren: 0.04,
                },
              },
            }}
            initial="hidden"
            animate="visible"
            className="p-2 space-y-1.5 max-h-[calc(100vh-320px)] overflow-y-auto"
          >
            {filteredVolumes.map((vol) => {
              const isSelected = selectedVolume.id === vol.id;
              return (
                <motion.div
                  key={vol.id}
                  variants={{
                    hidden: { opacity: 0, y: 8 },
                    visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
                  }}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.985 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  onClick={() => setSelectedVolume(vol)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5 ${
                    isSelected
                      ? 'bg-[#171717] border-white shadow-md ring-1 ring-white/20'
                      : 'bg-[#121212] border-[#262626] hover:border-zinc-500 hover:bg-[#171717]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white font-mono">
                      {vol.name}
                    </span>
                    <span className="text-xs font-mono font-medium text-zinc-200">
                      {vol.size}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-zinc-400 truncate">
                    <span className="text-white font-sans">{vol.service}</span> • {vol.mountPath}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>

        {/* Right Column (7 cols): Selected Volume Details & Telemetry */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="bg-[#0a0a0a] border border-[#262626] rounded-2xl p-5 space-y-5 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
              <div>
                <h2 className="text-base font-bold text-white font-mono">
                  {selectedVolume.name}
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5 font-sans">
                  {selectedVolume.format} • Direct IO
                </p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/20 text-white font-sans text-[11px] font-medium">
                BAĞLI & AKTİF
              </span>
            </div>

            {/* Mount specs */}
            <div className="space-y-3 font-mono text-xs">
              <div className="space-y-1.5">
                <span className="text-[11px] text-zinc-400 font-sans">Konteyner Bağlantı Yolu (Mount)</span>
                <div className="bg-[#121212] p-2.5 rounded-xl border border-[#262626] text-white flex items-center justify-between">
                  <span>{selectedVolume.mountPath}</span>
                  <span className="text-[11px] text-zinc-400 font-sans">{selectedVolume.service}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[11px] text-zinc-400 font-sans">Host Mutlak Dosya Yolu</span>
                <div className="bg-[#121212] p-2.5 rounded-xl border border-[#262626] text-white flex items-center justify-between">
                  <span className="truncate pr-2 text-zinc-300">{selectedVolume.hostPath}</span>
                  <button
                    onClick={handleCopyPath}
                    className="text-zinc-400 hover:text-white transition cursor-pointer p-1"
                    title="Dosya Yolunu Kopyala"
                  >
                    {copiedPath ? (
                      <Check className="w-3.5 h-3.5 text-white" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="bg-[#121212] p-3 rounded-xl border border-[#262626]">
                  <span className="text-[11px] text-zinc-400 block font-sans">Birim Boyutu</span>
                  <span className="text-sm font-bold text-white mt-1 block">
                    {selectedVolume.size}
                  </span>
                </div>
                <div className="bg-[#121212] p-3 rounded-xl border border-[#262626]">
                  <span className="text-[11px] text-zinc-400 block font-sans">Dosya Sayısı</span>
                  <span className="text-sm font-bold text-white mt-1 block">
                    {selectedVolume.fileCount} dosya
                  </span>
                </div>
              </div>
            </div>

            {/* NVMe Hardware Telemetry Integrated Bar */}
            <div className="pt-2 border-t border-[#262626] space-y-2">
              <div className="flex justify-between items-center text-xs font-sans">
                <span className="text-zinc-400 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-white" />
                  NVMe RAID-1 Disk Doluluğu
                </span>
                <span className="text-white font-mono font-medium">
                  128.4 / 500 GB (%25.6)
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-[#171717] overflow-hidden">
                <div className="h-full bg-white rounded-full" style={{ width: '25.6%' }} />
              </div>
              <div className="flex justify-between text-[11px] text-zinc-400 font-mono pt-0.5">
                <span>Okuma: 142.8 MB/s</span>
                <span>Yazma: 86.2 MB/s</span>
                <span>Gecikme: 0.4 ms</span>
              </div>
            </div>

            {/* Snapshot Action */}
            <div className="pt-3 border-t border-[#262626] flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-white block font-sans">Kalıcı Snapshot Al</span>
                <span className="text-[11px] text-zinc-400 font-sans">Anlık veri yedeği oluşturun.</span>
              </div>
              <button
                onClick={handleCreateSnapshot}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#121212] hover:bg-zinc-800 text-white border border-[#262626] rounded-xl text-xs font-sans transition cursor-pointer active:scale-95 shadow-sm"
              >
                <Camera className="w-3.5 h-3.5 text-white" />
                <span>Yedek Al</span>
              </button>
            </div>

            {snapshotName && (
              <div className="p-3 bg-white/5 border border-white/20 text-white rounded-xl text-xs font-mono flex items-center gap-2">
                <Check className="w-4 h-4 text-white" />
                <span>Snapshot başarıyla oluşturuldu: {snapshotName}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
