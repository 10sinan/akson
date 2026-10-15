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

const MOCK_ROUTES: RouteRule[] = [
  {
    id: 'r1',
    name: 'api-gateway@docker',
    rule: 'Host(`api.localhost`) || Host(`api.akson.internal`)',
    entryPoint: 'websecure (:443)',
    targetService: 'api-gateway:8080',
    targetIp: '172.20.0.2:8080',
    tls: true,
    status: 'healthy',
  },
  {
    id: 'r2',
    name: 'frontend-web@docker',
    rule: 'Host(`app.localhost`) || Host(`app.akson.internal`)',
    entryPoint: 'websecure (:443)',
    targetService: 'frontend-web:80',
    targetIp: '172.20.0.3:3000',
    tls: true,
    status: 'healthy',
  },
  {
    id: 'r3',
    name: 'postgres-internal@docker',
    rule: 'HostSNI(`db.internal`)',
    entryPoint: 'postgres (:5432)',
    targetService: 'postgres-main:5432',
    targetIp: '172.20.0.4:5432',
    tls: true,
    status: 'healthy',
  },
  {
    id: 'r4',
    name: 'redis-internal@docker',
    rule: 'HostSNI(`cache.internal`)',
    entryPoint: 'redis (:6379)',
    targetService: 'redis-cache:6379',
    targetIp: '172.20.0.5:6379',
    tls: false,
    status: 'healthy',
  },
];

interface NetworkViewProps {
  containers: ContainerItem[];
}

export const NetworkView: React.FC<NetworkViewProps> = ({ containers }) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshSuccess, setRefreshSuccess] = useState(false);

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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-[#1e1f25]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Ağ Topolojisi & Traefik v3 Proxy
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Traefik v3.0.1 Aktif
            </span>
          </div>
          <p className="text-xs text-[#8e9192] mt-1">
            İzole Docker köprüsü (akson-bridge), otomatik SSL/TLS sertifikaları ve yönlendirme kuralları.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefreshCerts}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#1a1b21] hover:bg-[#232736] text-white border border-[#26282e] hover:border-white/30 rounded-xl text-xs font-mono transition cursor-pointer active:scale-95 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Sertifikaları Yenile</span>
          </button>
        </div>
      </div>

      {refreshSuccess && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-mono flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>Let's Encrypt TLS-ALPN-01 sertifikaları başarıyla doğrulandı ve güncellendi.</span>
        </div>
      )}

      {/* Top 2 Cards: Traefik Entrypoints & SSL Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-2xl bg-[#121318] border border-[#26282e] space-y-2.5 font-mono text-xs shadow-sm">
          <div className="flex items-center gap-2 text-white font-semibold">
            <Globe className="w-4 h-4 text-blue-400" />
            <span>Giriş Noktaları (EntryPoints)</span>
          </div>
          <div className="space-y-1.5 pt-1 text-[#8e9192]">
            <div className="flex justify-between items-center bg-[#0d0e13] p-2 rounded-lg border border-[#1e1f25]">
              <span>Port 80 (HTTP)</span>
              <span className="text-white">Otomatik 443 (HTTPS) Redirection</span>
            </div>
            <div className="flex justify-between items-center bg-[#0d0e13] p-2 rounded-lg border border-[#1e1f25]">
              <span>Port 443 (HTTPS)</span>
              <span className="text-emerald-400 font-medium">Let's Encrypt TLS 1.3 / HTTP/2</span>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#121318] border border-[#26282e] space-y-2.5 font-mono text-xs shadow-sm">
          <div className="flex items-center gap-2 text-white font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Let's Encrypt ACME v02</span>
          </div>
          <div className="space-y-1.5 pt-1 text-[#8e9192]">
            <div className="flex justify-between items-center bg-[#0d0e13] p-2 rounded-lg border border-[#1e1f25]">
              <span>Sertifika Durumu:</span>
              <span className="text-emerald-400 font-medium">Sağlıklı (Auto-Renew Aktif)</span>
            </div>
            <div className="flex justify-between items-center bg-[#0d0e13] p-2 rounded-lg border border-[#1e1f25]">
              <span>Geçerlilik:</span>
              <span className="text-white">88 gün kaldı (Yenileme: 30 gün kala)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Traefik Routing Rules Table */}
      <div className="bg-[#121318] border border-[#26282e] rounded-2xl overflow-hidden shadow-sm space-y-3">
        <div className="p-4 border-b border-[#1e1f25] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Network className="w-4 h-4 text-purple-400" />
            <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Traefik v3 Rotaları & Servis Eşlemeleri
            </h2>
          </div>
          <span className="text-[11px] font-mono text-[#8e9192] bg-[#16171d] px-2 py-0.5 rounded border border-[#26282e]">
            {MOCK_ROUTES.length} Rota Tanımlı
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-[#16171d] text-[#8e9192] border-b border-[#26282e]">
              <tr>
                <th className="p-3.5">ROUTER ADI</th>
                <th className="p-3.5">KURAL (HOST / PATH)</th>
                <th className="p-3.5">GİRİŞ NOKTASI</th>
                <th className="p-3.5">HEDEF UPSTREAM IP</th>
                <th className="p-3.5">TLS / SSL</th>
                <th className="p-3.5 text-right">DURUM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e1f25]">
              {MOCK_ROUTES.map((route) => (
                <tr key={route.id} className="hover:bg-white/5 transition-colors">
                  <td className="p-3.5 font-semibold text-white">{route.name}</td>
                  <td className="p-3.5 text-blue-300 font-medium">{route.rule}</td>
                  <td className="p-3.5 text-slate-300">{route.entryPoint}</td>
                  <td className="p-3.5 text-emerald-400">{route.targetIp}</td>
                  <td className="p-3.5">
                    {route.tls ? (
                      <span className="inline-flex items-center gap-1 text-emerald-400">
                        <Lock className="w-3 h-3" /> TLS 1.3
                      </span>
                    ) : (
                      <span className="text-slate-500">Düz TCP</span>
                    )}
                  </td>
                  <td className="p-3.5 text-right">
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-medium border border-emerald-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Aktif
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Isolated Subnet Topology Card */}
      <div className="bg-[#121318] border border-[#26282e] rounded-2xl p-5 space-y-4 shadow-sm font-mono text-xs">
        <div className="flex items-center justify-between pb-3 border-b border-[#1e1f25]">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-emerald-400" />
            <h2 className="text-xs font-bold text-white uppercase tracking-wider">
              İzole Alt Ağ Topolojisi: akson-bridge (172.20.0.0/16)
            </h2>
          </div>
          <span className="text-[#8e9192]">Ağ Geçidi (Gateway): 172.20.0.1</span>
        </div>

        <p className="text-[#8e9192] text-[11px]">
          Tüm konteynerler yalnızca bu izole Docker köprüsü üzerinden birbirleriyle haberleşir. Dış dünyaya yalnızca Traefik 80/443 portları açıktır.
        </p>

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
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 pt-2"
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
              className="bg-[#0d0e13] p-3 rounded-xl border border-[#1e1f25] space-y-1.5 hover:border-white/20 transition-colors cursor-default"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white truncate">{c.name}</span>
                <span
                  className={`w-2 h-2 rounded-full ${
                    c.status === 'running' ? 'bg-emerald-400' : 'bg-zinc-600'
                  }`}
                />
              </div>
              <div className="text-[11px] text-emerald-400">{c.ipAddress}</div>
              <div className="text-[10px] text-[#8e9192] truncate">{c.image}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
};
