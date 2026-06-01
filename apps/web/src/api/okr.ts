// @ts-ignore - API type inference
import { apiClient } from './client';

export type OkrStatus   = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
export type OkrCycle    = 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'H1' | 'H2' | 'ANNUAL';
export type KpiFrequency = 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

export interface OkrKeyResult {
  id:           string;
  objectiveId:  string;
  title:        string;
  unit:         string;
  startValue:   number;
  targetValue:  number;
  currentValue: number;
  createdAt:    string;
}

export interface OkrObjective {
  id:                string;
  title:             string;
  description?:      string | null;
  cycle:             OkrCycle;
  year:              number;
  ownerId:           string;
  orgUnitId?:        string | null;
  status:            OkrStatus;
  processInstanceId?: string | null;
  keyResults:        OkrKeyResult[];
  owner:             {
    id: string;
    name: string;
    email: string;
    code?: string | null;
    orgUnit?: { name: string } | null;
    position?: { jobTitle?: { name: string } | null } | null;
  };
  createdAt:         string;
}

export interface KpiRecord {
  id:        string;
  metricId:  string;
  period:    string;
  value:     number;
  notes?:    string | null;
  createdAt: string;
}

export interface KpiMetric {
  id:           string;
  name:         string;
  description?: string | null;
  unit:         string;
  targetValue?: number | null;
  frequency:    KpiFrequency;
  orgUnitId?:   string | null;
  isActive:     boolean;
  records:      KpiRecord[];
  createdAt:    string;
}

export interface OkrStats {
  totalObj:    number;
  totalKr:     number;
  activeObj:   number;
  kpiCount:    number;
  avgProgress: number;
}

const BASE = '/okr';

export const okrApi = {
  stats: () => apiClient.get<OkrStats>(`${BASE}/stats`).then(r => r.data),

  listObjectives: (params?: { ownerId?: string; orgUnitId?: string; cycle?: string; year?: number; status?: string; page?: number; limit?: number }) =>
    apiClient.get<{ data: OkrObjective[]; total: number; totalPages: number }>(`${BASE}/objectives`, { params }).then(r => r.data),

  getObjective: (id: string) => apiClient.get<OkrObjective>(`${BASE}/objectives/${id}`).then(r => r.data),

  createObjective: (data: { title: string; description?: string; cycle: OkrCycle; year: number; ownerId: string; orgUnitId?: string; status?: OkrStatus }) =>
    apiClient.post<OkrObjective>(`${BASE}/objectives`, data).then(r => r.data),

  updateObjective: (id: string, data: Partial<Parameters<typeof okrApi.createObjective>[0]>) =>
    apiClient.put<OkrObjective>(`${BASE}/objectives/${id}`, data).then(r => r.data),

  deleteObjective: (id: string) => apiClient.delete(`${BASE}/objectives/${id}`).then(r => r.data),

  startReview: (id: string) =>
    apiClient.post<{ processInstanceId: string; status: string }>(`${BASE}/objectives/${id}/start-review`).then(r => r.data),

  addKeyResult: (objectiveId: string, data: { title: string; unit?: string; startValue?: number; targetValue: number; currentValue?: number }) =>
    apiClient.post<OkrKeyResult>(`${BASE}/objectives/${objectiveId}/key-results`, data).then(r => r.data),

  updateKeyResult: (id: string, data: Partial<{ title: string; unit: string; startValue: number; targetValue: number; currentValue: number }>) =>
    apiClient.patch<OkrKeyResult>(`${BASE}/key-results/${id}`, data).then(r => r.data),

  deleteKeyResult: (id: string) => apiClient.delete(`${BASE}/key-results/${id}`).then(r => r.data),

  listMetrics: (orgUnitId?: string) =>
    apiClient.get<KpiMetric[]>(`${BASE}/kpi-metrics`, { params: orgUnitId ? { orgUnitId } : {} }).then(r => r.data),

  createMetric: (data: { name: string; description?: string; unit?: string; targetValue?: number; frequency?: KpiFrequency; orgUnitId?: string }) =>
    apiClient.post<KpiMetric>(`${BASE}/kpi-metrics`, data).then(r => r.data),

  updateMetric: (id: string, data: Partial<Parameters<typeof okrApi.createMetric>[0]>) =>
    apiClient.put<KpiMetric>(`${BASE}/kpi-metrics/${id}`, data).then(r => r.data),

  deleteMetric: (id: string) => apiClient.delete(`${BASE}/kpi-metrics/${id}`).then(r => r.data),

  addKpiRecord: (metricId: string, data: { period: string; value: number; notes?: string }) =>
    apiClient.post<KpiRecord>(`${BASE}/kpi-metrics/${metricId}/records`, data).then(r => r.data),
};
