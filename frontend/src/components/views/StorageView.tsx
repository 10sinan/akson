import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Database,
  Search,
  Copy,
  Check,
  Plus,
  Camera,
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

const MOCK_VOLUMES: VolumeItem[] = [
  {
    id: 'v1',
    name: 'postgres_data',
    size: '42.8 GB',
    service: 'postgres-main',
    mountPath: '/var/lib/postgresql/data',
    hostPath: '/var/lib/docker/volumes/postgres_data/_data',
    driver: 'local',
    format: 'ext4 (Read-Write)',
    status: 'active',
    fileCount: 1420,
  },
  {
    id: 'v2',
    name: 'redis_cache_vol',
    size: '4.2 GB',
    service: 'redis-cache',
    mountPath: '/data',
    hostPath: '/var/lib/docker/volumes/redis_cache_vol/_data',
    driver: 'local',
    format: 'tmpfs/in-memory AOF',
    status: 'active',
    fileCount: 4,
  },
  {
    id: 'v3',
    name: 'uploads_media_storage',
    size: '62.8 GB',
    service: 'api-gateway',
    mountPath: '/var/www/uploads',
    hostPath: '/var/lib/docker/volumes/uploads_media_storage/_data',
    driver: 'local',
    format: 'ext4 (Read-Write)',
    status: 'active',
    fileCount: 8450,
  },
  {
    id: 'v4',
    name: 'traefik_acme_certs',
    size: '4.2 MB',
    service: 'api-gateway',
    mountPath: '/etc/traefik/acme',
    hostPath: '/var/lib/docker/volumes/traefik_acme_certs/_data',
    driver: 'local',
    format: 'ext4 (Strict 0600)',
    status: 'active',
    fileCount: 3,
  },
  {
    id: 'v5',
    name: 'akson_sqlite_wal',
    size: '18.6 MB',
    service: 'akson-core',
    mountPath: '/data/akson.db',
    hostPath: '/var/lib/docker/volumes/akson_sqlite_wal/_data',
    driver: 'local',
    format: 'SQLite WAL mode',
    status: 'active',
    fileCount: 3,
  },
  {
    id: 'v6',
    name: 'backup_archives',
    size: '18.6 GB',
    service: 'analytics-worker',
    mountPath: '/mnt/backups',
    hostPath: '/var/lib/docker/volumes/backup_archives/_data',
    driver: 'local',
    format: 'ext4 (Compressed)',
    status: 'active',
    fileCount: 12,
  },
];

