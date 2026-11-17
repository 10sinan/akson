import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Boxes, ChevronDown, GitBranch, Globe, Link2, Plus, Rocket, Sliders, Trash2 } from 'lucide-react';
import { snappySpring } from '../../utils/motion';
import { soundManager } from '../../utils/sound';
import type { ContainerItem } from '../../types/container';
import { api, mapApiContainerToItem } from '../../api/client';
import type { DeployContainerRequest, DeployEvent } from '../../api/client';
import { DeployProgress } from '../deploy/DeployProgress';
import { DeployError, DeploySuccess } from '../deploy/DeployResult';
import { GIT_STEPS, IMAGE_STEPS, KIND_LABELS } from '../deploy/deployModel';
import type { StepState } from '../deploy/deployModel';

interface DeployViewProps {
  onDeploySuccess: (container: ContainerItem) => void;
  onNavigateDashboard: () => void;
  isLiveBackend: boolean;
}

interface TemplateImage {
  id: string;
  name: string;
  image: string;
  defaultPort: number;
  desc: string;
}

const TEMPLATE_IMAGES: TemplateImage[] = [
  { id: 'nginx', name: 'web-frontend', image: 'nginx:alpine', defaultPort: 80, desc: 'Nginx web sunucusu' },
  { id: 'redis', name: 'cache-redis', image: 'redis:7-alpine', defaultPort: 6379, desc: 'Bellek içi önbellek' },
  { id: 'postgres', name: 'db-postgres', image: 'postgres:16-alpine', defaultPort: 5432, desc: 'SQL veritabanı (veriler kalıcı değil)' },
  { id: 'node', name: 'api-service', image: 'node:20-alpine', defaultPort: 3000, desc: 'Boş Node.js ortamı' },
];

type Mode = 'git' | 'image';
type Phase = 'idle' | 'running' | 'success' | 'error';

const inputCls =
  'w-full bg-[#121212] border border-[#262626] rounded-xl px-3.5 py-2 text-white text-xs font-mono focus:outline-none focus:border-white disabled:opacity-50';

const nameFromUrl = (url: string) => {
  const parts = url.trim().replace(/\.git$/, '').replace(/\/+$/, '').split('/');
  return (parts[parts.length - 1] || '').toLowerCase().replace(/[^a-z0-9-]/g, '-');
};

const HOW_IT_WORKS = [
  { icon: Link2, text: 'Linki yapıştır' },
  { icon: Rocket, text: 'Akson derler ve başlatır' },
  { icon: Globe, text: 'Adresin hazır' },
];

