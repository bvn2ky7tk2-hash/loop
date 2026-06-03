import dayjs, { type Dayjs } from 'dayjs';
import { Typography } from 'antd';
import type { CalendarEvent, NormalisedBooking } from '../../../api/calendar';
import { DAYS_OF_WEEK, HOURS, getEventColor } from '../constants';

const { Text } = Typography;

interface WeekViewProps {
  currentDate: Dayjs;
  isDark: boolean;
  textPrimary: string;
  textMuted: string;
  bgContainer: string;
  bgPage: string;
  borderColor: string;
  linkColor: string;
  allItems: (CalendarEvent | NormalisedBooking)[];
  openCreate: (date?: Dayjs) => void;
  openDetail: (item: CalendarEvent | NormalisedBooking) => void;
}

export function WeekView({
  currentDate,
  isDark,
  textPrimary,
  textMuted,
  bgContainer,
  bgPage,
  borderColor,
  linkColor,
  allItems,
  openCreate,
  openDetail,
}: WeekViewProps) {
  const weekStart = currentDate.startOf('week'); // Mon
  const weekDays  = Array.from({ length: 7 }, (_, i) => weekStart.add(i, 'day'));
  const today     = dayjs();
  const hourPx    = 60;

  const cellBg   = bgContainer;
  const headerBg = bgPage;
  const todayBg  = isDark ? '#1e3a5f22' : '#EFF6FF';

  return (
    <div style={{ border: `1px solid ${borderColor}`, borderRadius: 8, overflow: 'hidden' }}>
      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: '50px repeat(7, 1fr)', background: headerBg }}>
        <div style={{ borderRight: `1px solid ${borderColor}`, padding: 8 }} />
        {weekDays.map((d) => {
          const isToday = d.isSame(today, 'day');
          return (
            <div
              key={d.format('YYYY-MM-DD')}
              style={{
                padding: '8px 4px',
                textAlign: 'center',
                borderRight: `1px solid ${borderColor}`,
                background: isToday ? todayBg : undefined,
              }}
            >
              <Text style={{ color: textMuted, fontSize: 11 }}>{DAYS_OF_WEEK[d.day() === 0 ? 6 : d.day() - 1]}</Text>
              <br />
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: isToday ? linkColor : 'transparent',
                  color: isToday ? '#fff' : textPrimary,
                  fontWeight: isToday ? 700 : 400,
                  fontSize: 14,
                }}
              >
                {d.date()}
              </span>
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div style={{ overflowY: 'auto', maxHeight: 600, position: 'relative' }}>
        {HOURS.map((hour) => (
          <div
            key={hour}
            style={{
              display: 'grid',
              gridTemplateColumns: '50px repeat(7, 1fr)',
              height: hourPx,
              borderBottom: `1px solid ${borderColor}`,
            }}
          >
            {/* Hour label */}
            <div
              style={{
                borderRight: `1px solid ${borderColor}`,
                display: 'flex',
                alignItems: 'flex-start',
                paddingTop: 2,
                paddingLeft: 4,
              }}
            >
              <Text style={{ color: textMuted, fontSize: 10 }}>{`${hour}:00`}</Text>
            </div>
            {weekDays.map((d) => {
              const isToday = d.isSame(today, 'day');
              // Events that overlap this hour on this day
              const slotItems = allItems.filter((item) => {
                if (item.isAllDay) return false;
                const start = dayjs(item.startTime);
                const end   = dayjs(item.endTime);
                return (
                  start.isSame(d, 'day') &&
                  start.hour() <= hour &&
                  end.hour() > hour
                );
              });
              return (
                <div
                  key={d.format('YYYY-MM-DD') + hour}
                  style={{
                    borderRight: `1px solid ${borderColor}`,
                    background: isToday ? todayBg : cellBg,
                    position: 'relative',
                    padding: 1,
                  }}
                  onClick={() => openCreate(d.hour(hour))}
                >
                  {slotItems
                    .filter((item) => dayjs(item.startTime).hour() === hour)
                    .map((item) => {
                      const color = getEventColor(item);
                      const startMin = dayjs(item.startTime).minute();
                      const durationMin = dayjs(item.endTime).diff(dayjs(item.startTime), 'minute');
                      const topPct   = (startMin / 60) * 100;
                      const heightPx = Math.max(20, (durationMin / 60) * hourPx);
                      return (
                        <div
                          key={item.id}
                          onClick={(e) => { e.stopPropagation(); openDetail(item); }}
                          style={{
                            position: 'absolute',
                            top:   `${topPct}%`,
                            left:  2,
                            right: 2,
                            height: heightPx,
                            background: `${color}22`,
                            borderLeft: `3px solid ${color}`,
                            borderRadius: 3,
                            padding: '1px 3px',
                            overflow: 'hidden',
                            cursor: 'pointer',
                            fontSize: 10,
                            color,
                            fontWeight: 500,
                            zIndex: 1,
                          }}
                        >
                          {item.title}
                        </div>
                      );
                    })}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
