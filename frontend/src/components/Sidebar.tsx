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
    <aside className="fixed top-0 left-0 bottom-0 w-16 bg-[#090a0f] z-50 flex flex-col items-center py-3 justify-between select-none">
      {/* Top: Logo & Main Navigation */}
      <div className="flex flex-col items-center gap-6 w-full">
        {/* Brand Logo */}
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 font-bold tracking-tight">
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
                className="relative w-10 h-10 rounded-xl flex items-center justify-center transition-colors cursor-pointer text-[#8e9192] hover:text-white"
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

          <div className="w-6 h-[1px] bg-[#26282e] my-1" />

          {/* AI Copilot Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onOpenAiModal}
            title="Gemini AI DevOps Asistanı"
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer ${
              isAiOpen
                ? 'bg-gradient-to-tr from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/30 ring-2 ring-blue-400/50'
                : 'bg-gradient-to-tr from-blue-600/20 to-purple-600/30 text-blue-300 border border-blue-500/40 hover:text-white hover:border-blue-400'
            }`}
          >
            <Sparkles className={`w-5 h-5 ${isAiOpen ? 'text-white' : 'text-blue-400'}`} />
          </motion.button>
        </nav>
      </div>

      {/* Bottom: Settings & Status */}
      <div className="flex flex-col items-center gap-3 w-full px-2">
        <button
          title="Güvenlik & Sertifikalar"
          className="w-10 h-10 rounded-xl text-[#8e9192] hover:text-white hover:bg-[#1a1b21] flex items-center justify-center transition-all cursor-pointer"
        >
          <Shield className="w-5 h-5" />
        </button>

        <button
          title="Sistem Ayarları"
          className="w-10 h-10 rounded-xl text-[#8e9192] hover:text-white hover:bg-[#1a1b21] flex items-center justify-center transition-all cursor-pointer"
        >
          <Settings className="w-5 h-5" />
        </button>

        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-700 to-slate-900 border border-[#292a2f] flex items-center justify-center text-xs font-semibold text-slate-300">
          AK
        </div>
      </div>
    </aside>
  );
};
