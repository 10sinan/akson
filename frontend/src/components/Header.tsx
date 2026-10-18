import { useState } from 'react';
import {
  Search,
  RefreshCw,
  Plus,
  Cpu,
  Activity,
  Server,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { soundManager } from '../utils/sound';

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
  dockerStatus?: 'online' | 'demo' | 'checking';
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
  dockerStatus = 'online',
}) => {
  const [isMuted, setIsMuted] = useState(!soundManager.isEnabled());

  return (
    <header className="fixed top-0 left-0 md:left-16 right-0 h-14 bg-black border-b border-[#262626] z-40 flex items-center justify-between px-4 sm:px-6 pl-20 md:pl-6 select-none">
      {/* Sol alt birleşim köşesi: Main canvas rounded-tl-3xl kavisini tamamlayan köprü */}
      <div
        className="hidden md:block absolute -bottom-6 left-0 w-6 h-6 pointer-events-none z-40 overflow-hidden"
        aria-hidden="true"
      >
        <svg className="w-6 h-6 block" viewBox="0 0 24 24" fill="none">
          <path d="M 0 0 L 24 0 A 24 24 0 0 0 0 24 Z" fill="#000000" />
          <path d="M 24 0 A 24 24 0 0 0 0 24" stroke="#262626" strokeWidth="1" fill="none" />
        </svg>
      </div>

      {/* Left: Breadcrumbs & Cluster Status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center">
            <Server className="w-3 h-3 text-white" />
          </div>
          <span className="font-bold text-sm text-white tracking-wide">akson</span>
        </div>
        <span className="text-zinc-500 font-mono text-xs">/</span>
        <span className="text-zinc-500 font-mono text-xs hidden sm:inline">varsayilan-ag</span>
        <span className="text-zinc-500 font-mono text-xs hidden sm:inline">/</span>
        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-zinc-900 border border-zinc-800">
          <span className="w-1.5 h-1.5 rounded-full bg-white" />
          <span className="text-white text-xs font-mono font-medium">{currentTabName}</span>
        </div>
      </div>

      {/* Middle: Search bar / Spotlight trigger */}
      <div className="flex-1 max-w-sm mx-6 hidden md:block">
        <div
          onClick={onOpenCommandPalette}
          className="relative cursor-pointer group"
        >
          <Search className="w-3.5 h-3.5 text-zinc-400 group-hover:text-white transition-colors absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            readOnly
            value={searchQuery}
            onClick={onOpenCommandPalette}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder="Konteyner, servis ara... (⌘K)"
            className="w-full bg-zinc-900 group-hover:bg-zinc-800 border border-zinc-800 group-hover:border-zinc-600 text-xs text-white rounded-lg pl-9 pr-12 py-1.5 focus:outline-none transition-all placeholder:text-zinc-500 cursor-pointer"
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-zinc-400 group-hover:text-white bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800 font-mono pointer-events-none transition-colors">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right: Quick Stats & Action Buttons */}
      <div className="flex items-center gap-3">
        {/* Cluster Telemetry Pill */}
        <div className="hidden xl:flex items-center gap-3 bg-zinc-900 border border-zinc-800 px-3 py-1 rounded-lg text-[11px] font-mono text-zinc-300">
          <div className="flex items-center gap-1">
            <Cpu className="w-3 h-3 text-zinc-400" />
            <span>CPU: <strong className="text-white">{totalCpu.toFixed(1)}%</strong></span>
          </div>
          <div className="w-[1px] h-3 bg-zinc-800" />
          <div className="flex items-center gap-1">
            <Activity className="w-3 h-3 text-zinc-400" />
            <span>RAM: <strong className="text-white">{totalMemoryMb} MB</strong></span>
          </div>
          <div className="w-[1px] h-3 bg-zinc-800" />
          <div>
            <span>Servisler: <strong className="text-white">{runningContainers}</strong>/{totalContainers}</span>
          </div>
        </div>
        {/* Gemini AI Copilot Trigger */}
        {onOpenAi && (
          <button
            onClick={onOpenAi}
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition shadow-sm active:scale-95 cursor-pointer font-mono text-[11px] font-medium ${
              isAiOpen
                ? 'bg-white text-black border-white shadow-sm'
                : 'bg-zinc-900 border-zinc-800 hover:border-zinc-600 text-zinc-300 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Activity className={`w-3.5 h-3.5 ${isAiOpen ? 'text-black' : 'text-zinc-400'}`} />
            <span>Gemini Copilot</span>
          </button>
        )}

        {/* Docker Status Badge */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-mono">
          <span className="relative flex h-2 w-2 items-center justify-center">
            <span
              className={`inline-block rounded-full ${
                dockerStatus === 'online'
                  ? 'h-2 w-2 bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]'
                  : dockerStatus === 'checking'
                  ? 'h-2 w-2 bg-zinc-400 animate-pulse'
                  : 'h-1.5 w-1.5 border border-zinc-400'
              }`}
            />
          </span>
          <span className="text-white text-[11px]">
            Docker:{' '}
            <span className="font-medium text-white">
              {dockerStatus === 'online'
                ? 'Çevrimiçi'
                : dockerStatus === 'checking'
                ? 'Bağlanıyor...'
                : 'Demo Modu'}
            </span>
          </span>
        </div>

        {/* Haptic UI Sound Toggle */}
        <button
          onClick={() => {
            const enabled = soundManager.toggleSound();
            setIsMuted(!enabled);
          }}
          title={isMuted ? 'Arayüz Dokunsal Seslerini Aç' : 'Arayüz Seslerini Kapat'}
          className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg border border-zinc-800 transition cursor-pointer active:scale-95"
        >
          {isMuted ? (
            <VolumeX className="w-3.5 h-3.5 text-zinc-600" />
          ) : (
            <Volume2 className="w-3.5 h-3.5 text-zinc-200" />
          )}
        </button>

        {/* Refresh Button */}
        <button
          onClick={onRefresh}
          title="Metrikleri ve Durumu Yenile"
          className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg border border-zinc-800 transition cursor-pointer active:scale-95"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-white' : ''}`} />
        </button>

        {/* Deploy New Container Button */}
        <button
          onClick={onOpenDeploy}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-black hover:bg-zinc-200 font-semibold text-xs rounded-lg shadow-sm transition cursor-pointer active:scale-95"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Yeni Servis</span>
        </button>

        <div className="h-4 w-px bg-zinc-800" />

        {/* User Profile */}
        <div className="flex items-center gap-2.5 cursor-pointer">
          <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-semibold text-white flex items-center justify-center font-mono shadow-sm">
            JD
          </div>
          <div className="text-left hidden xl:block">
            <div className="text-xs font-semibold text-white leading-none">J. David</div>
            <div className="text-[10px] text-zinc-500 font-mono mt-0.5">Root Geliştirici</div>
          </div>
        </div>
      </div>
    </header>
  );
};