export const StorageView: React.FC = () => {
  const [volumes] = useState<VolumeItem[]>(MOCK_VOLUMES);
  const [selectedVolume, setSelectedVolume] = useState<VolumeItem>(MOCK_VOLUMES[0]);
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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-[#1e1f25]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Kalıcı Depolama & Birim Yönetimi
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {volumes.length} Birim Aktif
            </span>
          </div>
          <p className="text-xs text-[#8e9192] mt-1">
            Docker hacimleri, kalıcı depolama bağlama noktaları ve NVMe disk telemetrisi.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2.5 font-mono text-xs text-[#8e9192] bg-[#16171d] border border-[#26282e] px-3.5 py-2 rounded-xl">
            <span className="text-white/90">128.4 GB / 500 GB (%25.6)</span>
            <span className="text-[#2f3138]">•</span>
            <span className="text-emerald-400 font-medium">NVMe RAID-1</span>
          </div>

          <button
            onClick={() => alert('Yeni Docker Volume sihirbazı başlatıldı.')}
            className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-200 text-black font-semibold text-xs rounded-xl shadow transition cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Yeni Birim Oluştur</span>
          </button>
        </div>
      </div>

      {/* 3-Column / Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Column 1 (4 cols): Volume List */}
        <div className="lg:col-span-4 bg-[#121318] border border-[#26282e] rounded-2xl overflow-hidden shadow-sm flex flex-col">
          <div className="p-4 border-b border-[#1e1f25] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-blue-400" />
                <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Aktif Birimler
                </h2>
              </div>
              <span className="text-[11px] font-mono text-[#8e9192]">
                {filteredVolumes.length} Hacim
              </span>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#8e9192] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Birim adı veya servis ara..."
                className="w-full bg-[#16171d] border border-[#26282e] text-xs text-white rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:border-blue-500 transition-colors placeholder:text-[#8e9192]"
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
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  onClick={() => setSelectedVolume(vol)}
                  className={`p-3 rounded-xl border transition-colors cursor-pointer flex flex-col gap-1.5 ${
                    isSelected
                      ? 'bg-[#1a1b21] border-white/30 shadow-md'
                      : 'bg-[#121318] border-[#26282e] hover:border-white/20 hover:bg-[#16171d]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white font-mono">
                      {vol.name}
                    </span>
                    <span className="text-xs font-mono font-medium text-slate-200">
                      {vol.size}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-[#8e9192] truncate">
                    <span className="text-emerald-400">{vol.service}</span> • {vol.mountPath}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>

        {/* Column 2 (5 cols): Volume Mount Details & Host Paths */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="bg-[#121318] border border-[#26282e] rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-[#1e1f25]">
              <div>
                <h2 className="text-base font-bold text-white font-mono">
                  {selectedVolume.name}
                </h2>
                <p className="text-xs text-[#8e9192] mt-0.5">
                  {selectedVolume.format} • Doğrudan Direct IO
                </p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[10px] font-medium">
                BAĞLI
              </span>
            </div>

            {/* Mount specs */}
            <div className="space-y-3 font-mono text-xs">
              <div className="space-y-1">
                <span className="text-[10px] text-[#8e9192] uppercase">Konteyner Bağlantı Yolu (Mount)</span>
                <div className="bg-[#16171d] p-2.5 rounded-xl border border-[#26282e] text-emerald-400 flex items-center justify-between">
                  <span>{selectedVolume.mountPath}</span>
                  <span className="text-[10px] text-[#8e9192]">{selectedVolume.service}</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-[#8e9192] uppercase">Host Mutlak Dosya Yolu</span>
                <div className="bg-[#16171d] p-2.5 rounded-xl border border-[#26282e] text-white flex items-center justify-between">
                  <span className="truncate pr-2 text-slate-300">{selectedVolume.hostPath}</span>
                  <button
                    onClick={handleCopyPath}
                    className="text-[#8e9192] hover:text-white transition cursor-pointer"
                    title="Dosya Yolunu Kopyala"
                  >
                    {copiedPath ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="bg-[#0d0e13] p-3 rounded-xl border border-[#1e1f25]">
                  <span className="text-[10px] text-[#8e9192] block">Toplam Boyut</span>
                  <span className="text-sm font-bold text-white mt-1 block">
                    {selectedVolume.size}
                  </span>
                </div>
                <div className="bg-[#0d0e13] p-3 rounded-xl border border-[#1e1f25]">
                  <span className="text-[10px] text-[#8e9192] block">Dosya Sayısı</span>
                  <span className="text-sm font-bold text-white mt-1 block">
                    {selectedVolume.fileCount.toLocaleString()} dosya
                  </span>
                </div>
              </div>
            </div>

            {/* Snapshot Action */}
            <div className="pt-2 border-t border-[#1e1f25] flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-white block">Kalıcı Snapshot Al</span>
                <span className="text-[11px] text-[#8e9192]">Sıfır kesintiyle anlık veri yedeği oluşturun.</span>
              </div>
              <button
                onClick={handleCreateSnapshot}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a1b21] hover:bg-[#232736] text-white border border-[#26282e] hover:border-white/30 rounded-xl text-xs font-mono transition cursor-pointer active:scale-95"
              >
                <Camera className="w-3.5 h-3.5 text-blue-400" />
                <span>Yedek Al</span>
              </button>
            </div>

            {snapshotName && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-mono flex items-center gap-2">
                <Check className="w-4 h-4" />
                <span>Snapshot başarıyla oluşturuldu: {snapshotName}</span>
              </div>
            )}
          </div>
        </div>

        {/* Column 3 (3 cols): NVMe Disk Telemetry */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          <div className="bg-[#121318] border border-[#26282e] rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                NVMe Telemetrisi
              </span>
              <span className="text-[10px] font-mono text-[#8e9192] bg-[#16171d] px-2 py-0.5 rounded border border-[#26282e]">
                nvme0n1
              </span>
            </div>

            <div className="bg-[#0d0e13] border border-[#1e1f25] rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-baseline justify-between font-mono">
                <span className="text-lg font-bold text-white">
                  128.4 <span className="text-xs text-[#8e9192]">/ 500 GB</span>
                </span>
                <span className="text-xs text-emerald-400">%25.6 Doluluk</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#16171d] overflow-hidden">
                <div className="h-full bg-emerald-400 rounded-full" style={{ width: '25.6%' }} />
              </div>
            </div>

            <div className="space-y-2 font-mono text-xs">
              <div className="bg-[#0d0e13] p-3 rounded-xl border border-[#1e1f25] flex justify-between items-center">
                <span className="text-[#8e9192]">Okuma Hızı:</span>
                <span className="text-white font-medium flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-emerald-400" /> 142.8 MB/s
                </span>
              </div>
              <div className="bg-[#0d0e13] p-3 rounded-xl border border-[#1e1f25] flex justify-between items-center">
                <span className="text-[#8e9192]">Yazma Hızı:</span>
                <span className="text-white font-medium">86.2 MB/s</span>
              </div>
              <div className="bg-[#0d0e13] p-3 rounded-xl border border-[#1e1f25] flex justify-between items-center">
                <span className="text-[#8e9192]">Gecikme (Latency):</span>
                <span className="text-emerald-400 font-medium">0.4 ms (DirectIO)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
