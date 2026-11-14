import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { snappySpring } from '../../utils/motion';
import { soundManager } from '../../utils/sound';
import {
  Rocket,
  Globe,
  Terminal,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  ArrowRight,
  Sliders,
  Cpu,
  Layers,
  GitBranch,
  GitFork,
  Code2,
  RotateCcw,
} from 'lucide-react';
import type { ContainerItem } from '../../types/container';
import { PipelinePathStepper } from '../deploy/PipelinePathStepper';
import { api, mapApiContainerToItem } from '../../api/client';

interface DeployViewProps {
  onDeploySuccess: (container: ContainerItem) => void;
  onNavigateDashboard: () => void;
  isLiveBackend: boolean;
}

interface TemplateImage {
  id: string;
  name: string;
  image: string;
  tag: string;
  defaultPort: number;
  category: 'service' | 'database' | 'core' | 'worker';
  desc: string;
}

const TEMPLATE_IMAGES: TemplateImage[] = [
  {
    id: 'nginx',
    name: 'web-frontend',
    image: 'nginx',
    tag: 'alpine',
    defaultPort: 80,
    category: 'service',
    desc: 'Hafif ve yüksek performanslı Nginx web sunucusu',
  },
  {
    id: 'redis',
    name: 'cache-redis',
    image: 'redis',
    tag: '7-alpine',
    defaultPort: 6379,
    category: 'database',
    desc: 'Ultra hızlı bellek içi anahtar-değer önbelleği',
  },
  {
    id: 'postgres',
    name: 'db-postgres',
    image: 'postgres',
    tag: '16-alpine',
    defaultPort: 5432,
    category: 'database',
    desc: 'Güçlü ve güvenilir ilişkisel SQL veritabanı',
  },
  {
    id: 'node',
    name: 'api-service',
    image: 'node',
    tag: '20-alpine',
    defaultPort: 3000,
    category: 'core',
    desc: 'Modern JavaScript/TypeScript REST mikroservisi',
  },
];

const getTemplateCategoryBadge = (category: string) => {
  switch (category) {
    case 'service':
      return 'bg-zinc-300/10 text-zinc-300 border-white/20';
    case 'database':
      return 'bg-zinc-400/10 text-zinc-400 border-white/20';
    case 'core':
      return 'bg-zinc-300/10 text-zinc-300 border-white/20';
    case 'worker':
    default:
      return 'bg-zinc-100/10 text-zinc-100 border-white/20';
  }
};

