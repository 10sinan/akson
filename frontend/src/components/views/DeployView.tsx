import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { wiseBouncy } from '../../utils/motion';
import {
  Rocket,
  FolderGit2,
  Globe,
  CheckCircle2,
  Terminal,
  Clock,
  Search,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  Server,
} from 'lucide-react';
import type { ContainerItem } from '../../types/container';

interface RepoOption {
  id: string;
  name: string;
  isPrivate: boolean;
  updatedAt: string;
  runtime: string;
  branch: string;
  port: number;
}

const MOCK_REPOS: RepoOption[] = [
  {
    id: 'r1',
    name: 'my-nextjs-app',
    isPrivate: false,
    updatedAt: '12 dakika önce',
    runtime: 'Next.js 14 (App Router)',
    branch: 'main',
    port: 3000,
  },
  {
    id: 'r2',
    name: 'portfolio-website',
    isPrivate: true,
    updatedAt: '2 saat önce',
    runtime: 'Astro 4.0 + Tailwind v4',
    branch: 'production',
    port: 4321,
  },
  {
    id: 'r3',
    name: 'golang-microservice',
    isPrivate: false,
    updatedAt: '1 gün önce',
    runtime: 'Go 1.22 + Alpine Dockerfile',
    branch: 'main',
    port: 8080,
  },
  {
    id: 'r4',
    name: 'fastapi-ml-worker',
    isPrivate: true,
    updatedAt: '3 gün önce',
    runtime: 'Python 3.11 + Celery',
    branch: 'main',
    port: 8000,
  },
];

interface DeployViewProps {
  onDeploySuccess: (container: ContainerItem) => void;
  onNavigateDashboard: () => void;
}

