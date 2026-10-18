import { useState } from 'react';
import { X, Rocket, Plus, Trash2 } from 'lucide-react';
import type { ContainerItem } from '../types/container';

interface DeployModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeploy: (newContainer: ContainerItem) => void;
}

export const DeployModal: React.FC<DeployModalProps> = ({
  isOpen,
  onClose,
  onDeploy,
}) => {
  const [name, setName] = useState('');
  const [image, setImage] = useState('');
  const [tag, setTag] = useState('latest');
  const [hostPort, setHostPort] = useState('');
  const [containerPort, setContainerPort] = useState('');
  const [traefikRoute, setTraefikRoute] = useState('');
  const [envPairs, setEnvPairs] = useState<{ key: string; value: string }[]>([
    { key: 'NODE_ENV', value: 'production' },
  ]);

  if (!isOpen) return null;

  const handleAddEnv = () => {
    setEnvPairs([...envPairs, { key: '', value: '' }]);
  };

  const handleRemoveEnv = (index: number) => {
    setEnvPairs(envPairs.filter((_, i) => i !== index));
  };

  const handleEnvChange = (index: number, field: 'key' | 'value', val: string) => {
    const updated = [...envPairs];
    updated[index][field] = val;
    setEnvPairs(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !image) return;

    const parsedHostPort = parseInt(hostPort, 10);
    const parsedContainerPort = parseInt(containerPort, 10);

    const ports = (!isNaN(parsedHostPort) && !isNaN(parsedContainerPort))
      ? [{ hostPort: parsedHostPort, containerPort: parsedContainerPort, protocol: 'tcp' as const }]
      : [];

    const newContainer: ContainerItem = {
      id: `c-${Math.random().toString(36).substring(2, 9)}`,
      name: name.toLowerCase().replace(/\s+/g, '-'),
      image,
      tag: tag || 'latest',
      status: 'running',
      statusText: 'Çevrimiçi',
      subtitle: `${image}:${tag || 'latest'} • Özel Dağıtım`,
      category: 'service',
      uptime: 'Az önce',
      cpuPercent: 0.5,
      memoryUsageMb: 24,
      memoryLimitMb: 512,
      ports,
      traefikRoute: traefikRoute || undefined,
      network: 'akson-bridge',
      ipAddress: `172.20.0.${Math.floor(Math.random() * 200) + 10}`,
      restartCount: 0,
      logs: [
        `[docker] Pulling from library/${image}`,
        `[docker] Digest: sha256:${Math.random().toString(36).substring(2, 18)}...`,
        `[docker] Status: Downloaded newer image for ${image}:${tag}`,
        `[akson] Container ${name} started successfully on network akson-bridge`,
      ],
      env: envPairs.filter((p) => p.key.trim() !== ''),
    };

    onDeploy(newContainer);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-[#0a0a0a] border border-[#262626] rounded-2xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#262626] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-400 shadow-sm">
              <Rocket className="w-4 h-4 text-rose-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white font-mono">Yeni Konteyner Dağıt (Deploy)</h3>
              <p className="text-[11px] text-zinc-400">Docker imajını doğrudan host üzerinde ayağa kaldırır.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-mono">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-400 mb-1">Konteyner Adı *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="örn: payment-service"
                className="w-full bg-[#121212] border border-[#262626] text-white rounded-xl px-3 py-2 focus:outline-none focus:border-white transition"
              />
            </div>
            <div>
              <label className="block text-zinc-400 mb-1">İmaj Adı *</label>
              <input
                type="text"
                required
                value={image}
                onChange={(e) => setImage(e.target.value)}
                placeholder="örn: node, redis, nginx"
                className="w-full bg-[#121212] border border-[#262626] text-white rounded-xl px-3 py-2 focus:outline-none focus:border-white transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-zinc-400 mb-1">Tag (Sürüm)</label>
              <input
                type="text"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                placeholder="latest"
                className="w-full bg-[#121212] border border-[#262626] text-white rounded-xl px-3 py-2 focus:outline-none focus:border-white transition"
              />
            </div>
            <div>
              <label className="block text-zinc-400 mb-1">Host Port</label>
              <input
                type="number"
                value={hostPort}
                onChange={(e) => setHostPort(e.target.value)}
                placeholder="8080"
                className="w-full bg-[#121212] border border-[#262626] text-white rounded-xl px-3 py-2 focus:outline-none focus:border-white transition"
              />
            </div>
            <div>
              <label className="block text-zinc-400 mb-1">Konteyner Port</label>
              <input
                type="number"
                value={containerPort}
                onChange={(e) => setContainerPort(e.target.value)}
                placeholder="80"
                className="w-full bg-[#121212] border border-[#262626] text-white rounded-xl px-3 py-2 focus:outline-none focus:border-white transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-zinc-400 mb-1">Traefik Alan Adı Rotası (Opsiyonel)</label>
            <input
              type="text"
              value={traefikRoute}
              onChange={(e) => setTraefikRoute(e.target.value)}
              placeholder="örn: pay.akson.internal"
              className="w-full bg-[#121212] border border-[#262626] text-white rounded-xl px-3 py-2 focus:outline-none focus:border-white transition"
            />
          </div>

          {/* Environment Variables */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-zinc-400">Ortam Değişkenleri (ENV)</label>
              <button
                type="button"
                onClick={handleAddEnv}
                className="flex items-center gap-1 text-[11px] text-zinc-300 hover:text-white cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Değişken Ekle</span>
              </button>
            </div>
            {envPairs.map((pair, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="KEY"
                  value={pair.key}
                  onChange={(e) => handleEnvChange(idx, 'key', e.target.value)}
                  className="flex-1 bg-[#121212] border border-[#262626] text-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-white"
                />
                <input
                  type="text"
                  placeholder="VALUE"
                  value={pair.value}
                  onChange={(e) => handleEnvChange(idx, 'value', e.target.value)}
                  className="flex-1 bg-[#121212] border border-[#262626] text-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-white"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveEnv(idx)}
                  className="p-1.5 text-zinc-500 hover:text-white cursor-pointer transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#262626]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#121212] hover:bg-zinc-800 text-white rounded-xl transition cursor-pointer border border-[#262626]"
            >
              İptal
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-zinc-200 text-black font-semibold rounded-xl transition cursor-pointer shadow-md active:scale-95"
            >
              <Rocket className="w-3.5 h-3.5" />
              <span>Konteyneri Başlat</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
