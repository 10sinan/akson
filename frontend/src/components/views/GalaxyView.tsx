import React, { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, GitBranch, GitCommitHorizontal, Loader2, Orbit, Rocket, CircleAlert } from 'lucide-react';
import type { ContainerItem } from '../../types/container';
import { api, mapApiContainerToItem, type ApiBranch, type DeployEvent } from '../../api/client';
import { DeployProgress } from '../deploy/DeployProgress';
import { GIT_STEPS, KIND_LABELS, friendlyError, type StepState } from '../deploy/deployModel';
import { soundManager } from '../../utils/sound';
import { snappySpring } from '../../utils/motion';
import type { GalaxyBranch, GalaxyPlanet } from '../three/GalaxyScene3D';
import { MAX_3D_BRANCHES } from '../three/GalaxyScene3D';

// three.js ships in its own chunk, like the ambient scene.
const GalaxyScene3D = lazy(() => import('../three/GalaxyScene3D'));

interface GalaxyViewProps {
  containers: ContainerItem[];
  /** true when the backend and Docker are reachable; otherwise demo data is shown. */
  live: boolean;
  reducedMotion: boolean;
  /** Called with the new container after a branch was redeployed. */
  onRedeployed: (container: ContainerItem) => void;
}

interface AppEntry {
  id: string;
  name: string;
  running: boolean;
  repo?: string;
  branch?: string;
  commit?: string;
}

type BranchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; branches: ApiBranch[]; deployedBranch: string };

type RunPhase = 'idle' | 'running' | 'success' | 'error';

// Demo mode: a few made-up apps so the view can be tried without Docker.
const DEMO_APPS: (AppEntry & { demoBranches?: string[] })[] = [
  {
    id: 'demo-shop',
    name: 'magaza-web',
    running: true,
    repo: 'https://github.com/ornek/magaza-web',
    branch: 'main',
    commit: 'a1b2c3d4e5f6',
    demoBranches: ['main', 'develop', 'feature/sepet', 'feature/odeme', 'fix/giris-hatasi'],
  },
  {
    id: 'demo-api',
    name: 'api',
    running: true,
    repo: 'https://github.com/ornek/api',
    branch: 'v2',
    commit: '0f9e8d7c6b5a',
    demoBranches: ['main', 'v2', 'feature/rate-limit'],
  },
  { id: 'demo-db', name: 'postgres', running: true },
  {
    id: 'demo-worker',
    name: 'kuyruk-isci',
    running: false,
    repo: 'https://github.com/ornek/kuyruk-isci',
    branch: 'master',
    commit: '123abc456def',
    demoBranches: ['master', 'dev'],
  },
];

const fakeSha = (name: string) =>
  Array.from({ length: 40 }, (_, i) => ((name.charCodeAt(i % name.length) * (i + 7)) % 16).toString(16)).join('');

const shortSha = (sha?: string) => (sha ? sha.slice(0, 7) : '');

/** Plain Turkish explanation for a branch-list error. */
function branchError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('not deployed from a git repository')) {
    return 'Bu uygulama Git’ten kurulmamış ya da dal takibi eklenmeden önce kurulmuş. Bir kez yeniden kurarsan dalları burada görünür.';
  }
  if (m.includes('could not read branches')) {
    return 'Dallar okunamadı. Reponun herkese açık olduğundan emin ol (özel repolar henüz desteklenmiyor).';
  }
  if (m.includes('local or link-local') || m.includes('could not resolve')) {
    return 'Repo adresine ulaşılamadı.';
  }
  return message;
}

