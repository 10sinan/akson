import React from 'react';
import { Play, Square, RotateCw } from 'lucide-react';
import { soundManager } from '../utils/sound';

type CardAction = 'start' | 'stop' | 'restart';

interface CardActionsProps {
  id: string;
  isRunning: boolean;
  onAction: (action: CardAction | 'delete', id: string) => void | Promise<void>;
  className?: string;
}

const secondaryBtn =
  'flex-1 inline-flex items-center justify-center gap-1.5 px-2 py-1 rounded-lg border border-zinc-700 bg-zinc-900 text-[13px] font-sans font-medium text-zinc-100 hover:bg-zinc-800 hover:border-zinc-500 disabled:opacity-50 disabled:cursor-wait transition cursor-pointer';
const primaryBtn =
  'flex-1 inline-flex items-center justify-center gap-1.5 px-2 py-1 rounded-lg bg-white text-black text-[13px] font-sans font-semibold hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-wait transition cursor-pointer';

export const CardActions: React.FC<CardActionsProps> = ({ id, isRunning, onAction, className = '' }) => {
  const [busy, setBusy] = React.useState(false);

  const run = async (action: CardAction) => {
    if (busy) return;
    soundManager.playClick();
    setBusy(true);
    try {
      await onAction(action, id);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={`flex items-center gap-1.5 ${className}`}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      {isRunning ? (
        <>
          <button type="button" disabled={busy} onClick={() => run('stop')} className={secondaryBtn}>
            <Square className="w-3 h-3" /> Durdur
          </button>
          <button type="button" disabled={busy} onClick={() => run('restart')} className={secondaryBtn}>
            <RotateCw className="w-3 h-3" /> Yeniden başlat
          </button>
        </>
      ) : (
        <button type="button" disabled={busy} onClick={() => run('start')} className={primaryBtn}>
          <Play className="w-3 h-3" /> Başlat
        </button>
      )}
    </div>
  );
};
