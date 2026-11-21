import type { ContainerEnvVar, ContainerItem, ContainerStatus } from '../types/container';

export interface ApiHealth {
  status: string;
  docker: string;
  db: string;
  time: string;
}

export interface ApiPortMapping {
  ip?: string;
  private_port: number;
  public_port?: number;
  type: string;
}

export interface ApiContainer {
  id: string;
  name: string;
  image: string;
  state: string; // "running", "exited", "paused", "restarting"
  status: string; // e.g. "Up 2 hours", "Exited (0) 5 minutes ago"
  created: number;
  ports: ApiPortMapping[];
  labels: Record<string, string>;
}

export interface ApiContainerStats {
  container_id: string;
  cpu_percent: number;
  memory_usage: number; // in bytes
  memory_limit: number; // in bytes
  memory_percent: number;
  net_rx_bytes: number;
  net_tx_bytes: number;
  block_read_bytes: number;
  block_write_bytes: number;
  read_at: string;
}

export interface ApiLogEntry {
  timestamp: string;
  stream: string; // "stdout" | "stderr"
  message: string;
}

export interface ApiNetworkDetails {
  id: string;
  name: string;
  driver: string;
  subnet?: string;
  gateway?: string;
  containers: Record<string, string>;
}

export interface DeployContainerRequest {
  name: string;
  image?: string;
  ports?: ApiPortMapping[];
  env?: Record<string, string>;
  labels?: Record<string, string>;
  memory_limit_mb?: number;
  cpu_limit?: number;
  network_name?: string;
  restart_policy?: string;
  domain?: string;
  port?: number;
  path_prefix?: string;
  enable_tls?: boolean;
  branch?: string;
  commit_hash?: string;
  git_url?: string;
  git_branch?: string;
  dockerfile?: string;
}

export interface DeployContainerResult {
  container: ApiContainer;
  logs: string[];
}

export type DeployStep = 'clone' | 'detect' | 'build' | 'pull' | 'start' | 'ready';
export type DeployStepStatus = 'running' | 'done' | 'error';

/** One line of the live deploy stream (POST /api/v1/deployments/stream). */
export type DeployEvent =
  | { type: 'step'; step: DeployStep; status: DeployStepStatus; detail?: string }
  | { type: 'log'; line: string }
  | { type: 'result'; container: ApiContainer; url?: string }
  | { type: 'error'; message: string };

/** One branch of a deployed app's repository (GET /containers/{id}/branches). */
export interface ApiBranch {
  name: string;
  commit: string;
  deployed: boolean;
}

export interface ApiBranchesResponse {
  repo: string;
  deployed_branch: string;
  deployed_commit: string;
  branches: ApiBranch[];
}

const API_BASE = '';

/**
 * API token (AKSON_TOKEN on the server), saved in this browser with
 * localStorage.setItem('akson_token', '<token>'). Empty when auth is off.
 */
function getToken(): string {
  try {
    return localStorage.getItem('akson_token') ?? '';
  } catch {
    return '';
  }
}

/** fetch for /api/v1 calls: adds the Authorization header when a token is saved. */
function apiFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const token = getToken();
  if (!token) return fetch(url, init);
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  return fetch(url, { ...init, headers });
}

