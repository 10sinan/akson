import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { wiseSpring } from '../../utils/motion';
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
} from 'lucide-react';
import type { ContainerItem } from '../../types/container';
import { PipelinePathStepper } from '../deploy/PipelinePathStepper';

interface DeployViewProps {
  onDeploySuccess: (container: ContainerItem) => void;
  onNavigateDashboard: () => void;
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

export const DeployView: React.FC<DeployViewProps> = ({
  onDeploySuccess,
  onNavigateDashboard,
}) => {
  // Stepper state
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isDeploying, setIsDeploying] = useState<boolean>(false);
  const [deployLogs, setDeployLogs] = useState<string[]>([]);
  const [isDeployed, setIsDeployed] = useState<boolean>(false);

  // Form Configurations
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

  // Live Animated Deployment Flow
  const handleStartDeploy = () => {
    soundManager.playSuccess();
    setIsDeploying(true);
    setCurrentStep(1);
    setDeployLogs([
      `[akson-engine] Dağıtım işlemi başlatıldı: ${serviceName}`,
      `[1/5: image] Docker Hub'dan imaj doğrulanıyor: ${customImage}...`,
    ]);

    // Step 2: Port & ENV
    setTimeout(() => {
      soundManager.playClick();
      setCurrentStep(2);
      setDeployLogs((prev) => [
        ...prev,
        `[1/5: image] İmaj katmanları yerel önbellekte doğrulandı (sha256:d25907...).`,
        `[2/5: config] Portlar bağlanıyor (${hostPort}:${containerPort}) ve ${envVars.length} ortam değişkeni enjekte ediliyor...`,
      ]);
    }, 1100);

    // Step 3: Network & Proxy
    setTimeout(() => {
      soundManager.playClick();
      setCurrentStep(3);
      setDeployLogs((prev) => [
        ...prev,
        `[2/5: config] Ortam değişkenleri şifrelenip konteyner manifestine yazıldı.`,
        `[3/5: network] '${selectedNetwork}' izole köprü ağına bağlanılıyor ve Traefik v3 HTTP/HTTPS rotası oluşturuluyor: ${customDomain}...`,
      ]);
    }, 2200);

    // Step 4: Cgroup Limits
    setTimeout(() => {
      soundManager.playClick();
      setCurrentStep(4);
      setDeployLogs((prev) => [
        ...prev,
        `[3/5: network] Traefik ACME sertifika sağlayıcısına TLS SNI kuralı tanımlandı.`,
        `[4/5: cgroup] Linux çekirdek kısıtlamaları uygulanıyor: RAM ${ramLimitMb} MB, CPU ${cpuLimitCore} vCPU...`,
      ]);
    }, 3300);

    // Step 5: Start & Verify
    setTimeout(() => {
      soundManager.playClick();
      setCurrentStep(5);
      setDeployLogs((prev) => [
        ...prev,
        `[4/5: cgroup] cgroups v2 bellek ve CPU kısıtlamaları kernel tarafından onaylandı.`,
        `[5/5: health] Konteyner başlatılıyor ve HTTP healthcheck doğrulanıyor...`,
      ]);
    }, 4100);

    // Complete
    setTimeout(() => {
      soundManager.playSuccess();
      setIsDeploying(false);
      setIsDeployed(true);
      setDeployLogs((prev) => [
        ...prev,
        `[5/5: health] HTTP 200 OK yanıtı alındı! Servis hazır.`,
        `🎉 [akson-engine] '${serviceName}' başarıyla canlıya alındı!`,
      ]);

      const [imgName, tagPart] = customImage.split(':');
      const newContainer: ContainerItem = {
        id: `c-new-${Date.now().toString().slice(-6)}`,
        name: serviceName,
        subtitle: `${imgName}:${tagPart || 'latest'} • ${customDomain}`,
        status: 'running',
        statusText: 'Çalışıyor',
        uptime: 'Az önce',
        cpuPercent: 0.8,
        memoryUsageMb: Math.round(ramLimitMb * 0.15),
        memoryLimitMb: ramLimitMb,
        image: imgName,
        tag: tagPart || 'latest',
        category: (selectedTemplate === 'nginx' ? 'service' : selectedTemplate === 'redis' || selectedTemplate === 'postgres' ? 'database' : 'core'),
        ports: [{ hostPort, containerPort, protocol: 'tcp' }],
        network: selectedNetwork,
        ipAddress: `172.20.0.${Math.floor(Math.random() * 200) + 10}`,
        traefikRoute: customDomain,
        restartCount: 0,
        logs: [
          `[${serviceName}] Servis başarıyla ayağa kaldırıldı: http://${customDomain}`,
          `[${serviceName}] Traefik v3 ters vekil aktif (port: ${hostPort})`,
          `[${serviceName}] Canlı cgroup izlemesi devrede`,
        ],
        env: envVars.filter((e) => e.key.trim() !== ''),
      };

      setTimeout(() => {
        onDeploySuccess(newContainer);
      }, 1400);
    }, 4800);
  };

