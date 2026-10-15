import React from 'react';
import { motion } from 'framer-motion';
import {
  GitCommit,
  Clock,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

export interface PipelineItem {
  id: string;
  name: string;
  type: 'CI/CD' | 'MIGRATE' | 'BACKUP' | 'TASK';
  description: string;
  status: 'success' | 'running' | 'pending';
  branchOrTarget: string;
  duration: string;
}

const MOCK_PIPELINES: PipelineItem[] = [
  {
    id: 'deploy-run-482',
    name: 'deploy-run#482',
    type: 'CI/CD',
    description: 'api-gateway:latest (İmaj derleme)',
    status: 'success',
    branchOrTarget: 'main (7b4f91c)',
    duration: '42 saniye',
  },
  {
    id: 'db-migration-104',
    name: 'db-migration#104',
    type: 'MIGRATE',
    description: 'schema-sync (Kullanıcı tabloları)',
    status: 'success',
    branchOrTarget: 'v2.4.0-patch',
    duration: '8 saniye',
  },
  {
    id: 'scheduled-backup-89',
    name: 'scheduled-backup#89',
    type: 'BACKUP',
    description: 'postgres_data -> NVMe snapshot',
    status: 'success',
    branchOrTarget: 'RAID-1 disk alanı',
    duration: '1 dk 12 sn',
  },
  {
    id: 'cache-warmup-21',
    name: 'cache-warmup#21',
    type: 'TASK',
    description: 'redis-cache önbellek ısıtma',
    status: 'running',
    branchOrTarget: '10,000 anahtar',
    duration: 'Devam ediyor...',
  },
];

interface PipelineColumnProps {
  onSelectPipeline?: (item: PipelineItem) => void;
}

export const PipelineColumn: React.FC<PipelineColumnProps> = ({ onSelectPipeline }) => {
  return (
    <section className="space-y-4 bg-[#1a1b21] p-4 rounded-2xl border border-[#26282e] transition-all">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <GitCommit className="w-4 h-4 text-purple-400" />
          <h2 className="text-sm font-semibold text-white tracking-wide">
            Dağıtım & Görev Akışı
          </h2>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#121318] text-[#c4c7c8] border border-[#26282e]">
            {MOCK_PIPELINES.length} Görev
          </span>
        </div>
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
        className="space-y-3"
      >
        {MOCK_PIPELINES.map((item) => (
          <motion.article
            key={item.id}
            variants={{
              hidden: { opacity: 0, y: 10 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
            }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            onClick={() => onSelectPipeline?.(item)}
            className="group p-3.5 bg-[#121318] hover:bg-[#16171d] rounded-xl border border-[#26282e] hover:border-white/30 transition-colors cursor-pointer space-y-2.5"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-medium text-purple-300 bg-purple-500/10 border border-purple-500/20 px-1.5 py-0.5 rounded">
                    {item.type}
                  </span>
                  <h3 className="text-xs font-semibold text-white font-mono group-hover:text-purple-300 transition-colors">
                    {item.name}
                  </h3>
                </div>
                <p className="text-[11px] text-[#8e9192] mt-1">{item.description}</p>
              </div>

              {item.status === 'success' ? (
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-mono bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded font-medium">
                  <CheckCircle2 className="w-3 h-3" />
                  Başarılı
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] text-blue-400 font-mono bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded font-medium">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  İşleniyor
                </span>
              )}
            </div>

            <div className="bg-[#0d0e13] p-2 rounded-lg border border-[#1e1f25] space-y-1 text-[10px] font-mono text-[#8e9192]">
              <div className="flex justify-between items-center">
                <span>Hedef / Dal:</span>
                <span className="text-white font-medium">{item.branchOrTarget}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Süre:</span>
                <span className="text-slate-300 flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" />
                  {item.duration}
                </span>
              </div>
            </div>
          </motion.article>
        ))}
      </motion.div>
    </section>
  );
};
