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
  Layers,
} from 'lucide-react';

export type ActiveNavTab = 'dashboard' | 'deploy' | 'storage' | 'logs' | 'network' | 'settings';

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
  icon: React.FC<{ className?: string }>;
}[] = [
  { id: 'dashboard', title: 'Kontrol Paneli', shortDesc: 'Servis topolojisi & metrikler', icon: LayoutDashboard },
  { id: 'deploy', title: 'Yeni Dağıtım', shortDesc: 'Konteyner ayağa kaldır', icon: Rocket },
  { id: 'storage', title: 'Kalıcı Depolama', shortDesc: 'Akson verileri', icon: HardDrive },
  { id: 'logs', title: 'Canlı Loglar', shortDesc: 'Stdout/stderr akışı', icon: Terminal },
  { id: 'network', title: 'Ağ & Traefik', shortDesc: 'Traefik & akson-bridge', icon: Network },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  onOpenAiModal,
  isAiOpen = false,
  hasRunningContainers = true,
}) => {
  return (
    <aside className="fixed top-0 left-0 bottom-0 w-16 bg-[#0c0d10] border-r border-[#262626] z-50 flex flex-col items-center py-3 justify-between select-none">
      {/* Header ve Main Content ile kesintisiz köşe birleşim köprüsü (Inverted corner bridge) */}
      <div
        className="absolute top-14 -right-6 w-6 h-6 pointer-events-none z-50 overflow-hidden"
        aria-hidden="true"
      >
        <svg className="w-6 h-6 block" viewBox="0 0 24 24" fill="none">
          {/* Köşedeki boşluğu kapatan kama */}
          <path d="M 0 0 L 24 0 A 24 24 0 0 0 0 24 Z" fill="#0c0d10" />
          {/* Main content rounded-tl-3xl kavisini tamamlayan köşe çizgisi */}
          <path d="M 24 0 A 24 24 0 0 0 0 24" stroke="#262626" strokeWidth="1" fill="none" />
        </svg>
      </div>

      {/* Top: Logo & Main Navigation */}
      <div className="flex flex-col items-center gap-6 w-full">
        {/* Brand Logo - Clickable to Dashboard */}
        <button
          onClick={() => onSelectTab('dashboard')}
          className="relative group w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-700 hover:border-white/20 flex items-center justify-center text-white transition-all duration-200 cursor-pointer"
        >
          <Layers className="w-5 h-5 text-white group-hover:text-zinc-100 transition-colors" />

          {/* Instant Tooltip */}
          <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-zinc-900/98 border border-zinc-700/80 rounded-xl shadow-2xl text-[13px] font-mono text-zinc-200 pointer-events-none whitespace-nowrap opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0 transition-all duration-150 z-50 flex items-center gap-2">
            <span className="font-bold text-white">akson</span>
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
                className="group relative w-10 h-10 rounded-xl flex items-center justify-center transition-colors cursor-pointer text-zinc-300 hover:text-white"
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
                    className="absolute -left-2 top-2 bottom-2 w-1 rounded-r-full bg-zinc-100"
                  />
                )}

                <span className={`relative z-10 transition-colors ${isActive ? 'text-black font-semibold' : ''}`}>
                  <Icon className="w-5 h-5" />
                </span>

                {/* Live Activity Dot on Logs */}
                {showLiveDot && !isActive && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-zinc-100" />
                )}

                {/* Instant Cyber Tooltip */}
                <div className="absolute left-full ml-3 px-3 py-1.5 bg-zinc-900/98 border border-zinc-700/80 rounded-xl shadow-2xl text-[13px] font-mono text-zinc-200 pointer-events-none whitespace-nowrap opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0 transition-all duration-150 z-50 flex items-center gap-2.5">
                  <div className="flex flex-col text-left">
                    <span className="font-semibold text-white font-sans">{item.title}</span>
                    <span className="text-[12px] text-zinc-300 font-sans">{item.shortDesc}</span>
                  </div>
                </div>
              </button>
            );
          })}

          <div className="w-6 h-[1px] bg-zinc-800 my-1" />

          {/* Assistant button with tooltip */}
          <div className="relative group">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onOpenAiModal}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer ${
                isAiOpen
                  ? 'bg-zinc-800 text-white border border-zinc-600'
                  : 'bg-zinc-900 text-zinc-300 border border-zinc-800 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <Sparkles className={`w-5 h-5 ${isAiOpen ? 'text-white' : 'text-zinc-300 group-hover:text-white'}`} />
            </motion.button>

            {/* Instant Tooltip */}
            <div className="absolute left-full ml-3 px-3 py-1.5 bg-zinc-900/98 border border-zinc-700 rounded-xl text-[13px] font-mono text-zinc-200 pointer-events-none whitespace-nowrap opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0 transition-all duration-150 z-50 flex items-center gap-2.5">
              <div className="flex flex-col text-left">
                <span className="font-semibold text-white font-sans">Asistan</span>
                <span className="text-[12px] text-zinc-300 font-sans">Konteyner ve log özeti</span>
              </div>
            </div>
          </div>
        </nav>
      </div>

      {/* Bottom: Settings */}
      <div className="flex flex-col items-center gap-3 w-full px-2">
        <button
          type="button"
          onClick={() => onSelectTab('settings')}
          aria-label="Ayarlar"
          className="group relative w-10 h-10 rounded-xl flex items-center justify-center transition-colors cursor-pointer text-zinc-300 hover:text-white"
        >
          {activeTab === 'settings' && (
            <motion.div
              layoutId="sidebarActivePill"
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className="absolute inset-0 bg-white rounded-xl shadow-md"
            />
          )}
          <span className={`relative z-10 transition-colors ${activeTab === 'settings' ? 'text-black' : ''}`}>
            <Settings className="w-5 h-5" />
          </span>
          <div className="absolute left-full ml-3 px-3 py-1.5 bg-zinc-900/98 border border-zinc-700/80 rounded-xl shadow-2xl text-[13px] pointer-events-none whitespace-nowrap opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0 transition-all duration-150 z-50 flex flex-col text-left">
            <span className="font-semibold text-white font-sans">Ayarlar</span>
            <span className="text-[12px] text-zinc-300 font-sans">Sistem durumu &amp; bakım</span>
          </div>
        </button>
      </div>
    </aside>
  );
};
