import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package,
  Key,
  Globe,
  Cpu,
  Rocket,
  Check,
  Loader2,
  Info,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { snappySpring, snappyEase } from '../../utils/motion';
import { soundManager } from '../../utils/sound';

export interface StepInfo {
  id: number;
  key: string;
  title: string;
  shortDesc: string;
  icon: React.ElementType;
  doneDetails: string;
  todoDetails: string;
}

export const PIPELINE_STEPS: StepInfo[] = [
  {
    id: 1,
    key: 'image',
    title: '1. Kaynak & İmaj',
    shortDesc: 'Docker Hub İmaj Seçimi',
    icon: Package,
    doneDetails: 'İmaj çekildi ve katman bütünlüğü (SHA256) doğrulandı.',
    todoDetails: 'Docker Hub veya özel registry üzerinden imaj adı ve sürüm etiketi belirlenecek.',
  },
  {
    id: 2,
    key: 'config',
    title: '2. Port & Ortam (ENV)',
    shortDesc: 'Port ve Değişkenler',
    icon: Key,
    doneDetails: 'Dahili ve harici port eşlemeleri ile güvenli ortam değişkenleri tanımlandı.',
    todoDetails: 'Hedef konteyner portu (örn: 80, 3000) ve ENV konfigürasyonları girilecek.',
  },
  {
    id: 3,
    key: 'network',
    title: '3. Ağ & SSL (Traefik)',
    shortDesc: 'akson-bridge & Router',
    icon: Globe,
    doneDetails: 'İzole akson-bridge ağına bağlandı ve Traefik v3 ters vekil rotası enjekte edildi.',
    todoDetails: 'Dahili DNS rotası ve otomatik Let\'s Encrypt SSL yönlendirmesi bağlanacak.',
  },
  {
    id: 4,
    key: 'resources',
    title: '4. Kaynak Sınırları',
    shortDesc: 'CPU & RAM Cgroup',
    icon: Cpu,
    doneDetails: 'Hard RAM sınırı ve vCPU çekirdek tahsisi cgroup seviyesinde kilitlendi.',
    todoDetails: 'Konteynerin tüketebileceği azami bellek (MB) ve işlemci payı atanacak.',
  },
  {
    id: 5,
    key: 'deploy',
    title: '5. Canlıya Dağıtım',
    shortDesc: 'Canlı Çalıştırma & Kontrol',
    icon: Rocket,
    doneDetails: 'Docker motorunda konteyner çalıştırıldı ve HTTP 200 sağlık onayı alındı.',
    todoDetails: 'Konteyner ayağa kaldırılarak cgroup izlemesi ve canlı log akışı başlatılacak.',
  },
];

interface PipelinePathStepperProps {
  currentStep: number; // 1 to 5
  isDeploying?: boolean;
  isDeployed?: boolean;
  onSelectStep?: (stepId: number) => void;
  onDeploy?: () => void;
  onNavigateDashboard?: () => void;
}

