import { useState, useRef, useCallback } from 'react';
import {
  Tabs, Button, Table, Tag, Form, Input, InputNumber, Select,
  DatePicker, Tooltip, Space, Row, Col, Typography, Spin, message,
} from 'antd';
import { useQuery } from '@tanstack/react-query';
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  HomeOutlined, CalendarOutlined, TeamOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

import { useThemePalette } from '../../hooks/useThemePalette';
import { usePermissions } from '../../hooks/usePermissions';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { FilterBar } from '../../components/FilterBar';
import { CenteredModal } from '../../components/ui/CenteredModal';
import { confirmDelete } from '../../components/ui/confirmDelete';

import {
  useRooms, useGanttData, useRoomStats, useAvailableRooms,
  useCreateRoom, useUpdateRoom, useDeleteRoom,
  useCreateBooking, useCancelBooking,
  type MeetingRoom, type RoomBooking, type CreateRoomInput, type CreateBookingInput,
} from '../../api/room-booking';
import { employeesApi } from '../../api/employees';
import { apiClient } from '../../api/client';

const { Text } = Typography;
const { TextArea } = Input;

// ─── Hằng số Gantt ─────────────────────────────────────────────────────────────

const HOUR_START   = 8;    // 8:00
const HOUR_END     = 19;   // 19:00
const SLOT_WIDTH   = 60;   // px per 30-min slot
const ROW_HEIGHT   = 48;   // px mỗi row phòng
const HEADER_WIDTH = 140;  // px cột tên phòng

