import { apiClient } from './client';

export type DealStage = 'QUALIFICATION' | 'PROPOSAL' | 'NEGOTIATION' | 'WON' | 'LOST';

export interface ForecastStats {
  pipelineTotal:        number;
  weightedForecast:     number;
  wonYtd:               number;
  wonThisMonth:         number;
  targetThisMonth:      number;
  targetAchievementPct: number | null;
}

export interface PipelineFunnelItem {
  stage:    DealStage;
  count:    number;
  total:    number;
  weighted: number;
}

export interface MonthlyRow {
  period:    string;
  month:     string;
  target:    number;
  forecast:  number;
  actual:    number;
  dealCount: number;
}

export interface QuarterlyRow {
  period:    string;
  quarter:   string;
  target:    number;
  forecast:  number;
  actual:    number;
  dealCount: number;
}

export interface ForecastDeal {
  id:           string;
  code:         string;
  title:        string;
  stage:        DealStage;
  value:        number;
  weightedValue: number;
  probability:  number;
  expectedCloseDate: string | null;
  wonAt:        string | null;
  customer?:    { id: string; name: string };
  assigneeId?:  string | null;
}

export interface RevenueTarget {
  id:         string;
  period:     string;
  periodType: string;
  target:     number;
  currency:   string;
  notes?:     string | null;
  createdAt:  string;
}

const BASE = '/crm/forecast';

export const forecastApi = {
  stats: () =>
    apiClient.get<ForecastStats>(`${BASE}/stats`).then(r => r.data),

  pipeline: () =>
    apiClient.get<PipelineFunnelItem[]>(`${BASE}/pipeline`).then(r => r.data),

  monthly: (year?: number) =>
    apiClient.get<MonthlyRow[]>(`${BASE}/monthly`, { params: year ? { year } : {} }).then(r => r.data),

  quarterly: (year?: number) =>
    apiClient.get<QuarterlyRow[]>(`${BASE}/quarterly`, { params: year ? { year } : {} }).then(r => r.data),

  deals: (params?: { stage?: string; month?: string; page?: number; limit?: number }) =>
    apiClient.get<{ data: ForecastDeal[]; total: number; totalPages: number }>(`${BASE}/deals`, { params }).then(r => r.data),

  listTargets: (periodType?: string) =>
    apiClient.get<RevenueTarget[]>(`${BASE}/targets`, { params: periodType ? { periodType } : {} }).then(r => r.data),

  upsertTarget: (data: { period: string; periodType?: string; target: number; currency?: string; notes?: string }) =>
    apiClient.post<RevenueTarget>(`${BASE}/targets`, data).then(r => r.data),

  updateTarget: (id: string, data: { target?: number; notes?: string }) =>
    apiClient.put<RevenueTarget>(`${BASE}/targets/${id}`, data).then(r => r.data),

  deleteTarget: (id: string) =>
    apiClient.delete(`${BASE}/targets/${id}`).then(r => r.data),
};
