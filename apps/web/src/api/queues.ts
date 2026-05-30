import { apiClient } from './client';

export interface QueueStats {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
}

export interface QueueJob {
  id: string | undefined;
  name: string;
  status: string;
  data: unknown;
  failReason?: string;
  attemptsMade: number;
  timestamp: number;
}

export interface QueueJobsResult {
  data: QueueJob[];
  total: number;
}

export const queuesApi = {
  listQueues: () => apiClient.get<QueueStats[]>('/admin/queues').then((r) => r.data),

  getJobs: (queueName: string, status = 'failed', page = 1, limit = 50) =>
    apiClient
      .get<QueueJobsResult>(`/admin/queues/${queueName}/jobs`, {
        params: { status, page, limit },
      })
      .then((r) => r.data),

  retryJob: (queueName: string, jobId: string) =>
    apiClient.post(`/admin/queues/${queueName}/jobs/${jobId}/retry`).then((r) => r.data),
};