export const DeployView: React.FC<DeployViewProps> = ({
  onDeploySuccess,
  onNavigateDashboard,
  isLiveBackend,
}) => {
  // Stepper state
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isDeploying, setIsDeploying] = useState<boolean>(false);
  const [deployLogs, setDeployLogs] = useState<string[]>([]);
  const [isDeployed, setIsDeployed] = useState<boolean>(false);

  // Form Configurations
  const [deploySource, setDeploySource] = useState<'template' | 'git'>('template');
  const [gitUrl, setGitUrl] = useState<string>('');
  const [gitBranch, setGitBranch] = useState<string>('main');
  const [dockerfilePath, setDockerfilePath] = useState<string>('Dockerfile');

  const [selectedTemplate, setSelectedTemplate] = useState<string>('nginx');
  const [customImage, setCustomImage] = useState<string>('nginx:alpine');
  const [serviceName, setServiceName] = useState<string>('web-frontend');
  const [hostPort, setHostPort] = useState<number>(8080);
  const [containerPort, setContainerPort] = useState<number>(80);
  const [customDomain, setCustomDomain] = useState<string>('web-frontend.localhost');
  const [selectedNetwork, setSelectedNetwork] = useState<string>('akson-bridge');
  const [ramLimitMb, setRamLimitMb] = useState<number>(256);
  const [cpuLimitCore, setCpuLimitCore] = useState<number>(0.5);
  const [envVars, setEnvVars] = useState<Array<{ key: string; value: string; secret: boolean }>>([
    { key: 'ENV', value: 'production', secret: false },
    { key: 'PORT', value: '80', secret: false },
  ]);
  const [showSecrets, setShowSecrets] = useState<boolean>(false);

  // Timers of the demo-mode simulation; cleared when the view unmounts or a new deploy starts.
  const simTimersRef = useRef<number[]>([]);
  const clearSimTimers = () => {
    simTimersRef.current.forEach((t) => window.clearTimeout(t));
    simTimersRef.current = [];
  };
  const schedule = (fn: () => void, ms: number) => {
    simTimersRef.current.push(window.setTimeout(fn, ms));
  };
  useEffect(() => clearSimTimers, []);

  // After a finished deploy, go back to step 1 with the same form values so it can be deployed again.
  const handleResetDeploy = () => {
    soundManager.playClick();
    clearSimTimers();
    setIsDeployed(false);
    setCurrentStep(1);
    setDeployLogs([]);
  };

  const handleGitUrlChange = (url: string) => {
    setGitUrl(url);
    const cleaned = url.trim().replace(/\.git$/, '');
    const parts = cleaned.split('/');
    const repoName = parts[parts.length - 1];
    if (repoName) {
      const sanitized = repoName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
      setServiceName(sanitized);
      setCustomDomain(`${sanitized}.localhost`);
    }
  };

  const handleSelectTemplate = (tpl: TemplateImage) => {
    soundManager.playClick();
    setSelectedTemplate(tpl.id);
    setCustomImage(`${tpl.image}:${tpl.tag}`);
    setServiceName(tpl.name);
    setContainerPort(tpl.defaultPort);
    setHostPort(tpl.defaultPort === 80 ? 8080 : tpl.defaultPort + 1000);
    setCustomDomain(`${tpl.name}.localhost`);
  };

  const handleAddEnv = () => {
    soundManager.playClick();
    setEnvVars((prev) => [...prev, { key: '', value: '', secret: false }]);
  };

  const handleRemoveEnv = (index: number) => {
    soundManager.playPop();
    setEnvVars((prev) => prev.filter((_, i) => i !== index));
  };

  // Demo mode only: no backend is reachable, so nothing is really deployed. The steps below just show the flow.
  const runSimulatedDeploy = () => {
    setDeployLogs((prev) => [...prev, '[demo] Backend bağlı değil, gerçek dağıtım yapılmıyor.']);

    [2, 3, 4, 5].forEach((step, i) => {
      schedule(() => {
        soundManager.playClick();
        setCurrentStep(step);
      }, 600 * (i + 1));
    });

    schedule(() => {
      setIsDeploying(false);
      setIsDeployed(true);
      setDeployLogs((prev) => [...prev, `[demo] '${serviceName}' yalnızca bu ekranda oluşturuldu.`]);

      const [imgName, tagPart] = deploySource === 'git'
        ? [`akson/${serviceName}`, 'latest']
        : customImage.split(':');

      const newContainer: ContainerItem = {
        id: `demo-${Date.now().toString().slice(-6)}`,
        name: serviceName,
        subtitle: `${imgName}:${tagPart || 'latest'}`,
        status: 'running',
        statusText: 'Çalışıyor',
        uptime: 'Demo',
        cpuPercent: 0,
        memoryUsageMb: 0,
        memoryLimitMb: ramLimitMb,
        image: imgName,
        tag: tagPart || 'latest',
        category: (selectedTemplate === 'nginx' ? 'service' : selectedTemplate === 'redis' || selectedTemplate === 'postgres' ? 'database' : 'core'),
        ports: [{ hostPort, containerPort, protocol: 'tcp' }],
        network: selectedNetwork,
        ipAddress: '',
        traefikRoute: customDomain,
        restartCount: 0,
        logs: [`[demo] ${serviceName} yalnızca arayüzde var, gerçek bir konteyner değil.`],
        env: envVars.filter((e) => e.key.trim() !== ''),
      };

      onDeploySuccess(newContainer);
    }, 3000);
  };

  // Live Animated & Real API Deployment Flow
  const handleStartDeploy = async () => {
    // Guard against double clicks: both deploy buttons call this.
    if (isDeploying) return;
    if (isDeployed) {
      handleResetDeploy();
      return;
    }
    clearSimTimers();
    soundManager.playSuccess();
    setIsDeploying(true);
    setCurrentStep(1);
    setDeployLogs([
      `[akson-engine] Dağıtım işlemi başlatıldı: ${serviceName}`,
      deploySource === 'git'
        ? `[1/5: git & build] '${gitUrl}' (${gitBranch}) klonlanıyor ve Dockerfile derleniyor...`
        : `[1/5: image] Docker Hub'dan imaj doğrulanıyor: ${customImage}...`,
    ]);

    const envMap: Record<string, string> = {};
    envVars.forEach((e) => {
      if (e.key.trim()) {
        envMap[e.key.trim()] = e.value;
      }
    });

    const deployPayload = {
      name: serviceName.trim(),
      image: deploySource === 'git' ? undefined : customImage.trim(),
      git_url: deploySource === 'git' ? gitUrl.trim() : undefined,
      git_branch: deploySource === 'git' ? gitBranch.trim() : undefined,
      dockerfile: deploySource === 'git' ? dockerfilePath.trim() : undefined,
      ports: [
        {
          private_port: containerPort,
          public_port: hostPort,
          type: 'tcp',
        },
      ],
      env: envMap,
      memory_limit_mb: ramLimitMb,
      cpu_limit: cpuLimitCore,
      network_name: selectedNetwork,
      restart_policy: 'unless-stopped',
      domain: customDomain.trim(),
      port: containerPort,
    };

    try {
      setCurrentStep(2);
      setDeployLogs((prev) => [
        ...prev,
        `[2/5: config] Port (${hostPort}:${containerPort}) ve ${Object.keys(envMap).length} ortam değişkeni yapılandırılıyor...`,
      ]);

      const res = await api.deployContainer(deployPayload);

      setCurrentStep(3);
      setDeployLogs((prev) => [
        ...prev,
        `[3/5: network] '${selectedNetwork}' ağına bağlandı ve Traefik v3 rotası tanımlandı: ${customDomain}`,
        ...(res.logs || []).map((l) => `[docker] ${l}`),
      ]);

      setCurrentStep(4);
      setDeployLogs((prev) => [
        ...prev,
        `[4/5: cgroup] cgroup limitleri uygulandı: RAM ${ramLimitMb} MB, CPU ${cpuLimitCore} vCPU`,
      ]);

      setCurrentStep(5);
      soundManager.playSuccess();
      setIsDeploying(false);
      setIsDeployed(true);
      setDeployLogs((prev) => [
        ...prev,
        `[5/5: health] Konteyner çalışıyor (ID: ${res.container.id.substring(0, 12)})!`,
        `'${serviceName}' başarıyla dağıtıldı.`,
      ]);

      // Report right away: the container really exists now, even if the user leaves this tab.
      onDeploySuccess(mapApiContainerToItem(res.container));
    } catch (err) {
      if (!isLiveBackend) {
        // Demo mode: no backend reachable, so play the interactive simulation instead.
        runSimulatedDeploy();
        return;
      }
      // Live backend returned an error (clone/build/pull/port failure, timeout): surface it, never fake success.
      const message = err instanceof Error ? err.message : String(err);
      setIsDeploying(false);
      setIsDeployed(false);
      setDeployLogs((prev) => [
        ...prev,
        `[ERR] Dağıtım başarısız (deploy failed): ${message}`,
      ]);
    }
  };

  return (
    <div className="flex flex-col flex-1 space-y-5">
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#262626]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white tracking-tight font-sans">
              Yeni Servis Dağıtımı
            </h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1 font-sans">
            İmajı, portları, alan adını ve kaynak sınırlarını seçip servisi başlatın.
          </p>
        </div>

      </div>

      {/* 1. ÜST GÖRSEL DAĞITIM TÜNELİ (PIPELINE PATH STEPPER) */}
      <PipelinePathStepper
        currentStep={currentStep}
        isDeploying={isDeploying}
        isDeployed={isDeployed}
        onSelectStep={(step) => {
          if (!isDeploying) setCurrentStep(step);
        }}
        onDeploy={handleStartDeploy}
        onReset={handleResetDeploy}
        onNavigateDashboard={onNavigateDashboard}
      />

      {/* 2. ADIM KONFİGÜRASYON FORMU & CANLI ETKİLEŞİM */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column (7 cols): Step Configuration Panel */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          <div className="bg-[#0a0a0a] border border-[#262626] rounded-2xl p-5 space-y-5 shadow-sm">
            {/* Step 1: Image & Source */}
            {currentStep === 1 && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={snappySpring}
                className="space-y-4 text-xs font-sans"
              >
                <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-zinc-300" />
                    <h2 className="text-xs font-bold text-white uppercase tracking-wider font-sans">
                      1. Adım: Dağıtım Kaynağı & İmaj Seçimi
                    </h2>
                  </div>
                  <span className="text-[10px] text-zinc-300 bg-zinc-300/10 px-2 py-0.5 rounded border border-white/20 font-mono">
                    {deploySource === 'git' ? 'Git Engine' : 'Docker Registry'}
                  </span>
                </div>

                {/* Source Mode Toggle */}
                <div className="flex items-center gap-2 p-1 bg-[#121212] border border-[#262626] rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      soundManager.playClick();
                      setDeploySource('template');
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      deploySource === 'template'
                        ? 'bg-[#1f1f1f] text-white shadow-sm border border-white/10'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5 text-zinc-300" />
                    <span>Hazır Şablon & İmaj</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundManager.playClick();
                      setDeploySource('git');
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      deploySource === 'git'
                        ? 'bg-[#1f1f1f] text-white shadow-sm border border-white/10'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <GitBranch className="w-3.5 h-3.5 text-zinc-500" />
                    <span>GitHub / Git Reposu</span>
                  </button>
                </div>

                {deploySource === 'template' ? (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {TEMPLATE_IMAGES.map((tpl) => (
                        <div
                          key={tpl.id}
                          onClick={() => handleSelectTemplate(tpl)}
                          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                            selectedTemplate === tpl.id
                              ? 'bg-[#171717] border-white text-white shadow-md ring-1 ring-white/20'
                              : 'bg-[#121212] border-[#262626] text-zinc-400 hover:border-zinc-500 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center justify-between font-bold">
                            <span className="text-white font-sans">{tpl.name}</span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono border ${getTemplateCategoryBadge(tpl.category)}`}>
                              :{tpl.tag}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-400 mt-1 line-clamp-1 font-sans">
                            {tpl.desc}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-1.5 pt-2">
                      <label className="text-[11px] text-zinc-400 font-sans">Özel Docker İmajı ve Sürüm Etiketi:</label>
                      <input
                        type="text"
                        value={customImage}
                        onChange={(e) => setCustomImage(e.target.value)}
                        placeholder="örn: nginx:alpine, redis:7, python:3.11"
                        className="w-full bg-[#121212] border border-[#262626] rounded-xl px-3.5 py-2 text-white text-xs font-mono focus:outline-none focus:border-white"
                      />
                    </div>
                  </>
                ) : (
                  <div className="space-y-3 pt-1">
                    <div className="space-y-1.5">
                      <label className="text-[11px] text-zinc-400 font-sans flex items-center justify-between">
                        <span>Git Repository URL:</span>
                        <span className="text-[10px] text-zinc-500">HTTPS veya Git URL</span>
                      </label>
                      <div className="relative">
                        <GitFork className="w-4 h-4 text-zinc-500 absolute left-3.5 top-2.5" />
                        <input
                          type="text"
                          value={gitUrl}
                          onChange={(e) => handleGitUrlChange(e.target.value)}
                          placeholder="https://github.com/kullanici/proje-adi.git"
                          className="w-full bg-[#121212] border border-[#262626] rounded-xl pl-10 pr-3.5 py-2 text-white text-xs font-mono focus:outline-none focus:border-white/20"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[11px] text-zinc-400 font-sans flex items-center gap-1.5">
                          <GitBranch className="w-3.5 h-3.5 text-zinc-500" />
                          <span>Branch (Dal):</span>
                        </label>
                        <input
                          type="text"
                          value={gitBranch}
                          onChange={(e) => setGitBranch(e.target.value)}
                          placeholder="main"
                          className="w-full bg-[#121212] border border-[#262626] rounded-xl px-3.5 py-2 text-white text-xs font-mono focus:outline-none focus:border-white"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] text-zinc-400 font-sans flex items-center gap-1.5">
                          <Code2 className="w-3.5 h-3.5 text-zinc-300" />
                          <span>Dockerfile Konumu:</span>
                        </label>
                        <input
                          type="text"
                          value={dockerfilePath}
                          onChange={(e) => setDockerfilePath(e.target.value)}
                          placeholder="Dockerfile"
                          className="w-full bg-[#121212] border border-[#262626] rounded-xl px-3.5 py-2 text-white text-xs font-mono focus:outline-none focus:border-white"
                        />
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-zinc-500/5 border border-white/20 text-[11px] text-zinc-300 space-y-1">
                      <div className="font-semibold text-zinc-500 flex items-center gap-1.5">
                        <span>Git ile derleme:</span>
                      </div>
                      <p className="text-zinc-400 leading-relaxed">
                        Akson bu repoyu saniyeler içinde klonlar, projenizdeki <span className="text-white font-mono">{dockerfilePath}</span> dosyasını Docker Engine üzerinde derler ve izole köprü ağına alarak yayına başlatır.
                      </p>
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[11px] text-zinc-400 font-sans">Konteyner Servis Adı:</label>
                  <input
                    type="text"
                    value={serviceName}
                    onChange={(e) => setServiceName(e.target.value)}
                    placeholder="örn: my-web-app"
                    className="w-full bg-[#121212] border border-[#262626] rounded-xl px-3.5 py-2 text-white text-xs font-mono focus:outline-none focus:border-white"
                  />
                </div>
              </motion.div>
            )}

            {/* Step 2: Port & ENV */}
            {currentStep === 2 && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={snappySpring}
                className="space-y-4 text-xs font-sans"
              >
                <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-zinc-400" />
                    <h2 className="text-xs font-bold text-white uppercase tracking-wider font-sans">
                      2. Adım: Port & Ortam Değişkenleri (ENV)
                    </h2>
                  </div>
                  <span className="text-[10px] text-zinc-400 bg-zinc-400/10 px-2 py-0.5 rounded border border-white/20 font-mono">
                    Network & Config
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-zinc-400 font-sans">Dış Port (Host Port):</label>
                    <input
                      type="number"
                      value={hostPort}
                      onChange={(e) => setHostPort(Number(e.target.value))}
                      className="w-full bg-[#121212] border border-[#262626] rounded-xl px-3.5 py-2 text-white text-xs font-mono focus:outline-none focus:border-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-zinc-400 font-sans">İç Port (Container Port):</label>
                    <input
                      type="number"
                      value={containerPort}
                      onChange={(e) => setContainerPort(Number(e.target.value))}
                      className="w-full bg-[#121212] border border-[#262626] rounded-xl px-3.5 py-2 text-white text-xs font-mono focus:outline-none focus:border-white"
                    />
                  </div>
                </div>

                {/* Env Vars List */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-zinc-400 font-sans">Ortam Değişkenleri ({envVars.length}):</span>
                    <button
                      type="button"
                      onClick={() => setShowSecrets(!showSecrets)}
                      className="text-[11px] text-zinc-400 hover:text-white flex items-center gap-1 font-sans cursor-pointer"
                    >
                      {showSecrets ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{showSecrets ? 'Gizle' : 'Göster'}</span>
                    </button>
                  </div>

                  {envVars.map((env, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="ANAHTAR"
                        value={env.key}
                        onChange={(e) => {
                          const updated = [...envVars];
                          updated[idx].key = e.target.value;
                          setEnvVars(updated);
                        }}
                        className="flex-1 bg-[#121212] border border-[#262626] rounded-lg px-2.5 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-white"
                      />
                      <input
                        type={env.secret && !showSecrets ? 'password' : 'text'}
                        placeholder="DEĞER"
                        value={env.value}
                        onChange={(e) => {
                          const updated = [...envVars];
                          updated[idx].value = e.target.value;
                          setEnvVars(updated);
                        }}
                        className="flex-1 bg-[#121212] border border-[#262626] rounded-lg px-2.5 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-white"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveEnv(idx)}
                        className="p-1.5 text-zinc-500 hover:text-white transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={handleAddEnv}
                    className="inline-flex items-center gap-1 text-[11px] text-zinc-300 hover:text-white font-medium pt-1 font-sans cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Değişken Ekle
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Network & Traefik */}
            {currentStep === 3 && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={snappySpring}
                className="space-y-4 text-xs font-sans"
              >
                <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-zinc-100" />
                    <h2 className="text-xs font-bold text-white uppercase tracking-wider font-sans">
                      3. Adım: Ağ Köprüsü & Traefik SSL Rotalama
                    </h2>
                  </div>
                  <span className="text-[10px] text-zinc-100 bg-zinc-100/10 px-2 py-0.5 rounded border border-white/20 font-mono">
                    Traefik v3 SSL
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] text-zinc-400 font-sans">Traefik Web Router Domaini:</label>
                  <input
                    type="text"
                    value={customDomain}
                    onChange={(e) => setCustomDomain(e.target.value)}
                    placeholder="örn: api.localhost veya app.internal"
                    className="w-full bg-[#121212] border border-[#262626] rounded-xl px-3.5 py-2 text-white text-xs font-mono focus:outline-none focus:border-white"
                  />
                  <p className="text-[10px] text-zinc-500 font-mono">Host(`{customDomain}`) kuralı otomatik Traefik HTTP/HTTPS dinleyicisine eklenecektir.</p>
                </div>

                <div className="space-y-1.5 pt-2">
                  <label className="text-[11px] text-zinc-400 font-sans">Docker Ağı:</label>
                  <select
                    value={selectedNetwork}
                    onChange={(e) => setSelectedNetwork(e.target.value)}
                    className="w-full bg-[#121212] border border-[#262626] rounded-xl px-3.5 py-2 text-white text-xs font-mono focus:outline-none focus:border-white"
                  >
                    <option value="akson-bridge">akson-bridge (İzole Dahili Ağ)</option>
                    <option value="bridge">bridge (Varsayılan Docker Köprüsü)</option>
                    <option value="host">host (Doğrudan Host Ağı)</option>
                  </select>
                </div>
              </motion.div>
            )}

            {/* Step 4: Resources */}
            {currentStep === 4 && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={snappySpring}
                className="space-y-4 text-xs font-sans"
              >
                <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-zinc-300" />
                    <h2 className="text-xs font-bold text-white uppercase tracking-wider font-sans">
                      4. Adım: Donanım Sınırları & Cgroup
                    </h2>
                  </div>
                  <span className="text-[10px] text-zinc-300 bg-zinc-300/10 px-2 py-0.5 rounded border border-white/20 font-mono">
                    Cgroupv2
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-[11px] text-zinc-400 font-sans">Bellek Limiti (Hard RAM):</span>
                    <span className="text-white font-bold font-mono">{ramLimitMb} MB</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[128, 256, 512, 1024].map((mb) => (
                      <button
                        key={mb}
                        type="button"
                        onClick={() => setRamLimitMb(mb)}
                        className={`py-2 rounded-lg border text-center transition font-mono cursor-pointer ${
                          ramLimitMb === mb
                            ? 'bg-white text-black border-white font-bold'
                            : 'bg-[#121212] border-[#262626] text-zinc-400 hover:text-white'
                        }`}
                      >
                        {mb} MB
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <div className="flex justify-between">
                    <span className="text-[11px] text-zinc-400 font-sans">İşlemci Limiti (vCPU):</span>
                    <span className="text-white font-bold font-mono">{cpuLimitCore} Çekirdek</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[0.25, 0.5, 1.0, 2.0].map((core) => (
                      <button
                        key={core}
                        type="button"
                        onClick={() => setCpuLimitCore(core)}
                        className={`py-2 rounded-lg border text-center transition font-mono cursor-pointer ${
                          cpuLimitCore === core
                            ? 'bg-white text-black border-white font-bold'
                            : 'bg-[#121212] border-[#262626] text-zinc-400 hover:text-white'
                        }`}
                      >
                        {core} CPU
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 5: Summary */}
            {currentStep === 5 && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={snappySpring}
                className="space-y-4 text-xs font-sans"
              >
                <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
                  <div className="flex items-center gap-2">
                    <Rocket className="w-4 h-4 text-zinc-500" />
                    <h2 className="text-xs font-bold text-white uppercase tracking-wider font-sans">
                      5. Adım: Dağıtım Özeti & Onay
                    </h2>
                  </div>
                  <span className="text-[10px] text-zinc-500 bg-zinc-500/10 px-2 py-0.5 rounded border border-white/20 font-mono">
                    Hazır
                  </span>
                </div>

                <div className="bg-[#121212] p-4 rounded-xl border border-[#262626] divide-y divide-[#262626]">
                  <div className="flex justify-between py-2">
                    <span className="text-zinc-400 font-sans">Servis Adı</span>
                    <span className="text-white font-semibold font-mono">{serviceName}</span>
                  </div>
                  {deploySource === 'git' ? (
                    <>
                      <div className="flex justify-between py-2">
                        <span className="text-zinc-400 font-sans">Git Deposu</span>
                        <span className="text-zinc-500 font-mono truncate max-w-[260px]">{gitUrl || 'Belirtilmedi'}</span>
                      </div>
                      <div className="flex justify-between py-2">
                        <span className="text-zinc-400 font-sans">Dal / Dockerfile</span>
                        <span className="text-zinc-300 font-mono">{gitBranch} • {dockerfilePath}</span>
                      </div>
                      <div className="flex justify-between py-2">
                        <span className="text-zinc-400 font-sans">Hedef İmaj</span>
                        <span className="text-white font-mono">akson/{serviceName}:latest</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between py-2">
                      <span className="text-zinc-400 font-sans">Docker İmajı</span>
                      <span className="text-white font-mono">{customImage}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-2">
                    <span className="text-zinc-400 font-sans">Port Yönlendirmesi</span>
                    <span className="text-zinc-300 font-mono">{hostPort} → {containerPort}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-zinc-400 font-sans">Traefik Host Rotası</span>
                    <span className="text-white font-mono">{customDomain}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-zinc-400 font-sans">Kaynak Sınırı</span>
                    <span className="text-zinc-300 font-mono">{ramLimitMb} MB RAM, {cpuLimitCore} vCPU</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step Navigation Controls */}
            <div className="flex items-center justify-between pt-4 border-t border-[#262626]">
              <button
                type="button"
                disabled={currentStep === 1 || isDeploying}
                onClick={() => {
                  soundManager.playClick();
                  setCurrentStep((prev) => Math.max(1, prev - 1));
                }}
                className="px-3.5 py-1.5 rounded-xl bg-[#171717] hover:bg-zinc-800 text-white text-xs font-sans transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer border border-[#262626]"
              >
                Geri
              </button>

              {currentStep < 5 ? (
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playClick();
                    setCurrentStep((prev) => Math.min(5, prev + 1));
                  }}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-sans font-bold transition cursor-pointer shadow-md active:scale-95"
                >
                  <span>Sonraki Adım</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isDeploying}
                  onClick={isDeployed ? handleResetDeploy : handleStartDeploy}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-sans font-bold transition cursor-pointer shadow-md active:scale-95 disabled:opacity-50"
                >
                  {isDeployed ? <RotateCcw className="w-3.5 h-3.5" /> : <Rocket className="w-3.5 h-3.5" />}
                  <span>{isDeployed ? 'Yeni Dağıtım' : 'Dağıtımı Başlat'}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Live Terminal Stream */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* LIVE TERMINAL LOG STREAM */}
          <div className="bg-[#0a0a0a] border border-[#262626] rounded-2xl p-5 space-y-3 font-mono text-xs shadow-inner">
            <div className="flex items-center justify-between pb-2.5 border-b border-[#262626]">
              <div className="flex items-center gap-2 text-zinc-400">
                <Terminal className="w-4 h-4 text-white" />
                <span className="text-xs font-bold text-white uppercase tracking-wider font-sans">
                  Canlı Dağıtım Konsolu
                </span>
              </div>
              <span className="text-[10px] text-zinc-300 flex items-center gap-1.5 font-sans px-2.5 py-0.5 rounded-full bg-white/5 border border-[#262626]">
                <span className={`w-1.5 h-1.5 rounded-full ${isDeploying ? 'bg-zinc-100 animate-pulse' : 'bg-zinc-600'}`} />
                <span className={isDeploying ? 'text-zinc-100' : 'text-zinc-300'}>
                  {isDeploying ? 'Çalışıyor' : 'Hazır'}
                </span>
              </span>
            </div>

            <p className="text-[11px] text-zinc-400 font-sans">
              Dağıtım başlayınca adımlar ve Docker çıktıları burada görünür.
            </p>

            <div className="h-[340px] overflow-y-auto space-y-1.5 text-[11px] pr-1 bg-[#000000] p-3 rounded-xl border border-[#262626] font-mono">
              {deployLogs.length === 0 ? (
                <div className="text-zinc-600 italic pt-24 text-center text-xs font-sans">
                  Henüz çıktı yok.
                </div>
              ) : (
                deployLogs.map((log, idx) => {
                  const isSuccess = log.includes('başarıyla');
                  const isErr = log.includes('ERR') || log.includes('fail');
                  const isImageStep = log.includes('[1/5: image]');
                  const isConfigStep = log.includes('[2/5: config]');
                  const isNetworkStep = log.includes('[3/5: network]');
                  const isCgroupStep = log.includes('[4/5: cgroup]');
                  const isDeployStep = log.includes('[5/5: deploy]');

                  const colorClass = isSuccess
                    ? 'text-zinc-100 font-bold'
                    : isErr
                    ? 'text-zinc-500 underline font-semibold'
                    : isImageStep
                    ? 'text-zinc-300'
                    : isConfigStep
                    ? 'text-zinc-400'
                    : isNetworkStep
                    ? 'text-zinc-100'
                    : isCgroupStep
                    ? 'text-zinc-300'
                    : isDeployStep
                    ? 'text-zinc-500'
                    : 'text-zinc-300';

                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2 }}
                      className={`leading-relaxed ${colorClass}`}
                    >
                      {log}
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
