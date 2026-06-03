import { api } from './client';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string | null;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
  location?: string | null;
  color?: string | null;
  type?: string | null;
}

export const calendarApi = {
  // Khoảng [from, to] dạng ISO date-string.
  events: (from: string, to: string) =>
    api.get<CalendarEvent[]>(`/calendar/events?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
  create: (data: {
    title: string;
    startTime: string;
    endTime: string;
    isAllDay?: boolean;
    location?: string;
    description?: string;
  }) => api.post<CalendarEvent>('/calendar/events', data),
  remove: (id: string) => api.delete<void>(`/calendar/events/${id}`),
};
