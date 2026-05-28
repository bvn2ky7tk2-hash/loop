import { apiClient } from './client';

export interface QueueHealth {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
}

export interface SystemHealth {
  timestamp: string;
  database: { status: 'ok' | 'error'; responseMs: number };
  redis: { status: 'ok' | 'error'; responseMs: number };
  queues: QueueHealth[];
  storage: { status: 'ok' | 'error' };
  uptime: number;
  memory: { heapUsed: number; heapTotal: number; rss: number };
}

export const healthApi = {
  getHealth: () => apiClient.get<SystemHealth>('/admin/health').then((r) => r.data),
};
