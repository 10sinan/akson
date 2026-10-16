import React from 'react';
import { motion } from 'framer-motion';

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => {
  return (
    <div
      className={`relative overflow-hidden bg-white/[0.04] rounded-lg ${className}`}
    >
      <motion.div
        initial={{ x: '-100%' }}
        animate={{ x: '200%' }}
        transition={{
          repeat: Infinity,
          duration: 1.6,
          ease: 'easeInOut',
        }}
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent"
      />
    </div>
  );
};

export const CardSkeleton: React.FC = () => {
  return (
    <div className="relative overflow-hidden p-4 rounded-xl border border-[#26282e]/60 bg-[#121318]/60 space-y-3 font-mono">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="w-28 h-3.5 rounded" />
            <Skeleton className="w-36 h-2.5 rounded" />
          </div>
        </div>
        <Skeleton className="w-14 h-5 rounded-full" />
      </div>

      <div className="pt-3 border-t border-[#26282e]/40 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Skeleton className="w-8 h-2.5 rounded" />
          <Skeleton className="w-16 h-2 rounded-full" />
          <Skeleton className="w-10 h-2.5 rounded" />
        </div>
        <Skeleton className="w-20 h-2.5 rounded" />
      </div>

      {/* Glass Shimmer Sweep */}
      <motion.div
        initial={{ x: '-100%' }}
        animate={{ x: '100%' }}
        transition={{ repeat: Infinity, duration: 1.4, ease: 'linear' }}
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent pointer-events-none"
      />
    </div>
  );
};

export const ShimmerScan: React.FC = () => {
  return (
    <motion.div
      initial={{ x: '-100%' }}
      animate={{ x: '100%' }}
      transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
      className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-500/[0.07] to-transparent pointer-events-none z-20"
    />
  );
};

