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
  todoDetails: string;
}

export const PIPELINE_STEPS: StepInfo[] = [
  {
    id: 1,
    key: 'image',
    title: '1. Kaynak & İmaj',
    shortDesc: 'Docker Hub İmaj Seçimi',
    icon: Package,
    todoDetails: 'Bir hazır şablon, imaj adı ya da Git deposu seçin.',
  },
  {
    id: 2,
    key: 'config',
    title: '2. Port & Ortam (ENV)',
    shortDesc: 'Port ve Değişkenler',
    icon: Key,
    todoDetails: 'Dış ve iç portu belirleyin, gerekiyorsa ortam değişkenlerini girin.',
  },
  {
    id: 3,
    key: 'network',
    title: '3. Ağ & SSL (Traefik)',
    shortDesc: 'akson-bridge & Router',
    icon: Globe,
    todoDetails: 'Servisin bağlanacağı Docker ağını ve Traefik alan adını seçin.',
  },
  {
    id: 4,
    key: 'resources',
    title: '4. Kaynak Sınırları',
    shortDesc: 'CPU & RAM Cgroup',
    icon: Cpu,
    todoDetails: 'Servisin kullanabileceği en fazla bellek ve işlemci payını seçin.',
  },
  {
    id: 5,
    key: 'deploy',
    title: '5. Canlıya Dağıtım',
    shortDesc: 'Canlı Çalıştırma & Kontrol',
    icon: Rocket,
    todoDetails: 'Ayarları kontrol edip dağıtımı başlatın.',
  },
];

const getStepStyles = (id: number) => {
  switch (id) {
    case 1:
      return {
        text: 'text-zinc-300',
        badge: 'bg-zinc-300/10 border-white/20 text-zinc-300',
        activeRing: 'ring-2 ring-zinc-400',
      };
    case 2:
      return {
        text: 'text-zinc-400',
        badge: 'bg-zinc-400/10 border-white/20 text-zinc-400',
        activeRing: 'ring-2 ring-zinc-400',
      };
    case 3:
      return {
        text: 'text-zinc-100',
        badge: 'bg-zinc-100/10 border-white/20 text-zinc-100',
        activeRing: 'ring-2 ring-zinc-400',
      };
    case 4:
      return {
        text: 'text-zinc-300',
        badge: 'bg-zinc-300/10 border-white/20 text-zinc-300',
        activeRing: 'ring-2 ring-zinc-400',
      };
    case 5:
    default:
      return {
        text: 'text-zinc-500',
        badge: 'bg-zinc-500/10 border-white/20 text-zinc-500',
        activeRing: 'ring-2 ring-zinc-400',
      };
  }
};

interface PipelinePathStepperProps {
  currentStep: number; // 1 to 5
  isDeploying?: boolean;
  isDeployed?: boolean;
  onSelectStep?: (stepId: number) => void;
  onDeploy?: () => void;
  onReset?: () => void;
  onNavigateDashboard?: () => void;
}