// 8:00 → 18:30 = 21 slots 30-phút
const SLOTS = Array.from({ length: (HOUR_END - HOUR_START) * 2 }, (_, i) => {
  const totalMins = HOUR_START * 60 + i * 30;
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return { label: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`, slotIndex: i };
});

// Bảng màu booking (8 màu sáng, không dùng preset.primary)
const BOOKING_COLORS = [
  '#6366F1', '#10B981', '#F59E0B', '#3B82F6',
  '#EC4899', '#14B8A6', '#F97316', '#8B5CF6',
];

function colorForUser(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return BOOKING_COLORS[Math.abs(hash) % BOOKING_COLORS.length];
}

function toMinutes(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

// ─── Nhãn trạng thái phòng ───────────────────────────────────────────────────

function RoomStatusTag({ status, isDark }: { status: MeetingRoom['status']; isDark: boolean }) {
  if (status === 'ACTIVE') {
    return (
      <Tag
        style={isDark ? { background: 'rgba(52,211,153,0.15)', color: '#6EE7B7', borderColor: 'rgba(52,211,153,0.3)' } : {}}
        color={isDark ? undefined : 'green'}
      >
        Hoạt động
      </Tag>
    );
  }
  if (status === 'MAINTENANCE') {
    return (
      <Tag
        style={isDark ? { background: 'rgba(251,191,36,0.15)', color: '#FCD34D', borderColor: 'rgba(251,191,36,0.3)' } : {}}
        color={isDark ? undefined : 'orange'}
      >
        Bảo trì
      </Tag>
    );
  }
  return (
    <Tag
      style={isDark ? { background: 'rgba(148,163,184,0.15)', color: '#CBD5E1', borderColor: 'rgba(148,163,184,0.3)' } : {}}
      color={isDark ? undefined : 'default'}
    >
      Không hoạt động
    </Tag>
  );
}

// ─── Component chính ─────────────────────────────────────────────────────────

export default function RoomBookingPage() {
  const { textPrimary, textMuted, bgContainer, bgCard, borderColor, isDark, preset } = useThemePalette();
  const { hasRole } = usePermissions();
  const isAdmin = hasRole('ADMIN');

  // ── State ──────────────────────────────────────────────────────────────────
  const [ganttDate, setGanttDate]           = useState(dayjs().format('YYYY-MM-DD'));
  const [bookingOpen, setBookingOpen]       = useState(false);
  const [roomModalOpen, setRoomModalOpen]   = useState(false);
  const [editingRoom, setEditingRoom]       = useState<MeetingRoom | null>(null);
  const [bookingForm] = Form.useForm();
  const [roomForm]    = Form.useForm();

  // Pre-fill khi click slot Gantt
  const [prefillRoomId, setPrefillRoomId]   = useState<string | undefined>();
  const [prefillStart, setPrefillStart]     = useState<dayjs.Dayjs | undefined>();
  const [prefillEnd, setPrefillEnd]         = useState<dayjs.Dayjs | undefined>();

  // Lấy startTime/endTime từ form booking để query phòng trống
  const [bookingStart, setBookingStart]     = useState<string | undefined>();
  const [bookingEnd, setBookingEnd]         = useState<string | undefined>();

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: ganttRaw, isLoading: ganttLoading } = useGanttData(ganttDate);
  const { data: stats }                             = useRoomStats();
  const { data: roomsRaw, isLoading: roomsLoading } = useRooms({ limit: 100 });
  const { data: availableRooms = [] }               = useAvailableRooms(bookingStart, bookingEnd);
  const { data: empList = [] }                      = useQuery({
    queryKey: ['employees-list-booking'],
    queryFn:  () => employeesApi.list(),
  });

  // ── Mutations ──────────────────────────────────────────────────────────────
  const createRoomMut    = useCreateRoom();
  const updateRoomMut    = useUpdateRoom();
  const deleteRoomMut    = useDeleteRoom();
  const createBookingMut = useCreateBooking();
  const cancelBookingMut = useCancelBooking();

  const ganttRooms    = ganttRaw?.rooms    ?? [];
  const ganttBookings = ganttRaw?.bookings ?? [];
  const roomsList     = (roomsRaw as any)?.data ?? roomsRaw ?? [];

  // ── Handlers — Phòng ───────────────────────────────────────────────────────

  const openCreateRoom = () => {
    setEditingRoom(null);
    roomForm.resetFields();
    setRoomModalOpen(true);
  };

  const openEditRoom = (room: MeetingRoom) => {
    setEditingRoom(room);
    roomForm.setFieldsValue({
      name:      room.name,
      floor:     room.floor,
      capacity:  room.capacity,
      amenities: room.amenities,
      status:    room.status,
    });
    setRoomModalOpen(true);
  };

  const handleRoomSubmit = async (values: CreateRoomInput) => {
    try {
      if (editingRoom) {
        await updateRoomMut.mutateAsync({ id: editingRoom.id, data: values });
        message.success('Cập nhật phòng thành công');
      } else {
        await createRoomMut.mutateAsync(values);
        message.success('Thêm phòng thành công');
      }
      setRoomModalOpen(false);
    } catch (e: any) {
      message.error(e?.response?.data?.message ?? 'Có lỗi xảy ra');
    }
  };

  const handleDeleteRoom = (room: MeetingRoom) => {
    confirmDelete({
      itemName: room.name,
      onConfirm: async () => {
        try {
          await deleteRoomMut.mutateAsync(room.id);
          message.success('Xóa phòng thành công');
        } catch (e: any) {
          message.error(e?.response?.data?.message ?? 'Có lỗi xảy ra');
        }
      },
    });
  };

  // ── Handlers — Booking ─────────────────────────────────────────────────────

  const openBookingModal = (roomId?: string, start?: dayjs.Dayjs, end?: dayjs.Dayjs) => {
    setPrefillRoomId(roomId);
    setPrefillStart(start);
    setPrefillEnd(end);

    bookingForm.resetFields();
    if (roomId) bookingForm.setFieldValue('roomId', roomId);
    if (start)  bookingForm.setFieldValue('startTime', start);
    if (end)    bookingForm.setFieldValue('endTime', end);

    if (start && end) {
      setBookingStart(start.toISOString());
      setBookingEnd(end.toISOString());
    }

    setBookingOpen(true);
  };

  const handleBookingSubmit = async (values: any) => {
    try {
      const payload: CreateBookingInput = {
        roomId:    values.roomId,
        title:     values.title,
        startTime: values.startTime.toISOString(),
        endTime:   values.endTime.toISOString(),
        note:      values.note,
        attendees: values.attendees ?? [],
      };
      await createBookingMut.mutateAsync(payload);

      // Tạo calendar event để booking xuất hiện trên lịch cá nhân của attendees
      const attendeeList: string[] = values.attendees ?? [];
      if (attendeeList.length > 0 && values.title) {
        try {
          await apiClient.post('/calendar/events', {
            title:     `Phòng họp: ${values.title}`,
            eventType: 'MEETING',
            startTime: payload.startTime,
            endTime:   payload.endTime,
            isAllDay:  false,
            attendees: attendeeList,
          });
        } catch (e) {
          // Không chặn nếu calendar sync thất bại
          console.warn('Calendar sync failed:', e);
        }
      }

      message.success('Đặt phòng thành công');
      setBookingOpen(false);
    } catch (e: any) {
      message.error(e?.response?.data?.message ?? 'Đặt phòng thất bại');
    }
  };

  const handleCancelBooking = (booking: RoomBooking) => {
    confirmDelete({
      title:   `Hủy booking "${booking.title}"?`,
      content: 'Booking sẽ bị hủy và phòng sẽ được giải phóng.',
      onConfirm: async () => {
        try {
          await cancelBookingMut.mutateAsync(booking.id);
          message.success('Hủy booking thành công');
        } catch (e: any) {
          message.error(e?.response?.data?.message ?? 'Hủy thất bại');
        }
      },
    });
  };

  // ── Columns — Bảng phòng ───────────────────────────────────────────────────

  const roomColumns: ColumnsType<MeetingRoom> = [
    {
      title: 'Tên phòng',
      dataIndex: 'name',
      render: (v: string) => <Text style={{ color: textPrimary, fontWeight: 600 }}>{v}</Text>,
    },
    {
      title: 'Tầng',
      dataIndex: 'floor',
      render: (v?: string) => v
        ? <Text style={{ color: textPrimary }}>{v}</Text>
        : <Text style={{ color: textMuted }}>—</Text>,
    },
    {
      title: 'Sức chứa',
      dataIndex: 'capacity',
      render: (v: number) => <Text style={{ color: textPrimary }}>{v} người</Text>,
    },
    {
      title: 'Tiện nghi',
      dataIndex: 'amenities',
      render: (arr: string[], record: MeetingRoom) => (
        <Space wrap size={4}>
          {arr.map((a) => (
            <Tag
              key={a}
              style={isDark ? { background: 'rgba(96,165,250,0.15)', color: '#93C5FD', borderColor: 'rgba(96,165,250,0.3)' } : {}}
              color={isDark ? undefined : 'blue'}
            >
              {a}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      render: (v: MeetingRoom['status']) => <RoomStatusTag status={v} isDark={isDark} />,
    },
    ...(isAdmin ? [{
      title: 'Thao tác',
      key: 'actions',
      width: 100,
      render: (_: unknown, record: MeetingRoom) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            size="small"
            style={{ color: isDark ? '#93C5FD' : preset.primary }}
            onClick={() => openEditRoom(record)}
          />
          <Button
            type="text"
            icon={<DeleteOutlined />}
            size="small"
            danger
            onClick={() => handleDeleteRoom(record)}
          />
        </Space>
      ),
    }] : []),
  ];

  // ── Gantt Chart ───────────────────────────────────────────────────────────

  const ganttTotalWidth = SLOTS.length * SLOT_WIDTH;

  const handleSlotClick = (roomId: string, slotIndex: number) => {
    const startMins = HOUR_START * 60 + slotIndex * 30;
    const endMins   = startMins + 60; // mặc định 1 giờ
    const baseDate  = ganttDate;
    const startH    = Math.floor(startMins / 60);
    const startM    = startMins % 60;
    const endH      = Math.floor(endMins / 60);
    const endM      = endMins % 60;

    const start = dayjs(`${baseDate}T${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}:00`);
    const end   = dayjs(`${baseDate}T${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}:00`);
    openBookingModal(roomId, start, end);
  };

  const renderGantt = () => {
    const headerBg  = isDark ? '#1A2744' : '#F0F4FF';
    const rowBg     = isDark ? '#1E293B' : '#ffffff';
    const altRowBg  = isDark ? '#243044' : '#F8FAFC';
    const gridLine  = isDark ? '#334155' : '#E2E8F0';

    return (
      <div style={{ overflowX: 'auto', overflowY: 'visible' }}>
        <div style={{ minWidth: HEADER_WIDTH + ganttTotalWidth + 20, position: 'relative' }}>

          {/* Header hàng giờ */}
          <div style={{ display: 'flex', background: headerBg, borderBottom: `1px solid ${gridLine}` }}>
            <div style={{ width: HEADER_WIDTH, minWidth: HEADER_WIDTH, padding: '8px 12px', fontWeight: 600, color: textPrimary, borderRight: `1px solid ${gridLine}` }}>
              <Text style={{ color: textMuted, fontSize: 12 }}>Phòng / Giờ</Text>
            </div>
            <div style={{ display: 'flex' }}>
              {SLOTS.map((slot, i) => (
                <div
                  key={slot.slotIndex}
                  style={{
                    width:       SLOT_WIDTH,
                    minWidth:    SLOT_WIDTH,
                    textAlign:   'center',
                    padding:     '6px 0',
                    borderRight: `1px solid ${gridLine}`,
                    fontSize:    slot.slotIndex % 2 === 0 ? 12 : 11,
                    fontWeight:  slot.slotIndex % 2 === 0 ? 600 : 400,
                  }}
                >
                  <Text style={{ color: slot.slotIndex % 2 === 0 ? textPrimary : textMuted }}>
                    {slot.label}
                  </Text>
                </div>
              ))}
            </div>
          </div>

          {/* Rows — mỗi phòng 1 row */}
          {ganttRooms.map((room, rowIdx) => {
            const bookingsForRoom = ganttBookings.filter((b) => b.roomId === room.id);

            return (
              <div
                key={room.id}
                style={{
                  display:    'flex',
                  background: rowIdx % 2 === 0 ? rowBg : altRowBg,
                  borderBottom: `1px solid ${gridLine}`,
                  height:     ROW_HEIGHT,
                  position:   'relative',
                }}
              >
                {/* Tên phòng */}
                <div
                  style={{
                    width:        HEADER_WIDTH,
                    minWidth:     HEADER_WIDTH,
                    height:       ROW_HEIGHT,
                    padding:      '0 12px',
                    display:      'flex',
                    flexDirection:'column',
                    justifyContent: 'center',
                    borderRight:  `1px solid ${gridLine}`,
                  }}
                >
                  <Text style={{ color: textPrimary, fontWeight: 600, fontSize: 13, lineHeight: '18px' }}>{room.name}</Text>
                  {room.floor && <Text style={{ color: textMuted, fontSize: 11, lineHeight: '16px' }}>{room.floor}</Text>}
                </div>

                {/* Slots (click để đặt phòng) */}
                <div style={{ position: 'relative', flex: 1, display: 'flex', cursor: 'pointer' }}>
                  {SLOTS.map((slot) => (
                    <div
                      key={slot.slotIndex}
                      style={{
                        width:       SLOT_WIDTH,
                        minWidth:    SLOT_WIDTH,
                        height:      ROW_HEIGHT,
                        borderRight: `1px solid ${gridLine}`,
                        opacity:     0.8,
                      }}
                      onClick={() => handleSlotClick(room.id, slot.slotIndex)}
                    />
                  ))}

                  {/* Booking bars */}
                  {bookingsForRoom.map((booking) => {
                    const startMin   = toMinutes(booking.startTime);
                    const endMin     = toMinutes(booking.endTime);
                    const dayStart   = HOUR_START * 60;
                    const leftSlots  = (startMin - dayStart) / 30;
                    const widthSlots = (endMin - startMin) / 30;
                    const left       = leftSlots * SLOT_WIDTH;
                    const width      = widthSlots * SLOT_WIDTH - 2;
                    const color      = colorForUser(booking.bookedById);

                    return (
                      <Tooltip
                        key={booking.id}
                        title={
                          <div>
                            <div style={{ fontWeight: 700 }}>{booking.title}</div>
                            <div>Người đặt: {booking.bookedBy?.name}</div>
                            <div>{dayjs(booking.startTime).format('HH:mm')} – {dayjs(booking.endTime).format('HH:mm')}</div>
                            <div style={{ marginTop: 4, fontSize: 11, opacity: 0.8 }}>Click để hủy</div>
                          </div>
                        }
                      >
                        <div
                          style={{
                            position:     'absolute',
                            left,
                            top:          4,
                            height:       ROW_HEIGHT - 8,
                            width:        Math.max(width, 0),
                            background:   `${color}CC`,
                            border:       `1px solid ${color}`,
                            borderRadius: 6,
                            display:      'flex',
                            alignItems:   'center',
                            paddingLeft:  8,
                            cursor:       'pointer',
                            overflow:     'hidden',
                            zIndex:       10,
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCancelBooking(booking);
                          }}
                        >
                          <Text style={{ color: '#fff', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {booking.title}
                          </Text>
                        </div>
                      </Tooltip>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {ganttRooms.length === 0 && !ganttLoading && (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <Text style={{ color: textMuted }}>Không có phòng nào hoạt động</Text>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Đặt phòng họp"
        icon={<HomeOutlined />}
        iconColor="#6366F1"
        actions={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => openBookingModal()}
          >
            Đặt phòng
          </Button>
        }
      />

      {/* Stat cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <StatCard
            label="Tổng phòng"
            value={stats?.totalRooms ?? 0}
            color="#6366F1"
            icon={<HomeOutlined />}
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            label="Phòng hoạt động"
            value={stats?.activeRooms ?? 0}
            color="#10B981"
            icon={<CalendarOutlined />}
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            label="Booking hôm nay"
            value={stats?.todayBookings ?? 0}
            color="#3B82F6"
            icon={<TeamOutlined />}
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            label="Phòng bảo trì"
            value={stats?.maintenanceRooms ?? 0}
            color="#F59E0B"
            icon={<HomeOutlined />}
          />
        </Col>
      </Row>

      {/* Tabs */}
      <div style={{ background: bgContainer, borderRadius: 8, border: `1px solid ${borderColor}`, padding: '16px 16px 0' }}>
        <Tabs
          defaultActiveKey="gantt"
          items={[
            {
              key:   'gantt',
              label: 'Gantt Calendar',
              children: (
                <div>
                  <FilterBar>
                    <DatePicker
                      value={dayjs(ganttDate)}
                      onChange={(d) => d && setGanttDate(d.format('YYYY-MM-DD'))}
                      format="DD/MM/YYYY"
                      allowClear={false}
                    />
                    <Text style={{ color: textMuted, fontSize: 13 }}>
                      Click slot trống để đặt phòng · Click booking để hủy
                    </Text>
                  </FilterBar>

                  <Spin spinning={ganttLoading}>
                    <div
                      style={{
                        background:   bgCard,
                        borderRadius: 8,
                        border:       `1px solid ${borderColor}`,
                        padding:      '12px 0 12px',
                        overflow:     'hidden',
                        marginBottom: 16,
                      }}
                    >
                      {renderGantt()}
                    </div>
                  </Spin>
                </div>
              ),
            },
            ...(isAdmin ? [{
              key:   'rooms',
              label: 'Quản lý phòng',
              children: (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={openCreateRoom}
                    >
                      Thêm phòng
                    </Button>
                  </div>
                  <Table<MeetingRoom>
                    rowKey="id"
                    columns={roomColumns}
                    dataSource={roomsList}
                    loading={roomsLoading}
                    pagination={{ pageSize: 20 }}
                  />
                </div>
              ),
            }] : []),
          ]}
        />
      </div>

      {/* Modal đặt phòng */}
      <CenteredModal
        title="Đặt phòng họp"
        open={bookingOpen}
        onCancel={() => setBookingOpen(false)}
        onOk={() => bookingForm.submit()}
        confirmLoading={createBookingMut.isPending}
        okText="Đặt phòng"
      >
        <Form form={bookingForm} layout="vertical" onFinish={handleBookingSubmit}>
          <Form.Item
            name="startTime"
            label="Thời gian bắt đầu"
            rules={[{ required: true, message: 'Chọn giờ bắt đầu' }]}
          >
            <DatePicker
              showTime={{ format: 'HH:mm', minuteStep: 30 as any }}
              format="DD/MM/YYYY HH:mm"
              style={{ width: '100%' }}
              onChange={(d) => {
                if (d) setBookingStart(d.toISOString());
              }}
            />
          </Form.Item>

          <Form.Item
            name="endTime"
            label="Thời gian kết thúc"
            rules={[{ required: true, message: 'Chọn giờ kết thúc' }]}
          >
            <DatePicker
              showTime={{ format: 'HH:mm', minuteStep: 30 as any }}
              format="DD/MM/YYYY HH:mm"
              style={{ width: '100%' }}
              onChange={(d) => {
                if (d) setBookingEnd(d.toISOString());
              }}
            />
          </Form.Item>

          <Form.Item
            name="roomId"
            label="Phòng họp"
            rules={[{ required: true, message: 'Chọn phòng họp' }]}
          >
            <Select placeholder="Chọn phòng trống">
              {(bookingStart && bookingEnd ? availableRooms : (roomsList as MeetingRoom[]).filter((r) => r.status === 'ACTIVE')).map((room: MeetingRoom) => (
                <Select.Option key={room.id} value={room.id}>
                  {room.name} {room.floor ? `— ${room.floor}` : ''} ({room.capacity} người)
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="title"
            label="Tiêu đề cuộc họp"
            rules={[{ required: true, message: 'Nhập tiêu đề' }]}
          >
            <Input placeholder="VD: Sprint Planning, Daily Standup..." maxLength={300} />
          </Form.Item>

          <Form.Item name="note" label="Ghi chú">
            <TextArea rows={3} placeholder="Thông tin thêm (không bắt buộc)" maxLength={500} />
          </Form.Item>

          <Form.Item name="attendees" label="Người tham dự">
            <Select
              mode="multiple"
              allowClear
              showSearch
              placeholder="Chọn nhân viên tham dự..."
              optionFilterProp="label"
              options={(empList as any[]).map((e) => ({
                value: e.fullName,
                label: `${e.code ? e.code + ' — ' : ''}${e.fullName}`,
              }))}
            />
          </Form.Item>
        </Form>
      </CenteredModal>

      {/* Modal thêm/sửa phòng (ADMIN only) */}
      <CenteredModal
        title={editingRoom ? `Sửa phòng: ${editingRoom.name}` : 'Thêm phòng mới'}
        open={roomModalOpen}
        onCancel={() => setRoomModalOpen(false)}
        onOk={() => roomForm.submit()}
        confirmLoading={createRoomMut.isPending || updateRoomMut.isPending}
        okText={editingRoom ? 'Lưu thay đổi' : 'Thêm phòng'}
      >
        <Form form={roomForm} layout="vertical" onFinish={handleRoomSubmit}>
          <Form.Item name="name" label="Tên phòng" rules={[{ required: true }]}>
            <Input placeholder="VD: Phòng Hoa, A3.01..." maxLength={200} />
          </Form.Item>

          <Form.Item name="floor" label="Tầng">
            <Input placeholder="VD: Tầng 2, Tầng 3..." maxLength={100} />
          </Form.Item>

          <Form.Item name="capacity" label="Sức chứa (người)">
            <InputNumber min={1} max={500} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="amenities" label="Tiện nghi">
            <Select mode="tags" placeholder="Nhập tiện nghi (Enter để thêm)" />
          </Form.Item>

          <Form.Item name="status" label="Trạng thái">
            <Select>
              <Select.Option value="ACTIVE">Hoạt động</Select.Option>
              <Select.Option value="INACTIVE">Không hoạt động</Select.Option>
              <Select.Option value="MAINTENANCE">Bảo trì</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </CenteredModal>
    </div>
  );
}