export const PipelinePathStepper: React.FC<PipelinePathStepperProps> = ({
  currentStep,
  isDeploying = false,
  isDeployed = false,
  onSelectStep,
  onDeploy,
  onNavigateDashboard,
}) => {
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);

  const activeHover = hoveredStep !== null ? hoveredStep : currentStep;
  const currentStepData = PIPELINE_STEPS.find((s) => s.id === activeHover) || PIPELINE_STEPS[0];

  const handleStepClick = (stepId: number) => {
    soundManager.playClick();
    onSelectStep?.(stepId);
  };

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-xl relative overflow-hidden space-y-4">
      {/* Ambient background glow - neutral */}
      <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-white/[0.015] blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-white/[0.015] blur-3xl pointer-events-none" />

      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-3 relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-white" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Görsel Dağıtım Tüneli (Pipeline Path)
            </h3>
          </div>
          <p className="text-[11px] text-zinc-400 mt-0.5 font-mono">
            İstasyonlara tıklayarak detayları inceleyebilir, dağıtım sürecini soldan sağa görsel olarak takip edebilirsiniz.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-[11px]">
          <span className="text-zinc-400">Aşama:</span>
          <span className="px-2.5 py-0.5 rounded-full bg-zinc-900 text-zinc-200 border border-zinc-700 font-bold">
            {currentStep} / {PIPELINE_STEPS.length}
          </span>
        </div>
      </div>

      {/* Interactive Path Canvas */}
      <div className="relative py-2 select-none">
        {/* SVG Connecting Track Line */}
        <div className="absolute top-[38px] left-[6%] right-[6%] h-[3px] bg-zinc-900 -translate-y-1/2 rounded-full z-0 overflow-hidden">
          {/* Base Inactive Track */}
          <div className="w-full h-full bg-zinc-800" />

          {/* Active Progress Track */}
          <motion.div
            className="absolute top-0 left-0 bottom-0 bg-white shadow-[0_0_8px_rgba(255,255,255,0.4)]"
            initial={{ width: '0%' }}
            animate={{
              width: `${((Math.max(1, currentStep) - 1) / (PIPELINE_STEPS.length - 1)) * 100}%`,
            }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          />

          {/* Laser Energy Pulse (Active when deploying) */}
          {isDeploying && (
            <motion.div
              className="absolute top-0 bottom-0 w-24 bg-gradient-to-r from-transparent via-white to-transparent opacity-90 blur-[1px]"
              animate={{ left: ['-10%', '110%'] }}
              transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
            />
          )}
        </div>

        {/* Station Nodes Grid */}
        <div className="grid grid-cols-5 relative z-10">
          {PIPELINE_STEPS.map((step) => {
            const isCompleted = step.id < currentStep;
            const isCurrent = step.id === currentStep;
            const Icon = step.icon;

            return (
              <div
                key={step.id}
                className="flex flex-col items-center cursor-pointer group"
                onClick={() => handleStepClick(step.id)}
                onMouseEnter={() => setHoveredStep(step.id)}
                onMouseLeave={() => setHoveredStep(null)}
              >
                {/* Node Circle */}
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.96 }}
                  transition={snappySpring}
                  className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center relative transition-all duration-200 ${
                    isCompleted
                      ? 'bg-zinc-200 text-black shadow-md'
                      : isCurrent
                      ? 'bg-white text-black shadow-lg ring-2 ring-white/80'
                      : 'bg-zinc-900 text-zinc-500 border border-zinc-800 group-hover:border-zinc-600 group-hover:text-white'
                  }`}
                >
                  {/* Icon or Status */}
                  {isCompleted ? (
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 stroke-[3]" />
                  ) : isCurrent && isDeploying ? (
                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-black" />
                  ) : (
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                  )}

                  {/* Step Number Badge */}
                  <span
                    className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full text-[9px] font-mono font-bold flex items-center justify-center border ${
                      isCompleted
                        ? 'bg-zinc-900 text-zinc-300 border-zinc-700'
                        : isCurrent
                        ? 'bg-white text-black border-white'
                        : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                    }`}
                  >
                    {step.id}
                  </span>
                </motion.div>

                {/* Node Label */}
                <div className="mt-3 text-center px-1">
                  <div
                    className={`text-xs font-semibold tracking-tight transition-colors ${
                      isCurrent
                        ? 'text-white font-bold'
                        : isCompleted
                        ? 'text-zinc-300'
                        : 'text-zinc-500 group-hover:text-white'
                    }`}
                  >
                    {step.title.split('. ')[1]}
                  </div>
                  <div className="text-[10px] text-zinc-500 font-mono hidden sm:block truncate max-w-[110px] mt-0.5">
                    {step.shortDesc}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dynamic Popover / Details Drawer for the Selected Node */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStepData.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={snappyEase}
          className="bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 relative font-mono text-xs shadow-inner"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 text-white flex items-center justify-center shrink-0">
                <currentStepData.icon className="w-4 h-4" />
              </div>
              <div>
                <span className="text-white font-bold">{currentStepData.title}</span>
                <span className="text-zinc-400 ml-2 text-[11px]">— {currentStepData.shortDesc}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold border ${
                  currentStepData.id < currentStep
                    ? 'bg-zinc-800 text-white border-zinc-700'
                    : currentStepData.id === currentStep
                    ? 'bg-white/10 text-white border-white/20'
                    : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                }`}
              >
                {currentStepData.id < currentStep ? (
                  <>
                    <Check className="w-3 h-3 text-white" /> Tamamlandı
                  </>
                ) : currentStepData.id === currentStep ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> Aktif İstasyon
                  </>
                ) : (
                  'Sırada'
                )}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3">
            <div className="space-y-1">
              <div className="text-[10px] uppercase font-bold text-white tracking-wider flex items-center gap-1">
                <Check className="w-3 h-3 text-zinc-300" /> Yapılan / Doğrulanan
              </div>
              <p className="text-[11px] text-zinc-300 leading-relaxed font-sans bg-zinc-950 p-2.5 rounded-lg border border-zinc-800">
                {currentStepData.doneDetails}
              </p>
            </div>

            <div className="space-y-1">
              <div className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider flex items-center gap-1">
                <Info className="w-3 h-3 text-zinc-400" /> Bu Adımda Yapılması Gereken
              </div>
              <p className="text-[11px] text-zinc-300 leading-relaxed font-sans bg-zinc-950 p-2.5 rounded-lg border border-zinc-800">
                {currentStepData.todoDetails}
              </p>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* 4. TÜNEL İÇİ DAĞITIM VE AKSİYON ŞERİDİ (Integrated Deploy Action Bar) */}
      {onDeploy && (
        <div className="relative z-10 pt-4 border-t border-zinc-800 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Sol Taraf: Tünel Durumu ve Bilgilendirme */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
              {isDeployed ? (
                <CheckCircle2 className="w-5 h-5 text-white" />
              ) : isDeploying ? (
                <Loader2 className="w-5 h-5 animate-spin text-white" />
              ) : (
                <Sparkles className="w-5 h-5 text-white" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider font-sans">
                  {isDeployed ? 'Canlıya Alındı' : isDeploying ? 'Dağıtım Yürütülüyor' : 'Dağıtım Emri'}
                </span>
                <span className="text-[10px] font-mono text-zinc-300 bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded">
                  Docker Engine SDK
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
                {isDeployed
                  ? 'Tüm istasyonlar onaylandı, servis akson-bridge üzerinde 200 OK yanıtı veriyor.'
                  : isDeploying
                  ? `Lazer tüneli devrede — İstasyon ${currentStep}/5 işleniyor...`
                  : 'Soldan sağa 5 istasyonu işletip servisi canlı Docker ortamına dağıtır.'}
              </p>
            </div>
          </div>

          {/* Sağ Taraf: Ana Aksiyon Butonları */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto shrink-0">
            {isDeployed && onNavigateDashboard && (
              <button
                type="button"
                onClick={onNavigateDashboard}
                className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-sans font-semibold transition flex items-center justify-center gap-2 border border-zinc-700 cursor-pointer shadow-md active:scale-95"
              >
                <span>Kontrol Paneline Git</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            <motion.button
              whileHover={{ scale: isDeploying ? 1 : 1.02 }}
              whileTap={{ scale: isDeploying ? 1 : 0.98 }}
              disabled={isDeploying || isDeployed}
              onClick={() => {
                soundManager.playClick();
                onDeploy();
              }}
              className={`w-full sm:w-auto py-3 px-6 rounded-xl font-bold font-sans text-xs tracking-wide transition-all shadow-md flex items-center justify-center gap-2.5 cursor-pointer ${
                isDeployed
                  ? 'bg-zinc-800 text-white border border-zinc-700 cursor-default font-semibold'
                : isDeploying
                  ? 'bg-zinc-900 text-zinc-400 border border-zinc-700 cursor-wait'
                  : 'bg-white hover:bg-zinc-200 text-black ring-1 ring-white/80 font-extrabold shadow-[0_0_24px_rgba(255,255,255,0.22)] hover:shadow-[0_0_32px_rgba(255,255,255,0.32)] active:scale-[0.98]'
              }`}
            >
              {isDeployed ? (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Başarıyla Canlıya Alındı!</span>
                </>
              ) : isDeploying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Dağıtılıyor (Adım {currentStep}/5)...</span>
                </>
              ) : (
                <>
                  <Rocket className="w-4 h-4" />
                  <span>Canlıya Dağıt (Deploy to Production)</span>
                </>
              )}
            </motion.button>
          </div>
        </div>
      )}
    </div>
  );
};
