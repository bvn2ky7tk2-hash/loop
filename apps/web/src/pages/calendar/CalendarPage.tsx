import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Button,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Switch,
  Tag,
  Typography,
  Space,
  Spin,
  Tooltip,
  Row,
  Col,
  Badge,
} from 'antd';
import {
  LeftOutlined,
  RightOutlined,
  PlusOutlined,
  CalendarOutlined,
  UnorderedListOutlined,
  AppstoreOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  UserOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/vi';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import { useThemePalette } from '../../hooks/useThemePalette';
import { PageHeader } from '../../components/ui/PageHeader';
import { FilterBar } from '../../components/FilterBar';
import { confirmDelete } from '../../components/ui/confirmDelete';
import {
  useMonthView,
  useCreateEvent,
  useUpdateEvent,
  useDeleteEvent,
  type CalendarEvent,
  type NormalisedBooking,
  type CalendarEventType,
  type CreateEventPayload,
} from '../../api/calendar';
import { useAvailableRooms, roomBookingApi } from '../../api/room-booking';
import { employeesApi } from '../../api/employees';

dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);
dayjs.locale('vi');

const { Text, Title } = Typography;
const { RangePicker } = DatePicker;
const { TextArea } = Input;

// ─── Constants ────────────────────────────────────────────────────────────────

type ViewMode = 'month' | 'week' | 'list';

const EVENT_TYPE_COLORS: Record<string, string> = {
  MEETING:      '#3B82F6',
  HOLIDAY:      '#10B981',
  TRAINING:     '#8B5CF6',
  DEADLINE:     '#EF4444',
  OTHER:        '#94A3B8',
  ROOM_BOOKING: '#F59E0B',
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  MEETING:      'Họp',
  HOLIDAY:      'Nghỉ lễ',
  TRAINING:     'Đào tạo',
  DEADLINE:     'Deadline',
  OTHER:        'Khác',
  ROOM_BOOKING: 'Đặt phòng',
};

const DAYS_OF_WEEK = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7:00–20:00

// ─── Helper: get color for event ─────────────────────────────────────────────

function getEventColor(event: CalendarEvent | NormalisedBooking): string {
  if ('color' in event && event.color) return event.color;
  return EVENT_TYPE_COLORS[event.eventType] ?? '#94A3B8';
}

// ─── Event Type Tag ────────────────────────────────────────────────────────

function EventTypeTag({ type, isDark }: { type: string; isDark: boolean }) {
  const colorMap: Record<string, { bg: string; text: string; border: string; light: string }> = {
    MEETING:      { bg: 'rgba(59,130,246,0.15)',  text: '#93C5FD', border: 'rgba(59,130,246,0.3)',  light: 'blue' },
    HOLIDAY:      { bg: 'rgba(16,185,129,0.15)',  text: '#6EE7B7', border: 'rgba(16,185,129,0.3)',  light: 'green' },
    TRAINING:     { bg: 'rgba(139,92,246,0.15)',  text: '#C4B5FD', border: 'rgba(139,92,246,0.3)',  light: 'purple' },
    DEADLINE:     { bg: 'rgba(239,68,68,0.15)',   text: '#FCA5A5', border: 'rgba(239,68,68,0.3)',   light: 'red' },
    OTHER:        { bg: 'rgba(148,163,184,0.15)', text: '#CBD5E1', border: 'rgba(148,163,184,0.3)', light: 'default' },
    ROOM_BOOKING: { bg: 'rgba(245,158,11,0.15)',  text: '#FCD34D', border: 'rgba(245,158,11,0.3)',  light: 'orange' },
  };
  const c = colorMap[type] ?? colorMap.OTHER;
  return (
    <Tag
      style={isDark ? { background: c.bg, color: c.text, borderColor: c.border } : {}}
      color={isDark ? undefined : c.light}
    >
      {EVENT_TYPE_LABELS[type] ?? type}
    </Tag>
  );
}

// ─── Mini event bar (used in month cells) ────────────────────────────────────