  return (
    <div className="flex flex-col flex-1 space-y-6">
      {/* 1. ÜST GÖRSEL DAĞITIM TÜNELİ (PIPELINE PATH STEPPER) */}
      <PipelinePathStepper
        currentStep={currentStep}
        isDeploying={isDeploying}
        isDeployed={isDeployed}
        onSelectStep={(step) => {
          if (!isDeploying) setCurrentStep(step);
        }}
        onDeploy={handleStartDeploy}
        onNavigateDashboard={onNavigateDashboard}
      />

      {/* 2. ADIM KONFİGÜRASYON FORMU & CANLI ETKİLEŞİM */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (7 cols): Step Configuration Panel */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="bg-[#0a0a0a] border border-[#262626] rounded-2xl p-6 space-y-6 shadow-sm">
            {/* Step 1: Image & Source */}
            {currentStep === 1 && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={wiseSpring}
                className="space-y-4 text-xs font-sans"
              >
                <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-white" />
                    <h2 className="text-xs font-bold text-white uppercase tracking-wider font-sans">
                      1. Adım: Docker İmajı & Şablon Seçimi
                    </h2>
                  </div>
                  <span className="text-[10px] text-zinc-300 bg-white/5 px-2 py-0.5 rounded border border-[#262626] font-mono">
                    Docker Registry
                  </span>
                </div>

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
                        <span className="text-[10px] text-zinc-400 font-mono">:{tpl.tag}</span>
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
                transition={wiseSpring}
                className="space-y-4 text-xs font-sans"
              >
                <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-white" />
                    <h2 className="text-xs font-bold text-white uppercase tracking-wider font-sans">
                      2. Adım: Port & Ortam Değişkenleri (ENV)
                    </h2>
                  </div>
                  <span className="text-[10px] text-zinc-300 bg-white/5 px-2 py-0.5 rounded border border-[#262626] font-mono">
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
                transition={wiseSpring}
                className="space-y-4 text-xs font-sans"
              >
                <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-white" />
                    <h2 className="text-xs font-bold text-white uppercase tracking-wider font-sans">
                      3. Adım: Ağ Köprüsü & Traefik SSL Rotalama
                    </h2>
                  </div>
                  <span className="text-[10px] text-zinc-300 bg-white/5 px-2 py-0.5 rounded border border-[#262626] font-mono">
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
                transition={wiseSpring}
                className="space-y-4 text-xs font-sans"
              >
                <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-white" />
                    <h2 className="text-xs font-bold text-white uppercase tracking-wider font-sans">
                      4. Adım: Donanım Sınırları & Cgroup
                    </h2>
                  </div>
                  <span className="text-[10px] text-zinc-300 bg-white/5 px-2 py-0.5 rounded border border-[#262626] font-mono">
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
                transition={wiseSpring}
                className="space-y-4 text-xs font-sans"
              >
                <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
                  <div className="flex items-center gap-2">
                    <Rocket className="w-4 h-4 text-white" />
                    <h2 className="text-xs font-bold text-white uppercase tracking-wider font-sans">
                      5. Adım: Dağıtım Özeti & Onay
                    </h2>
                  </div>
                  <span className="text-[10px] text-zinc-300 bg-white/5 px-2 py-0.5 rounded border border-[#262626] font-mono">
                    Hazır
                  </span>
                </div>

                <div className="bg-[#121212] p-4 rounded-xl border border-[#262626] divide-y divide-[#262626]">
                  <div className="flex justify-between py-2">
                    <span className="text-zinc-400 font-sans">Servis Adı</span>
                    <span className="text-white font-semibold font-mono">{serviceName}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-zinc-400 font-sans">Docker İmajı</span>
                    <span className="text-white font-mono">{customImage}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-zinc-400 font-sans">Port Yönlendirmesi</span>
                    <span className="text-zinc-300 font-mono">{hostPort} ➔ {containerPort}</span>
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
                  disabled={isDeploying || isDeployed}
                  onClick={handleStartDeploy}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-sans font-bold transition cursor-pointer shadow-md active:scale-95 disabled:opacity-50"
                >
                  <Rocket className="w-3.5 h-3.5" />
                  <span>Dağıtımı Başlat</span>
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
                <span className={`w-1.5 h-1.5 rounded-full ${isDeploying ? 'bg-white animate-pulse' : 'bg-zinc-600'}`} />
                {isDeploying ? 'Akış Aktif' : 'Docker SDK Hazır'}
              </span>
            </div>

            <p className="text-[11px] text-zinc-400 font-sans">
              Yukarıdaki görsel dağıtım tünelinden işlem başlatıldığında Docker Engine SDK çıktıları bu konsola anlık olarak yansıtılır.
            </p>

            <div className="h-[340px] overflow-y-auto space-y-1.5 text-[11px] text-zinc-300 pr-1 bg-[#000000] p-3 rounded-xl border border-[#262626] font-mono">
              {deployLogs.length === 0 ? (
                <div className="text-zinc-600 italic pt-24 text-center text-xs font-sans">
                  "Canlıya Dağıt" butonuna basıldığında tünel istasyonlarının çıktıları burada akacaktır.
                </div>
              ) : (
                deployLogs.map((log, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`leading-relaxed ${
                      log.includes('🎉')
                        ? 'text-white font-bold'
                        : log.includes('ERR')
                        ? 'text-zinc-400 underline font-semibold'
                        : 'text-zinc-300'
                    }`}
                  >
                    {log}
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
