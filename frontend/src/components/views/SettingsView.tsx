import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Box,
  Network,
  Lock,
  ShieldCheck,
  Database,
  Trash2,
  Volume2,
  VolumeX,
  RefreshCw,
  Check,
  FileCode2,
} from 'lucide-react';
import { api, type ApiSystemInfo } from '../../api/client';
import { soundManager, SOUND_CHANGE_EVENT } from '../../utils/sound';

interface SettingsViewProps {
  isLiveBackend: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${Math.round(mb)} MB`;
}

interface StatusCardProps {
  icon: React.FC<{ className?: string }>;
  title: string;
  value: string;
  ok: boolean | null;
  hint: string;
  labels?: [string, string];
}

// One read-only fact about the running system. `ok` null means "unknown" (demo mode or not loaded).
const StatusCard: React.FC<StatusCardProps> = ({ icon: Icon, title, value, ok, hint, labels = ['Açık', 'Kapalı'] }) => (
  <div className="bg-[#0a0a0a] border border-[#262626] rounded-2xl p-4 flex flex-col gap-3">
    <div className="flex items-center justify-between">
      <div className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
        <Icon className="w-4 h-4 text-zinc-300" />
      </div>
      {ok !== null && (
        <span
          className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
            ok ? 'bg-white text-black border-white' : 'text-zinc-400 border-zinc-700'
          }`}
        >
          {ok ? labels[0] : labels[1]}
        </span>
      )}
    </div>
    <div>
      <p className="text-[11px] text-zinc-500 font-sans">{title}</p>
      <p className="text-sm font-semibold text-white font-mono truncate" title={value}>
        {value}
      </p>
    </div>
    <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">{hint}</p>
  </div>
);

const SectionTitle: React.FC<{ title: string; desc: string }> = ({ title, desc }) => (
  <div>
    <h2 className="text-sm font-bold text-white font-sans">{title}</h2>
    <p className="text-xs text-zinc-500 font-sans">{desc}</p>
  </div>
);

type PrunePhase = 'idle' | 'confirm' | 'running' | 'done' | 'error';

