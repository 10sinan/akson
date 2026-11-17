import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Check, Copy, ExternalLink, LayoutDashboard, RotateCcw } from 'lucide-react';
import { snappySpring } from '../../utils/motion';
import { friendlyError } from './deployModel';

interface SuccessProps {
  name: string;
  url?: string;
  demo: boolean;
  onRedeploy: () => void;
  onDashboard: () => void;
}

export const DeploySuccess: React.FC<SuccessProps> = ({ name, url, demo, onRedeploy, onDashboard }) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard may be blocked; the address is still visible to copy by hand
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={snappySpring}
      className="bg-white text-black rounded-2xl p-5 sm:p-6 space-y-4"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-black text-white flex items-center justify-center shrink-0">
          <Check className="w-5 h-5" strokeWidth={3} />
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-bold">{demo ? 'Demo tamamlandı' : 'Uygulaman yayında'}</h2>
          <p className="text-xs text-zinc-400 truncate">{name}</p>
        </div>
      </div>

      {url ? (
        <div className="flex flex-col sm:flex-row gap-2">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 min-w-0 truncate font-mono text-sm bg-zinc-100 border border-zinc-300 rounded-xl px-4 py-3 hover:bg-zinc-200 transition"
          >
            {url}
          </a>
          <div className="flex gap-2">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 bg-black text-white text-xs font-semibold rounded-xl px-4 py-3 hover:bg-zinc-800 transition"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Aç
            </a>
            <button
              type="button"
              onClick={copy}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 border border-zinc-300 text-xs font-semibold rounded-xl px-4 py-3 hover:bg-zinc-100 transition cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Kopyalandı' : 'Kopyala'}
            </button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-zinc-400">
          {demo
            ? 'Demo modunda gerçek bir konteyner oluşturulmadı.'
            : 'Konteyner çalışıyor ama dışarı açılmış bir port yok. Gelişmiş ayarlardan uygulama portunu girip tekrar dağıtabilirsin.'}
        </p>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="button"
          onClick={onDashboard}
          className="inline-flex items-center gap-1.5 text-xs font-semibold border border-zinc-300 rounded-xl px-3 py-2 hover:bg-zinc-100 transition cursor-pointer"
        >
          <LayoutDashboard className="w-3.5 h-3.5" /> Panele git
        </button>
        <button
          type="button"
          onClick={onRedeploy}
          className="inline-flex items-center gap-1.5 text-xs font-semibold border border-zinc-300 rounded-xl px-3 py-2 hover:bg-zinc-100 transition cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Yeni dağıtım
        </button>
      </div>
    </motion.div>
  );
};

interface ErrorProps {
  message: string;
  onRetry: () => void;
}

export const DeployError: React.FC<ErrorProps> = ({ message, onRetry }) => {
  const info = friendlyError(message);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={snappySpring}
      className="bg-[#0a0a0a] border border-zinc-500 rounded-2xl p-5 sm:p-6 space-y-3"
      role="alert"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl border border-zinc-500 text-zinc-200 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="min-w-0 space-y-1">
          <h2 className="text-base font-bold text-white">{info.title}</h2>
          <p className="text-sm text-zinc-300">{info.hint}</p>
          <p className="text-[13px] font-mono text-zinc-400 break-words">{message}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white text-black rounded-xl px-4 py-2 hover:bg-zinc-200 transition cursor-pointer"
      >
        <RotateCcw className="w-3.5 h-3.5" /> Düzenle ve tekrar dene
      </button>
    </motion.div>
  );
};
