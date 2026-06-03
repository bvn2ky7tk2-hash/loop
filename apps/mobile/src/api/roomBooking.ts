import { api } from './client';

export interface MeetingRoom {
  id: string;
  name: string;
  floor?: string | null;
  capacity: number;
  amenities: string[];
}

export interface RoomBooking {
  id: string;
  roomId: string;
  title: string;
  startTime: string;
  endTime: string;
  note?: string | null;
  room?: { id: string; name: string } | null;
}

interface Paginated<T> { data: T[]; meta: { total: number; page: number; limit: number } }

export const roomBookingApi = {
  available: (startTime: string, endTime: string) =>
    api.get<MeetingRoom[]>(`/rooms/available?startTime=${encodeURIComponent(startTime)}&endTime=${encodeURIComponent(endTime)}`),
  bookings: () => api.get<Paginated<RoomBooking>>('/room-bookings?page=1&limit=100'),
  create: (data: { roomId: string; title: string; startTime: string; endTime: string; note?: string }) =>
    api.post<RoomBooking>('/room-bookings', data),
  cancel: (id: string) => api.delete<void>(`/room-bookings/${id}`),
};
