import dayjs, { type Dayjs } from 'dayjs';
import { Typography } from 'antd';
import type { CalendarEvent, NormalisedBooking } from '../../../api/calendar';
import { DAYS_OF_WEEK } from '../constants';
import { EventBar } from './EventBar';

const { Text } = Typography;

interface MonthViewProps {
  currentDate: Dayjs;
  isDark: boolean;
  textPrimary: string;
  textMuted: string;
  bgContainer: string;
  bgPage: string;
  borderColor: string;
  linkColor: string;
  itemsForDay: (day: Dayjs) => (CalendarEvent | NormalisedBooking)[];
  openCreate: (date?: Dayjs) => void;
  openDetail: (item: CalendarEvent | NormalisedBooking) => void;
}

export function MonthView({
  currentDate,
  isDark,
  textPrimary,
  textMuted,
  bgContainer,
  bgPage,
  borderColor,
  linkColor,
  itemsForDay,
  openCreate,
  openDetail,
}: MonthViewProps) {
  const firstOfMonth = currentDate.startOf('month');
  // Mon = 1, start grid on Monday
  let startOffset: number = firstOfMonth.day(); // 0=Sun..6=Sat
  startOffset = startOffset === 0 ? 6 : startOffset - 1; // shift to Mon-based

  const daysInMonth = currentDate.daysInMonth();
  const cells: (Dayjs | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) =>
      firstOfMonth.date(i + 1)
    ),
  ];
  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null);

  const today = dayjs();

  const cellBg   = bgContainer;
  const emptyBg  = isDark ? '#162032' : '#F8FAFC';
  const todayBg  = isDark ? '#1e3a5f' : '#EFF6FF';
  const headerBg = bgPage;

  return (
    <div style={{ border: `1px solid ${borderColor}`, borderRadius: 8, overflow: 'hidden' }}>
      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: headerBg }}>
        {DAYS_OF_WEEK.map((d) => (
          <div
            key={d}
            style={{
              padding: '8px 0',
              textAlign: 'center',
              fontWeight: 600,
              fontSize: 12,
              color: textMuted,
              borderRight: `1px solid ${borderColor}`,
            }}
          >
            <Text style={{ color: textMuted }}>{d}</Text>
          </div>
        ))}
      </div>

      {/* Calendar cells */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {cells.map((day, idx) => {
          if (!day) {
            return (
              <div
                key={`empty-${idx}`}
                style={{
                  minHeight: 100,
                  background: emptyBg,
                  borderRight: `1px solid ${borderColor}`,
                  borderBottom: `1px solid ${borderColor}`,
                }}
              />
            );
          }
          const isToday = day.isSame(today, 'day');
          const dayItems = itemsForDay(day);
          const bg = isToday ? todayBg : cellBg;
          return (
            <div
              key={day.format('YYYY-MM-DD')}
              onClick={() => openCreate(day)}
              style={{
                minHeight: 100,
                background: bg,
                borderRight: `1px solid ${borderColor}`,
                borderBottom: `1px solid ${borderColor}`,
                padding: 4,
                cursor: 'pointer',
                position: 'relative',
              }}
            >
              <div style={{ marginBottom: 4 }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: isToday ? linkColor : 'transparent',
                    color: isToday ? '#fff' : textPrimary,
                    fontWeight: isToday ? 700 : 400,
                    fontSize: 12,
                  }}
                >
                  {day.date()}
                </span>
              </div>
              {dayItems.slice(0, 3).map((item) => (
                <EventBar key={item.id} event={item} onClick={() => openDetail(item)} />
              ))}
              {dayItems.length > 3 && (
                <Text style={{ fontSize: 10, color: textMuted }}>
                  +{dayItems.length - 3} thêm
                </Text>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
