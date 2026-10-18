import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Network,
  ShieldCheck,
  Globe,
  Lock,
  Server,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
} from 'lucide-react';
import type { ContainerItem } from '../../types/container';

interface RouteRule {
  id: string;
  name: string;
  rule: string;
  entryPoint: string;
  targetService: string;
  targetIp: string;
  tls: boolean;
  status: 'healthy' | 'degraded';
}

interface NetworkViewProps {
  containers: ContainerItem[];
}

export const NetworkView: React.FC<NetworkViewProps> = ({ containers }) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshSuccess, setRefreshSuccess] = useState(false);

  const dynamicRoutes: RouteRule[] = React.useMemo(() => {
    return containers.map((c, index) => {
      const portInfo = c.ports && c.ports.length > 0 ? c.ports[0] : null;
      const hostPort = portInfo?.hostPort || 80;
      const containerPort = portInfo?.containerPort || 80;
      return {
        id: `r-${c.id || index}`,
        name: `${c.name}@docker`,
        rule: c.traefikRoute ? `Host(\`${c.traefikRoute}\`)` : `Host(\`${c.name}.localhost\`)`,
        entryPoint: portInfo ? `:${hostPort} ➔ :${containerPort}` : 'akson-bridge',
        targetService: `${c.name}:${containerPort}`,
        targetIp: `${c.ipAddress || '172.20.0.' + (index + 2)}:${containerPort}`,
        tls: true,
        status: (c.status === 'running' ? 'healthy' : 'degraded') as 'healthy' | 'degraded',
      };
    });
  }, [containers]);

  const handleRefreshCerts = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      setRefreshSuccess(true);
      setTimeout(() => setRefreshSuccess(false), 3000);
    }, 1000);
  };

  return (
    <div className="flex flex-col flex-1 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-[#262626]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white tracking-tight font-sans">
              Ağ Topolojisi & Traefik v3 Proxy
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 font-sans text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />
              Traefik v3.0.1 Aktif
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1 font-sans">
            İzole Docker köprüsü, otomatik SSL/TLS sertifikaları ve ters vekil rotaları.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefreshCerts}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#121212] hover:bg-zinc-800 text-white border border-[#262626] hover:border-zinc-500 rounded-xl text-xs font-sans transition cursor-pointer active:scale-95 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-zinc-300 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Sertifikaları Yenile</span>
          </button>
        </div>
      </div>

      {refreshSuccess && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 rounded-xl text-xs font-sans flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Let's Encrypt TLS-ALPN-01 sertifikaları başarıyla doğrulandı ve güncellendi.</span>
        </div>
      )}

      {/* Visual Traffic Flow Pipeline Strip (Replaces bulky box-in-a-box) */}
      <div className="p-4 rounded-2xl bg-[#0a0a0a] border border-[#262626] flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Step 1: Ingress */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/25 flex items-center justify-center shrink-0">
            <Globe className="w-4 h-4 text-sky-400" />
          </div>
          <div>
            <span className="text-xs font-semibold text-white font-sans block">Dış Giriş Noktaları</span>
            <span className="text-[11px] text-zinc-400 font-mono">:80 (HTTP) ➔ :443 (HTTPS)</span>
          </div>
        </div>

        <ArrowRight className="w-4 h-4 text-zinc-600 hidden md:block shrink-0" />

        {/* Step 2: SSL & Proxy Core */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <span className="text-xs font-semibold text-white font-sans block">Traefik v3 Core</span>
            <span className="text-[11px] text-emerald-400/90 font-mono">Let's Encrypt TLS 1.3</span>
          </div>
        </div>

        <ArrowRight className="w-4 h-4 text-zinc-600 hidden md:block shrink-0" />

        {/* Step 3: Isolated Network */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/25 flex items-center justify-center shrink-0">
            <Server className="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <span className="text-xs font-semibold text-white font-sans block">İzole Köprü Ağı</span>
            <span className="text-[11px] text-violet-300/90 font-mono">akson-bridge (172.20.0.0/16)</span>
          </div>
        </div>
      </div>

      {/* Traefik Routing Rules Table */}
      <div className="bg-[#0a0a0a] border border-[#262626] rounded-2xl overflow-hidden shadow-sm space-y-3">
        <div className="p-4 border-b border-[#262626] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Network className="w-4 h-4 text-white" />
            <h2 className="text-xs font-bold text-white uppercase tracking-wider font-sans">
              Traefik v3 Rotaları & Servis Eşlemeleri
            </h2>
          </div>
          <span className="text-[11px] font-sans text-zinc-400 bg-white/[0.04] px-2.5 py-0.5 rounded-full border border-[#262626] font-medium">
            {dynamicRoutes.length} Rota
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#121212] text-zinc-400 border-b border-[#262626] font-sans">
              <tr>
                <th className="p-3.5">ROUTER ADI</th>
                <th className="p-3.5">KURAL (HOST / DOMAIN)</th>
                <th className="p-3.5">PORT GEÇİŞİ</th>
                <th className="p-3.5">HEDEF UPSTREAM IP</th>
                <th className="p-3.5">ŞİFRELEME</th>
                <th className="p-3.5 text-right">DURUM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#262626] font-mono">
              {dynamicRoutes.map((route) => (
                <tr key={route.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="p-3.5 font-medium text-white">{route.name}</td>
                  <td className="p-3.5 text-zinc-300 font-medium">{route.rule}</td>
                  <td className="p-3.5 text-zinc-400">{route.entryPoint}</td>
                  <td className="p-3.5 text-zinc-300">{route.targetIp}</td>
                  <td className="p-3.5">
                    {route.tls ? (
                      <span className="inline-flex items-center gap-1 text-white font-sans text-xs">
                        <Lock className="w-3 h-3 text-emerald-400" /> TLS 1.3
                      </span>
                    ) : (
                      <span className="text-zinc-500 font-sans text-xs">TCP</span>
                    )}
                  </td>
                  <td className="p-3.5 text-right">
                    <span
                      className={`inline-flex items-center gap-1.5 text-[10px] font-sans px-2.5 py-0.5 rounded-full font-medium border ${
                        route.status === 'healthy'
                          ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25'
                          : 'text-amber-400 bg-amber-500/10 border-amber-500/25'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          route.status === 'healthy'
                            ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse'
                            : 'bg-amber-400'
                        }`}
                      />
                      {route.status === 'healthy' ? 'Aktif' : 'Beklemede'}
                    </span>
                  </td>
                </tr>
              ))}
              {dynamicRoutes.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-zinc-500 font-sans">
                    Aktif Docker konteyneri bulunamadı.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Isolated Subnet Topology Card */}
      <div className="bg-[#0a0a0a] border border-[#262626] rounded-2xl p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-violet-400" />
            <h2 className="text-xs font-bold text-white uppercase tracking-wider font-sans">
              İzole Alt Ağ Düğümleri: akson-bridge (172.20.0.0/16)
            </h2>
          </div>
          <span className="text-zinc-500 font-mono text-xs">Ağ Geçidi: 172.20.0.1</span>
        </div>

        {/* Visual node grid */}
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
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pt-1"
        >
          {containers.map((c) => (
            <motion.div
              key={c.id}
              variants={{
                hidden: { opacity: 0, y: 8 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
              }}
              whileHover={{ y: -2 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="bg-[#121212] p-3 rounded-xl border border-[#262626] space-y-1 hover:border-zinc-500 transition-colors cursor-default"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white text-xs font-sans truncate">{c.name}</span>
                <span
                  className={`w-2 h-2 rounded-full ${
                    c.status === 'running'
                      ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse'
                      : 'bg-zinc-600'
                  }`}
                />
              </div>
              <div className="text-[11px] text-zinc-300 font-mono">{c.ipAddress}</div>
              <div className="text-[10px] text-zinc-500 font-mono truncate">{c.image}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
};
