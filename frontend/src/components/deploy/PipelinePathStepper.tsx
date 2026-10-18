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
} from 'lucide-react';
import { wiseSpring, wiseBouncy } from '../../utils/motion';
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
  onSelectStep?: (stepId: number) => void;
}

export const PipelinePathStepper: React.FC<PipelinePathStepperProps> = ({
  currentStep,
  isDeploying = false,
  onSelectStep,
}) => {
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);

  const activeHover = hoveredStep !== null ? hoveredStep : currentStep;
  const currentStepData = PIPELINE_STEPS.find((s) => s.id === activeHover) || PIPELINE_STEPS[0];

  const handleStepClick = (stepId: number) => {
    soundManager.playClick();
    onSelectStep?.(stepId);
  };

  return (
    <div className="bg-[#121318] border border-[#26282e] rounded-2xl p-6 shadow-xl relative overflow-hidden space-y-6">
      {/* Ambient background glow - subtle & natural */}
      <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-emerald-500/[0.03] blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-white/[0.015] blur-3xl pointer-events-none" />

      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-3 relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Görsel Dağıtım Tüneli (Pipeline Path)
            </h3>
          </div>
          <p className="text-[11px] text-[#8e9192] mt-0.5 font-mono">
            İstasyonlara tıklayarak detayları inceleyebilir, dağıtım sürecini soldan sağa görsel olarak takip edebilirsiniz.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-[11px]">
          <span className="text-[#8e9192]">Aşama:</span>
          <span className="px-2.5 py-0.5 rounded-full bg-[#1c1e26] text-slate-200 border border-[#2d303b] font-bold">
            {currentStep} / {PIPELINE_STEPS.length}
          </span>
        </div>
      </div>

      {/* Interactive Path Canvas */}
      <div className="relative py-4 select-none">
        {/* SVG Connecting Track Line */}
        <div className="absolute top-[42px] left-[6%] right-[6%] h-[3px] bg-[#1a1b21] -translate-y-1/2 rounded-full z-0 overflow-hidden">
          {/* Base Inactive Track */}
          <div className="w-full h-full bg-[#26282e]" />

          {/* Active Colored Progress Track */}
          <motion.div
            className="absolute top-0 left-0 bottom-0 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]"
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
                  whileHover={{ scale: 1.12 }}
                  whileTap={{ scale: 0.94 }}
                  transition={wiseBouncy}
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center relative transition-all duration-300 ${
                    isCompleted
                      ? 'bg-emerald-500 text-slate-950 shadow-[0_0_16px_rgba(16,185,129,0.35)]'
                      : isCurrent
                      ? 'bg-white text-slate-950 shadow-[0_0_18px_rgba(255,255,255,0.25)] ring-2 ring-white/80'
                      : 'bg-[#16171d] text-[#8e9192] border border-[#26282e] group-hover:border-white/30 group-hover:text-white'
                  }`}
                >
                  {/* Pulse Ring when Active or Deploying */}
                  {isCurrent && (
                    <motion.div
                      className="absolute inset-0 rounded-2xl border-2 border-white/50"
                      animate={{ scale: [1, 1.25, 1], opacity: [0.8, 0, 0.8] }}
                      transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
                    />
                  )}

                  {/* Icon or Status */}
                  {isCompleted ? (
                    <Check className="w-5 h-5 stroke-[3]" />
                  ) : isCurrent && isDeploying ? (
                    <Loader2 className="w-5 h-5 animate-spin text-white" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}

                  {/* Step Number Badge */}
                  <span
                    className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full text-[9px] font-mono font-bold flex items-center justify-center border ${
                      isCompleted
                        ? 'bg-slate-900 text-emerald-400 border-emerald-500/30'
                        : isCurrent
                        ? 'bg-white text-slate-900 border-white'
                        : 'bg-[#121318] text-[#8e9192] border-[#26282e]'
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
                        ? 'text-emerald-300'
                        : 'text-[#8e9192] group-hover:text-white'
                    }`}
                  >
                    {step.title.split('. ')[1]}
                  </div>
                  <div className="text-[10px] text-[#8e9192] font-mono hidden sm:block truncate max-w-[110px] mt-0.5">
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
          transition={wiseSpring}
          className="bg-[#0e0f14] border border-[#26282e] rounded-xl p-4 relative font-mono text-xs shadow-inner"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#1e1f25]">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#1a1c24] border border-[#2c2f3d] text-white flex items-center justify-center shrink-0">
                <currentStepData.icon className="w-4 h-4" />
              </div>
              <div>
                <span className="text-white font-bold">{currentStepData.title}</span>
                <span className="text-[#8e9192] ml-2 text-[11px]">— {currentStepData.shortDesc}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold border ${
                  currentStepData.id < currentStep
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : currentStepData.id === currentStep
                    ? 'bg-white/10 text-white border-white/20'
                    : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                }`}
              >
                {currentStepData.id < currentStep ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" /> Tamamlandı
                  </>
                ) : currentStepData.id === currentStep ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Aktif İstasyon
                  </>
                ) : (
                  'Sırada'
                )}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3">
            <div className="space-y-1">
              <div className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider flex items-center gap-1">
                <Check className="w-3 h-3" /> Yapılan / Doğrulanan
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed font-sans bg-[#121318] p-2.5 rounded-lg border border-[#1e1f25]">
                {currentStepData.doneDetails}
              </p>
            </div>

            <div className="space-y-1">
              <div className="text-[10px] uppercase font-bold text-amber-400 tracking-wider flex items-center gap-1">
                <Info className="w-3 h-3" /> Bu Adımda Yapılması Gereken
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed font-sans bg-[#121318] p-2.5 rounded-lg border border-[#1e1f25]">
                {currentStepData.todoDetails}
              </p>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
