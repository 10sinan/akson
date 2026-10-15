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
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  onOpenAiModal,
}) => {
  return (
    <aside className="w-16 bg-[#090a0f] border-r border-[#26282e] flex flex-col items-center py-4 justify-between select-none z-30 shrink-0">
      {/* Top: Logo & Main Navigation */}
      <div className="flex flex-col items-center gap-6 w-full">
        {/* Brand Logo */}
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 font-bold tracking-tight">
          <Layers className="w-5 h-5 text-white" />
        </div>

        {/* Navigation Buttons */}
        <nav className="flex flex-col items-center gap-2 w-full px-2">
          <button
            onClick={() => onSelectTab('dashboard')}
            title="Kontrol Paneli (Dashboard)"
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-white text-black shadow-md font-semibold'
                : 'text-[#8e9192] hover:text-white hover:bg-[#1a1b21]'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
          </button>

          <button
            onClick={() => onSelectTab('deploy')}
            title="Yeni Dağıtım (Deploy)"
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer ${
              activeTab === 'deploy'
                ? 'bg-white text-black shadow-md font-semibold'
                : 'text-[#8e9192] hover:text-white hover:bg-[#1a1b21]'
            }`}
          >
            <Rocket className="w-5 h-5" />
          </button>

          <button
            onClick={() => onSelectTab('storage')}
            title="Depolama & Volumes"
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer ${
              activeTab === 'storage'
                ? 'bg-white text-black shadow-md font-semibold'
                : 'text-[#8e9192] hover:text-white hover:bg-[#1a1b21]'
            }`}
          >
            <HardDrive className="w-5 h-5" />
          </button>

          <button
            onClick={() => onSelectTab('logs')}
            title="Konsol & Canlı Günlükler"
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer ${
              activeTab === 'logs'
                ? 'bg-white text-black shadow-md font-semibold'
                : 'text-[#8e9192] hover:text-white hover:bg-[#1a1b21]'
            }`}
          >
            <Terminal className="w-5 h-5" />
          </button>

          <button
            onClick={() => onSelectTab('network')}
            title="Ağ & Traefik Proxy"
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer ${
              activeTab === 'network'
                ? 'bg-white text-black shadow-md font-semibold'
                : 'text-[#8e9192] hover:text-white hover:bg-[#1a1b21]'
            }`}
          >
            <Network className="w-5 h-5" />
          </button>

          <div className="w-6 h-[1px] bg-[#26282e] my-1" />

          {/* AI Copilot Button */}
          <button
            onClick={onOpenAiModal}
            title="Gemini AI DevOps Asistanı"
            className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600/20 to-purple-600/30 text-blue-300 border border-blue-500/40 hover:text-white hover:border-blue-400 flex items-center justify-center transition-all duration-200 shadow-sm cursor-pointer hover:scale-105 active:scale-95"
          >
            <Sparkles className="w-5 h-5 text-blue-400" />
          </button>
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
