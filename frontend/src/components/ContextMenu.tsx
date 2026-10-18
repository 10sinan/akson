import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Square,
  RotateCw,
  Terminal,
  ExternalLink,
  Trash2,
  Copy,
} from 'lucide-react';
import type { ContainerItem } from '../types/container';
import { wiseBouncy } from '../utils/motion';

export interface ContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
  container: ContainerItem | null;
}

interface ContextMenuProps {
  state: ContextMenuState;
  onClose: () => void;
  onAction: (action: 'start' | 'stop' | 'restart' | 'delete', id: string) => void;
  onSelectContainer: (container: ContainerItem) => void;
  onOpenLogs?: (container: ContainerItem) => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  state,
  onClose,
  onAction,
  onSelectContainer,
  onOpenLogs,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click or escape
  useEffect(() => {
    if (!state.isOpen) return;

    const handlePointerDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [state.isOpen, onClose]);

  if (!state.isOpen || !state.container) return null;

  const { container, x, y } = state;
  const isRunning = container.status === 'running';

  // Prevent overflowing window bounds
  const menuWidth = 210;
  const menuHeight = 240;
  const adjustedX = Math.max(10, Math.min(x, window.innerWidth - menuWidth - 10));
  const adjustedY = Math.max(10, Math.min(y, window.innerHeight - menuHeight - 10));

  const copyId = () => {
    navigator.clipboard.writeText(container.id);
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        ref={menuRef}
        initial={{ opacity: 0, scale: 0.94, y: -4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={wiseBouncy}
        style={{ left: adjustedX, top: adjustedY }}
        className="fixed z-50 min-w-[210px] bg-[#0a0a0a]/95 backdrop-blur-2xl border border-[#262626] shadow-2xl shadow-black/80 rounded-2xl p-1.5 font-mono text-xs select-none"
      >
        {/* Header container info */}
        <div className="px-2.5 py-1.5 border-b border-[#262626] mb-1 flex items-center justify-between">
          <span className="font-semibold text-white truncate max-w-[130px]">
            {container.name}
          </span>
          <span
            className={`w-2 h-2 rounded-full ${
              isRunning ? 'bg-white' : 'bg-zinc-600'
            }`}
          />
        </div>

        {/* Action: Start / Stop */}
        {isRunning ? (
          <button
            onClick={() => {
              onAction('stop', container.id);
              onClose();
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-xl transition cursor-pointer"
          >
            <Square className="w-3.5 h-3.5 fill-current text-white" />
            <span>Konteyneri Durdur</span>
          </button>
        ) : (
          <button
            onClick={() => {
              onAction('start', container.id);
              onClose();
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-xl transition cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current text-white" />
            <span>Konteyneri Başlat</span>
          </button>
        )}

        {/* Action: Restart */}
        <button
          onClick={() => {
            onAction('restart', container.id);
            onClose();
          }}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-xl transition cursor-pointer"
        >
          <RotateCw className="w-3.5 h-3.5 text-white" />
          <span>Yeniden Başlat</span>
        </button>

        {/* Action: Open Details */}
        <button
          onClick={() => {
            onSelectContainer(container);
            onClose();
          }}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-xl transition cursor-pointer"
        >
          <ExternalLink className="w-3.5 h-3.5 text-white" />
          <span>Detayları Aç</span>
        </button>

        {/* Action: Open Logs */}
        {onOpenLogs && (
          <button
            onClick={() => {
              onOpenLogs(container);
              onClose();
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-xl transition cursor-pointer"
          >
            <Terminal className="w-3.5 h-3.5 text-white" />
            <span>Canlı Loglar</span>
          </button>
        )}

        {/* Action: Copy ID */}
        <button
          onClick={copyId}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition cursor-pointer"
        >
          <Copy className="w-3.5 h-3.5 text-zinc-400" />
          <span>ID Kopyala</span>
        </button>

        <div className="h-[1px] bg-[#262626] my-1" />

        {/* Action: Delete */}
        <button
          onClick={() => {
            onAction('delete', container.id);
            onClose();
          }}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Konteyneri Sil</span>
        </button>
      </motion.div>
    </AnimatePresence>
  );
};
