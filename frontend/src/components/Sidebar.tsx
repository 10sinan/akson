import React from 'react';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Rocket,
  HardDrive,
  Terminal,
  Network,
  Sparkles,
  Settings,
  Shield,
  Layers,
} from 'lucide-react';

export type ActiveNavTab = 'dashboard' | 'deploy' | 'storage' | 'logs' | 'network';

interface SidebarProps {
  activeTab: ActiveNavTab;
  onSelectTab: (tab: ActiveNavTab) => void;
  onOpenAiModal: () => void;
  isAiOpen?: boolean;
  hasRunningContainers?: boolean;
}

const NAV_ITEMS: {
  id: ActiveNavTab;
  title: string;
  shortDesc: string;
  shortcut: string;
  icon: React.FC<{ className?: string }>;
}[] = [
  { id: 'dashboard', title: 'Kontrol Paneli', shortDesc: 'Servis topolojisi & metrikler', shortcut: '⌘1', icon: LayoutDashboard },
  { id: 'deploy', title: 'Yeni Dağıtım', shortDesc: 'Konteyner ayağa kaldır', shortcut: '⌘2', icon: Rocket },
  { id: 'storage', title: 'Kalıcı Depolama', shortDesc: 'Volumes & NVMe disk', shortcut: '⌘3', icon: HardDrive },
  { id: 'logs', title: 'Canlı Loglar', shortDesc: 'Stdout/stderr akışı', shortcut: '⌘4', icon: Terminal },
  { id: 'network', title: 'Ağ & Traefik', shortDesc: 'SSL & akson-bridge', shortcut: '⌘5', icon: Network },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  onOpenAiModal,
  isAiOpen = false,
  hasRunningContainers = true,
}) => {
  return (
    <aside className="fixed top-0 left-0 bottom-0 w-16 bg-black border-r border-[#262626] z-50 flex flex-col items-center py-3 justify-between select-none">
      {/* Header ve Main Content ile kesintisiz köşe birleşim köprüsü (Inverted corner bridge) */}
      <div
        className="absolute top-14 -right-6 w-6 h-6 pointer-events-none z-50 overflow-hidden"
        aria-hidden="true"
      >
        <svg className="w-6 h-6 block" viewBox="0 0 24 24" fill="none">
          {/* Köşedeki boşluğu kapatan siyah kama */}
          <path d="M 0 0 L 24 0 A 24 24 0 0 0 0 24 Z" fill="#000000" />
          {/* Main content rounded-tl-3xl kavisini tamamlayan köşe çizgisi */}
          <path d="M 24 0 A 24 24 0 0 0 0 24" stroke="#262626" strokeWidth="1" fill="none" />
        </svg>
      </div>

      {/* Top: Logo & Main Navigation */}
      <div className="flex flex-col items-center gap-6 w-full">
        {/* Brand Logo - Clickable to Dashboard */}
        <button
          onClick={() => onSelectTab('dashboard')}
          className="relative group w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-700 hover:border-emerald-500/50 hover:shadow-[0_0_15px_rgba(52,211,153,0.25)] flex items-center justify-center text-white transition-all duration-200 cursor-pointer"
        >
          <Layers className="w-5 h-5 text-white group-hover:text-emerald-400 transition-colors" />

          {/* Instant Tooltip */}
          <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-zinc-900/98 border border-zinc-700/80 rounded-xl shadow-2xl text-[11px] font-mono text-zinc-200 pointer-events-none whitespace-nowrap opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0 transition-all duration-150 z-50 flex items-center gap-2">
            <span className="font-bold text-white">akson</span>
            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20 font-mono">v1.0.0</span>
          </div>
        </button>

        {/* Navigation Buttons with Animated Sliding Pill & Instant Tooltips */}
        <nav className="flex flex-col items-center gap-2 w-full px-2">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            const showLiveDot = item.id === 'logs' && hasRunningContainers;

            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className="group relative w-10 h-10 rounded-xl flex items-center justify-center transition-colors cursor-pointer text-zinc-400 hover:text-white"
              >
                {/* Active Sliding Pill */}
                {isActive && (
                  <motion.div
                    layoutId="sidebarActivePill"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    className="absolute inset-0 bg-white rounded-xl shadow-md"
                  />
                )}

                {/* Left Active Indicator Bar */}
                {isActive && (
                  <motion.div
                    layoutId="sidebarActiveIndicator"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    className="absolute -left-2 top-2 bottom-2 w-1 rounded-r-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                  />
                )}

                <span className={`relative z-10 transition-colors ${isActive ? 'text-black font-semibold' : ''}`}>
                  <Icon className="w-5 h-5" />
                </span>

                {/* Live Activity Dot on Logs */}
                {showLiveDot && !isActive && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)] animate-pulse" />
                )}

                {/* Instant Cyber Tooltip */}
                <div className="absolute left-full ml-3 px-3 py-1.5 bg-zinc-900/98 border border-zinc-700/80 rounded-xl shadow-2xl text-[11px] font-mono text-zinc-200 pointer-events-none whitespace-nowrap opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0 transition-all duration-150 z-50 flex items-center gap-2.5">
                  <div className="flex flex-col text-left">
                    <span className="font-semibold text-white font-sans">{item.title}</span>
                    <span className="text-[10px] text-zinc-400 font-sans">{item.shortDesc}</span>
                  </div>
                  <kbd className="text-[9px] text-zinc-400 bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800 font-mono">
                    {item.shortcut}
                  </kbd>
                </div>
              </button>
            );
          })}

          <div className="w-6 h-[1px] bg-zinc-800 my-1" />

          {/* AI Copilot Button with Instant Tooltip */}
          <div className="relative group">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onOpenAiModal}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer ${
                isAiOpen
                  ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40 shadow-sm ring-1 ring-violet-500/30'
                  : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-violet-300 hover:border-violet-500/30 hover:bg-zinc-800'
              }`}
            >
              <Sparkles className={`w-5 h-5 ${isAiOpen ? 'text-violet-300' : 'text-zinc-400 group-hover:text-violet-400'}`} />
            </motion.button>

            {/* Instant Tooltip */}
            <div className="absolute left-full ml-3 px-3 py-1.5 bg-zinc-900/98 border border-violet-500/30 rounded-xl shadow-2xl text-[11px] font-mono text-zinc-200 pointer-events-none whitespace-nowrap opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0 transition-all duration-150 z-50 flex items-center gap-2.5">
              <div className="flex flex-col text-left">
                <span className="font-semibold text-violet-300 font-sans">Gemini AI Copilot</span>
                <span className="text-[10px] text-zinc-400 font-sans">Canlı DevOps ve log analizi</span>
              </div>
              <span className="text-[9px] text-violet-300 bg-violet-500/10 px-1.5 py-0.5 rounded border border-violet-500/30 font-mono">
                AI
              </span>
            </div>
          </div>
        </nav>
      </div>

      {/* Bottom: Settings & Status */}
      <div className="flex flex-col items-center gap-3 w-full px-2">
        <div className="relative group">
          <button
            className="w-10 h-10 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900 flex items-center justify-center transition-all cursor-pointer"
          >
            <Shield className="w-5 h-5" />
          </button>
          <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-zinc-900/98 border border-zinc-700/80 rounded-xl shadow-2xl text-[11px] font-sans text-zinc-200 pointer-events-none whitespace-nowrap opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0 transition-all duration-150 z-50">
            Güvenlik & Sertifikalar (TLS 1.3)
          </div>
        </div>

        <div className="relative group">
          <button
            className="w-10 h-10 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900 flex items-center justify-center transition-all cursor-pointer"
          >
            <Settings className="w-5 h-5" />
          </button>
          <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-zinc-900/98 border border-zinc-700/80 rounded-xl shadow-2xl text-[11px] font-sans text-zinc-200 pointer-events-none whitespace-nowrap opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0 transition-all duration-150 z-50">
            Sistem Ayarları & Motor
          </div>
        </div>

        {/* User Profile Avatar with Online Status Dot & Tooltip */}
        <div className="relative group cursor-pointer">
          <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center text-xs font-semibold text-zinc-300 relative shadow-sm hover:border-zinc-500 transition-colors">
            AK
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-black shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
          </div>

          {/* Instant Tooltip */}
          <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-zinc-900/98 border border-zinc-700/80 rounded-xl shadow-2xl text-[11px] font-mono text-zinc-200 pointer-events-none whitespace-nowrap opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0 transition-all duration-150 z-50 flex items-center gap-2">
            <span className="font-semibold text-white">Akson Root</span>
            <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 font-mono">Çevrimiçi</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
