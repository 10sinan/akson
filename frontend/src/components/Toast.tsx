import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  AlertCircle,
  Info,
  AlertTriangle,
  X,
} from 'lucide-react';
import { wiseBouncy } from '../utils/motion';

export interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  description?: string;
  duration?: number;
}

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  onDismiss,
}) => {
  const getIcon = (type: ToastItem['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />;
      case 'info':
      default:
        return <Info className="w-4 h-4 text-blue-400 shrink-0" />;
    }
  };

  const getBorderColor = (type: ToastItem['type']) => {
    switch (type) {
      case 'success':
        return 'border-emerald-500/30';
      case 'error':
        return 'border-rose-500/30';
      case 'warning':
        return 'border-amber-500/30';
      case 'info':
      default:
        return 'border-blue-500/30';
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={wiseBouncy}
            className={`pointer-events-auto bg-[#121318]/95 backdrop-blur-xl border ${getBorderColor(
              toast.type
            )} rounded-2xl p-4 shadow-2xl flex items-start gap-3 font-mono select-none`}
          >
            {/* Icon */}
            <div className="mt-0.5">{getIcon(toast.type)}</div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <span className="text-xs font-semibold text-white block">
                {toast.title}
              </span>
              {toast.description && (
                <span className="text-[11px] text-[#8e9192] block mt-0.5 leading-snug">
                  {toast.description}
                </span>
              )}
            </div>

            {/* Close Button */}
            <button
              onClick={() => onDismiss(toast.id)}
              className="text-[#8e9192] hover:text-white p-1 rounded-lg transition-colors cursor-pointer shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