export const PipelinePathStepper: React.FC<PipelinePathStepperProps> = ({
  currentStep,
  isDeploying = false,
  isDeployed = false,
  onSelectStep,
  onDeploy,
  onReset,
  onNavigateDashboard,
}) => {
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);

  const activeHover = hoveredStep !== null ? hoveredStep : currentStep;
  const currentStepData = PIPELINE_STEPS.find((s) => s.id === activeHover) || PIPELINE_STEPS[0];
  const activeStepStyles = getStepStyles(currentStepData.id);

  const handleStepClick = (stepId: number) => {
    soundManager.playClick();
    onSelectStep?.(stepId);
  };

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-xl relative overflow-hidden space-y-4">
      {/* Ambient background glow - subtle */}
      <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-white/[0.015] blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-white/[0.015] blur-3xl pointer-events-none" />

      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-3 relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-zinc-100" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Dağıtım adımları
            </h3>
          </div>
          <p className="text-[11px] text-zinc-400 mt-0.5 font-mono">
            Bir adıma tıklayarak o adımın ayarlarına geçebilirsiniz.
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
        {/* Connecting track line */}
        <div className="absolute top-[28px] sm:top-[30px] left-[10%] right-[10%] h-2 bg-zinc-900 border border-zinc-800/90 -translate-y-1/2 rounded-full z-0 overflow-hidden shadow-inner flex items-center">
          {/* Base Inactive Track Guide Line */}
          <div className="w-full h-[2px] bg-zinc-800/80" />

          {/* Active Progress Track with semantic gradient */}
          <motion.div
            className="absolute top-0 left-0 bottom-0 bg-zinc-100"
            initial={{ width: '0%' }}
            animate={{
              width: `${((Math.max(1, currentStep) - 1) / (PIPELINE_STEPS.length - 1)) * 100}%`,
            }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>

        {/* Station Nodes Grid */}
        <div className="grid grid-cols-5 relative z-10">
          {PIPELINE_STEPS.map((step) => {
            const isCompleted = step.id < currentStep;
            const isCurrent = step.id === currentStep;
            const Icon = step.icon;
            const stepStyles = getStepStyles(step.id);

            return (
              <div
                key={step.id}
                className="flex flex-col items-center cursor-pointer group"
                onClick={() => handleStepClick(step.id)}
                onMouseEnter={() => setHoveredStep(step.id)}
                onMouseLeave={() => setHoveredStep(null)}
              >
                {/* Node Circle with Ambient Halo */}
                <div className="relative">

                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.96 }}
                    transition={snappySpring}
                    className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center relative transition-all duration-200 ${
                      isCompleted
                        ? 'bg-zinc-100/15 text-zinc-100 border border-white/20'
                        : isCurrent
                        ? `bg-white text-black ${stepStyles.activeRing}`
                        : 'bg-zinc-900 text-zinc-500 border border-zinc-800 group-hover:border-zinc-700 group-hover:text-zinc-300'
                    }`}
                  >
                    {/* Icon or Status */}
                    {isCompleted ? (
                      <Check className="w-4 h-4 sm:w-5 sm:h-5 stroke-[3] text-zinc-100" />
                    ) : isCurrent && isDeploying ? (
                      <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-black" />
                    ) : (
                      <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                    )}

                    {/* Step Number Badge */}
                    <span
                      className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full text-[9px] font-mono font-bold flex items-center justify-center border ${
                        isCompleted
                          ? 'bg-zinc-900 text-zinc-100 border-white/20'
                          : isCurrent
                          ? 'bg-white text-black border-white'
                          : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                      }`}
                    >
                      {step.id}
                    </span>
                  </motion.div>
                </div>

                {/* Node Label */}
                <div className="mt-3 text-center px-1">
                  <div
                    className={`text-xs font-semibold tracking-tight transition-colors ${
                      isCurrent
                        ? 'text-white font-bold'
                        : isCompleted
                        ? 'text-zinc-300'
                        : 'text-zinc-500 group-hover:text-zinc-300'
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
              <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${activeStepStyles.badge}`}>
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
                    ? 'bg-zinc-100/10 text-zinc-100 border-white/20'
                    : currentStepData.id === currentStep
                    ? 'bg-zinc-300/10 text-zinc-300 border-white/20'
                    : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                }`}
              >
                {currentStepData.id < currentStep ? (
                  <>
                    <Check className="w-3 h-3 text-zinc-100" /> Tamamlandı
                  </>
                ) : currentStepData.id === currentStep ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-300" /> Geçerli adım
                  </>
                ) : (
                  'Sırada'
                )}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-zinc-300 leading-relaxed font-sans pt-3">
            {currentStepData.todoDetails}
          </p>
        </motion.div>
      </AnimatePresence>

      {/* 4. TÜNEL İÇİ DAĞITIM VE AKSİYON ŞERİDİ (Integrated Deploy Action Bar) */}
      {onDeploy && (
        <div className="relative z-10 pt-4 border-t border-zinc-800 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Sol Taraf: Tünel Durumu ve Bilgilendirme */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
              {isDeployed ? (
                <CheckCircle2 className="w-5 h-5 text-zinc-100" />
              ) : isDeploying ? (
                <Loader2 className="w-5 h-5 animate-spin text-zinc-300" />
              ) : (
                <Sparkles className="w-5 h-5 text-zinc-200" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider font-sans">
                  {isDeployed ? 'Canlıya Alındı' : isDeploying ? 'Dağıtım Yürütülüyor' : 'Dağıtım Emri'}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
                {isDeployed
                  ? 'Servis başlatıldı. Durumunu Kontrol Paneli’nden izleyebilirsiniz.'
                  : isDeploying
                  ? `Adım ${currentStep}/5 işleniyor...`
                  : 'Ayarları gözden geçirip servisi dağıtın.'}
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
              disabled={isDeploying || (isDeployed && !onReset)}
              onClick={() => {
                if (isDeployed) {
                  onReset?.();
                  return;
                }
                soundManager.playClick();
                onDeploy();
              }}
              className={`w-full sm:w-auto py-3 px-6 rounded-xl font-bold font-sans text-xs tracking-wide transition-all shadow-md flex items-center justify-center gap-2.5 cursor-pointer ${
                isDeployed
                  ? 'bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 font-semibold'
                : isDeploying
                  ? 'bg-zinc-900 text-zinc-400 border border-zinc-700 cursor-wait'
                  : 'bg-white hover:bg-zinc-200 text-black ring-1 ring-white/80 font-extrabold active:scale-[0.98]'
              }`}
            >
              {isDeployed ? (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>{onReset ? 'Canlıya Alındı • Tekrar Dağıt' : 'Başarıyla Canlıya Alındı!'}</span>
                </>
              ) : isDeploying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Dağıtılıyor (Adım {currentStep}/5)...</span>
                </>
              ) : (
                <>
                  <Rocket className="w-4 h-4" />
                  <span>Dağıt</span>
                </>
              )}
            </motion.button>
          </div>
        </div>
      )}
    </div>
  );
};