function EventBar({
  event,
  onClick,
}: {
  event: CalendarEvent | NormalisedBooking;
  onClick: () => void;
}) {
  const color = getEventColor(event);
  return (
    <div
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      style={{
        background: `${color}22`,
        borderLeft: `3px solid ${color}`,
        borderRadius: 3,
        padding: '1px 4px',
        marginBottom: 2,
        cursor: 'pointer',
        fontSize: 11,
        color,
        fontWeight: 500,
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        textOverflow: 'ellipsis',
      }}
      title={event.title}
    >
      {event.isAllDay ? '' : `${dayjs(event.startTime).format('HH:mm')} `}{event.title}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const { isDark, textPrimary, textMuted, bgContainer, bgCard, bgPage, borderColor, linkColor } = useThemePalette();

  const [currentDate, setCurrentDate] = useState<Dayjs>(dayjs());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | NormalisedBooking | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [prefilledDate, setPrefilledDate] = useState<Dayjs | null>(null);
  const [filterType, setFilterType] = useState<string>('');

  const [pickedRange, setPickedRange] = useState<[string, string] | null>(null);

  const [form] = Form.useForm();

  const year  = currentDate.year();
  const month = currentDate.month() + 1;

  const { data: monthData, isLoading } = useMonthView(year, month);
  const createMutation = useCreateEvent();
  const updateMutation = useUpdateEvent();
  const deleteMutation = useDeleteEvent();

  const { data: availableRooms = [] } = useAvailableRooms(
    pickedRange?.[0],
    pickedRange?.[1],
  );

  const { data: employeesList = [] } = useQuery({
    queryKey: ['employees-list'],
    queryFn:  () => employeesApi.list().then((r) => r),
  });

  // Combine events + bookings
  const allItems = useMemo(() => {
    const events   = (monthData?.events   ?? []) as (CalendarEvent | NormalisedBooking)[];
    const bookings = (monthData?.bookings ?? []) as (CalendarEvent | NormalisedBooking)[];
    let items = [...events, ...bookings];
    if (filterType) items = items.filter((i) => i.eventType === filterType);
    return items;
  }, [monthData, filterType]);

  // ─── Navigation ────────────────────────────────────────────────────────────

  function prevPeriod() {
    if (viewMode === 'month') setCurrentDate(currentDate.subtract(1, 'month'));
    else setCurrentDate(currentDate.subtract(1, 'week'));
  }
  function nextPeriod() {
    if (viewMode === 'month') setCurrentDate(currentDate.add(1, 'month'));
    else setCurrentDate(currentDate.add(1, 'week'));
  }
  function goToday() { setCurrentDate(dayjs()); }

  // ─── Header label ──────────────────────────────────────────────────────────

  const periodLabel = useMemo(() => {
    if (viewMode === 'month') return currentDate.format('MMMM YYYY');
    if (viewMode === 'week') {
      const start = currentDate.startOf('week');
      const end   = currentDate.endOf('week');
      return `${start.format('D/M')} – ${end.format('D/M/YYYY')}`;
    }
    return currentDate.format('MMMM YYYY');
  }, [currentDate, viewMode]);

  // ─── Open create modal ─────────────────────────────────────────────────────

  function openCreate(date?: Dayjs) {
    setEditingEvent(null);
    setPrefilledDate(date ?? null);
    form.resetFields();
    if (date) {
      form.setFieldsValue({
        range: [date.hour(9), date.hour(10)],
        isAllDay: false,
      });
    }
    setFormVisible(true);
  }

  function openEdit(event: CalendarEvent) {
    setEditingEvent(event);
    form.setFieldsValue({
      title:       event.title,
      description: event.description,
      eventType:   event.eventType,
      range: [
        dayjs(event.startTime),
        dayjs(event.endTime),
      ],
      isAllDay:    event.isAllDay,
      location:    event.location,
      color:       event.color,
      attendees:   event.attendees,
    });
    setFormVisible(true);
  }

  // ─── Submit form ───────────────────────────────────────────────────────────

  async function handleSubmit() {
    const values = await form.validateFields();
    const [startTime, endTime] = values.range as [Dayjs, Dayjs];
    const roomId = values.roomId as string | undefined;
    const payload: CreateEventPayload = {
      title:       values.title,
      description: values.description,
      eventType:   values.eventType ?? 'MEETING',
      startTime:   startTime.toISOString(),
      endTime:     endTime.toISOString(),
      isAllDay:    values.isAllDay ?? false,
      location:    values.location,
      color:       values.color,
      attendees:   values.attendees ?? [],
    };
    if (editingEvent) {
      await updateMutation.mutateAsync({ id: editingEvent.id, payload });
    } else {
      await createMutation.mutateAsync(payload);
      // Nếu chọn phòng → tạo booking tương ứng
      if (roomId) {
        try {
          await roomBookingApi.createBooking({
            roomId,
            title:     payload.title,
            startTime: payload.startTime,
            endTime:   payload.endTime,
          });
        } catch (e) {
          // booking thất bại không chặn event creation
          console.warn('Could not create room booking:', e);
        }
      }
    }
    setFormVisible(false);
    form.resetFields();
    setPickedRange(null);
  }

  // ─── Delete event ──────────────────────────────────────────────────────────

  function handleDelete(event: CalendarEvent) {
    confirmDelete({
      itemName: event.title,
      onConfirm: async () => {
        await deleteMutation.mutateAsync(event.id);
        setDetailVisible(false);
      },
    });
  }

  // ─── Open detail ───────────────────────────────────────────────────────────

  function openDetail(item: CalendarEvent | NormalisedBooking) {
    setSelectedEvent(item);
    setDetailVisible(true);
  }

  // ─── Items for a specific day ──────────────────────────────────────────────

  function itemsForDay(day: Dayjs): (CalendarEvent | NormalisedBooking)[] {
    return allItems.filter((item) => {
      const start = dayjs(item.startTime);
      const end   = dayjs(item.endTime);
      return (
        day.isSameOrAfter(start, 'day') &&
        day.isSameOrBefore(end, 'day')
      );
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MONTHLY VIEW
  // ═══════════════════════════════════════════════════════════════════════════

  function renderMonthView() {
    const firstOfMonth = currentDate.startOf('month');
    // Mon = 1, start grid on Monday
    let startOffset = firstOfMonth.day(); // 0=Sun..6=Sat
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

  // ═══════════════════════════════════════════════════════════════════════════
  // WEEKLY VIEW
  // ═══════════════════════════════════════════════════════════════════════════

  function renderWeekView() {
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

  // ═══════════════════════════════════════════════════════════════════════════
  // LIST VIEW
  // ═══════════════════════════════════════════════════════════════════════════

  function renderListView() {
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

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Lịch công ty"
        icon={<CalendarOutlined />}
        iconColor="#3B82F6"
        actions={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => openCreate()}
          >
            Thêm sự kiện
          </Button>
        }
      />

      {/* Controls bar */}
      <FilterBar
        right={
          <Space>
            <Button.Group>
              <Button
                icon={<AppstoreOutlined />}
                type={viewMode === 'month' ? 'primary' : 'default'}
                onClick={() => setViewMode('month')}
              >
                Tháng
              </Button>
              <Button
                icon={<CalendarOutlined />}
                type={viewMode === 'week' ? 'primary' : 'default'}
                onClick={() => setViewMode('week')}
              >
                Tuần
              </Button>
              <Button
                icon={<UnorderedListOutlined />}
                type={viewMode === 'list' ? 'primary' : 'default'}
                onClick={() => setViewMode('list')}
              >
                Danh sách
              </Button>
            </Button.Group>
          </Space>
        }
      >
        {/* Navigation */}
        <Space>
          <Button icon={<LeftOutlined />} onClick={prevPeriod} />
          <Button onClick={goToday}>Hôm nay</Button>
          <Button icon={<RightOutlined />} onClick={nextPeriod} />
          <Text style={{ color: textPrimary, fontWeight: 600, minWidth: 160, textAlign: 'center' }}>
            {periodLabel}
          </Text>
        </Space>

        {/* Type filter */}
        <Select
          allowClear
          placeholder="Loại sự kiện"
          style={{ width: 150 }}
          value={filterType || undefined}
          onChange={(v) => setFilterType(v ?? '')}
          options={[
            { value: 'MEETING',      label: 'Họp' },
            { value: 'HOLIDAY',      label: 'Nghỉ lễ' },
            { value: 'TRAINING',     label: 'Đào tạo' },
            { value: 'DEADLINE',     label: 'Deadline' },
            { value: 'OTHER',        label: 'Khác' },
            { value: 'ROOM_BOOKING', label: 'Đặt phòng' },
          ]}
        />
      </FilterBar>

      {/* Calendar content */}
      <Spin spinning={isLoading}>
        {viewMode === 'month' && renderMonthView()}
        {viewMode === 'week'  && renderWeekView()}
        {viewMode === 'list'  && renderListView()}
      </Spin>

      {/* ─── Event Detail Modal ─────────────────────────────────────────── */}
      <Modal
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        title={
          <Text style={{ color: textPrimary, fontWeight: 700 }}>
            Chi tiết sự kiện
          </Text>
        }
        styles={{ content: { background: bgContainer }, header: { background: bgContainer } }}
      >
        {selectedEvent && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  width: '100%',
                  height: 4,
                  background: getEventColor(selectedEvent),
                  borderRadius: 2,
                  marginBottom: 12,
                }}
              />
              <Title level={4} style={{ color: textPrimary, marginBottom: 8 }}>
                {selectedEvent.title}
              </Title>
              <EventTypeTag type={selectedEvent.eventType} isDark={isDark} />
            </div>

            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              <div>
                <Text style={{ color: textMuted, fontSize: 12 }}>Thời gian</Text>
                <br />
                <Text style={{ color: textPrimary }}>
                  {selectedEvent.isAllDay
                    ? `${dayjs(selectedEvent.startTime).format('DD/MM/YYYY')} (Cả ngày)`
                    : `${dayjs(selectedEvent.startTime).format('DD/MM/YYYY HH:mm')} – ${dayjs(selectedEvent.endTime).format('HH:mm')}`}
                </Text>
              </div>

              {selectedEvent.location && (
                <div>
                  <Text style={{ color: textMuted, fontSize: 12 }}>Địa điểm</Text>
                  <br />
                  <Text style={{ color: textPrimary }}>
                    <EnvironmentOutlined style={{ marginRight: 4 }} />
                    {selectedEvent.location}
                  </Text>
                </div>
              )}

              {selectedEvent.description && (
                <div>
                  <Text style={{ color: textMuted, fontSize: 12 }}>Mô tả</Text>
                  <br />
                  <Text style={{ color: textPrimary }}>{selectedEvent.description}</Text>
                </div>
              )}

              {selectedEvent.attendees?.length > 0 && (
                <div>
                  <Text style={{ color: textMuted, fontSize: 12 }}>Người tham dự ({selectedEvent.attendees.length})</Text>
                  <br />
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                    {selectedEvent.attendees.map((a, i) => (
                      <Tag key={i} style={isDark ? { background: 'rgba(59,130,246,0.15)', color: '#93C5FD', borderColor: 'rgba(59,130,246,0.3)' } : {}} color={isDark ? undefined : 'blue'}>
                        <UserOutlined style={{ marginRight: 4 }} />
                        {a}
                      </Tag>
                    ))}
                  </div>
                </div>
              )}

              {'createdBy' in selectedEvent && selectedEvent.createdBy && (
                <div>
                  <Text style={{ color: textMuted, fontSize: 12 }}>Tạo bởi</Text>
                  <br />
                  <Text style={{ color: textPrimary }}>{selectedEvent.createdBy.name}</Text>
                </div>
              )}
            </Space>

            {/* Actions — only for CalendarEvent (not room bookings) */}
            {'createdById' in selectedEvent && !('bookingId' in selectedEvent) && (
              <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <Button
                  icon={<EditOutlined />}
                  onClick={() => {
                    setDetailVisible(false);
                    openEdit(selectedEvent as CalendarEvent);
                  }}
                >
                  Sửa
                </Button>
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => handleDelete(selectedEvent as CalendarEvent)}
                >
                  Xóa
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ─── Create / Edit Event Modal ──────────────────────────────────── */}
      <Modal
        open={formVisible}
        onCancel={() => { setFormVisible(false); form.resetFields(); setPickedRange(null); }}
        onOk={handleSubmit}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        title={
          <Text style={{ color: textPrimary, fontWeight: 700 }}>
            {editingEvent ? 'Chỉnh sửa sự kiện' : 'Thêm sự kiện mới'}
          </Text>
        }
        okText={editingEvent ? 'Lưu thay đổi' : 'Tạo sự kiện'}
        cancelText="Hủy"
        styles={{ content: { background: bgContainer }, header: { background: bgContainer } }}
        width={560}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="title"
            label={<Text style={{ color: textPrimary }}>Tiêu đề</Text>}
            rules={[{ required: true, message: 'Vui lòng nhập tiêu đề' }]}
          >
            <Input placeholder="Tên sự kiện..." />
          </Form.Item>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                name="eventType"
                label={<Text style={{ color: textPrimary }}>Loại sự kiện</Text>}
              >
                <Select
                  options={[
                    { value: 'MEETING',  label: 'Họp' },
                    { value: 'HOLIDAY',  label: 'Nghỉ lễ' },
                    { value: 'TRAINING', label: 'Đào tạo' },
                    { value: 'DEADLINE', label: 'Deadline' },
                    { value: 'OTHER',    label: 'Khác' },
                  ]}
                  defaultValue="MEETING"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="isAllDay"
                label={<Text style={{ color: textPrimary }}>Cả ngày</Text>}
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="range"
            label={<Text style={{ color: textPrimary }}>Thời gian</Text>}
            rules={[{ required: true, message: 'Vui lòng chọn thời gian' }]}
          >
            <RangePicker
              showTime={{ format: 'HH:mm' }}
              format="DD/MM/YYYY HH:mm"
              style={{ width: '100%' }}
              onChange={(dates) => {
                if (dates?.[0] && dates?.[1]) {
                  setPickedRange([dates[0].toISOString(), dates[1].toISOString()]);
                } else {
                  setPickedRange(null);
                }
              }}
            />
          </Form.Item>

          <Form.Item
            name="roomId"
            label={<Text style={{ color: textPrimary }}>Phòng họp</Text>}
          >
            <Select
              allowClear
              placeholder={pickedRange ? 'Chọn phòng trống...' : 'Chọn thời gian trước để lọc phòng trống'}
              disabled={!pickedRange}
              onChange={(roomId) => {
                if (roomId) {
                  const room = (availableRooms as any[]).find((r) => r.id === roomId);
                  if (room) form.setFieldValue('location', room.name);
                }
              }}
              options={(availableRooms as any[]).map((r) => ({
                value: r.id,
                label: `${r.name}${r.floor ? ` — ${r.floor}` : ''} (${r.capacity ?? '?'} người)`,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="location"
            label={<Text style={{ color: textPrimary }}>Địa điểm</Text>}
          >
            <Input placeholder="Phòng họp, địa chỉ..." prefix={<EnvironmentOutlined />} />
          </Form.Item>

          <Form.Item
            name="description"
            label={<Text style={{ color: textPrimary }}>Mô tả</Text>}
          >
            <TextArea rows={3} placeholder="Nội dung, ghi chú..." />
          </Form.Item>

          <Form.Item
            name="attendees"
            label={<Text style={{ color: textPrimary }}>Người tham dự</Text>}
          >
            <Select
              mode="multiple"
              allowClear
              showSearch
              placeholder="Chọn nhân viên tham dự..."
              optionFilterProp="label"
              options={(employeesList as any[]).map((e) => ({
                value: e.fullName,
                label: `${e.code ? e.code + ' — ' : ''}${e.fullName}`,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
