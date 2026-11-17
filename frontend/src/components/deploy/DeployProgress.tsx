import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, ChevronDown, Loader2, Terminal, X } from 'lucide-react';
import { snappySpring } from '../../utils/motion';
import type { StepDef, StepState } from './deployModel';

interface DeployProgressProps {
  steps: StepDef[];
  states: Partial<Record<string, StepState>>;
  details: Partial<Record<string, string>>;
  logs: string[];
  demo: boolean;
}

const STATE_TEXT: Record<StepState, string> = {
  pending: 'Bekliyor',
  running: 'Çalışıyor…',
  done: 'Tamam',
  error: 'Hata',
};

const StepNode: React.FC<{ step: StepDef; state: StepState }> = ({ step, state }) => {
  const Icon = step.icon;
  const base = 'relative w-12 h-12 rounded-2xl flex items-center justify-center border transition-colors duration-300';
  const look: Record<StepState, string> = {
    pending: 'border-[#262626] bg-[#0a0a0a] text-zinc-400',
    running: 'border-white bg-[#121212] text-white',
    done: 'border-white bg-white text-black',
    error: 'border-zinc-500 bg-[#121212] text-zinc-300',
  };
  return (
    <div className={`${base} ${look[state]}`}>
      {state === 'running' && (
        <motion.span
          className="absolute inset-0 rounded-2xl border border-white"
          animate={{ opacity: [0.6, 0], scale: [1, 1.35] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }}
        />
      )}
      {state === 'done' ? (
        <Check className="w-5 h-5" strokeWidth={3} />
      ) : state === 'error' ? (
        <X className="w-5 h-5" strokeWidth={3} />
      ) : state === 'running' ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        <Icon className="w-5 h-5" />
      )}
    </div>
  );
};

/** Visual, live pipeline of a deployment: one node per step, connected by filling lines. */
export const DeployProgress: React.FC<DeployProgressProps> = ({ steps, states, details, logs, demo }) => {
  const [showLogs, setShowLogs] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showLogs) logEndRef.current?.scrollIntoView({ block: 'nearest' });
  }, [logs.length, showLogs]);

  return (
    <div className="bg-[#0a0a0a] border border-[#262626] rounded-2xl p-5 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">Dağıtım ilerlemesi</h2>
        {demo && (
          <span className="text-[12px] font-mono uppercase tracking-wider text-zinc-300 border border-[#262626] rounded-md px-2 py-0.5">
            Demo
          </span>
        )}
      </div>

      <ol className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-0">
        {steps.map((step, i) => {
          const state = states[step.id] ?? 'pending';
          const detail = details[step.id];
          const nextStarted = i < steps.length - 1 && (states[steps[i + 1].id] ?? 'pending') !== 'pending';
          return (
            <li key={step.id} className="relative flex sm:flex-col items-center sm:flex-1 gap-3 sm:gap-2 sm:text-center">
              {i < steps.length - 1 && (
                <>
                  {/* connector: vertical on phones, horizontal from sm up */}
                  <div className="absolute left-6 top-12 h-4 w-px bg-[#262626] sm:hidden" />
                  <div className="hidden sm:block absolute top-6 left-[calc(50%+1.75rem)] right-[calc(-50%+1.75rem)] h-px bg-[#262626] overflow-hidden">
                    <motion.div
                      className="h-full bg-white origin-left"
                      initial={false}
                      animate={{ scaleX: state === 'done' && nextStarted ? 1 : state === 'done' ? 0.5 : 0 }}
                      transition={snappySpring}
                    />
                  </div>
                </>
              )}
              <StepNode step={step} state={state} />
              <div className="min-w-0">
                <div className={`text-xs font-semibold ${state === 'pending' ? 'text-zinc-400' : 'text-white'}`}>
                  {step.label}
                </div>
                <div className="text-[13px] text-zinc-400">
                  {state === 'running' ? step.hint : STATE_TEXT[state]}
                </div>
                {detail && state !== 'pending' && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={snappySpring}
                    className="mt-1 inline-block max-w-[12rem] truncate text-[12px] font-mono text-zinc-200 bg-white/5 border border-[#262626] rounded-md px-1.5 py-0.5"
                    title={detail}
                  >
                    {detail}
                  </motion.div>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <div className="border-t border-[#262626] pt-4">
        <button
          type="button"
          onClick={() => setShowLogs((v) => !v)}
          className="flex items-center gap-2 text-xs text-zinc-300 hover:text-white transition cursor-pointer"
          aria-expanded={showLogs}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Ayrıntılı loglar ({logs.length} satır)</span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showLogs ? 'rotate-180' : ''}`} />
        </button>
        {showLogs && (
          <div className="mt-3 max-h-72 overflow-y-auto bg-black border border-[#262626] rounded-xl p-3 font-mono text-[13px] leading-relaxed text-zinc-300 whitespace-pre-wrap break-words">
            {logs.length === 0 ? <span className="text-zinc-400">Henüz çıktı yok.</span> : logs.join('\n')}
            <div ref={logEndRef} />
          </div>
        )}
      </div>
    </div>
  );
};