export const DeployView: React.FC<DeployViewProps> = ({
  onDeploySuccess,
  onNavigateDashboard,
}) => {
  const [sourceType, setSourceType] = useState<'github' | 'giturl'>('github');
  const [searchRepo, setSearchRepo] = useState('');
  const [selectedRepo, setSelectedRepo] = useState<RepoOption>(MOCK_REPOS[0]);
  const [customGitUrl, setCustomGitUrl] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('main');
  const [serviceName, setServiceName] = useState('my-nextjs-app');
  const [servicePort, setServicePort] = useState(3000);
  const [customDomain, setCustomDomain] = useState('app.localhost');
  const [envVars, setEnvVars] = useState<Array<{ key: string; value: string; secret: boolean }>>([
    { key: 'NODE_ENV', value: 'production', secret: false },
    { key: 'PORT', value: '3000', secret: false },
  ]);

  // Deployment simulation state
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployStep, setDeployStep] = useState<number>(0);
  const [deployLogs, setDeployLogs] = useState<string[]>([]);
  const [isDeployed, setIsDeployed] = useState(false);

  const filteredRepos = MOCK_REPOS.filter((r) =>
    r.name.toLowerCase().includes(searchRepo.toLowerCase())
  );

  const handleSelectRepo = (repo: RepoOption) => {
    setSelectedRepo(repo);
    setServiceName(repo.name);
    setServicePort(repo.port);
    setSelectedBranch(repo.branch);
    setCustomDomain(`${repo.name}.localhost`);
  };

  const handleAddEnv = () => {
    setEnvVars((prev) => [...prev, { key: '', value: '', secret: false }]);
  };

  const handleRemoveEnv = (index: number) => {
    setEnvVars((prev) => prev.filter((_, i) => i !== index));
  };

  const handleStartDeploy = () => {
    setIsDeploying(true);
    setDeployStep(1);
    setDeployLogs([
      `[akson-build] Başlatılıyor: ${serviceName}`,
      `[git] Depo çekiliyor: ${sourceType === 'github' ? selectedRepo.name : customGitUrl || 'custom-git'} (${selectedBranch})...`,
    ]);

    setTimeout(() => {
      setDeployStep(2);
      setDeployLogs((prev) => [
        ...prev,
        `[git] HEAD commit: 7b4f91c - Merge pull request #14`,
        `[docker] Runtime algılandı: ${selectedRepo.runtime}`,
        `[docker] Multi-stage build başlatıldı (BuildKit engine v0.13)...`,
        `[docker] [1/4] FROM node:20-alpine AS builder`,
        `[docker] [2/4] COPY package.json package-lock.json ./`,
        `[docker] [3/4] RUN npm ci --omit=dev`,
        `[docker] [4/4] EXPOSE ${servicePort}`,
      ]);
    }, 1200);

    setTimeout(() => {
      setDeployStep(3);
      setDeployLogs((prev) => [
        ...prev,
        `[docker] İmaj başarıyla derlendi: akson/${serviceName}:latest (sha256:4a8c91...)`,
        `[traefik] Ters vekil rotası bağlanıyor: Host(\`${customDomain}\`) -> :${servicePort}`,
        `[traefik] Let's Encrypt TLS-ALPN-01 sertifikası doğrulandı.`,
        `[network] 172.20.0.12 (akson-bridge) sanal IP'si atandı.`,
      ]);
    }, 2400);

    setTimeout(() => {
      setDeployStep(4);
      setDeployLogs((prev) => [
        ...prev,
        `[akson] Servis başarıyla ayağa kaldırıldı ve sağlık kontrolünden geçti (200 OK)!`,
      ]);
      setIsDeploying(false);
      setIsDeployed(true);

      const newContainer: ContainerItem = {
        id: `c-new-${Date.now().toString(36)}`,
        name: serviceName,
        image: `akson/${serviceName}`,
        tag: 'latest',
        status: 'running',
        statusText: 'Çevrimiçi',
        subtitle: `${selectedRepo.runtime} • Yeni Dağıtım`,
        category: 'service',
        uptime: 'Az önce başlatıldı',
        cpuPercent: 1.1,
        memoryUsageMb: 42,
        memoryLimitMb: 512,
        ports: [{ hostPort: servicePort, containerPort: servicePort, protocol: 'tcp' }],
        traefikRoute: customDomain,
        network: 'akson-bridge',
        ipAddress: '172.20.0.12',
        restartCount: 0,
        logs: [
          `[${serviceName}] Servis başlatıldı: http://${customDomain}`,
          `[${serviceName}] Traefik ters proxy aktif`,
        ],
        env: envVars.filter((e) => e.key.trim() !== ''),
      };

      onDeploySuccess(newContainer);
    }, 3600);
  };

  return (
    <div className="flex flex-col flex-1 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-[#1e1f25]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white tracking-tight">Yeni Dağıtım Başlat</h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Canlı Ortam
            </span>
          </div>
          <p className="text-xs text-[#8e9192] mt-1">
            GitHub deponuzu veya harici Git URL'nizi bağlayarak saniyeler içinde yayına alın.
          </p>
        </div>

        {/* Daemon Telemetry */}
        <div className="flex items-center gap-3 bg-[#121318] border border-[#26282e] p-1.5 rounded-xl font-mono text-xs">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#16171d] border border-[#26282e]">
            <Server className="w-3.5 h-3.5 text-emerald-400" />
            <div>
              <span className="text-[10px] text-[#8e9192] block leading-none">DÜĞÜM</span>
              <span className="text-white font-medium">local-core-01</span>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5">
            <Clock className="w-3.5 h-3.5 text-[#8e9192]" />
            <div>
              <span className="text-[10px] text-[#8e9192] block leading-none">ORTALAMA DERLEME</span>
              <span className="text-white font-medium">24s</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Settings vs Build logs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols): Source, Config, Env */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Section 1: Kaynak Depo */}
          <div className="bg-[#121318] border border-[#26282e] rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-[#1e1f25]">
              <div className="flex items-center gap-2">
                <FolderGit2 className="w-4 h-4 text-blue-400" />
                <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  1. Kaynak Havuzu
                </h2>
              </div>

              {/* Source Switcher with Wise Sliding Pill */}
              <div className="flex items-center gap-1 bg-[#090a0f] p-1 rounded-xl border border-[#26282e] text-xs font-mono">
                <button
                  onClick={() => setSourceType('github')}
                  className={`relative px-3 py-1 rounded-lg transition-colors cursor-pointer select-none ${
                    sourceType === 'github'
                      ? 'text-white font-medium'
                      : 'text-[#8e9192] hover:text-white'
                  }`}
                >
                  {sourceType === 'github' && (
                    <motion.div
                      layoutId="deploySourcePill"
                      className="absolute inset-0 bg-[#16171d] rounded-lg border border-white/10 shadow-sm"
                      transition={wiseBouncy}
                    />
                  )}
                  <span className="relative z-10">GitHub</span>
                </button>
                <button
                  onClick={() => setSourceType('giturl')}
                  className={`relative px-3 py-1 rounded-lg transition-colors cursor-pointer select-none ${
                    sourceType === 'giturl'
                      ? 'text-white font-medium'
                      : 'text-[#8e9192] hover:text-white'
                  }`}
                >
                  {sourceType === 'giturl' && (
                    <motion.div
                      layoutId="deploySourcePill"
                      className="absolute inset-0 bg-[#16171d] rounded-lg border border-white/10 shadow-sm"
                      transition={wiseBouncy}
                    />
                  )}
                  <span className="relative z-10">Git URL</span>
                </button>
              </div>
            </div>

            {sourceType === 'github' ? (
              <div className="space-y-3">
                {/* Search */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-[#8e9192] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchRepo}
                    onChange={(e) => setSearchRepo(e.target.value)}
                    placeholder="Depolarınızda arayın..."
                    className="w-full bg-[#16171d] border border-[#26282e] text-xs text-white rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:border-blue-500 transition-colors placeholder:text-[#8e9192]"
                  />
                </div>

                {/* Repo List */}
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
                  className="space-y-2 max-h-56 overflow-y-auto pr-1"
                >
                  {filteredRepos.map((repo) => {
                    const isSelected = selectedRepo.id === repo.id;
                    return (
                      <motion.div
                        key={repo.id}
                        variants={{
                          hidden: { opacity: 0, y: 8 },
                          visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
                        }}
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                        onClick={() => handleSelectRepo(repo)}
                        className={`p-3 rounded-xl border transition-colors cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-[#1a1b21] border-blue-500/50 shadow-sm'
                            : 'bg-[#16171d]/60 border-[#26282e] hover:bg-[#16171d] hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-[#121318] border border-[#26282e] flex items-center justify-center text-slate-300">
                            <FolderGit2 className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-white font-mono">
                                {repo.name}
                              </span>
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#121318] text-[#8e9192] border border-[#26282e]">
                                {repo.isPrivate ? 'Özel' : 'Açık'}
                              </span>
                            </div>
                            <div className="text-[11px] text-[#8e9192] font-mono mt-0.5">
                              {repo.updatedAt} •{' '}
                              <span className="text-emerald-400 font-medium">{repo.runtime}</span>
                            </div>
                          </div>
                        </div>

                        <button
                          className={`px-3 py-1 rounded-lg text-xs font-mono transition ${
                            isSelected
                              ? 'bg-blue-600 text-white font-semibold'
                              : 'bg-[#121318] text-[#8e9192] hover:text-white border border-[#26282e]'
                          }`}
                        >
                          {isSelected ? 'Seçildi' : 'Bağla'}
                        </button>
                      </motion.div>
                    );
                  })}
                </motion.div>
              </div>
            ) : (
              <div className="space-y-3 font-mono text-xs">
                <label className="text-[10px] text-[#8e9192] uppercase block">
                  Git Depo Adresi (.git)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customGitUrl}
                    onChange={(e) => setCustomGitUrl(e.target.value)}
                    placeholder="https://github.com/kullanici/proje.git"
                    className="flex-1 px-3 py-2 rounded-xl bg-[#16171d] border border-[#26282e] text-white focus:outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={() => alert('Depo erişimi doğrulandı (HTTPS 200 OK)!')}
                    className="px-4 py-2 bg-[#16171d] hover:bg-[#232736] text-white border border-[#26282e] rounded-xl transition cursor-pointer"
                  >
                    Erişimi Kontrol Et
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Temel Ayarlar */}
          <div className="bg-[#121318] border border-[#26282e] rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-[#1e1f25]">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-400" />
                <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  2. Servis & Yönlendirme Ayarları
                </h2>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Otomatik Algılandı
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs">
              <div className="space-y-1.5">
                <label className="text-[10px] text-[#8e9192] uppercase">Servis Adı</label>
                <input
                  type="text"
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#16171d] border border-[#26282e] text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-[#8e9192] uppercase">Dal (Branch)</label>
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#16171d] border border-[#26282e] text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="main">main (Önerilen)</option>
                  <option value="production">production</option>
                  <option value="staging">staging</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-[#8e9192] uppercase">İç Port</label>
                <input
                  type="number"
                  value={servicePort}
                  onChange={(e) => setServicePort(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-[#16171d] border border-[#26282e] text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-[#8e9192] uppercase">Traefik Host Kuralı</label>
                <input
                  type="text"
                  value={customDomain}
                  onChange={(e) => setCustomDomain(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#16171d] border border-[#26282e] text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Ortam Değişkenleri (.env) */}
          <div className="bg-[#121318] border border-[#26282e] rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-[#1e1f25]">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-amber-400" />
                <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  3. Çevre Değişkenleri (.env)
                </h2>
              </div>
              <button
                onClick={handleAddEnv}
                className="flex items-center gap-1 text-[11px] font-mono text-blue-400 hover:text-blue-300 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Değişken Ekle
              </button>
            </div>

            <div className="space-y-2">
              {envVars.map((env, i) => (
                <div key={i} className="flex items-center gap-2 font-mono text-xs">
                  <input
                    type="text"
                    value={env.key}
                    placeholder="KEY"
                    onChange={(e) => {
                      const next = [...envVars];
                      next[i].key = e.target.value;
                      setEnvVars(next);
                    }}
                    className="flex-1 px-3 py-1.5 bg-[#16171d] border border-[#26282e] rounded-lg text-white focus:outline-none"
                  />
                  <input
                    type={env.secret ? 'password' : 'text'}
                    value={env.value}
                    placeholder="VALUE"
                    onChange={(e) => {
                      const next = [...envVars];
                      next[i].value = e.target.value;
                      setEnvVars(next);
                    }}
                    className="flex-1 px-3 py-1.5 bg-[#16171d] border border-[#26282e] rounded-lg text-white focus:outline-none"
                  />
                  <button
                    onClick={() => {
                      const next = [...envVars];
                      next[i].secret = !next[i].secret;
                      setEnvVars(next);
                    }}
                    title={env.secret ? 'Gizliliği Kaldır' : 'Gizle'}
                    className="p-1.5 text-[#8e9192] hover:text-white"
                  >
                    {env.secret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => handleRemoveEnv(i)}
                    className="p-1.5 text-[#8e9192] hover:text-rose-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Deployment Terminal & Execution Card */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="bg-[#121318] border border-[#26282e] rounded-2xl p-6 space-y-5 shadow-2xl">
            <div>
              <h2 className="text-sm font-bold text-white font-mono">Dağıtım Özeti</h2>
              <p className="text-xs text-[#8e9192] mt-0.5">
                Konfigürasyonu onaylayın ve konteyneri tek tıkla çalıştırın.
              </p>
            </div>

            <div className="bg-[#0d0e13] p-4 rounded-xl border border-[#1e1f25] space-y-2 text-xs font-mono text-[#8e9192]">
              <div className="flex justify-between">
                <span>Servis:</span>
                <span className="text-white font-medium">{serviceName}</span>
              </div>
              <div className="flex justify-between">
                <span>Runtime:</span>
                <span className="text-emerald-400 font-medium">{selectedRepo.runtime}</span>
              </div>
              <div className="flex justify-between">
                <span>Alan Adı:</span>
                <span className="text-blue-400 font-medium">{customDomain}</span>
              </div>
              <div className="flex justify-between">
                <span>Ağ Alt Yapısı:</span>
                <span className="text-slate-300">akson-bridge (Traefik v3)</span>
              </div>
              <div className="flex justify-between">
                <span>SSL Durumu:</span>
                <span className="text-emerald-400 font-medium">Let's Encrypt (Otomatik)</span>
              </div>
            </div>

            {/* Launch Button */}
            {!isDeployed ? (
              <button
                disabled={isDeploying}
                onClick={handleStartDeploy}
                className={`w-full py-3 rounded-xl font-semibold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-95 ${
                  isDeploying
                    ? 'bg-blue-600/50 text-blue-200 cursor-not-allowed'
                    : 'bg-white hover:bg-slate-200 text-black'
                }`}
              >
                {isDeploying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Dağıtılıyor ({deployStep}/4 Adım)...</span>
                  </>
                ) : (
                  <>
                    <Rocket className="w-4 h-4 stroke-[2.5]" />
                    <span>Tek Tıkla Yayına Al</span>
                  </>
                )}
              </button>
            ) : (
              <div className="space-y-3">
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-mono flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Servis başarıyla yayına alındı!</span>
                </div>
                <button
                  onClick={onNavigateDashboard}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition cursor-pointer"
                >
                  Kontrol Paneline Dön ve İncele
                </button>
              </div>
            )}

            {/* Live Terminal Build Output */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-[#8e9192] flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-blue-400" />
                  Canlı Derleme Çıktısı (Build Output)
                </span>
                {isDeploying && (
                  <span className="text-emerald-400 animate-pulse">stdout: Dinleniyor</span>
                )}
              </div>

              <div className="bg-[#08090d] rounded-xl p-3 border border-[#1f2129] font-mono text-[11px] leading-relaxed text-[#c4c7c8] space-y-1 h-52 overflow-y-auto select-text shadow-inner">
                {deployLogs.length === 0 ? (
                  <div className="text-[#8e9192] italic pt-4 text-center">
                    Dağıtımı başlattığınızda derleme logları burada canlı akacaktır.
                  </div>
                ) : (
                  deployLogs.map((log, index) => (
                    <div
                      key={index}
                      className={
                        log.includes('başarıyla')
                          ? 'text-emerald-400 font-semibold'
                          : log.includes('FROM') || log.includes('RUN')
                          ? 'text-blue-300'
                          : 'text-slate-300'
                      }
                    >
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
