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
  isRefreshing: boolean;
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
  isRefreshing,
}) => {
  return (
    <header className="h-16 border-b border-[#26282e] bg-[#0d0e13]/80 backdrop-blur-md px-6 flex items-center justify-between z-20 shrink-0">
      {/* Left: Breadcrumbs & Cluster Status */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold text-white tracking-wider">AKSON</span>
          <span className="text-[#8e9192]">/</span>
          <span className="text-[#8e9192] font-mono">{currentTabName}</span>
        </div>

        <div className="hidden sm:flex items-center gap-2 pl-4 border-l border-[#26282e]">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Traefik v3.0 • Canlı
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Server className="w-3 h-3" />
            Docker Sock: Bağlı
          </span>
        </div>
      </div>

      {/* Middle: Search bar */}
      <div className="flex-1 max-w-md mx-6 hidden md:block">
        <div className="relative">
          <Search className="w-4 h-4 text-[#8e9192] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Konteyner, imaj veya port ara... (Ctrl + K)"
            className="w-full bg-[#121318] border border-[#26282e] text-xs text-white rounded-xl pl-9 pr-4 py-2 focus:outline-none focus:border-blue-500 transition-colors placeholder:text-[#8e9192]"
          />
        </div>
      </div>

      {/* Right: Quick Stats & Action Buttons */}
      <div className="flex items-center gap-3">
        {/* Quick Resource Usage Pill */}
        <div className="hidden xl:flex items-center gap-4 bg-[#121318] border border-[#26282e] px-3.5 py-1.5 rounded-xl text-xs font-mono text-[#c4c7c8]">
          <div className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-blue-400" />
            <span>CPU: <strong className="text-white">{totalCpu.toFixed(1)}%</strong></span>
          </div>
          <div className="w-[1px] h-3 bg-[#26282e]" />
          <div className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-purple-400" />
            <span>RAM: <strong className="text-white">{totalMemoryMb} MB</strong></span>
          </div>
          <div className="w-[1px] h-3 bg-[#26282e]" />
          <div>
            <span>Konteyner: <strong className="text-emerald-400">{runningContainers}</strong>/{totalContainers}</span>
          </div>
        </div>

        {/* Refresh Button */}
        <button
          onClick={onRefresh}
          title="Metrikleri ve Durumu Yenile"
          className="p-2 bg-[#1a1b21] hover:bg-[#232736] text-white rounded-xl border border-[#292a2f] transition-all cursor-pointer active:scale-95"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
        </button>

        {/* Deploy New Container Button */}
        <button
          onClick={onOpenDeploy}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-white text-black hover:bg-slate-200 font-semibold text-xs rounded-xl shadow transition-all cursor-pointer active:scale-95"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Yeni Dağıtım</span>
        </button>
      </div>
    </header>
  );
};
