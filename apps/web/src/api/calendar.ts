import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';

// ─── Types ───────────────────────────────────────────────────────────────────

export type CalendarEventType = 'MEETING' | 'HOLIDAY' | 'TRAINING' | 'DEADLINE' | 'OTHER' | 'ROOM_BOOKING';

export interface CalendarEventCreator {
  id:   string;
  name: string;
}

export interface CalendarEvent {
  id:          string;
  title:       string;
  description?: string;
  eventType:   CalendarEventType;
  startTime:   string;
  endTime:     string;
  isAllDay:    boolean;
  location?:   string;
  color?:      string;
  attendees:   string[];
  createdById: string;
  createdBy:   CalendarEventCreator;
  createdAt:   string;
  updatedAt:   string;
}

export interface NormalisedBooking {
  id:          string;
  title:       string;
  description?: string;
  eventType:   'ROOM_BOOKING';
  startTime:   string;
  endTime:     string;
  isAllDay:    boolean;
  location?:   string;
  color:       string;
  attendees:   string[];
  createdBy:   CalendarEventCreator;
  roomName:    string;
  bookingId:   string;
}

export interface MonthViewResponse {
  year:     number;
  month:    number;
  events:   CalendarEvent[];
  bookings: NormalisedBooking[];
}

export interface CreateEventPayload {
  title:        string;
  description?: string;
  eventType?:   CalendarEventType;
  startTime:    string;
  endTime:      string;
  isAllDay?:    boolean;
  location?:    string;
  color?:       string;
  attendees?:   string[];
}

export type UpdateEventPayload = Partial<CreateEventPayload>;

// ─── Unified calendar item type for frontend ─────────────────────────────────

export type CalendarItem = (CalendarEvent | NormalisedBooking) & { _source: 'event' | 'booking' };

// ─── API functions ────────────────────────────────────────────────────────────

const fetchEvents = (from: string, to: string) =>
  apiClient.get<CalendarEvent[]>(`/api/v1/calendar/events?from=${from}&to=${to}`).then((r) => r.data);

const fetchMonthView = (year: number, month: number) =>
  apiClient.get<MonthViewResponse>(`/api/v1/calendar/month?year=${year}&month=${month}`).then((r) => r.data);

const createEvent = (payload: CreateEventPayload) =>
  apiClient.post<CalendarEvent>('/api/v1/calendar/events', payload).then((r) => r.data);

const updateEvent = (id: string, payload: UpdateEventPayload) =>
  apiClient.patch<CalendarEvent>(`/api/v1/calendar/events/${id}`, payload).then((r) => r.data);

const deleteEvent = (id: string) =>
  apiClient.delete(`/api/v1/calendar/events/${id}`).then((r) => r.data);

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useCalendarEvents(from: string, to: string) {
  return useQuery({
    queryKey: ['calendar-events', from, to],
    queryFn:  () => fetchEvents(from, to),
    enabled:  Boolean(from && to),
  });
}

export function useMonthView(year: number, month: number) {
  return useQuery({
    queryKey: ['calendar-month', year, month],
    queryFn:  () => fetchMonthView(year, month),
  });
}

export function useCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createEvent,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calendar-month'] });
      qc.invalidateQueries({ queryKey: ['calendar-events'] });
    },
  });
}

export function useUpdateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateEventPayload }) =>
      updateEvent(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calendar-month'] });
      qc.invalidateQueries({ queryKey: ['calendar-events'] });
    },
  });
}

export function useDeleteEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteEvent,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calendar-month'] });
      qc.invalidateQueries({ queryKey: ['calendar-events'] });
    },
  });
}
