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
}

const NAV_ITEMS: { id: ActiveNavTab; title: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'dashboard', title: 'Kontrol Paneli (Dashboard)', icon: LayoutDashboard },
  { id: 'deploy', title: 'Yeni Dağıtım (Deploy)', icon: Rocket },
  { id: 'storage', title: 'Depolama & Volumes', icon: HardDrive },
  { id: 'logs', title: 'Konsol & Canlı Günlükler', icon: Terminal },
  { id: 'network', title: 'Ağ & Traefik Proxy', icon: Network },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  onOpenAiModal,
  isAiOpen = false,
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
        {/* Brand Logo */}
        <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center text-white shadow-sm font-bold tracking-tight">
          <Layers className="w-5 h-5 text-white" />
        </div>

        {/* Navigation Buttons with Animated Sliding Pill */}
        <nav className="flex flex-col items-center gap-2 w-full px-2">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                title={item.title}
                className="relative w-10 h-10 rounded-xl flex items-center justify-center transition-colors cursor-pointer text-zinc-400 hover:text-white"
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebarActivePill"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    className="absolute inset-0 bg-white rounded-xl shadow-md"
                  />
                )}
                <span className={`relative z-10 transition-colors ${isActive ? 'text-black font-semibold' : ''}`}>
                  <Icon className="w-5 h-5" />
                </span>
              </button>
            );
          })}

          <div className="w-6 h-[1px] bg-zinc-800 my-1" />

          {/* AI Copilot Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onOpenAiModal}
            title="Gemini AI DevOps Asistanı"
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer ${
              isAiOpen
                ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40 shadow-sm ring-1 ring-violet-500/30'
                : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-violet-300 hover:border-violet-500/30 hover:bg-zinc-800'
            }`}
          >
            <Sparkles className={`w-5 h-5 ${isAiOpen ? 'text-violet-300' : 'text-zinc-400 group-hover:text-violet-400'}`} />
          </motion.button>
        </nav>
      </div>

      {/* Bottom: Settings & Status */}
      <div className="flex flex-col items-center gap-3 w-full px-2">
        <button
          title="Güvenlik & Sertifikalar"
          className="w-10 h-10 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900 flex items-center justify-center transition-all cursor-pointer"
        >
          <Shield className="w-5 h-5" />
        </button>

        <button
          title="Sistem Ayarları"
          className="w-10 h-10 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900 flex items-center justify-center transition-all cursor-pointer"
        >
          <Settings className="w-5 h-5" />
        </button>

        <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center text-xs font-semibold text-zinc-300">
          AK
        </div>
      </div>
    </aside>
  );
};