export const GalaxyView: React.FC<GalaxyViewProps> = ({ containers, live, reducedMotion, onRedeployed }) => {
  const [focusId, setFocusId] = useState<string | null>(null);
  const [branchState, setBranchState] = useState<BranchState>({ status: 'idle' });
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [webglOk, setWebglOk] = useState(true);
  const [demoDeployed, setDemoDeployed] = useState<Record<string, string>>({});

  const [phase, setPhase] = useState<RunPhase>('idle');
  const [stepStates, setStepStates] = useState<Partial<Record<string, StepState>>>({});
  const [stepDetails, setStepDetails] = useState<Partial<Record<string, string>>>({});
  const [logs, setLogs] = useState<string[]>([]);
  const [runError, setRunError] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const demoTimers = useRef<number[]>([]);
  const fetchSeq = useRef(0);

  useEffect(
    () => () => {
      abortRef.current?.abort();
      demoTimers.current.forEach((t) => window.clearTimeout(t));
    },
    []
  );

  const apps: AppEntry[] = useMemo(() => {
    if (!live) {
      return DEMO_APPS.map((a) => ({ ...a, branch: demoDeployed[a.id] ?? a.branch }));
    }
    return containers.map((c) => ({
      id: c.id,
      name: c.name,
      running: c.status === 'running',
      repo: c.git?.url,
      branch: c.git?.branch,
      commit: c.git?.commit,
    }));
  }, [live, containers, demoDeployed]);

  const focused = apps.find((a) => a.id === focusId) ?? null;
  const busy = phase === 'running';

  const planets: GalaxyPlanet[] = useMemo(
    () => apps.map((a) => ({ id: a.id, label: a.name, running: a.running, hasGit: Boolean(a.repo) })),
    [apps]
  );

  const branchList: ApiBranch[] = useMemo(
    () => (branchState.status === 'ready' ? branchState.branches : []),
    [branchState]
  );
  const sceneBranches: GalaxyBranch[] = useMemo(
    () =>
      branchList.map((b, i) => ({
        name: b.name,
        deployed: b.deployed,
        isDefault: i === 0 && (b.name === 'main' || b.name === 'master'),
      })),
    [branchList]
  );

  const loadBranches = useCallback(
    async (app: AppEntry) => {
      const seq = ++fetchSeq.current;
      if (!app.repo) {
        setBranchState({ status: 'idle' });
        return;
      }
      if (!live) {
        const demo = DEMO_APPS.find((d) => d.id === app.id);
        const deployed = app.branch ?? '';
        setBranchState({
          status: 'ready',
          deployedBranch: deployed,
          branches: (demo?.demoBranches ?? []).map((name) => ({
            name,
            commit: fakeSha(name),
            deployed: name === deployed,
          })),
        });
        return;
      }
      setBranchState({ status: 'loading' });
      try {
        const res = await api.fetchBranches(app.id);
        if (seq !== fetchSeq.current) return; // a newer request won
        setBranchState({ status: 'ready', branches: res.branches, deployedBranch: res.deployed_branch });
      } catch (err) {
        if (seq !== fetchSeq.current) return;
        setBranchState({ status: 'error', message: branchError(err instanceof Error ? err.message : String(err)) });
      }
    },
    [live]
  );

  const resetRun = () => {
    setPhase('idle');
    setStepStates({});
    setStepDetails({});
    setLogs([]);
    setRunError('');
  };

  const openApp = useCallback(
    (id: string) => {
      if (busy) return;
      const app = apps.find((a) => a.id === id);
      if (!app) return;
      soundManager.playClick();
      setFocusId(id);
      setSelectedBranch(null);
      resetRun();
      void loadBranches(app);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [apps, busy, loadBranches]
  );

  const goBack = useCallback(() => {
    if (busy) return;
    soundManager.playPop();
    fetchSeq.current++;
    setFocusId(null);
    setSelectedBranch(null);
    setBranchState({ status: 'idle' });
    resetRun();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy]);

  const pickBranch = useCallback(
    (name: string) => {
      if (busy) return;
      soundManager.playClick();
      setSelectedBranch((prev) => (prev === name ? null : name));
      resetRun();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [busy]
  );

  // Esc leaves the galaxy.
  useEffect(() => {
    if (!focusId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') goBack();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [focusId, goBack]);

  const handleEvent = (ev: DeployEvent, onResult: (c: ContainerItem) => void) => {
    switch (ev.type) {
      case 'step': {
        setStepStates((prev) => ({ ...prev, [ev.step]: ev.status }));
        let detail: string | undefined;
        if (ev.step === 'detect' && ev.status === 'done' && ev.detail) detail = KIND_LABELS[ev.detail] ?? ev.detail;
        if (ev.step === 'clone' && ev.status === 'done' && ev.detail) detail = `commit ${ev.detail}`;
        if (ev.step === 'ready' && ev.detail) detail = ev.detail;
        if (detail) setStepDetails((prev) => ({ ...prev, [ev.step]: detail }));
        break;
      }
      case 'log':
        setLogs((prev) => [...prev, ...ev.line.split('\n').filter((l) => l.trim() !== '')]);
        break;
      case 'result':
        onResult(mapApiContainerToItem(ev.container));
        break;
      case 'error':
        setRunError(ev.message);
        setPhase('error');
        break;
    }
  };

  const deployBranch = async () => {
    if (!focused || !selectedBranch || busy) return;
    soundManager.playClick();
    const app = focused;
    const branch = selectedBranch;
    resetRun();
    setPhase('running');

    if (!live) {
      const events: DeployEvent[] = [];
      GIT_STEPS.forEach((s) => {
        events.push({ type: 'step', step: s.id, status: 'running' });
        events.push({ type: 'log', line: `[demo] ${s.label} (${branch})` });
        events.push({ type: 'step', step: s.id, status: 'done', detail: s.id === 'detect' ? 'node' : undefined });
      });
      events.forEach((ev, i) => {
        demoTimers.current.push(window.setTimeout(() => handleEvent(ev, () => {}), 260 * (i + 1)));
      });
      demoTimers.current.push(
        window.setTimeout(() => {
          setPhase('success');
          soundManager.playSuccess();
          setDemoDeployed((prev) => ({ ...prev, [app.id]: branch }));
          void loadBranches({ ...app, branch });
        }, 260 * (events.length + 1))
      );
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    let finished = false;
    try {
      await api.redeployBranch(
        app.id,
        branch,
        (ev) =>
          handleEvent(ev, (item) => {
            finished = true;
            setPhase('success');
            soundManager.playSuccess();
            onRedeployed(item);
            // The rebuilt app is a new container: follow it and refresh its branches.
            setFocusId(item.id);
            void loadBranches({ id: item.id, name: item.name, running: true, repo: app.repo, branch });
          }),
        controller.signal
      );
      if (!finished) {
        setPhase((p) => (p === 'running' ? 'error' : p));
        setRunError((m) => m || 'Bağlantı kesildi. Dağıtım arka planda sürüyor olabilir; listeyi yenile.');
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      setRunError(err instanceof Error ? err.message : String(err));
      setPhase('error');
    }
  };

  const selected = branchList.find((b) => b.name === selectedBranch) ?? null;
  const hiddenCount = Math.max(0, branchList.length - MAX_3D_BRANCHES);
  const error = runError ? friendlyError(runError) : null;

  return (
    <div className="flex flex-col flex-1 space-y-6">
      {/* Başlık */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-[#262626]">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3 font-sans">
            <Orbit className="w-6 h-6" /> Galaksi
          </h1>
          <p className="text-xs text-zinc-300 mt-1 font-sans">
            Her uygulama bir gezegen. Gezegene tıkla, Git dalları kendi galaksisinde açılsın.
          </p>
        </div>
        <nav aria-label="Konum" className="flex items-center gap-2 text-xs font-mono text-zinc-300">
          <button
            type="button"
            onClick={goBack}
            disabled={!focusId || busy}
            className={`px-2 py-1 rounded-lg border transition ${
              focusId ? 'border-[#262626] hover:border-zinc-500 hover:text-white cursor-pointer' : 'border-transparent text-white'
            } disabled:cursor-default`}
          >
            Evren
          </button>
          {focused && (
            <>
              <span aria-hidden="true">/</span>
              <span className="px-2 py-1 rounded-lg border border-white/30 text-white">{focused.name}</span>
            </>
          )}
        </nav>
      </div>

      {!live && (
        <div className="px-4 py-2.5 rounded-xl border border-[#262626] bg-[#0a0a0a] text-xs text-zinc-300 font-sans">
          Demo verisi gösteriliyor: uygulamalar ve dallar örnek. Yayınla düğmesi gerçek bir şey kurmaz.
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* 3D harita */}
        <div className="xl:col-span-8 relative h-[420px] sm:h-[560px] rounded-2xl border border-[#262626] bg-black overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:28px_28px] pointer-events-none" />
          {webglOk ? (
            <Suspense
              fallback={
                <div className="absolute inset-0 flex items-center justify-center text-xs text-zinc-400">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" /> Harita yükleniyor…
                </div>
              }
            >
              <GalaxyScene3D
                planets={planets}
                focusId={focusId}
                focusLabel={focused?.name ?? ''}
                branches={sceneBranches}
                selectedBranch={selectedBranch}
                reducedMotion={reducedMotion}
                onPickPlanet={openApp}
                onPickBranch={pickBranch}
                onUnsupported={() => setWebglOk(false)}
              />
            </Suspense>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-xs text-zinc-300">
              Tarayıcın 3D (WebGL) desteklemiyor. Sağdaki listeden aynı işlemleri yapabilirsin.
            </div>
          )}

          {focusId && (
            <button
              type="button"
              onClick={goBack}
              disabled={busy}
              className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900/90 border border-zinc-700 text-xs text-white hover:bg-zinc-800 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Evrene dön <span className="text-zinc-400 font-mono">Esc</span>
            </button>
          )}
          {focusId && branchState.status === 'loading' && (
            <div className="absolute bottom-3 left-3 flex items-center gap-2 text-xs text-zinc-300">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Dallar okunuyor…
            </div>
          )}
          {focusId && hiddenCount > 0 && (
            <div className="absolute bottom-3 right-3 text-[12px] font-mono text-zinc-400">
              +{hiddenCount} dal daha (listede)
            </div>
          )}
          {!focusId && apps.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-zinc-400">
              Henüz uygulama yok. Yeni Dağıtım sekmesinden bir Git reposu kur.
            </div>
          )}
        </div>

        {/* Yan panel */}
        <aside className="xl:col-span-4 space-y-4">
          <AnimatePresence mode="wait" initial={false}>
            {!focused ? (
              <motion.section
                key="universe"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={snappySpring}
                className="bg-[#0a0a0a] border border-[#262626] rounded-2xl p-4 space-y-3"
              >
                <h2 className="text-sm font-semibold text-white">Uygulamalar</h2>
                <ul className="space-y-1.5">
                  {apps.map((a) => (
                    <li key={a.id}>
                      <button
                        type="button"
                        onClick={() => openApp(a.id)}
                        className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl border border-[#262626] hover:border-zinc-500 bg-black text-left transition cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${a.running ? 'bg-zinc-100' : 'border border-zinc-500'}`}
                            aria-label={a.running ? 'çalışıyor' : 'durdu'}
                          />
                          <span className="text-xs font-semibold text-white truncate">{a.name}</span>
                        </span>
                        {a.repo ? (
                          <span className="flex items-center gap-1 text-[12px] font-mono text-zinc-300 shrink-0">
                            <GitBranch className="w-3 h-3" />
                            {a.branch || '—'}
                          </span>
                        ) : (
                          <span className="text-[12px] text-zinc-500 shrink-0">Git yok</span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
                <p className="text-[12px] text-zinc-400">
                  Halkalı gezegenler Git’ten kuruldu. Diğerleri hazır imajdan.
                </p>
              </motion.section>
            ) : (
              <motion.section
                key={`galaxy-${focused.id}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={snappySpring}
                className="bg-[#0a0a0a] border border-[#262626] rounded-2xl p-4 space-y-4"
              >
                <div>
                  <h2 className="text-sm font-semibold text-white">{focused.name}</h2>
                  {focused.repo ? (
                    <p className="text-[12px] font-mono text-zinc-400 break-all mt-0.5">{focused.repo}</p>
                  ) : (
                    <p className="text-xs text-zinc-300 mt-1">
                      Bu uygulama hazır bir imajdan kuruldu, Git dalı yok.
                    </p>
                  )}
                </div>

                {branchState.status === 'error' && (
                  <div className="flex gap-2 text-xs text-zinc-200 bg-black border border-[#262626] rounded-xl p-3">
                    <CircleAlert className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{branchState.message}</span>
                  </div>
                )}

                {branchState.status === 'ready' && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-zinc-300">Dallar ({branchList.length})</h3>
                    <ul className="max-h-64 overflow-y-auto space-y-1 pr-1">
                      {branchList.map((b) => {
                        const isSel = b.name === selectedBranch;
                        return (
                          <li key={b.name}>
                            <button
                              type="button"
                              onClick={() => pickBranch(b.name)}
                              aria-pressed={isSel}
                              disabled={busy}
                              className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg border text-left transition cursor-pointer disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                                isSel ? 'border-white bg-zinc-900' : 'border-[#262626] hover:border-zinc-500 bg-black'
                              }`}
                            >
                              <span className="flex items-center gap-2 min-w-0">
                                <GitBranch className="w-3.5 h-3.5 shrink-0 text-zinc-300" />
                                <span className="text-xs font-mono text-white truncate">{b.name}</span>
                              </span>
                              {b.deployed && (
                                <span className="shrink-0 text-[11px] font-semibold text-black bg-white rounded-full px-1.5">
                                  yayında
                                </span>
                              )}
                            </button>
                          </li>
                        );
                      })}
                      {branchList.length === 0 && <li className="text-xs text-zinc-400">Repoda dal bulunamadı.</li>}
                    </ul>
                  </div>
                )}

                {selected && (
                  <div className="border-t border-[#262626] pt-4 space-y-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm font-mono text-white">
                        <GitBranch className="w-4 h-4" /> {selected.name}
                      </div>
                      <div className="flex items-center gap-2 text-[12px] font-mono text-zinc-300">
                        <GitCommitHorizontal className="w-3.5 h-3.5" /> son commit {shortSha(selected.commit)}
                        {live && selected.deployed && focused.commit && shortSha(focused.commit) !== shortSha(selected.commit) && (
                          <span className="text-zinc-400">(yayındaki: {shortSha(focused.commit)}, yeni commit var)</span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={deployBranch}
                      disabled={busy}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-semibold transition active:scale-95 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Rocket className="w-3.5 h-3.5" />}
                      {selected.deployed ? 'Bu dalı yeniden yayınla' : 'Bu dalı yayınla'}
                    </button>
                    <p className="text-[12px] text-zinc-400">
                      {focused.name} bu daldan yeniden derlenir. Ortam değişkenleri, portlar ve alan adı korunur; yeni
                      sürüm hazır olana kadar eskisi çalışmaya devam eder.
                    </p>
                  </div>
                )}
              </motion.section>
            )}
          </AnimatePresence>

          {phase !== 'idle' && (
            <div className="space-y-3">
              <DeployProgress steps={GIT_STEPS} states={stepStates} details={stepDetails} logs={logs} demo={!live} />
              {phase === 'success' && (
                <div className="text-xs text-white bg-[#0a0a0a] border border-white/30 rounded-xl p-3">
                  Yayınlandı. Galakside parlayan gezegen artık bu dal.
                </div>
              )}
              {phase === 'error' && error && (
                <div className="text-xs bg-[#0a0a0a] border border-[#262626] rounded-xl p-3 space-y-1">
                  <div className="font-semibold text-white">{error.title}</div>
                  <div className="text-zinc-300">{error.hint}</div>
                </div>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};
