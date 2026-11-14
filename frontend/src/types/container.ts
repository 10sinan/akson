export type ContainerStatus = 'running' | 'stopped' | 'degraded' | 'restarting';

export interface ContainerPort {
  hostPort: number;
  containerPort: number;
  protocol: 'tcp' | 'udp';
}

export interface ContainerEnvVar {
  key: string;
  value: string;
  secret?: boolean;
}

export interface ContainerItem {
  id: string;
  name: string;
  image: string;
  tag: string;
  status: ContainerStatus;
  statusText: string;
  subtitle: string;
  category: 'core' | 'service' | 'database' | 'worker';
  uptime: string;
  cpuPercent: number;
  memoryUsageMb: number;
  memoryLimitMb: number;
  ports: ContainerPort[];
  traefikRoute?: string;
  network: string;
  ipAddress: string;
  restartCount: number;
  logs: string[];
  env: ContainerEnvVar[];
}
