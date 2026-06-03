import dayjs from 'dayjs';
import { Typography, Space, Badge } from 'antd';
import {
  ClockCircleOutlined,
  EnvironmentOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { CalendarEvent, NormalisedBooking } from '../../../api/calendar';
import { getEventColor } from '../constants';
import { EventTypeTag } from './EventTypeTag';

const { Text } = Typography;

interface ListViewProps {
  isDark: boolean;
  textPrimary: string;
  textMuted: string;
  bgCard: string;
  bgPage: string;
  borderColor: string;
  linkColor: string;
  allItems: (CalendarEvent | NormalisedBooking)[];
  openDetail: (item: CalendarEvent | NormalisedBooking) => void;
}

export function ListView({
  isDark,
  textPrimary,
  textMuted,
  bgCard,
  bgPage,
  borderColor,
  linkColor,
  allItems,
  openDetail,
}: ListViewProps) {
  // Group by day
  const grouped = new Map<string, (CalendarEvent | NormalisedBooking)[]>();
  const sorted  = [...allItems].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );
  sorted.forEach((item) => {
    const key = dayjs(item.startTime).format('YYYY-MM-DD');
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(item);
  });

  if (grouped.size === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 48 }}>
        <Text style={{ color: textMuted }}>Không có sự kiện nào trong tháng này</Text>
      </div>
    );
  }

  return (
    <div>
      {[...grouped.entries()].map(([dateKey, items]) => {
        const date    = dayjs(dateKey);
        const isToday = date.isSame(dayjs(), 'day');
        return (
          <div key={dateKey} style={{ marginBottom: 16 }}>
            {/* Day header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 8,
                padding: '6px 12px',
                background: bgPage,
                borderRadius: 6,
                border: isToday ? `1px solid ${linkColor}` : `1px solid ${borderColor}`,
              }}
            >
              <Text style={{ color: isToday ? linkColor : textPrimary, fontWeight: 600 }}>
                {date.format('dddd, D MMMM YYYY')}
              </Text>
              {isToday && <Badge count="Hôm nay" style={{ background: linkColor }} />}
            </div>

            {/* Events for this day */}
            {items.map((item) => {
              const color = getEventColor(item);
              return (
                <div
                  key={item.id}
                  onClick={() => openDetail(item)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    padding: '10px 12px',
                    marginBottom: 6,
                    background: bgCard,
                    border: `1px solid ${borderColor}`,
                    borderLeft: `4px solid ${color}`,
                    borderRadius: 6,
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <Text style={{ color: textPrimary, fontWeight: 600 }}>{item.title}</Text>
                      <EventTypeTag type={item.eventType} isDark={isDark} />
                    </div>
                    <Space size={12}>
                      <Text style={{ color: textMuted, fontSize: 12 }}>
                        <ClockCircleOutlined style={{ marginRight: 4 }} />
                        {item.isAllDay
                          ? 'Cả ngày'
                          : `${dayjs(item.startTime).format('HH:mm')} – ${dayjs(item.endTime).format('HH:mm')}`}
                      </Text>
                      {item.location && (
                        <Text style={{ color: textMuted, fontSize: 12 }}>
                          <EnvironmentOutlined style={{ marginRight: 4 }} />
                          {item.location}
                        </Text>
                      )}
                      {item.attendees?.length > 0 && (
                        <Text style={{ color: textMuted, fontSize: 12 }}>
                          <UserOutlined style={{ marginRight: 4 }} />
                          {item.attendees.length} người
                        </Text>
                      )}
                    </Space>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