export const DeployView: React.FC<DeployViewProps> = ({ onDeploySuccess, onNavigateDashboard, isLiveBackend }) => {
  // Form
  const [mode, setMode] = useState<Mode>('git');
  const [gitUrl, setGitUrl] = useState('');
  const [gitBranch, setGitBranch] = useState('main');
  const [dockerfilePath, setDockerfilePath] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('nginx');
  const [image, setImage] = useState('nginx:alpine');
  const [serviceName, setServiceName] = useState('');
  const [appPort, setAppPort] = useState<number | ''>('');
  const [hostPort, setHostPort] = useState(0);
  const [domain, setDomain] = useState('');
  const [ramLimitMb, setRamLimitMb] = useState(512);
  const [cpuLimitCore, setCpuLimitCore] = useState(1);
  const [envVars, setEnvVars] = useState<Array<{ key: string; value: string }>>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Run state
  const [phase, setPhase] = useState<Phase>('idle');
  const [runMode, setRunMode] = useState<Mode>('git');
  const [stepStates, setStepStates] = useState<Partial<Record<string, StepState>>>({});
  const [stepDetails, setStepDetails] = useState<Partial<Record<string, string>>>({});
  const [logs, setLogs] = useState<string[]>([]);
  const [resultUrl, setResultUrl] = useState<string | undefined>();
  const [errorMessage, setErrorMessage] = useState('');
  const [deployedName, setDeployedName] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const demoTimers = useRef<number[]>([]);

  useEffect(
    () => () => {
      abortRef.current?.abort();
      demoTimers.current.forEach((t) => window.clearTimeout(t));
    },
    []
  );

  const busy = phase === 'running';
  const effectiveName =
    serviceName.trim() ||
    (mode === 'git' ? nameFromUrl(gitUrl) : TEMPLATE_IMAGES.find((t) => t.id === selectedTemplate)?.name || nameFromUrl(image.split(':')[0]));
  const canDeploy = !busy && (mode === 'git' ? gitUrl.trim() !== '' : image.trim() !== '');

  const selectMode = (m: Mode) => {
    if (busy) return;
    soundManager.playClick();
    setMode(m);
    if (m === 'git') {
      setAppPort('');
    } else {
      setAppPort(TEMPLATE_IMAGES.find((t) => t.id === selectedTemplate)?.defaultPort ?? 80);
    }
  };

  const selectTemplate = (tpl: TemplateImage) => {
    if (busy) return;
    soundManager.playClick();
    setSelectedTemplate(tpl.id);
    setImage(tpl.image);
    setAppPort(tpl.defaultPort);
    setServiceName('');
  };

  // Applies one stream event to the visual state.
  const handleEvent = (ev: DeployEvent, onResult: (url?: string) => void, onError: (msg: string) => void) => {
    switch (ev.type) {
      case 'step': {
        setStepStates((prev) => ({ ...prev, [ev.step]: ev.status }));
        let detail: string | undefined;
        // On error the full explanation goes to the error card, not under the step.
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
        onDeploySuccess(mapApiContainerToItem(ev.container));
        onResult(ev.url);
        break;
      case 'error':
        onError(ev.message);
        break;
    }
  };

  // Demo mode only: no backend is reachable, so the steps are played back without deploying anything.
  const runDemo = (m: Mode) => {
    const steps = m === 'git' ? GIT_STEPS : IMAGE_STEPS;
    const events: DeployEvent[] = [];
    steps.forEach((s) => {
      events.push({ type: 'step', step: s.id, status: 'running' });
      events.push({ type: 'log', line: `[demo] ${s.label}` });
      events.push({ type: 'step', step: s.id, status: 'done', detail: s.id === 'detect' ? 'node' : undefined });
    });
    events.forEach((ev, i) => {
      demoTimers.current.push(window.setTimeout(() => handleEvent(ev, () => {}, () => {}), 350 * (i + 1)));
    });
    demoTimers.current.push(window.setTimeout(() => setPhase('success'), 350 * (events.length + 1)));
  };

  const handleDeploy = async () => {
    if (!canDeploy) return;
    soundManager.playClick();
    const name = effectiveName;
    setRunMode(mode);
    setPhase('running');
    setStepStates({});
    setStepDetails({});
    setLogs([]);
    setResultUrl(undefined);
    setErrorMessage('');
    setDeployedName(name);

    if (!isLiveBackend) {
      runDemo(mode);
      return;
    }

    const env: Record<string, string> = {};
    envVars.forEach((e) => {
      if (e.key.trim()) env[e.key.trim()] = e.value;
    });
    const port = appPort === '' ? undefined : Number(appPort);
    const payload: DeployContainerRequest = {
      name,
      image: mode === 'image' ? image.trim() : undefined,
      git_url: mode === 'git' ? gitUrl.trim() : undefined,
      git_branch: mode === 'git' ? gitBranch.trim() || 'main' : undefined,
      dockerfile: mode === 'git' ? dockerfilePath.trim() || undefined : undefined,
      ports: port ? [{ private_port: port, public_port: hostPort || undefined, type: 'tcp' }] : undefined,
      env,
      memory_limit_mb: ramLimitMb,
      cpu_limit: cpuLimitCore,
      network_name: 'akson-bridge',
      restart_policy: 'unless-stopped',
      domain: domain.trim() || undefined,
      port,
    };

    let finished = false;
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      await api.deployStream(
        payload,
        (ev) =>
          handleEvent(
            ev,
            (url) => {
              finished = true;
              setResultUrl(url);
              setPhase('success');
              soundManager.playSuccess();
            },
            (msg) => {
              finished = true;
              setErrorMessage(msg);
              setPhase('error');
            }
          ),
        controller.signal
      );
      if (!finished) {
        setErrorMessage('Bağlantı koptu. Dağıtım sunucuda devam ediyor olabilir, durumunu panelden kontrol et.');
        setPhase('error');
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      setErrorMessage(err instanceof Error ? err.message : String(err));
      setPhase('error');
    }
  };

  const resetToForm = () => {
    soundManager.playClick();
    setPhase('idle');
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-10">
      {/* Heading */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Projeni yayına al</h1>
        <p className="text-sm text-zinc-400">Git linkini yapıştır, Dağıt’a bas. Akson indirir, derler ve sana bir adres verir.</p>
      </div>

      {/* Form card */}
      <div className="bg-[#0a0a0a] border border-[#262626] rounded-2xl p-4 sm:p-6 space-y-5">
        {/* Source toggle */}
        <div className="inline-flex p-1 rounded-xl bg-[#121212] border border-[#262626] text-xs">
          {(
            [
              { m: 'git', label: 'Git linki', Icon: GitBranch },
              { m: 'image', label: 'Hazır şablon', Icon: Boxes },
            ] as const
          ).map(({ m, label, Icon }) => (
            <button
              key={m}
              type="button"
              onClick={() => selectMode(m)}
              disabled={busy}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer disabled:cursor-not-allowed ${
                mode === m ? 'bg-white text-black font-semibold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </div>

        {mode === 'git' ? (
          <div className="flex flex-col sm:flex-row gap-2">
            <label className="relative flex-1">
              <span className="sr-only">Git linki</span>
              <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="url"
                value={gitUrl}
                onChange={(e) => setGitUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleDeploy()}
                disabled={busy}
                placeholder="https://github.com/kullanici/proje"
                className="w-full bg-[#121212] border border-[#262626] rounded-xl pl-11 pr-4 py-3.5 text-white text-sm font-mono focus:outline-none focus:border-white disabled:opacity-50"
              />
            </label>
            <DeployButton onClick={handleDeploy} disabled={!canDeploy} busy={busy} />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {TEMPLATE_IMAGES.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => selectTemplate(tpl)}
                  disabled={busy}
                  className={`text-left p-3 rounded-xl border transition cursor-pointer disabled:cursor-not-allowed ${
                    selectedTemplate === tpl.id ? 'border-white bg-white/5' : 'border-[#262626] hover:border-zinc-500'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-white">{tpl.name}</span>
                    <span className="text-[12px] font-mono text-zinc-400">{tpl.image}</span>
                  </div>
                  <p className="text-[13px] text-zinc-500 mt-0.5">{tpl.desc}</p>
                </button>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <label className="flex-1">
                <span className="sr-only">Docker imajı</span>
                <input
                  type="text"
                  value={image}
                  onChange={(e) => {
                    setImage(e.target.value);
                    setSelectedTemplate('');
                  }}
                  disabled={busy}
                  placeholder="örn: nginx:alpine"
                  className="w-full bg-[#121212] border border-[#262626] rounded-xl px-4 py-3.5 text-white text-sm font-mono focus:outline-none focus:border-white disabled:opacity-50"
                />
              </label>
              <DeployButton onClick={handleDeploy} disabled={!canDeploy} busy={busy} />
            </div>
          </div>
        )}

        {/* How it works: a small picture of the flow while nothing is running */}
        {phase === 'idle' && mode === 'git' && (
          <div className="grid grid-cols-3 gap-2 text-center">
            {HOW_IT_WORKS.map(({ icon: Icon, text }, i) => (
              <div key={text} className="relative flex flex-col items-center gap-1.5 py-2">
                <div className="w-9 h-9 rounded-xl border border-[#262626] bg-[#121212] flex items-center justify-center text-zinc-300">
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-[13px] text-zinc-400 leading-tight">{text}</span>
                {i < HOW_IT_WORKS.length - 1 && (
                  <ArrowRight className="hidden sm:block absolute -right-2 top-4 w-4 h-4 text-zinc-600" />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Advanced settings */}
        <div className="border-t border-[#262626] pt-4">
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="flex items-center gap-2 text-xs text-zinc-400 hover:text-white transition cursor-pointer"
            aria-expanded={showAdvanced}
          >
            <Sliders className="w-3.5 h-3.5" />
            Gelişmiş ayarlar
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
          </button>

          {showAdvanced && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={snappySpring}
              className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs"
            >
              <Field label="Servis adı" hint="Boşsa linkten otomatik alınır">
                <input
                  className={inputCls}
                  value={serviceName}
                  disabled={busy}
                  placeholder={effectiveName || 'my-app'}
                  onChange={(e) => setServiceName(e.target.value)}
                />
              </Field>
              {mode === 'git' && (
                <>
                  <Field label="Branch">
                    <input className={inputCls} value={gitBranch} disabled={busy} onChange={(e) => setGitBranch(e.target.value)} />
                  </Field>
                  <Field label="Dockerfile" hint="Boşsa otomatik bulunur veya üretilir">
                    <input
                      className={inputCls}
                      value={dockerfilePath}
                      disabled={busy}
                      placeholder="otomatik"
                      onChange={(e) => setDockerfilePath(e.target.value)}
                    />
                  </Field>
                </>
              )}
              <Field label="Uygulama portu" hint={mode === 'git' ? 'Boşsa otomatik bulunur' : 'Konteynerin içinde dinlenen port'}>
                <input
                  type="number"
                  className={inputCls}
                  value={appPort}
                  disabled={busy}
                  placeholder="otomatik"
                  onChange={(e) => setAppPort(e.target.value === '' ? '' : Number(e.target.value))}
                />
              </Field>
              <Field label="Dış port" hint="0 = boş bir port otomatik seçilir">
                <input
                  type="number"
                  className={inputCls}
                  value={hostPort}
                  disabled={busy}
                  onChange={(e) => setHostPort(Number(e.target.value) || 0)}
                />
              </Field>
              <Field label="Alan adı (Traefik)" hint="Sadece Traefik çalışıyorsa açılır">
                <input
                  className={inputCls}
                  value={domain}
                  disabled={busy}
                  placeholder="uygulama.siten.com"
                  onChange={(e) => setDomain(e.target.value)}
                />
              </Field>
              <Field label={`RAM sınırı: ${ramLimitMb} MB`}>
                <input
                  type="range"
                  min={128}
                  max={4096}
                  step={128}
                  value={ramLimitMb}
                  disabled={busy}
                  onChange={(e) => setRamLimitMb(Number(e.target.value))}
                  className="w-full accent-white"
                />
              </Field>
              <Field label={`CPU sınırı: ${cpuLimitCore} çekirdek`}>
                <input
                  type="range"
                  min={0.25}
                  max={4}
                  step={0.25}
                  value={cpuLimitCore}
                  disabled={busy}
                  onChange={(e) => setCpuLimitCore(Number(e.target.value))}
                  className="w-full accent-white"
                />
              </Field>

              <div className="sm:col-span-2 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] text-zinc-400">Ortam değişkenleri (ENV)</span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setEnvVars((prev) => [...prev, { key: '', value: '' }])}
                    className="inline-flex items-center gap-1 text-[13px] text-zinc-300 hover:text-white cursor-pointer disabled:opacity-50"
                  >
                    <Plus className="w-3 h-3" /> Ekle
                  </button>
                </div>
                {envVars.length === 0 && <p className="text-[13px] text-zinc-600">Henüz değişken yok.</p>}
                {envVars.map((ev, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      className={inputCls}
                      placeholder="ANAHTAR"
                      value={ev.key}
                      disabled={busy}
                      onChange={(e) => setEnvVars((prev) => prev.map((x, j) => (j === i ? { ...x, key: e.target.value } : x)))}
                    />
                    <input
                      className={inputCls}
                      placeholder="değer"
                      value={ev.value}
                      disabled={busy}
                      onChange={(e) => setEnvVars((prev) => prev.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))}
                    />
                    <button
                      type="button"
                      aria-label="Değişkeni sil"
                      disabled={busy}
                      onClick={() => setEnvVars((prev) => prev.filter((_, j) => j !== i))}
                      className="px-2 text-zinc-500 hover:text-white cursor-pointer disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Live progress */}
      {phase !== 'idle' && (
        <DeployProgress
          steps={runMode === 'git' ? GIT_STEPS : IMAGE_STEPS}
          states={stepStates}
          details={stepDetails}
          logs={logs}
          demo={!isLiveBackend}
        />
      )}

      {/* Outcome */}
      {phase === 'success' && (
        <DeploySuccess
          name={deployedName}
          url={resultUrl}
          demo={!isLiveBackend}
          onRedeploy={resetToForm}
          onDashboard={onNavigateDashboard}
        />
      )}
      {phase === 'error' && <DeployError message={errorMessage} onRetry={resetToForm} />}
    </div>
  );
};

const DeployButton: React.FC<{ onClick: () => void; disabled: boolean; busy: boolean }> = ({ onClick, disabled, busy }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className="inline-flex items-center justify-center gap-2 bg-white text-black text-sm font-semibold rounded-xl px-6 py-3.5 hover:bg-zinc-200 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
  >
    <Rocket className={`w-4 h-4 ${busy ? 'animate-pulse' : ''}`} />
    {busy ? 'Dağıtılıyor…' : 'Dağıt'}
  </button>
);

const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({ label, hint, children }) => (
  <label className="block space-y-1.5">
    <span className="text-[13px] text-zinc-400">{label}</span>
    {children}
    {hint && <span className="block text-[12px] text-zinc-600">{hint}</span>}
  </label>
);