export const SettingsView: React.FC<SettingsViewProps> = ({ isLiveBackend }) => {
  const [info, setInfo] = useState<ApiSystemInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [prunePhase, setPrunePhase] = useState<PrunePhase>('idle');
  const [pruneMessage, setPruneMessage] = useState('');
  const [soundOn, setSoundOn] = useState(soundManager.isEnabled());

  const load = useCallback(
    () =>
      api
        .fetchSystemInfo()
        .then((d) => {
          setInfo(d);
          setLoadError(null);
        })
        .catch((err: unknown) => setLoadError(err instanceof Error ? err.message : String(err))),
    []
  );

  useEffect(() => {
    if (isLiveBackend) load();
  }, [isLiveBackend, load]);

  // The header has its own sound toggle; follow it.
  useEffect(() => {
    const onChange = (e: Event) => setSoundOn((e as CustomEvent<boolean>).detail);
    window.addEventListener(SOUND_CHANGE_EVENT, onChange);
    return () => window.removeEventListener(SOUND_CHANGE_EVENT, onChange);
  }, []);

  const handleRefresh = () => {
    setIsLoading(true);
    load().finally(() => setIsLoading(false));
  };

  const handlePrune = async () => {
    setPrunePhase('running');
    try {
      const res = await api.pruneUnusedImages();
      setPruneMessage(
        res.deleted === 0
          ? 'Silinecek kullanılmayan imaj yoktu.'
          : `${res.deleted} imaj silindi, ${formatBytes(res.space_reclaimed)} yer açıldı.`
      );
      setPrunePhase('done');
      load();
    } catch (err) {
      setPruneMessage(err instanceof Error ? err.message : String(err));
      setPrunePhase('error');
    }
  };

  const known = isLiveBackend && info !== null;
  const unused = info?.unused_images;

  return (
    <div className="flex flex-col flex-1 space-y-8 max-w-4xl">
      {/* Title */}
      <div className="pb-6 border-b border-[#262626] flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight font-sans">Ayarlar</h1>
          <p className="text-xs text-zinc-400 mt-1 font-sans">
            Akson&apos;un nasıl çalıştığını gör, bilgisayarında yer aç, arayüzü kendine göre ayarla.
          </p>
        </div>
        {isLiveBackend && (
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-lg border border-zinc-800 text-xs transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Yenile
          </button>
        )}
      </div>

      {/* System status */}
      <section className="space-y-3">
        <SectionTitle title="Sistem durumu" desc="Bu bilgiler sadece gösterilir; nasıl değiştirileceği en altta." />

        {!isLiveBackend ? (
          <div className="p-4 rounded-2xl border border-dashed border-[#262626] text-xs text-zinc-400 font-sans">
            Demo modundasın: Akson&apos;un arka yüzüne bağlanılamadı, bu yüzden sistem bilgisi gösterilemiyor.
          </div>
        ) : loadError ? (
          <div className="p-4 rounded-2xl border border-zinc-700 text-xs text-zinc-300 font-sans">
            Sistem bilgisi alınamadı: <span className="font-mono text-zinc-400">{loadError}</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <StatusCard
              icon={Box}
              title="Docker"
              value={info?.docker ? `v${info.docker.version}` : info ? 'Bağlı değil' : '…'}
              ok={known ? Boolean(info?.docker) : null}
              labels={['Bağlı', 'Bağlı değil']}
              hint={
                info?.docker
                  ? `${info.docker.os}/${info.docker.arch} • API ${info.docker.api_version}`
                  : 'Uygulamaları çalıştıran motor.'
              }
            />
            <StatusCard
              icon={Network}
              title="Traefik (alan adları)"
              value={!info ? '…' : info.traefik_running ? 'Çalışıyor' : 'Çalışmıyor'}
              ok={known ? info!.traefik_running : null}
              hint="Uygulamalara uygulama.siten.com gibi adres vermek için gerekir. Yoksa localhost:PORT kullanılır."
            />
            <StatusCard
              icon={Lock}
              title="Giriş koruması"
              value={!info ? '…' : info.auth_enabled ? 'Token gerekli' : 'Herkese açık'}
              ok={known ? info!.auth_enabled : null}
              hint="Akson'u internete açacaksan AKSON_TOKEN ile koru. Sadece kendi bilgisayarındaysan gerekmez."
            />
            <StatusCard
              icon={ShieldCheck}
              title="HTTPS sertifikası"
              value={!info ? '…' : info.acme_email_set ? "Let's Encrypt hazır" : 'Ayarlanmamış'}
              ok={known ? info!.acme_email_set : null}
              hint="Alan adlarına otomatik ücretsiz HTTPS için ACME_EMAIL'e bir e-posta yaz."
            />
            <StatusCard
              icon={Database}
              title="Veritabanı"
              value={info?.db_path || '…'}
              ok={null}
              hint="Servislerin ve dağıtım geçmişinin saklandığı dosya."
            />
          </div>
        )}
      </section>

      {/* Maintenance */}
      <section className="space-y-3">
        <SectionTitle title="Bakım" desc="Bilgisayarında yer aç." />
        <div className="bg-[#0a0a0a] border border-[#262626] rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
              <Trash2 className="w-5 h-5 text-zinc-300" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white font-sans">Kullanılmayan imajlar</p>
              <p className="text-xs text-zinc-400 font-sans">
                Her yeniden dağıtımda eski derleme boşta kalır ve yer kaplar. Çalışan uygulamalara dokunulmaz.
              </p>
              {known && unused && (
                <p className="mt-2 font-mono text-lg text-white">
                  {unused.count} imaj
                  <span className="text-zinc-500"> • </span>
                  {formatBytes(unused.size_bytes)}
                </p>
              )}
            </div>
          </div>

          <div className="shrink-0 flex flex-col items-stretch sm:items-end gap-2">
            {prunePhase === 'confirm' ? (
              <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-2">
                <p className="text-[11px] text-zinc-400 font-sans">Silinen imajlar geri gelmez. Emin misin?</p>
                <div className="flex gap-2">
                  <button
                    onClick={handlePrune}
                    className="px-3 py-1.5 bg-white text-black hover:bg-zinc-200 font-semibold text-xs rounded-lg cursor-pointer"
                  >
                    Evet, temizle
                  </button>
                  <button
                    onClick={() => setPrunePhase('idle')}
                    className="px-3 py-1.5 bg-zinc-900 text-zinc-300 hover:text-white border border-zinc-800 text-xs rounded-lg cursor-pointer"
                  >
                    Vazgeç
                  </button>
                </div>
              </motion.div>
            ) : (
              <button
                onClick={() => setPrunePhase('confirm')}
                disabled={!known || prunePhase === 'running' || (unused?.count ?? 0) === 0}
                className="flex items-center justify-center gap-1.5 px-4 py-2 bg-white text-black hover:bg-zinc-200 font-semibold text-xs rounded-lg transition cursor-pointer disabled:bg-zinc-900 disabled:text-zinc-600 disabled:border disabled:border-zinc-800 disabled:cursor-not-allowed"
              >
                {prunePhase === 'running' ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                {prunePhase === 'running' ? 'Temizleniyor…' : 'Temizle'}
              </button>
            )}
            {(prunePhase === 'done' || prunePhase === 'error') && (
              <p className="text-[11px] font-sans text-zinc-300 flex items-center gap-1.5">
                {prunePhase === 'done' && <Check className="w-3.5 h-3.5" />}
                {prunePhase === 'error' ? `Temizlenemedi: ${pruneMessage}` : pruneMessage}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Interface */}
      <section className="space-y-3">
        <SectionTitle title="Arayüz" desc="Bu ayarlar sadece bu tarayıcıda saklanır." />
        <button
          onClick={() => soundManager.toggleSound()}
          role="switch"
          aria-checked={soundOn}
          className="w-full bg-[#0a0a0a] border border-[#262626] hover:border-zinc-700 rounded-2xl p-4 flex items-center gap-4 text-left cursor-pointer transition-colors"
        >
          <div className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
            {soundOn ? <Volume2 className="w-4 h-4 text-zinc-200" /> : <VolumeX className="w-4 h-4 text-zinc-500" />}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-white font-sans">Arayüz sesleri</p>
            <p className="text-xs text-zinc-400 font-sans">Düğmelere basınca kısa tık sesi.</p>
          </div>
          <span
            className={`relative w-10 h-6 rounded-full border transition-colors ${
              soundOn ? 'bg-white border-white' : 'bg-zinc-900 border-zinc-700'
            }`}
          >
            <motion.span
              layout
              transition={{ type: 'spring', stiffness: 500, damping: 32 }}
              className={`absolute top-0.5 w-4 h-4 rounded-full ${soundOn ? 'right-0.5 bg-black' : 'left-0.5 bg-zinc-500'}`}
            />
          </span>
        </button>
      </section>

      {/* How to change */}
      <section className="space-y-3 pb-8">
        <SectionTitle
          title="Sistem ayarları nasıl değiştirilir?"
          desc="Token ve e-posta güvenlik için tarayıcıdan değil, kurulum dosyasından ayarlanır."
        />
        <div className="bg-[#0a0a0a] border border-[#262626] rounded-2xl p-5 space-y-4">
          <ol className="text-xs text-zinc-300 font-sans space-y-2 list-decimal list-inside">
            <li>
              Akson klasöründeki <span className="font-mono text-white">docker-compose.yml</span> dosyasını aç.
            </li>
            <li>
              <span className="font-mono text-white">environment</span> kısmındaki satırın sonuna değeri yaz.
            </li>
            <li>
              Terminalde <span className="font-mono text-white">docker compose up -d</span> yaz. Bu sayfa yenilenince
              değişikliği görürsün.
            </li>
          </ol>
          <div className="bg-[#121212] border border-[#262626] rounded-xl p-3 font-mono text-[11px] text-zinc-300 overflow-x-auto">
            <div className="flex items-center gap-2 text-zinc-500 mb-2">
              <FileCode2 className="w-3.5 h-3.5" />
              docker-compose.yml
            </div>
            <pre className="whitespace-pre">{`    environment:
      - AKSON_TOKEN=uzun-gizli-bir-sifre   # giriş koruması
      - ACME_EMAIL=sen@ornek.com           # HTTPS sertifikası`}</pre>
          </div>
        </div>
      </section>
    </div>
  );
};
