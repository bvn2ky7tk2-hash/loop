import { api } from './client';

export type VehicleStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface Vehicle {
  id: string;
  name: string;
  plateNumber: string;
  type: string;
  seats: number;
}

export interface VehicleRequest {
  id: string;
  vehicleId: string;
  purpose: string;
  destination: string;
  startTime: string;
  endTime: string;
  passengerCount: number;
  status: VehicleStatus;
  rejectionReason?: string | null;
  vehicle?: { id: string; name: string; plateNumber: string } | null;
  createdAt: string;
}

export const vehicleBookingApi = {
  vehicles: () => api.get<Vehicle[]>('/vehicle-booking/vehicles'),
  requests: () => api.get<{ data: VehicleRequest[]; total: number }>('/vehicle-booking/requests?page=1&limit=100'),
  create: (data: { vehicleId: string; purpose: string; destination: string; startTime: string; endTime: string }) =>
    api.post<VehicleRequest>('/vehicle-booking/requests', data),
  cancel: (id: string) => api.post<VehicleRequest>(`/vehicle-booking/requests/${id}/cancel`, {}),
};
