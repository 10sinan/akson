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
  Loader2,
  ArrowRight,
  Sparkles,
  CheckCircle2,
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
        `[2/5: config] Port eşlemesi yapılandırılıyor: ${hostPort} -> ${containerPort}/tcp`,
        `[2/5: config] ${envVars.filter((e) => e.key).length} ortam değişkeni güvenle enjekte edildi.`,
      ]);
    }, 1200);

    // Step 3: Network & Traefik
    setTimeout(() => {
      soundManager.playClick();
      setCurrentStep(3);
      setDeployLogs((prev) => [
        ...prev,
        `[3/5: network] '${selectedNetwork}' izole köprü ağına bağlanılıyor...`,
        `[3/5: network] Traefik ters vekil yönlendiricisi oluşturuldu: Host(\`${customDomain}\`)`,
        `[3/5: network] Otomatik TLS 1.3 sertifikası ve dahili DNS kaydı bağlandı.`,
      ]);
    }, 2400);

    // Step 4: Resources
    setTimeout(() => {
      soundManager.playClick();
      setCurrentStep(4);
      setDeployLogs((prev) => [
        ...prev,
        `[4/5: resources] cgroupv2 sınırları kilitlendi: RAM max ${ramLimitMb} MB, CPU ${cpuLimitCore} vCPU`,
        `[4/5: resources] Güvenlik profili ve OOM killer ayarları tamamlandı.`,
      ]);
    }, 3600);

    // Step 5: Live & Verify
    setTimeout(() => {
      soundManager.playSuccess();
      setCurrentStep(5);
      setDeployLogs((prev) => [
        ...prev,
        `[5/5: deploy] Konteyner başlatıldı (ID: c-${Date.now().toString(36)})`,
        `[5/5: deploy] Sağlık kontrolü (Healthcheck): HTTP 200 OK (1.4ms)`,
        `🎉 [akson-engine] Servis başarıyla canlıya alındı!`,
      ]);
      setIsDeploying(false);
      setIsDeployed(true);

      const [imageName, imageTag = 'latest'] = customImage.split(':');
      const newContainer: ContainerItem = {
        id: `c-${Date.now().toString(36)}`,
        name: serviceName,
        image: imageName,
        tag: imageTag,
        status: 'running',
        statusText: 'Çevrimiçi',
        subtitle: `${customImage} • Yeni Dağıtım`,
        category: (TEMPLATE_IMAGES.find((t) => t.id === selectedTemplate)?.category || 'service'),
        uptime: 'Az önce başlatıldı',
        cpuPercent: 0.8,
        memoryUsageMb: Math.round(ramLimitMb * 0.15),
        memoryLimitMb: ramLimitMb,
        ports: [{ hostPort, containerPort, protocol: 'tcp' }],
        traefikRoute: customDomain,
        network: selectedNetwork,
        ipAddress: '172.20.0.15',
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
        onSelectStep={(step) => {
          if (!isDeploying) setCurrentStep(step);
        }}
      />

      {/* 2. ADIM KONFİGÜRASYON FORMU & CANLI ETKİLEŞİM */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (7 cols): Step Configuration Panel */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="bg-[#121318] border border-[#26282e] rounded-2xl p-6 space-y-6 shadow-sm">
            {/* Step 1: Image & Source */}
            {currentStep === 1 && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={wiseSpring}
                className="space-y-4 font-mono text-xs"
              >
                <div className="flex items-center justify-between pb-3 border-b border-[#1e1f25]">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-400" />
                    <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                      1. Adım: Docker İmajı & Şablon Seçimi
                    </h2>
                  </div>
                  <span className="text-[10px] text-slate-300 bg-white/5 px-2 py-0.5 rounded border border-white/10">
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
                          ? 'bg-[#1a1c24] border-white/60 text-white shadow-md ring-1 ring-white/20'
                          : 'bg-[#0d0e13] border-[#26282e] text-[#8e9192] hover:border-white/20 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span className="text-white">{tpl.name}</span>
                        <span className="text-[10px] text-emerald-400 font-mono">:{tpl.tag}</span>
                      </div>
                      <p className="text-[11px] text-[#8e9192] mt-1 line-clamp-1 font-sans">
                        {tpl.desc}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="space-y-1.5 pt-2">
                  <label className="text-[11px] text-[#8e9192]">Özel Docker İmajı ve Sürüm Etiketi:</label>
                  <input
                    type="text"
                    value={customImage}
                    onChange={(e) => setCustomImage(e.target.value)}
                    placeholder="örn: nginx:alpine, redis:7, python:3.11"
                    className="w-full bg-[#0d0e13] border border-[#26282e] rounded-xl px-3.5 py-2 text-white text-xs font-mono focus:outline-none focus:border-white/60 focus:ring-1 focus:ring-white/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] text-[#8e9192]">Konteyner Servis Adı:</label>
                  <input
                    type="text"
                    value={serviceName}
                    onChange={(e) => setServiceName(e.target.value)}
                    placeholder="örn: my-web-app"
                    className="w-full bg-[#0d0e13] border border-[#26282e] rounded-xl px-3.5 py-2 text-white text-xs font-mono focus:outline-none focus:border-white/60 focus:ring-1 focus:ring-white/20"
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
                className="space-y-4 font-mono text-xs"
              >
                <div className="flex items-center justify-between pb-3 border-b border-[#1e1f25]">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-emerald-400" />
                    <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                      2. Adım: Port & Ortam Değişkenleri (ENV)
                    </h2>
                  </div>
                  <span className="text-[10px] text-slate-300 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                    Network & Config
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-[#8e9192]">Dış Port (Host Port):</label>
                    <input
                      type="number"
                      value={hostPort}
                      onChange={(e) => setHostPort(Number(e.target.value))}
                      className="w-full bg-[#0d0e13] border border-[#26282e] rounded-xl px-3.5 py-2 text-white text-xs font-mono focus:outline-none focus:border-white/60 focus:ring-1 focus:ring-white/20"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-[#8e9192]">İç Port (Container Port):</label>
                    <input
                      type="number"
                      value={containerPort}
                      onChange={(e) => setContainerPort(Number(e.target.value))}
                      className="w-full bg-[#0d0e13] border border-[#26282e] rounded-xl px-3.5 py-2 text-white text-xs font-mono focus:outline-none focus:border-white/60 focus:ring-1 focus:ring-white/20"
                    />
                  </div>
                </div>

                {/* Env Vars List */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[#8e9192]">Ortam Değişkenleri ({envVars.length}):</span>
                    <button
                      type="button"
                      onClick={() => setShowSecrets(!showSecrets)}
                      className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1"
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
                        className="flex-1 bg-[#0d0e13] border border-[#26282e] rounded-lg px-2.5 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-white/60 focus:ring-1 focus:ring-white/20"
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
                        className="flex-1 bg-[#0d0e13] border border-[#26282e] rounded-lg px-2.5 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-white/60 focus:ring-1 focus:ring-white/20"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveEnv(idx)}
                        className="p-1.5 text-zinc-500 hover:text-rose-400 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={handleAddEnv}
                    className="inline-flex items-center gap-1 text-[11px] text-slate-300 hover:text-white font-semibold pt-1"
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
                className="space-y-4 font-mono text-xs"
              >
                <div className="flex items-center justify-between pb-3 border-b border-[#1e1f25]">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-emerald-400" />
                    <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                      3. Adım: Ağ Köprüsü & Traefik SSL Rotalama
                    </h2>
                  </div>
                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Traefik v3 SSL
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] text-[#8e9192]">Traefik Web Router Domaini:</label>
                  <input
                    type="text"
                    value={customDomain}
                    onChange={(e) => setCustomDomain(e.target.value)}
                    placeholder="örn: api.localhost veya app.internal"
                    className="w-full bg-[#0d0e13] border border-[#26282e] rounded-xl px-3.5 py-2 text-white text-xs font-mono focus:outline-none focus:border-white/60 focus:ring-1 focus:ring-white/20"
                  />
                  <p className="text-[10px] text-[#8e9192]">Host(`{customDomain}`) kuralı otomatik Traefik HTTP/HTTPS dinleyicisine eklenecektir.</p>
                </div>

                <div className="space-y-1.5 pt-2">
                  <label className="text-[11px] text-[#8e9192]">Docker Ağı:</label>
                  <select
                    value={selectedNetwork}
                    onChange={(e) => setSelectedNetwork(e.target.value)}
                    className="w-full bg-[#0d0e13] border border-[#26282e] rounded-xl px-3.5 py-2 text-white text-xs font-mono focus:outline-none focus:border-white/60 focus:ring-1 focus:ring-white/20"
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
                className="space-y-4 font-mono text-xs"
              >
                <div className="flex items-center justify-between pb-3 border-b border-[#1e1f25]">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-amber-400" />
                    <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                      4. Adım: Donanım Sınırları & Cgroup
                    </h2>
                  </div>
                  <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    Cgroupv2
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-[11px] text-[#8e9192]">Bellek Limiti (Hard RAM):</span>
                    <span className="text-white font-bold">{ramLimitMb} MB</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[128, 256, 512, 1024].map((mb) => (
                      <button
                        key={mb}
                        type="button"
                        onClick={() => setRamLimitMb(mb)}
                        className={`py-2 rounded-lg border text-center transition ${
                          ramLimitMb === mb
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                            : 'bg-[#0d0e13] border-[#26282e] text-[#8e9192] hover:text-white'
                        }`}
                      >
                        {mb} MB
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <div className="flex justify-between">
                    <span className="text-[11px] text-[#8e9192]">İşlemci Limiti (vCPU):</span>
                    <span className="text-white font-bold">{cpuLimitCore} Çekirdek</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[0.25, 0.5, 1.0, 2.0].map((core) => (
                      <button
                        key={core}
                        type="button"
                        onClick={() => setCpuLimitCore(core)}
                        className={`py-2 rounded-lg border text-center transition ${
                          cpuLimitCore === core
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                            : 'bg-[#0d0e13] border-[#26282e] text-[#8e9192] hover:text-white'
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
                className="space-y-4 font-mono text-xs"
              >
                <div className="flex items-center justify-between pb-3 border-b border-[#1e1f25]">
                  <div className="flex items-center gap-2">
                    <Rocket className="w-4 h-4 text-emerald-400" />
                    <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                      5. Adım: Dağıtım Özeti & Canlı Onay
                    </h2>
                  </div>
                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Ready to Deploy
                  </span>
                </div>

                <div className="bg-[#0d0e13] p-3.5 rounded-xl border border-[#26282e] space-y-2">
                  <div className="flex justify-between">
                    <span className="text-[#8e9192]">Servis Adı:</span>
                    <span className="text-white font-bold">{serviceName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8e9192]">Docker İmajı:</span>
                    <span className="text-blue-400">{customImage}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8e9192]">Portlar:</span>
                    <span className="text-purple-300">{hostPort} ➔ {containerPort}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8e9192]">Traefik Rota:</span>
                    <span className="text-emerald-400">{customDomain}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8e9192]">Kaynak Sınırı:</span>
                    <span className="text-amber-300">{ramLimitMb} MB RAM, {cpuLimitCore} vCPU</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step Navigation Controls */}
            <div className="flex items-center justify-between pt-4 border-t border-[#1e1f25]">
              <button
                type="button"
                disabled={currentStep === 1 || isDeploying}
                onClick={() => {
                  soundManager.playClick();
                  setCurrentStep((prev) => Math.max(1, prev - 1));
                }}
                className="px-3.5 py-1.5 rounded-xl bg-[#16171d] hover:bg-[#1f2027] text-white text-xs font-mono transition disabled:opacity-40 disabled:cursor-not-allowed"
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
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-950 text-xs font-mono font-bold transition cursor-pointer shadow-md active:scale-95"
                >
                  <span>Sonraki Adım</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <span className="text-[11px] text-emerald-400 font-mono font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Tüm Adımlar Hazır
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): The Big Action Button and Live Terminal Stream */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* THE BIG DEPLOY BUTTON */}
          <div className="bg-[#121318] border border-[#26282e] rounded-2xl p-6 shadow-xl relative overflow-hidden space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" /> Dağıtım Emri
              </span>
              <span className="text-[10px] text-emerald-400 font-mono">Docker Engine SDK</span>
            </div>

            <motion.button
              whileHover={{ scale: isDeploying ? 1 : 1.02 }}
              whileTap={{ scale: isDeploying ? 1 : 0.97 }}
              disabled={isDeploying || isDeployed}
              onClick={handleStartDeploy}
              className={`w-full py-4 px-6 rounded-2xl font-bold font-mono text-sm tracking-wide transition-all shadow-xl flex items-center justify-center gap-3 cursor-pointer ${
                isDeployed
                  ? 'bg-emerald-500 text-slate-950 cursor-default font-extrabold'
                  : isDeploying
                  ? 'bg-[#1c1e27] text-slate-200 border border-white/20 cursor-wait'
                  : 'bg-white hover:bg-slate-100 text-slate-950 ring-2 ring-white/80 font-extrabold shadow-2xl active:scale-[0.98]'
              }`}
            >
              {isDeployed ? (
                <>
                  <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                  <span>Başarıyla Canlıya Alındı!</span>
                </>
              ) : isDeploying ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
                  <span>Dağıtılıyor (Adım {currentStep}/5)...</span>
                </>
              ) : (
                <>
                  <Rocket className="w-5 h-5" />
                  <span>🚀 Canlıya Dağıt (Deploy to Production)</span>
                </>
              )}
            </motion.button>

            <p className="text-[11px] text-[#8e9192] text-center font-mono">
              Butona tıkladığınızda soldan sağa lazer akışı ile 5 adım canlı olarak işletilir.
            </p>

            {isDeployed && (
              <button
                type="button"
                onClick={onNavigateDashboard}
                className="w-full py-2.5 px-4 rounded-xl bg-[#1a1b24] hover:bg-[#232736] text-blue-400 hover:text-white text-xs font-mono transition flex items-center justify-center gap-2 border border-blue-500/30 cursor-pointer shadow-md"
              >
                <span>Kontrol Paneline Git (Dashboard)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* LIVE TERMINAL LOG STREAM */}
          <div className="bg-[#090a0f] border border-[#26282e] rounded-2xl p-4 space-y-2.5 font-mono text-xs shadow-inner">
            <div className="flex items-center justify-between pb-2 border-b border-[#1e1f25]">
              <div className="flex items-center gap-2 text-[#8e9192]">
                <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[11px] font-bold text-white uppercase tracking-wider">
                  Canlı Dağıtım Konsolu
                </span>
              </div>
              <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${isDeploying ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}`} />
                {isDeploying ? 'Akış Aktif' : 'Beklemede'}
              </span>
            </div>

            <div className="h-[240px] overflow-y-auto space-y-1.5 text-[11px] text-slate-300 pr-1">
              {deployLogs.length === 0 ? (
                <div className="text-zinc-600 italic pt-16 text-center text-xs">
                  "Canlıya Dağıt" butonuna basıldığında adım adım Docker logları burada akacaktır.
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
                        ? 'text-emerald-400 font-bold'
                        : log.includes('ERR')
                        ? 'text-rose-400'
                        : 'text-slate-300'
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
