import React from 'react';
import { motion } from 'framer-motion';
import {
  GitCommit,
  Clock,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import type { ContainerItem } from '../../types/container';

export interface PipelineItem {
  id: string;
  name: string;
  type: 'CI/CD' | 'MIGRATE' | 'BACKUP' | 'TASK';
  description: string;
  status: 'success' | 'running' | 'pending';
  branchOrTarget: string;
  duration: string;
}

interface PipelineColumnProps {
  containers?: ContainerItem[];
  onSelectPipeline?: (item: PipelineItem) => void;
}

export const PipelineColumn: React.FC<PipelineColumnProps> = ({ containers = [], onSelectPipeline }) => {
  const dynamicPipelines: PipelineItem[] = React.useMemo(() => {
    return containers.map((c, idx) => ({
      id: `pipeline-${c.id || idx}`,
      name: `${c.name}#live`,
      type: (c.category === 'core' ? 'CI/CD' : c.category === 'database' ? 'MIGRATE' : 'TASK') as PipelineItem['type'],
      description: `${c.image}:${c.tag} (${c.status === 'running' ? 'Çalışıyor' : 'Durduruldu'})`,
      status: (c.status === 'running' ? 'success' : 'pending') as PipelineItem['status'],
      branchOrTarget: c.uptime || 'akson-bridge',
      duration: c.status === 'running' ? 'Aktif' : '0s',
    }));
  }, [containers]);

  return (
    <section className="space-y-4 bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800 transition-all">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <GitCommit className="w-4 h-4 text-zinc-300" />
          <h2 className="text-sm font-semibold text-white tracking-tight font-sans">
            Dağıtım & Görev Akışı
          </h2>
        </div>
        <span className="text-[11px] font-sans px-2.5 py-0.5 rounded-full bg-zinc-900 text-zinc-400 border border-zinc-800 font-medium">
          {dynamicPipelines.length} Görev
        </span>
      </div>

      {/* List with Staggered Children */}
      <motion.div
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: {
              staggerChildren: 0.04,
            },
          },
        }}
        initial="hidden"
        animate="visible"
        className="space-y-2.5"
      >
        {dynamicPipelines.map((item) => (
          <motion.article
            key={item.id}
            variants={{
              hidden: { opacity: 0, y: 8 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
            }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.985 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            onClick={() => onSelectPipeline?.(item)}
            className="group p-3.5 bg-zinc-950 hover:bg-zinc-900 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer space-y-2"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-medium text-zinc-300 bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded">
                    {item.type}
                  </span>
                  <h3 className="text-xs font-semibold text-white tracking-tight font-sans group-hover:text-zinc-300 transition-colors truncate">
                    {item.name}
                  </h3>
                </div>
                <p className="text-[11px] text-zinc-400 mt-1 font-mono truncate">{item.description}</p>
              </div>

              {item.status === 'success' ? (
                <span className="shrink-0 inline-flex items-center gap-1 text-[10px] text-white font-sans bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-full font-medium">
                  <CheckCircle2 className="w-3 h-3 text-zinc-300" />
                  Başarılı
                </span>
              ) : (
                <span className="shrink-0 inline-flex items-center gap-1 text-[10px] text-zinc-400 font-sans bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-full font-medium">
                  <Loader2 className="w-3 h-3 animate-spin text-zinc-400" />
                  İşleniyor
                </span>
              )}
            </div>

            {/* Clean Metadata Line (No nested box!) */}
            <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1 border-t border-zinc-800/80 font-mono">
              <span className="truncate pr-2">{item.branchOrTarget}</span>
              <span className="shrink-0 text-zinc-400 flex items-center gap-1">
                <Clock className="w-3 h-3 text-zinc-500" />
                {item.duration}
              </span>
            </div>
          </motion.article>
        ))}

        {dynamicPipelines.length === 0 && (
          <div className="p-6 text-center text-xs font-sans text-zinc-500 bg-zinc-950 rounded-xl border border-zinc-800">
            Kayıtlı işlem veya olay geçmişi bulunmuyor.
          </div>
        )}
      </motion.div>
    </section>
  );
};
