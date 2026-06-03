import type { CalendarEvent, NormalisedBooking } from '../../api/calendar';

// ─── Constants ────────────────────────────────────────────────────────────────

export type ViewMode = 'month' | 'week' | 'list';

export const EVENT_TYPE_COLORS: Record<string, string> = {
  MEETING:      '#3B82F6',
  HOLIDAY:      '#10B981',
  TRAINING:     '#8B5CF6',
  DEADLINE:     '#EF4444',
  OTHER:        '#94A3B8',
  ROOM_BOOKING: '#F59E0B',
};

export const EVENT_TYPE_LABELS: Record<string, string> = {
  MEETING:      'Họp',
  HOLIDAY:      'Nghỉ lễ',
  TRAINING:     'Đào tạo',
  DEADLINE:     'Deadline',
  OTHER:        'Khác',
  ROOM_BOOKING: 'Đặt phòng',
};

export const DAYS_OF_WEEK = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
export const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7:00–20:00

// ─── Helper: get color for event ─────────────────────────────────────────────

export function getEventColor(event: CalendarEvent | NormalisedBooking): string {
  if ('color' in event && event.color) return event.color;
  return EVENT_TYPE_COLORS[event.eventType] ?? '#94A3B8';
}
