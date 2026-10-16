import {
  Search,
  RefreshCw,
  Plus,
  Cpu,
  Activity,
  Server,
} from 'lucide-react';

interface HeaderProps {
  currentTabName: string;
  totalContainers: number;
  runningContainers: number;
  totalCpu: number;
  totalMemoryMb: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onRefresh: () => void;
  onOpenDeploy: () => void;
  onOpenAi?: () => void;
  onOpenCommandPalette?: () => void;
  isRefreshing: boolean;
  isAiOpen?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentTabName,
  totalContainers,
  runningContainers,
  totalCpu,
  totalMemoryMb,
  searchQuery,
  onSearchChange,
  onRefresh,
  onOpenDeploy,
  onOpenAi,
  onOpenCommandPalette,
  isRefreshing,
  isAiOpen = false,
}) => {
  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-[#090a0f] z-40 flex items-center justify-between px-6 pl-20 select-none">
      {/* Left: Breadcrumbs & Cluster Status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-[#1a1b21] border border-[#292a2f] flex items-center justify-center">
            <Server className="w-3 h-3 text-white" />
          </div>
          <span className="font-bold text-sm text-white tracking-wide">akson</span>
        </div>
        <span className="text-[#8e9192] font-mono text-xs">/</span>
        <span className="text-[#8e9192] font-mono text-xs hidden sm:inline">varsayilan-ag</span>
        <span className="text-[#8e9192] font-mono text-xs hidden sm:inline">/</span>
        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#16171d] border border-[#22242a]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span className="text-white text-xs font-mono font-medium">{currentTabName}</span>
        </div>
      </div>

      {/* Middle: Search bar / Spotlight trigger */}
      <div className="flex-1 max-w-sm mx-6 hidden md:block">
        <div
          onClick={onOpenCommandPalette}
          className="relative cursor-pointer group"
        >
          <Search className="w-3.5 h-3.5 text-[#8e9192] group-hover:text-white transition-colors absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            readOnly
            value={searchQuery}
            onClick={onOpenCommandPalette}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder="Konteyner, servis ara... (⌘K)"
            className="w-full bg-[#1a1b21] group-hover:bg-[#1e2028] border border-[#292a2f] group-hover:border-white/30 text-xs text-white rounded-lg pl-9 pr-12 py-1.5 focus:outline-none transition-all placeholder:text-[#8e9192] cursor-pointer"
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-[#8e9192] group-hover:text-white bg-[#121318] px-1.5 py-0.5 rounded border border-[#292a2f] font-mono pointer-events-none transition-colors">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right: Quick Stats & Action Buttons */}
      <div className="flex items-center gap-3">
        {/* Cluster Telemetry Pill */}
        <div className="hidden xl:flex items-center gap-3 bg-[#121318] border border-[#26282e] px-3 py-1 rounded-lg text-[11px] font-mono text-[#c4c7c8]">
          <div className="flex items-center gap-1">
            <Cpu className="w-3 h-3 text-blue-400" />
            <span>CPU: <strong className="text-white">{totalCpu.toFixed(1)}%</strong></span>
          </div>
          <div className="w-[1px] h-3 bg-[#26282e]" />
          <div className="flex items-center gap-1">
            <Activity className="w-3 h-3 text-purple-400" />
            <span>RAM: <strong className="text-white">{totalMemoryMb} MB</strong></span>
          </div>
          <div className="w-[1px] h-3 bg-[#26282e]" />
          <div>
            <span>Servisler: <strong className="text-emerald-400">{runningContainers}</strong>/{totalContainers}</span>
          </div>
        </div>
        {/* Gemini AI Copilot Trigger */}
        {onOpenAi && (
          <button
            onClick={onOpenAi}
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition shadow-sm active:scale-95 cursor-pointer font-mono text-[11px] font-medium ${
              isAiOpen
                ? 'bg-blue-600 border-blue-400 text-white shadow-md shadow-blue-500/20'
                : 'bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-indigo-500/10 border-blue-500/30 hover:border-blue-400/60 text-blue-300 hover:text-white'
            }`}
          >
            <Activity className={`w-3.5 h-3.5 ${isAiOpen ? 'text-white' : 'text-blue-400'} animate-pulse`} />
            <span>Gemini Copilot</span>
          </button>
        )}

        {/* Docker Live Badge */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1a1b21] border border-[#292a2f] text-xs font-mono">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
          </span>
          <span className="text-white text-[11px]">Docker: <span className="text-emerald-400 font-medium">Çevrimiçi</span></span>
        </div>

        {/* Refresh Button */}
        <button
          onClick={onRefresh}
          title="Metrikleri ve Durumu Yenile"
          className="p-1.5 bg-[#1a1b21] hover:bg-[#232736] text-[#8e9192] hover:text-white rounded-lg border border-[#292a2f] transition cursor-pointer active:scale-95"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
        </button>

        {/* Deploy New Container Button */}
        <button
          onClick={onOpenDeploy}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-black hover:bg-slate-200 font-semibold text-xs rounded-lg shadow transition cursor-pointer active:scale-95"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Yeni Servis</span>
        </button>

        <div className="h-4 w-px bg-[#292a2f]" />

        {/* User Profile */}
        <div className="flex items-center gap-2.5 cursor-pointer">
          <div className="w-8 h-8 rounded-full bg-[#1a1b21] border border-[#292a2f] text-xs font-semibold text-white flex items-center justify-center font-mono shadow-sm">
            JD
          </div>
          <div className="text-left hidden xl:block">
            <div className="text-xs font-semibold text-white leading-none">J. David</div>
            <div className="text-[10px] text-[#8e9192] font-mono mt-0.5">Root Geliştirici</div>
          </div>
        </div>
      </div>
    </header>
  );
};
