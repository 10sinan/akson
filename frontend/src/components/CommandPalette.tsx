import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Layers,
  Rocket,
  Database,
  Terminal,
  Network,
  Sparkles,
  RotateCw,
  ArrowRight,
  Command,
} from 'lucide-react';
import type { ContainerItem } from '../types/container';
import type { ActiveNavTab } from './Sidebar';
import { wiseBouncy, wiseSpring } from '../utils/motion';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  containers: ContainerItem[];
  onSelectContainer: (container: ContainerItem) => void;
  onSelectTab: (tab: ActiveNavTab) => void;
  onOpenDeploy: () => void;
  onOpenAi: () => void;
  onRefresh: () => void;
}

interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  category: 'Konteynerler' | 'Gezinme' | 'Hızlı Eylemler';
  icon: React.ReactNode;
  action: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  containers,
  onSelectContainer,
  onSelectTab,
  onOpenDeploy,
  onOpenAi,
  onRefresh,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut listener (Cmd+K or Ctrl+K and Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          setQuery('');
        }
      } else if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Build commands list
  const allCommands: CommandItem[] = [
    // 1. Navigation
    {
      id: 'nav-dashboard',
      title: 'Kontrol Paneline Git',
      subtitle: '3 Sütunlu servis, boru hattı ve telemetri görünümü',
      category: 'Gezinme',
      icon: <Layers className="w-4 h-4 text-white" />,
      action: () => {
        onSelectTab('dashboard');
        onClose();
      },
    },
    {
      id: 'nav-deploy',
      title: 'Yeni Servis Dağıt (Deploy)',
      subtitle: 'GitHub deposu veya Git URL ile otomatik dağıtım',
      category: 'Gezinme',
      icon: <Rocket className="w-4 h-4 text-white" />,
      action: () => {
        onSelectTab('deploy');
        onClose();
      },
    },
    {
      id: 'nav-storage',
      title: 'Depolama & Birimler (Storage)',
      subtitle: 'Docker hacimleri ve NVMe disk telemetrisi',
      category: 'Gezinme',
      icon: <Database className="w-4 h-4 text-white" />,
      action: () => {
        onSelectTab('storage');
        onClose();
      },
    },
    {
      id: 'nav-logs',
      title: 'Canlı Sistem Günlükleri (Logs)',
      subtitle: 'Tüm servislerin renkli konsol çıktıları',
      category: 'Gezinme',
      icon: <Terminal className="w-4 h-4 text-white" />,
      action: () => {
        onSelectTab('logs');
        onClose();
      },
    },
    {
      id: 'nav-network',
      title: 'Ağ & Traefik Proxy (Network)',
      subtitle: 'Let\'s Encrypt SSL ve akson-bridge topolojisi',
      category: 'Gezinme',
      icon: <Network className="w-4 h-4 text-white" />,
      action: () => {
        onSelectTab('network');
        onClose();
      },
    },

    // 2. Quick Actions
    {
      id: 'act-refresh',
      title: 'Sistem Metriklerini Yenile',
      subtitle: 'CPU, RAM ve konteyner sayaçlarını tazele',
      category: 'Hızlı Eylemler',
      icon: <RotateCw className="w-4 h-4 text-white" />,
      action: () => {
        onRefresh();
        onClose();
      },
    },
    {
      id: 'act-ai',
      title: 'Gemini AI DevOps Teşhisini Başlat',
      subtitle: 'Hataları tara ve otomatik çözüm önerileri al',
      category: 'Hızlı Eylemler',
      icon: <Sparkles className="w-4 h-4 text-violet-400" />,
      action: () => {
        onOpenAi();
        onClose();
      },
    },
    {
      id: 'act-deploy-wizard',
      title: 'Yeni Konteyner Dağıtma Sihirbazı',
      subtitle: 'Hızlı modal penceresini aç',
      category: 'Hızlı Eylemler',
      icon: <Rocket className="w-4 h-4 text-rose-400" />,
      action: () => {
        onOpenDeploy();
        onClose();
      },
    },

    // 3. Containers
    ...containers.map((c): CommandItem => ({
      id: `container-${c.id}`,
      title: c.name,
      subtitle: `${c.image}:${c.tag} • ${c.statusText}`,
      category: 'Konteynerler',
      icon: (
        <span className="relative flex h-2 w-2">
          {c.status === 'running' && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
          )}
          <span
            className={`relative inline-flex rounded-full h-2 w-2 ${
              c.status === 'running' ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]' : 'bg-zinc-600'
            }`}
          />
        </span>
      ),
      action: () => {
        onSelectTab('dashboard');
        onSelectContainer(c);
        onClose();
      },
    })),
  ];

  // Filter commands by query
  const filteredCommands = allCommands.filter((cmd) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return (
      cmd.title.toLowerCase().includes(q) ||
      (cmd.subtitle && cmd.subtitle.toLowerCase().includes(q)) ||
      cmd.category.toLowerCase().includes(q)
    );
  });

  // Handle arrow keys and enter
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredCommands.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action();
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 sm:pt-28 px-4">
          {/* Glassmorphic Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-md"
          />

          {/* Palette Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -16 }}
            transition={wiseSpring}
            className="relative w-full max-w-xl bg-[#0a0a0a] border border-[#262626] rounded-2xl shadow-2xl overflow-hidden flex flex-col z-10"
          >
            {/* Search Input Bar */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#262626] bg-[#121212]">
              <Search className="w-4 h-4 text-zinc-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Komut yazın veya servis arayın (örn: restart, redis, logs)..."
                className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-500 focus:outline-none font-mono"
              />
              <div className="flex items-center gap-1 bg-[#171717] border border-[#262626] px-2 py-0.5 rounded text-[10px] font-mono text-zinc-400">
                <span>ESC</span>
              </div>
            </div>

            {/* Results List */}
            <div className="max-h-[360px] overflow-y-auto p-2 space-y-1">
              {filteredCommands.length === 0 ? (
                <div className="p-8 text-center text-xs text-zinc-500 font-mono">
                  Sonuç bulunamadı: "<strong className="text-white">{query}</strong>"
                </div>
              ) : (
                filteredCommands.map((cmd, idx) => {
                  const isSelected = idx === selectedIndex;
                  return (
                    <motion.div
                      key={cmd.id}
                      onClick={cmd.action}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`relative flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer select-none transition-colors ${
                        isSelected ? 'bg-[#171717] text-white' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      {/* Active Sliding Highlight */}
                      {isSelected && (
                        <motion.div
                          layoutId="commandItemHighlight"
                          className="absolute inset-0 bg-[#171717] rounded-xl border border-[#262626] shadow-sm"
                          transition={wiseBouncy}
                        />
                      )}

                      <div className="flex items-center gap-3 relative z-10 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-[#121212] border border-[#262626] flex items-center justify-center shrink-0">
                          {cmd.icon}
                        </div>
                        <div className="min-w-0">
                          <span className={`text-xs font-mono font-medium block truncate ${isSelected ? 'text-white' : 'text-zinc-300'}`}>
                            {cmd.title}
                          </span>
                          {cmd.subtitle && (
                            <span className="text-[11px] text-zinc-400 block truncate">
                              {cmd.subtitle}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="relative z-10 flex items-center gap-2 shrink-0 ml-3">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#121212] border border-[#262626] text-zinc-400">
                          {cmd.category}
                        </span>
                        {isSelected && (
                          <ArrowRight className="w-3.5 h-3.5 text-white" />
                        )}
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* Bottom Keyboard Hint Bar */}
            <div className="px-4 py-2 bg-[#000000] border-t border-[#262626] flex items-center justify-between text-[11px] font-mono text-zinc-400">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-[#121212] rounded border border-[#262626] text-[10px] text-zinc-300">↑</kbd>
                  <kbd className="px-1.5 py-0.5 bg-[#121212] rounded border border-[#262626] text-[10px] text-zinc-300">↓</kbd>
                  Gezin
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-[#121212] rounded border border-[#262626] text-[10px] text-zinc-300">↵</kbd>
                  Çalıştır
                </span>
              </div>
              <div className="flex items-center gap-1 text-zinc-400">
                <Command className="w-3 h-3" />
                <span>Akson Spotlight</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
