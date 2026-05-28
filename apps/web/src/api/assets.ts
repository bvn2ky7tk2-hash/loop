import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';

// ─── Types ───────────────────────────────────────────────────────────────────

export type AssetCategory = 'LAPTOP' | 'DESKTOP' | 'PHONE' | 'SERVER' | 'PERIPHERAL' | 'SOFTWARE' | 'FURNITURE' | 'VEHICLE' | 'OTHER';
export type AssetStatus   = 'AVAILABLE' | 'ASSIGNED' | 'UNDER_MAINTENANCE' | 'RETIRED';

export interface Asset {
  id:                string;
  code:              string;
  name:              string;
  category:          AssetCategory;
  brand?:            string;
  model?:            string;
  serialNumber?:     string;
  orgUnitId?:        string;
  orgUnit?:          { id: string; name: string };
  status:            AssetStatus;
  purchaseDate?:     string;
  purchasePrice?:    string;
  depreciationYears?: number;
  notes?:            string;
  createdAt:         string;
  updatedAt:         string;
  assignments?:      AssetAssignment[];
  maintenanceLogs?:  AssetMaintenance[];
}

export interface AssetAssignment {
  id:          string;
  assetId:     string;
  asset?:      { id: string; code: string; name: string; category: AssetCategory };
  employeeId:  string;
  employee?:   { id: string; fullName: string };
  assignedAt:  string;
  returnedAt?: string;
  notes?:      string;
  createdAt:   string;
}

export interface AssetMaintenance {
  id:          string;
  assetId:     string;
  asset?:      { id: string; code: string; name: string };
  type:        string;
  performedAt: string;
  cost?:       string;
  performedBy?: string;
  notes?:      string;
  createdAt:   string;
}

export interface AssetSummary {
  total:               number;
  assigned:            number;
  underMaintenance:    number;
  totalPurchaseValue:  number;
}

export interface AssetDepreciation {
  purchasePrice:           number;
  depreciationYears:       number;
  annualDepreciation:      number;
  accumulatedDepreciation: number;
  bookValue:               number;
  yearsElapsed:            number;
  error?: string;
}

export interface PaginatedResult<T> {
  data:       T[];
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
}

// ─── Query Keys ──────────────────────────────────────────────────────────────

export const assetKeys = {
  all:         ['assets'] as const,
  list:        (p: object) => ['assets', 'list', p] as const,
  detail:      (id: string) => ['assets', id] as const,
  summary:     ['assets', 'summary'] as const,
  assignments: (p: object) => ['assets', 'assignments', p] as const,
  maintenance: (p: object) => ['assets', 'maintenance', p] as const,
};

// ─── Assets ───────────────────────────────────────────────────────────────────

export interface AssetFilterParams { category?: AssetCategory; status?: AssetStatus; orgUnitId?: string; page?: number; limit?: number; }

export const useGetAssets = (params: AssetFilterParams = {}) =>
  useQuery<PaginatedResult<Asset>>({
    queryKey: assetKeys.list(params),
    queryFn:  () => apiClient.get<PaginatedResult<Asset>>('/assets', { params }).then(r => r.data),
  });

export const useGetAsset = (id: string) =>
  useQuery<Asset>({
    queryKey: assetKeys.detail(id),
    queryFn:  () => apiClient.get<Asset>(`/assets/${id}`).then(r => r.data),
    enabled:  !!id,
  });

export const useGetAssetSummary = () =>
  useQuery<AssetSummary>({
    queryKey: assetKeys.summary,
    queryFn:  () => apiClient.get<AssetSummary>('/assets/summary').then(r => r.data),
  });

export const useCreateAsset = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Asset> & { code: string; name: string; category: AssetCategory }) =>
      apiClient.post<Asset>('/assets', data).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: assetKeys.all }); qc.invalidateQueries({ queryKey: assetKeys.summary }); },
  });
};

export const useUpdateAsset = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Asset> }) =>
      apiClient.put<Asset>(`/assets/${id}`, data).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: assetKeys.all }); qc.invalidateQueries({ queryKey: assetKeys.summary }); },
  });
};

export const useDeleteAsset = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/assets/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: assetKeys.all }); qc.invalidateQueries({ queryKey: assetKeys.summary }); },
  });
};

export const useAssignAsset = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, employeeId, notes }: { id: string; employeeId: string; notes?: string }) =>
      apiClient.post<AssetAssignment>(`/assets/${id}/assign`, { employeeId, notes }).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: assetKeys.all }); qc.invalidateQueries({ queryKey: assetKeys.summary }); },
  });
};

export const useReturnAsset = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      apiClient.patch<Asset>(`/assets/${id}/return`, { notes }).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: assetKeys.all }); qc.invalidateQueries({ queryKey: assetKeys.summary }); },
  });
};

// ─── Assignments ──────────────────────────────────────────────────────────────

export interface AssignmentFilterParams { employeeId?: string; assetId?: string; status?: 'active' | 'returned'; page?: number; limit?: number; }

export const useGetAllAssignments = (params: AssignmentFilterParams = {}) =>
  useQuery<PaginatedResult<AssetAssignment>>({
    queryKey: assetKeys.assignments(params),
    queryFn:  () => apiClient.get<PaginatedResult<AssetAssignment>>('/assets/assignments', { params }).then(r => r.data),
  });

// ─── Maintenance ──────────────────────────────────────────────────────────────

export interface MaintenanceFilterParams { assetId?: string; type?: string; dateFrom?: string; dateTo?: string; page?: number; limit?: number; }

export const useGetAllMaintenance = (params: MaintenanceFilterParams = {}) =>
  useQuery<PaginatedResult<AssetMaintenance>>({
    queryKey: assetKeys.maintenance(params),
    queryFn:  () => apiClient.get<PaginatedResult<AssetMaintenance>>('/assets/maintenance', { params }).then(r => r.data),
  });

export const useAddMaintenance = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ assetId, data }: { assetId: string; data: { type: string; performedAt: string; cost?: number; performedBy?: string; notes?: string } }) =>
      apiClient.post<AssetMaintenance>(`/assets/${assetId}/maintenance`, data).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: assetKeys.all }); qc.invalidateQueries({ queryKey: assetKeys.summary }); },
  });
};
