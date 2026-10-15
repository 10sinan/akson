import type { ContainerItem } from '../types/container';
import {
  Globe,
  Database,
  Cpu,
  Layers,
  Zap,
} from 'lucide-react';

interface ContainerCardProps {
  container: ContainerItem;
  isSelected: boolean;
  onSelect: (container: ContainerItem) => void;
}

export const ContainerCard: React.FC<ContainerCardProps> = ({
  container,
  isSelected,
  onSelect,
}) => {
  // Select appropriate icon
  const getIcon = () => {
    switch (container.category) {
      case 'core':
        return <Zap className="w-4 h-4 text-amber-400" />;
      case 'service':
        return <Globe className="w-4 h-4 text-blue-400" />;
      case 'database':
        return <Database className="w-4 h-4 text-emerald-400" />;
      case 'worker':
        return <Cpu className="w-4 h-4 text-purple-400" />;
      default:
        return <Layers className="w-4 h-4 text-slate-400" />;
    }
  };

  const isRunning = container.status === 'running';

  return (
    <div
      onClick={() => onSelect(container)}
      className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer select-none ${
        isSelected
          ? 'bg-[#16171d] border-blue-500/80 shadow-lg shadow-blue-500/5 ring-1 ring-blue-500/40'
          : 'bg-[#121318] border-[#26282e] hover:border-white/20 hover:bg-[#16171d]/60'
      }`}
    >
      {/* Top Header of Card */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#1a1b21] border border-[#292a2f] flex items-center justify-center shrink-0">
            {getIcon()}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white font-mono tracking-tight flex items-center gap-2">
              {container.name}
            </h3>
            <p className="text-[11px] text-[#8e9192] line-clamp-1">{container.subtitle}</p>
          </div>
        </div>

        {/* Status Dot */}
        <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
          <span
            className={`w-2 h-2 rounded-full ${
              isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'
            }`}
          />
          <span className="text-[11px] font-mono text-[#c4c7c8]">
            {container.statusText}
          </span>
        </div>
      </div>

      {/* Middle: Tag & Port preview */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
        <span className="px-2 py-0.5 rounded bg-[#1a1b21] text-slate-300 border border-[#292a2f]">
          {container.image}:{container.tag}
        </span>
        {container.ports.length > 0 && (
          <span className="px-2 py-0.5 rounded bg-[#1a1b21] text-blue-300 border border-blue-500/20">
            {container.ports.map((p) => `${p.hostPort}:${p.containerPort}`).join(', ')}
          </span>
        )}
      </div>

      {/* Bottom: Resource Metric Bar */}
      <div className="mt-3 pt-3 border-t border-[#26282e]/60 flex items-center justify-between text-[11px] text-[#8e9192] font-mono">
        <div className="flex items-center gap-1.5">
          <span>CPU</span>
          <div className="w-16 h-1.5 rounded-full bg-[#1a1b21] overflow-hidden">
            <div
              className={`h-full rounded-full ${
                container.cpuPercent > 50 ? 'bg-amber-400' : 'bg-blue-400'
              }`}
              style={{ width: `${Math.min(container.cpuPercent * 10, 100)}%` }}
            />
          </div>
          <span className="text-white">{container.cpuPercent.toFixed(1)}%</span>
        </div>

        <div>
          <span>RAM: <strong className="text-white">{container.memoryUsageMb} MB</strong></span>
        </div>
      </div>
    </div>
  );
};
