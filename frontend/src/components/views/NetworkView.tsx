import React, { useCallback, useEffect, useState } from 'react';
import { Network, Server, RefreshCw } from 'lucide-react';
import type { ContainerItem } from '../../types/container';
import { api, type ApiNetworkDetails } from '../../api/client';

interface NetworkViewProps {
  containers: ContainerItem[];
  isLiveBackend: boolean;
}

export const NetworkView: React.FC<NetworkViewProps> = ({ containers, isLiveBackend }) => {
  const [details, setDetails] = useState<ApiNetworkDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchDetails = useCallback(
    () =>
      api
        .fetchNetworkDetails()
        .then((d) => {
          setDetails(d);
          setError(null);
        })
        .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : String(err));
        }),
    []
  );

  // Initial load and reload when the container count changes. State is only set after the request returns.
  useEffect(() => {
    if (isLiveBackend) fetchDetails();
  }, [isLiveBackend, containers.length, fetchDetails]);

  const handleRefresh = () => {
    setIsLoading(true);
    fetchDetails().finally(() => setIsLoading(false));
  };

  // The network API keys containers by full ID; the list uses the 12 character short ID.
  const ipOf = (c: ContainerItem): string => {
    if (!details) return '—';
    const key = Object.keys(details.containers || {}).find((id) => id.startsWith(c.id));
    return key ? details.containers[key] : '—';
  };

  const routed = containers.filter((c) => c.traefikRoute);

  return (
    <div className="flex flex-col flex-1 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-[#262626]">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight font-sans">Ağ</h1>
          <p className="text-xs text-zinc-400 mt-1 font-sans">
            Servislerin bağlı olduğu Docker ağı ve Traefik rotaları.
          </p>
        </div>

        {isLiveBackend && (
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#121212] hover:bg-zinc-800 text-white border border-[#262626] rounded-xl text-xs font-sans transition cursor-pointer active:scale-95 disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-zinc-300 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Yenile</span>
          </button>
        )}
      </div>

      {!isLiveBackend && (
        <div className="p-3 rounded-xl border border-[#262626] bg-[#0a0a0a] text-xs text-zinc-400 font-sans">
          Demo modu: backend bağlı olmadığı için ağ bilgisi okunamıyor.
        </div>
      )}
      {error && (
        <div className="p-3 rounded-xl border border-rose-500/25 bg-rose-500/10 text-xs text-rose-300 font-sans">
          Ağ bilgisi alınamadı: {error}
        </div>
      )}

      {/* Network summary: values come from the Docker daemon */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'Ağ adı', value: details?.name },
          { label: 'Alt ağ', value: details?.subnet },
          { label: 'Ağ geçidi', value: details?.gateway },
        ].map((item) => (
          <div key={item.label} className="bg-[#0a0a0a] border border-[#262626] rounded-2xl p-4">
            <span className="text-[11px] text-zinc-400 font-sans block">{item.label}</span>
            <span className="text-sm text-white font-mono mt-1 block">{item.value || '—'}</span>
          </div>
        ))}
      </div>

      {/* Traefik routes: only containers that really carry a router rule label */}
      <div className="bg-[#0a0a0a] border border-[#262626] rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-[#262626] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Network className="w-4 h-4 text-white" />
            <h2 className="text-xs font-bold text-white uppercase tracking-wider font-sans">Traefik rotaları</h2>
          </div>
          <span className="text-[11px] font-sans text-zinc-400">{routed.length} rota</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#121212] text-zinc-400 border-b border-[#262626] font-sans">
              <tr>
                <th className="p-3.5 font-medium">Servis</th>
                <th className="p-3.5 font-medium">Kural</th>
                <th className="p-3.5 font-medium">Port</th>
                <th className="p-3.5 font-medium">IP</th>
                <th className="p-3.5 font-medium text-right">Durum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#262626] font-mono">
              {routed.map((c) => {
                const port = c.ports[0];
                return (
                  <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-3.5 text-white">{c.name}</td>
                    <td className="p-3.5 text-zinc-300">{c.traefikRoute}</td>
                    <td className="p-3.5 text-zinc-400">
                      {port ? (port.hostPort ? `${port.hostPort} → ${port.containerPort}` : port.containerPort) : '—'}
                    </td>
                    <td className="p-3.5 text-zinc-300">{ipOf(c)}</td>
                    <td className="p-3.5 text-right font-sans">
                      <span className={c.status === 'running' ? 'text-emerald-400' : 'text-zinc-500'}>
                        {c.status === 'running' ? 'Çalışıyor' : 'Durdu'}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {routed.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-zinc-500 font-sans">
                    Traefik rotası olan servis yok. Dağıtım sırasında bir alan adı girerseniz burada görünür.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Containers and their addresses on the network */}
      <div className="bg-[#0a0a0a] border border-[#262626] rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-[#262626]">
          <Server className="w-4 h-4 text-zinc-300" />
          <h2 className="text-xs font-bold text-white uppercase tracking-wider font-sans">Ağdaki servisler</h2>
        </div>

        {containers.length === 0 ? (
          <p className="text-xs text-zinc-500 font-sans">Henüz servis yok.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {containers.map((c) => (
              <div key={c.id} className="bg-[#121212] p-3 rounded-xl border border-[#262626] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white text-xs font-sans truncate">{c.name}</span>
                  <span className={`w-2 h-2 rounded-full ${c.status === 'running' ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
                </div>
                <div className="text-[11px] text-zinc-300 font-mono">{ipOf(c)}</div>
                <div className="text-[10px] text-zinc-500 font-mono truncate">{c.image}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
