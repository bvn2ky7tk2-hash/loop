import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';

// ─── Types ───────────────────────────────────────────────────────────────────

export type RoomStatus    = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
export type BookingStatus = 'CONFIRMED' | 'CANCELLED';

export interface MeetingRoom {
  id:        string;
  name:      string;
  floor?:    string;
  capacity:  number;
  amenities: string[];
  status:    RoomStatus;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
  _count?:   { bookings: number };
}

export interface RoomBooking {
  id:         string;
  roomId:     string;
  room?:      { id: string; name: string; floor?: string };
  bookedById: string;
  bookedBy?:  { id: string; name: string };
  title:      string;
  startTime:  string;
  endTime:    string;
  attendees:  string[];
  status:     BookingStatus;
  note?:      string;
  createdAt:  string;
  updatedAt:  string;
}

export interface GanttData {
  rooms:    MeetingRoom[];
  bookings: RoomBooking[];
}

export interface RoomStats {
  totalRooms:       number;
  activeRooms:      number;
  maintenanceRooms: number;
  todayBookings:    number;
}

export interface CreateRoomInput {
  name:       string;
  floor?:     string;
  capacity?:  number;
  amenities?: string[];
  status?:    RoomStatus;
  imageUrl?:  string;
}

export interface CreateBookingInput {
  roomId:     string;
  title:      string;
  startTime:  string;
  endTime:    string;
  attendees?: string[];
  note?:      string;
}

// ─── API calls ───────────────────────────────────────────────────────────────

export const roomBookingApi = {
  listRooms: (params?: { page?: number; limit?: number }) =>
    apiClient.get('/rooms', { params }).then((r) => r.data),

  createRoom: (data: CreateRoomInput) =>
    apiClient.post('/rooms', data).then((r) => r.data),

  updateRoom: (id: string, data: Partial<CreateRoomInput>) =>
    apiClient.patch(`/rooms/${id}`, data).then((r) => r.data),

  deleteRoom: (id: string) =>
    apiClient.delete(`/rooms/${id}`).then((r) => r.data),

  getAvailable: (startTime: string, endTime: string) =>
    apiClient.get('/rooms/available', { params: { startTime, endTime } }).then((r) => r.data),

  getGantt: (date: string): Promise<GanttData> =>
    apiClient.get('/rooms/gantt', { params: { date } }).then((r) => r.data),

  getRoomStats: (): Promise<RoomStats> =>
    apiClient.get('/rooms/stats').then((r) => r.data),

  listBookings: (params?: { page?: number; limit?: number; date?: string }) =>
    apiClient.get('/room-bookings', { params }).then((r) => r.data),

  createBooking: (data: CreateBookingInput) =>
    apiClient.post('/room-bookings', data).then((r) => r.data),

  cancelBooking: (id: string) =>
    apiClient.delete(`/room-bookings/${id}`).then((r) => r.data),
};

// ─── TanStack Query Hooks ─────────────────────────────────────────────────────

export function useRooms(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['rooms', params],
    queryFn:  () => roomBookingApi.listRooms(params),
  });
}

export function useGanttData(date: string) {
  return useQuery({
    queryKey: ['rooms', 'gantt', date],
    queryFn:  () => roomBookingApi.getGantt(date),
    enabled:  !!date,
  });
}

export function useRoomStats() {
  return useQuery({
    queryKey: ['rooms', 'stats'],
    queryFn:  () => roomBookingApi.getRoomStats(),
  });
}

export function useAvailableRooms(startTime?: string, endTime?: string) {
  return useQuery({
    queryKey: ['rooms', 'available', startTime, endTime],
    queryFn:  () => roomBookingApi.getAvailable(startTime!, endTime!),
    enabled:  !!(startTime && endTime),
  });
}

export function useCreateRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateRoomInput) => roomBookingApi.createRoom(data),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['rooms'] }),
  });
}

export function useUpdateRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateRoomInput> }) =>
      roomBookingApi.updateRoom(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rooms'] }),
  });
}

export function useDeleteRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => roomBookingApi.deleteRoom(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['rooms'] }),
  });
}

export function useCreateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateBookingInput) => roomBookingApi.createBooking(data),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['rooms', 'gantt'] });
      qc.invalidateQueries({ queryKey: ['rooms', 'stats'] });
      qc.invalidateQueries({ queryKey: ['room-bookings'] });
    },
  });
}

export function useCancelBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => roomBookingApi.cancelBooking(id),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['rooms', 'gantt'] });
      qc.invalidateQueries({ queryKey: ['rooms', 'stats'] });
      qc.invalidateQueries({ queryKey: ['room-bookings'] });
    },
  });
}
