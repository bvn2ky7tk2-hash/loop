import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';

// ─── Types ───────────────────────────────────────────────────────────────────

export type VehicleStatus        = 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'RETIRED';
export type VehicleRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface Vehicle {
  id:          string;
  name:        string;
  plateNumber: string;
  type:        string;
  seats:       number;
  status:      VehicleStatus;
  driverId?:   string;
  driver?:     { id: string; name: string };
  imageUrl?:   string;
  createdAt:   string;
  updatedAt:   string;
  _count?:     { requests: number };
}

export interface VehicleRequest {
  id:              string;
  vehicleId:       string;
  vehicle?:        { id: string; name: string; plateNumber: string; type: string };
  requestedById:   string;
  requestedBy?:    { id: string; name: string };
  approvedById?:   string;
  approvedBy?:     { id: string; name: string };
  purpose:         string;
  destination:     string;
  startTime:       string;
  endTime:         string;
  passengerCount:  number;
  status:          VehicleRequestStatus;
  rejectionReason?: string;
  note?:           string;
  createdAt:       string;
  updatedAt:       string;
}

export interface VehicleStats {
  totalVehicles:   number;
  available:       number;
  inUse:           number;
  pendingRequests: number;
  todayRequests:   number;
}

export interface CreateVehicleInput {
  name:        string;
  plateNumber: string;
  type:        string;
  seats?:      number;
  status?:     VehicleStatus;
  driverId?:   string;
  imageUrl?:   string;
}

export interface CreateRequestInput {
  vehicleId:      string;
  purpose:        string;
  destination:    string;
  startTime:      string;
  endTime:        string;
  passengerCount?: number;
  note?:          string;
}

// ─── API calls ───────────────────────────────────────────────────────────────

export const vehicleBookingApi = {
  listVehicles: (): Promise<Vehicle[]> =>
    apiClient.get('/vehicle-booking/vehicles').then((r) => r.data),

  createVehicle: (data: CreateVehicleInput) =>
    apiClient.post('/vehicle-booking/vehicles', data).then((r) => r.data),

  updateVehicle: (id: string, data: Partial<CreateVehicleInput>) =>
    apiClient.patch(`/vehicle-booking/vehicles/${id}`, data).then((r) => r.data),

  deleteVehicle: (id: string) =>
    apiClient.delete(`/vehicle-booking/vehicles/${id}`).then((r) => r.data),

  listRequests: (): Promise<{ data: VehicleRequest[]; total: number }> =>
    apiClient.get('/vehicle-booking/requests').then((r) => r.data),

  createRequest: (data: CreateRequestInput) =>
    apiClient.post('/vehicle-booking/requests', data).then((r) => r.data),

  approveRequest: (id: string) =>
    apiClient.post(`/vehicle-booking/requests/${id}/approve`).then((r) => r.data),

  rejectRequest: (id: string, reason: string) =>
    apiClient.post(`/vehicle-booking/requests/${id}/reject`, { reason }).then((r) => r.data),

  cancelRequest: (id: string) =>
    apiClient.post(`/vehicle-booking/requests/${id}/cancel`).then((r) => r.data),

  completeRequest: (id: string) =>
    apiClient.post(`/vehicle-booking/requests/${id}/complete`).then((r) => r.data),

  getStats: (): Promise<VehicleStats> =>
    apiClient.get('/vehicle-booking/stats').then((r) => r.data),
};

// ─── TanStack Query Hooks ─────────────────────────────────────────────────────

export function useVehicles() {
  return useQuery({
    queryKey: ['vehicles'],
    queryFn:  () => vehicleBookingApi.listVehicles(),
  });
}

export function useVehicleRequests() {
  return useQuery({
    queryKey: ['vehicle-requests'],
    queryFn:  () => vehicleBookingApi.listRequests(),
  });
}

export function useVehicleStats() {
  return useQuery({
    queryKey: ['vehicle-stats'],
    queryFn:  () => vehicleBookingApi.getStats(),
  });
}

export function useCreateVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateVehicleInput) => vehicleBookingApi.createVehicle(data),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['vehicles'] }),
  });
}

export function useUpdateVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateVehicleInput> }) =>
      vehicleBookingApi.updateVehicle(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vehicles'] }),
  });
}

export function useDeleteVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => vehicleBookingApi.deleteVehicle(id),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['vehicles'] });
      qc.invalidateQueries({ queryKey: ['vehicle-stats'] });
    },
  });
}

export function useCreateRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateRequestInput) => vehicleBookingApi.createRequest(data),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['vehicle-requests'] });
      qc.invalidateQueries({ queryKey: ['vehicle-stats'] });
    },
  });
}

export function useApproveRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => vehicleBookingApi.approveRequest(id),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['vehicle-requests'] });
      qc.invalidateQueries({ queryKey: ['vehicle-stats'] });
      qc.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });
}

export function useRejectRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      vehicleBookingApi.rejectRequest(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vehicle-requests'] });
      qc.invalidateQueries({ queryKey: ['vehicle-stats'] });
    },
  });
}

export function useCancelRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => vehicleBookingApi.cancelRequest(id),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['vehicle-requests'] });
      qc.invalidateQueries({ queryKey: ['vehicle-stats'] });
    },
  });
}

export function useCompleteRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => vehicleBookingApi.completeRequest(id),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['vehicle-requests'] });
      qc.invalidateQueries({ queryKey: ['vehicle-stats'] });
      qc.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });
}