/** Reads an NDJSON deploy stream (one DeployEvent per line) and calls onEvent for each line. */
async function readDeployStream(res: Response, onEvent: (ev: DeployEvent) => void): Promise<void> {
  if (!res.ok || !res.body) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Deploy failed with HTTP ${res.status}`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const flush = (line: string) => {
    if (!line.trim()) return;
    try {
      onEvent(JSON.parse(line) as DeployEvent);
    } catch {
      // ignore a malformed line rather than breaking the whole stream
    }
  };
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    lines.forEach(flush);
  }
  flush(buffer);
}

/** EventSource cannot send headers, so the token goes in the query string. */
function withToken(url: string): string {
  const token = getToken();
  if (!token) return url;
  return `${url}${url.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`;
}

/**
 * Transforms backend Docker ContainerInfo into frontend ContainerItem.
 */
export function mapApiContainerToItem(apiC: ApiContainer): ContainerItem {
  const isRunning = apiC.state === 'running';
  const tag = apiC.image.includes(':') ? apiC.image.split(':')[1] : 'latest';
  const cleanImage = apiC.image.includes(':') ? apiC.image.split(':')[0] : apiC.image;

  // Auto-detect category
  let category: 'core' | 'service' | 'database' | 'worker' = 'service';
  const lower = (apiC.name + ' ' + apiC.image).toLowerCase();
  if (
    lower.includes('traefik') ||
    lower.includes('proxy') ||
    lower.includes('akson') ||
    lower.includes('gateway')
  ) {
    category = 'core';
  } else if (
    lower.includes('postgres') ||
    lower.includes('mysql') ||
    lower.includes('redis') ||
    lower.includes('mongo')
  ) {
    category = 'database';
  } else if (
    lower.includes('worker') ||
    lower.includes('queue') ||
    lower.includes('cron') ||
    lower.includes('celery')
  ) {
    category = 'worker';
  }

  // Traefik route label check
  let traefikRoute: string | undefined;
  for (const [key, val] of Object.entries(apiC.labels || {})) {
    if (key.includes('routers') && key.endsWith('.rule')) {
      traefikRoute = val;
      break;
    }
  }

  const gitUrl = apiC.labels?.['akson.git.url'];
  const git = gitUrl
    ? {
        url: gitUrl,
        branch: apiC.labels['akson.git.branch'] || '',
        commit: apiC.labels['akson.git.commit'] || '',
      }
    : undefined;

  return {
    git,
    id: apiC.id.substring(0, 12),
    name: apiC.name || 'unnamed-container',
    image: cleanImage,
    tag: tag,
    status: (isRunning ? 'running' : 'stopped') as ContainerStatus,
    statusText: isRunning ? 'Çevrimiçi' : 'Durduruldu',
    subtitle: `${cleanImage}:${tag}`,
    category,
    uptime: apiC.status,
    cpuPercent: 0,
    memoryUsageMb: 0,
    memoryLimitMb: 512,
    ports: (apiC.ports || []).map((p) => ({
      hostPort: p.public_port || 0,
      containerPort: p.private_port,
      protocol: (p.type || 'tcp') as 'tcp' | 'udp',
    })),
    traefikRoute,
    network: 'akson-bridge',
    ipAddress: '',
    restartCount: 0,
    logs: [`[akson] Canlı Docker konteyneri: ${apiC.name} (${cleanImage})`],
    env: Object.entries(apiC.labels || {})
      .slice(0, 6)
      .map(([k, v]) => ({
        key: k,
        value: v,
      })),
  };
}

export interface ApiSystemInfo {
  docker?: { version: string; api_version: string; os: string; arch: string };
  docker_error?: string;
  unused_images?: { count: number; size_bytes: number };
  traefik_running: boolean;
  auth_enabled: boolean;
  acme_email_set: boolean;
  db_path: string;
  serves_frontend: boolean;
}

export interface ApiPruneResult {
  deleted: number;
  space_reclaimed: number;
}

export const api = {
  /**
   * Pings backend health endpoint to check Docker and DB status.
   */
  async checkHealth(): Promise<ApiHealth> {
    const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) throw new Error(`Health check failed: HTTP ${res.status}`);
    return res.json();
  },

  /**
   * Fetches real container list from Docker daemon via Go backend.
   */
  async fetchContainers(): Promise<ContainerItem[]> {
    const res = await apiFetch(`${API_BASE}/api/v1/containers/`, {
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) throw new Error(`Fetch containers failed: HTTP ${res.status}`);
    const rawList: ApiContainer[] = await res.json();
    const items = rawList.map(mapApiContainerToItem);

    // Real CPU/RAM for running containers; a container whose stats can't be read keeps 0.
    await Promise.all(
      items.map(async (item) => {
        if (item.status !== 'running') return;
        try {
          const st = await api.fetchContainerStats(item.id);
          item.cpuPercent = +st.cpu_percent.toFixed(1);
          item.memoryUsageMb = Math.round(st.memory_usage / (1024 * 1024));
          if (st.memory_limit > 0) item.memoryLimitMb = Math.round(st.memory_limit / (1024 * 1024));
        } catch {
          // keep the zero defaults
        }
      })
    );
    return items;
  },

  /**
   * Performs start, stop, restart, or delete on a container via Docker SDK.
   */
  async containerAction(
    id: string,
    action: 'start' | 'stop' | 'restart' | 'delete'
  ): Promise<{ status: string; message: string }> {
    const res =
      action === 'delete'
        ? await apiFetch(`${API_BASE}/api/v1/containers/${id}`, {
            method: 'DELETE',
            signal: AbortSignal.timeout(30000),
          })
        : await apiFetch(`${API_BASE}/api/v1/containers/${id}/actions/${action}`, {
            method: 'POST',
            signal: AbortSignal.timeout(15000),
          });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Container action '${action}' failed: HTTP ${res.status}`);
    }
    return res.json();
  },

  /**
   * Fetches the container's real environment variables (Docker inspect Config.Env).
   */
  async fetchContainerEnv(id: string): Promise<ContainerEnvVar[]> {
    const res = await apiFetch(`${API_BASE}/api/v1/containers/${id}`, {
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) throw new Error(`Fetch env failed: HTTP ${res.status}`);
    const data: { Config?: { Env?: string[] } } = await res.json();
    const secretKey = /(PASS|SECRET|TOKEN|KEY|PWD|CREDENTIAL)/i;
    return (data.Config?.Env || []).map((line) => {
      const i = line.indexOf('=');
      const key = i === -1 ? line : line.slice(0, i);
      const value = i === -1 ? '' : line.slice(i + 1);
      return { key, value, secret: secretKey.test(key) };
    });
  },

  /**
   * Recreates a managed container with a new environment (new container id).
   */
  async updateContainerEnv(id: string, env: Record<string, string>): Promise<void> {
    const res = await apiFetch(`${API_BASE}/api/v1/containers/${id}/env`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ env }),
      signal: AbortSignal.timeout(120000),
    });
    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try {
        const data = await res.json();
        msg = data.error || data.message || msg;
      } catch {
        // keep the HTTP status message
      }
      throw new Error(msg);
    }
  },

  /**
   * Fetches a one-shot resource telemetry snapshot for a container.
   */
  async fetchContainerStats(id: string): Promise<ApiContainerStats> {
    const res = await apiFetch(`${API_BASE}/api/v1/containers/${id}/stats`, {
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) throw new Error(`Fetch stats failed: HTTP ${res.status}`);
    return res.json();
  },

  /**
   * Connects to Server-Sent Events (SSE) live logs stream for a container.
   * Returns a cleanup function to close the stream.
   */
  createLogStream(
    id: string,
    onEntry: (entry: ApiLogEntry) => void,
    onError?: (err: Event) => void
  ): () => void {
    const eventSource = new EventSource(withToken(`${API_BASE}/api/v1/containers/${id}/logs/stream?tail=100`));

    eventSource.onmessage = (event) => {
      try {
        const data: ApiLogEntry = JSON.parse(event.data);
        onEntry(data);
      } catch {
        // Raw text line fallback
        onEntry({
          timestamp: new Date().toISOString(),
          stream: 'stdout',
          message: event.data,
        });
      }
    };

    eventSource.onerror = (err) => {
      if (onError) onError(err);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  },

  /**
   * Connects to Server-Sent Events (SSE) live stats stream for a container.
   * Returns a cleanup function to close the stream.
   */
  createStatsStream(
    id: string,
    onStats: (stats: ApiContainerStats) => void,
    onError?: (err: Event) => void
  ): () => void {
    const eventSource = new EventSource(withToken(`${API_BASE}/api/v1/containers/${id}/stats/stream`));

    eventSource.onmessage = (event) => {
      try {
        const stats: ApiContainerStats = JSON.parse(event.data);
        onStats(stats);
      } catch {
        // Ignore json parse error
      }
    };

    eventSource.onerror = (err) => {
      if (onError) onError(err);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  },

  /**
   * Fetches akson-bridge topology and connected containers.
   */
  async fetchNetworkDetails(): Promise<ApiNetworkDetails> {
    const res = await apiFetch(`${API_BASE}/api/v1/network`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`Fetch network failed: HTTP ${res.status}`);
    return res.json();
  },

  /**
   * Deploys and streams progress events as they happen. Resolves when the stream ends.
   * Aborting the signal stops reading; the deployment itself keeps running on the server.
   */
  async deployStream(
    req: DeployContainerRequest,
    onEvent: (ev: DeployEvent) => void,
    signal?: AbortSignal
  ): Promise<void> {
    const res = await apiFetch(`${API_BASE}/api/v1/deployments/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
      signal,
    });
    await readDeployStream(res, onEvent);
  },

  /**
   * Lists the branches of the repository a git-deployed container was built from.
   */
  async fetchBranches(id: string): Promise<ApiBranchesResponse> {
    const res = await apiFetch(`${API_BASE}/api/v1/containers/${id}/branches`, {
      signal: AbortSignal.timeout(35000),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Branches failed with HTTP ${res.status}`);
    }
    return res.json();
  },

  /**
   * Rebuilds a git-deployed container from another branch, streaming progress like deployStream.
   */
  async redeployBranch(
    id: string,
    branch: string,
    onEvent: (ev: DeployEvent) => void,
    signal?: AbortSignal
  ): Promise<void> {
    const res = await apiFetch(`${API_BASE}/api/v1/containers/${id}/redeploy-branch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ branch }),
      signal,
    });
    await readDeployStream(res, onEvent);
  },

  /**
   * Deploys a new container from scratch via Docker daemon (pull, configure, network, start).
   */
  async deployContainer(req: DeployContainerRequest): Promise<DeployContainerResult> {
    const res = await apiFetch(`${API_BASE}/api/v1/containers/deploy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
      // Image pull might take time; a git clone + Dockerfile build can take much longer.
      signal: AbortSignal.timeout(req.git_url ? 600000 : 120000),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Deploy failed with HTTP ${res.status}`);
    }
    return res.json();
  },
  async fetchSystemInfo(): Promise<ApiSystemInfo> {
    const res = await apiFetch(`${API_BASE}/api/v1/system`, { signal: AbortSignal.timeout(12000) });
    if (!res.ok) throw new Error(`System info failed: HTTP ${res.status}`);
    return res.json();
  },

  async pruneUnusedImages(): Promise<ApiPruneResult> {
    const res = await apiFetch(`${API_BASE}/api/v1/system/prune-images`, { method: 'POST' });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || `Prune failed: HTTP ${res.status}`);
    return body;
  },
};
