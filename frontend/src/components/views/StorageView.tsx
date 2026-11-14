import React, { useState } from 'react';
import { Database, Copy, Check, HardDrive } from 'lucide-react';

interface StorageItem {
  id: string;
  name: string;
  description: string;
  path: string;
  format: string;
}

// Only storage the backend really owns is listed here. Container volumes are not exposed by the API yet,
// so they are not invented.
const STORAGE_ITEMS: StorageItem[] = [
  {
    id: 'akson-db',
    name: 'akson.db',
    description: 'Servis ve dağıtım geçmişi',
    path: './data/akson.db',
    format: 'SQLite (WAL modu)',
  },
];

export const StorageView: React.FC = () => {
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  const handleCopyPath = (item: StorageItem) => {
    navigator.clipboard.writeText(item.path);
    setCopiedPath(item.id);
    setTimeout(() => setCopiedPath(null), 2000);
  };

  return (
    <div className="flex flex-col flex-1 space-y-6">
      <div className="pb-6 border-b border-[#262626]">
        <h1 className="text-2xl font-bold text-white tracking-tight font-sans">Depolama</h1>
        <p className="text-xs text-zinc-400 mt-1 font-sans">
          Akson&apos;un kendi verilerini sakladığı dosyalar.
        </p>
      </div>

      <div className="space-y-3 max-w-2xl">
        {STORAGE_ITEMS.map((item) => (
          <div
            key={item.id}
            className="bg-[#0a0a0a] border border-[#262626] rounded-2xl p-5 space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                <Database className="w-4 h-4 text-zinc-300" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white font-mono">{item.name}</h2>
                <p className="text-xs text-zinc-400 font-sans">
                  {item.description} • {item.format}
                </p>
              </div>
            </div>

            <div className="bg-[#121212] p-2.5 rounded-xl border border-[#262626] flex items-center justify-between font-mono text-xs">
              <span className="truncate pr-2 text-zinc-300">{item.path}</span>
              <button
                onClick={() => handleCopyPath(item)}
                className="text-zinc-400 hover:text-white transition cursor-pointer p-1"
                title="Yolu kopyala"
              >
                {copiedPath === item.id ? (
                  <Check className="w-3.5 h-3.5 text-zinc-100" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        ))}

        <div className="flex items-start gap-3 p-4 rounded-2xl border border-dashed border-[#262626] text-xs text-zinc-400 font-sans">
          <HardDrive className="w-4 h-4 mt-0.5 shrink-0 text-zinc-500" />
          <p>
            Konteyner birimleri (Docker volume) henüz buradan okunmuyor. Bunları görmek için
            terminalde <span className="font-mono text-zinc-300">docker volume ls</span> kullanabilirsiniz.
          </p>
        </div>
      </div>
    </div>
  );
};
