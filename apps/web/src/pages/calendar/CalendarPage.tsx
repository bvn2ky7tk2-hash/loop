import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Button,
  Form,
  Select,
  Typography,
  Space,
  Spin,
} from 'antd';
import {
  LeftOutlined,
  RightOutlined,
  PlusOutlined,
  CalendarOutlined,
  UnorderedListOutlined,
  AppstoreOutlined,
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
  type CreateEventPayload,
} from '../../api/calendar';
import { useAvailableRooms, roomBookingApi } from '../../api/room-booking';
import { employeesApi } from '../../api/employees';
import type { ViewMode } from './constants';
import { MonthView } from './components/MonthView';
import { WeekView } from './components/WeekView';
import { ListView } from './components/ListView';
import { EventDetailModal } from './components/EventDetailModal';
import { EventFormModal } from './components/EventFormModal';

dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);
dayjs.locale('vi');

const { Text } = Typography;

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const { isDark, textPrimary, textMuted, bgContainer, bgCard, bgPage, borderColor, linkColor } = useThemePalette();

  const [currentDate, setCurrentDate] = useState<Dayjs>(dayjs());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | NormalisedBooking | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
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
        {viewMode === 'month' && (
          <MonthView
            currentDate={currentDate}
            isDark={isDark}
            textPrimary={textPrimary}
            textMuted={textMuted}
            bgContainer={bgContainer}
            bgPage={bgPage}
            borderColor={borderColor}
            linkColor={linkColor}
            itemsForDay={itemsForDay}
            openCreate={openCreate}
            openDetail={openDetail}
          />
        )}
        {viewMode === 'week' && (
          <WeekView
            currentDate={currentDate}
            isDark={isDark}
            textPrimary={textPrimary}
            textMuted={textMuted}
            bgContainer={bgContainer}
            bgPage={bgPage}
            borderColor={borderColor}
            linkColor={linkColor}
            allItems={allItems}
            openCreate={openCreate}
            openDetail={openDetail}
          />
        )}
        {viewMode === 'list' && (
          <ListView
            isDark={isDark}
            textPrimary={textPrimary}
            textMuted={textMuted}
            bgCard={bgCard}
            bgPage={bgPage}
            borderColor={borderColor}
            linkColor={linkColor}
            allItems={allItems}
            openDetail={openDetail}
          />
        )}
      </Spin>

      {/* ─── Event Detail Modal ─────────────────────────────────────────── */}
      <EventDetailModal
        open={detailVisible}
        selectedEvent={selectedEvent}
        isDark={isDark}
        textPrimary={textPrimary}
        textMuted={textMuted}
        bgContainer={bgContainer}
        onClose={() => setDetailVisible(false)}
        openEdit={openEdit}
        handleDelete={handleDelete}
      />

      {/* ─── Create / Edit Event Modal ──────────────────────────────────── */}
      <EventFormModal
        open={formVisible}
        form={form}
        editingEvent={editingEvent}
        textPrimary={textPrimary}
        bgContainer={bgContainer}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        pickedRange={pickedRange}
        setPickedRange={setPickedRange}
        availableRooms={availableRooms as any[]}
        employeesList={employeesList as any[]}
        onCancel={() => { setFormVisible(false); form.resetFields(); setPickedRange(null); }}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
