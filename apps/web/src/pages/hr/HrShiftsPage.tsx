import { useState, useMemo } from 'react';
import {
  Button, Form, Input, Select, InputNumber, DatePicker,
  Space, Table, Tag, Tabs, Typography, Row, Col, App,
  Segmented, Tooltip, Divider, Badge, Popover, List, Avatar,
} from 'antd';
import {
  ClockCircleOutlined, PlusOutlined, EditOutlined, DeleteOutlined,
  TeamOutlined, CheckCircleOutlined, CalendarOutlined,
  ArrowRightOutlined, MinusCircleOutlined, UserAddOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';

import { useThemePalette } from '../../hooks/useThemePalette';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { FilterBar } from '../../components/FilterBar';
import { CenteredModal } from '../../components/ui/CenteredModal';
import { confirmDelete } from '../../components/ui/confirmDelete';
import {
  workShiftsApi,
  type WorkShift, type ShiftAssignment, type ShiftType,
  type WorkSchedule, type WorkScheduleEnrollment, type ScheduleRepeatType,
} from '../../api/work-shifts';
import { employeesApi } from '../../api/employees';

const { Text } = Typography;

// ─── Constants ────────────────────────────────────────────────────────────────

const SHIFT_TYPE_MAP: Record<ShiftType, { label: string; color: string; darkBg: string; darkText: string; darkBorder: string }> = {
  HANH_CHINH: { label: 'Hành chính', color: 'blue',   darkBg: 'rgba(96,165,250,0.15)',  darkText: '#93C5FD', darkBorder: 'rgba(96,165,250,0.3)' },
  CA_SANG:    { label: 'Ca sáng',    color: 'gold',   darkBg: 'rgba(251,191,36,0.15)',  darkText: '#FCD34D', darkBorder: 'rgba(251,191,36,0.3)' },
  CA_CHIEU:   { label: 'Ca chiều',   color: 'orange', darkBg: 'rgba(251,146,60,0.15)',  darkText: '#FDBA74', darkBorder: 'rgba(251,146,60,0.3)' },
  CA_DEM:     { label: 'Ca đêm',     color: 'purple', darkBg: 'rgba(167,139,250,0.15)', darkText: '#C4B5FD', darkBorder: 'rgba(167,139,250,0.3)' },
  LINH_HOAT:  { label: 'Linh hoạt', color: 'cyan',   darkBg: 'rgba(34,211,238,0.15)',  darkText: '#67E8F9', darkBorder: 'rgba(34,211,238,0.3)' },
};

const REPEAT_META: Record<ScheduleRepeatType, { label: string; phaseLabel: string; color: string }> = {
  DAILY:   { label: 'Theo ngày',  phaseLabel: 'Ngày',  color: '#10B981' },
  WEEKLY:  { label: 'Theo tuần',  phaseLabel: 'Tuần',  color: '#3B82F6' },
  MONTHLY: { label: 'Theo tháng', phaseLabel: 'Tháng', color: '#8B5CF6' },
};

function calcNetHours(startTime: string, endTime: string, breakMinutes: number): number {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  let totalMin = (eh * 60 + em) - (sh * 60 + sm);
  if (totalMin < 0) totalMin += 24 * 60;
  totalMin -= breakMinutes;
  return Math.max(0, totalMin / 60);
}

function ShiftTypeTag({ type, isDark }: { type: ShiftType; isDark: boolean }) {
  const meta = SHIFT_TYPE_MAP[type];
  if (!meta) return <Text>{type}</Text>;
  return (
    <Tag
      color={isDark ? undefined : meta.color}
      style={isDark ? { background: meta.darkBg, color: meta.darkText, borderColor: meta.darkBorder } : {}}
    >
      {meta.label}
    </Tag>
  );
}

// ── EnrollmentPopover — hiển thị danh sách nhân viên trong lịch ──────────────

function EnrollmentPopover({
  scheduleId,
  count,
  onRemove,
  isDark,
  textPrimary,
  textMuted,
  borderColor,
}: {
  scheduleId: string;
  count: number;
  onRemove: (id: string) => void;
  isDark: boolean;
  textPrimary: string;
  textMuted: string;
  borderColor: string;
}) {
  const [open, setOpen] = useState(false);
  const { data: enrollments = [], isLoading } = useQuery({
    queryKey: ['enrollments', scheduleId],
    queryFn: () => workShiftsApi.listEnrollments(scheduleId),
    enabled: open,
  });

  const content = (
    <div style={{ width: 280, maxHeight: 320, overflowY: 'auto' }}>
      {isLoading ? (
        <Text style={{ color: textMuted }}>Đang tải...</Text>
      ) : enrollments.length === 0 ? (
        <Text style={{ color: textMuted }}>Chưa có nhân viên nào trong lịch này</Text>
      ) : (
        <List
          size="small"
          dataSource={enrollments}
          renderItem={(e: WorkScheduleEnrollment) => (
            <List.Item
              style={{ borderColor }}
              actions={[
                <Button
                  key="del"
                  type="text" size="small" danger icon={<DeleteOutlined />}
                  onClick={() => onRemove(e.id)}
                />,
              ]}
            >
              <List.Item.Meta
                avatar={
                  <Avatar size={28} style={{ background: isDark ? '#3B82F6' : '#6366F1', fontSize: 12 }}>
                    {e.employee?.fullName?.[0] ?? '?'}
                  </Avatar>
                }
                title={<Text style={{ color: textPrimary, fontSize: 13 }}>{e.employee?.fullName ?? 'Phòng ban'}</Text>}
                description={
                  <Text style={{ color: textMuted, fontSize: 11 }}>
                    Từ {dayjs(e.effectiveFrom).format('DD/MM/YYYY')}
                    {e.effectiveTo ? ` → ${dayjs(e.effectiveTo).format('DD/MM/YYYY')}` : ' (vô thời hạn)'}
                  </Text>
                }
              />
            </List.Item>
          )}
        />
      )}
    </div>
  );

  return (
    <Popover
      content={content}
      title={<Text style={{ color: textPrimary }}>Nhân viên trong lịch ({count})</Text>}
      trigger="click"
      open={open}
      onOpenChange={setOpen}
      placement="bottomLeft"
    >
      <Button type="link" size="small" style={{ padding: 0, color: isDark ? '#93C5FD' : '#6366F1' }}>
        <TeamOutlined /> {count} nhân sự
      </Button>
    </Popover>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function HrShiftsPage() {
  const { textPrimary, textMuted, borderColor, bgContainer, linkColor, isDark } = useThemePalette();
  const { message } = App.useApp();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<'shifts' | 'assignments' | 'schedules'>('schedules');

  // ── Shift modal ──
  const [shiftModalOpen, setShiftModalOpen] = useState(false);
  const [editShift, setEditShift] = useState<WorkShift | null>(null);
  const [shiftForm] = Form.useForm();

  // ── Assignment modal ──
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignForm] = Form.useForm();

  // ── Schedule (template) modal ──
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleForm] = Form.useForm();
  const [scheduleRepeatType, setScheduleRepeatType] = useState<ScheduleRepeatType>('WEEKLY');

  // ── Enrollment modal ──
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [enrollTargetSchedule, setEnrollTargetSchedule] = useState<WorkSchedule | null>(null);
  const [enrollForm] = Form.useForm();

  // ── Filters ──
  const [filterEmpId, setFilterEmpId] = useState<string | undefined>();
  const [filterShiftId, setFilterShiftId] = useState<string | undefined>();
  const [scheduleSearch, setScheduleSearch] = useState('');

  // ── Queries ──
  const { data: shifts = [], isLoading: shiftsLoading } = useQuery({
    queryKey: ['work-shifts'],
    queryFn: workShiftsApi.listShifts,
  });

  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ['shift-assignments', filterEmpId, filterShiftId],
    queryFn: () => workShiftsApi.listAssignments({ employeeId: filterEmpId, shiftId: filterShiftId }),
  });

  const { data: schedules = [], isLoading: schedulesLoading } = useQuery({
    queryKey: ['work-schedules', scheduleSearch],
    queryFn: () => workShiftsApi.listSchedules({ search: scheduleSearch || undefined, limit: 100 }),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: employeesApi.list,
  });

  // ── Stats ──
  const totalShifts = shifts.length;
  const activeShifts = shifts.filter((s) => s.isActive).length;
  const totalSchedules = schedules.length;
  const totalEnrolled = schedules.reduce((acc, s) => acc + (s._count?.enrollments ?? 0), 0);

  // ── Shift mutations ──
  const createShiftMutation = useMutation({
    mutationFn: workShiftsApi.createShift,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['work-shifts'] });
      message.success('Đã tạo ca làm việc');
      setShiftModalOpen(false);
      shiftForm.resetFields();
    },
    onError: () => message.error('Tạo ca thất bại'),
  });

  const updateShiftMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Partial<WorkShift> }) =>
      workShiftsApi.updateShift(id, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['work-shifts'] });
      message.success('Đã cập nhật ca làm việc');
      setShiftModalOpen(false);
      setEditShift(null);
      shiftForm.resetFields();
    },
    onError: () => message.error('Cập nhật thất bại'),
  });

  const deleteShiftMutation = useMutation({
    mutationFn: workShiftsApi.deleteShift,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['work-shifts'] }); message.success('Đã xóa ca'); },
    onError: () => message.error('Xóa thất bại'),
  });

  // ── Assignment mutations ──
  const createAssignmentMutation = useMutation({
    mutationFn: workShiftsApi.createAssignment,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shift-assignments'] });
      message.success('Đã phân công ca');
      setAssignModalOpen(false);
      assignForm.resetFields();
    },
    onError: () => message.error('Phân công thất bại'),
  });

  const deleteAssignmentMutation = useMutation({
    mutationFn: workShiftsApi.deleteAssignment,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['shift-assignments'] }); message.success('Đã xóa phân công'); },
    onError: () => message.error('Xóa thất bại'),
  });

  // ── Schedule mutations ──
  const createScheduleMutation = useMutation({
    mutationFn: workShiftsApi.createSchedule,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['work-schedules'] });
      message.success('Đã tạo lịch làm việc');
      setScheduleModalOpen(false);
      scheduleForm.resetFields();
      setScheduleRepeatType('WEEKLY');
    },
    onError: () => message.error('Tạo lịch thất bại'),
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: workShiftsApi.deleteSchedule,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['work-schedules'] }); message.success('Đã xóa lịch'); },
    onError: () => message.error('Xóa lịch thất bại'),
  });

  // ── Enrollment mutations ──
  const enrollMutation = useMutation({
    mutationFn: ({ scheduleId, dto }: { scheduleId: string; dto: Parameters<typeof workShiftsApi.enrollEmployees>[1] }) =>
      workShiftsApi.enrollEmployees(scheduleId, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['work-schedules'] });
      qc.invalidateQueries({ queryKey: ['enrollments', enrollTargetSchedule?.id] });
      message.success('Đã gán nhân sự vào lịch');
      setEnrollModalOpen(false);
      enrollForm.resetFields();
    },
    onError: () => message.error('Gán nhân sự thất bại'),
  });

  const removeEnrollmentMutation = useMutation({
    mutationFn: workShiftsApi.removeEnrollment,
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['work-schedules'] });
      // Invalidate all enrollment queries
      qc.invalidateQueries({ queryKey: ['enrollments'] });
      message.success('Đã xóa nhân sự khỏi lịch');
    },
    onError: () => message.error('Xóa thất bại'),
  });

  // ── Handlers ──
  function openCreateShift() {
    setEditShift(null);
    shiftForm.resetFields();
    setShiftModalOpen(true);
  }

  function openEditShift(record: WorkShift) {
    setEditShift(record);
    shiftForm.setFieldsValue(record);
    setShiftModalOpen(true);
  }

  function handleShiftSave() {
    shiftForm.validateFields().then((values) => {
      if (editShift) updateShiftMutation.mutate({ id: editShift.id, dto: values });
      else createShiftMutation.mutate(values);
    });
  }

  function handleAssignSave() {
    assignForm.validateFields().then((values) => {
      createAssignmentMutation.mutate({
        ...values,
        effectiveFrom: values.effectiveFrom.format('YYYY-MM-DD'),
        effectiveTo: values.effectiveTo ? values.effectiveTo.format('YYYY-MM-DD') : undefined,
      });
    });
  }

  function handleScheduleSave() {
    scheduleForm.validateFields().then((values) => {
      const phases = (values.phases ?? []).map((p: { shiftId: string }, i: number) => ({
        shiftId: p.shiftId,
        phaseOrder: i,
      }));
      createScheduleMutation.mutate({
        name: values.name,
        description: values.description,
        repeatType: values.repeatType,
        phases,
      });
    });
  }

  function openEnrollModal(schedule: WorkSchedule) {
    setEnrollTargetSchedule(schedule);
    enrollForm.resetFields();
    setEnrollModalOpen(true);
  }

  function handleEnrollSave() {
    if (!enrollTargetSchedule) return;
    enrollForm.validateFields().then((values) => {
      enrollMutation.mutate({
        scheduleId: enrollTargetSchedule.id,
        dto: {
          employeeIds: values.employeeIds?.length ? values.employeeIds : undefined,
          orgUnitId: values.orgUnitId ?? undefined,
          effectiveFrom: values.effectiveFrom.format('YYYY-MM-DD'),
          effectiveTo: values.effectiveTo ? values.effectiveTo.format('YYYY-MM-DD') : undefined,
          note: values.note,
        },
      });
    });
  }

  // ── Options ──
  const employeeOptions = useMemo(
    () => employees.map((e) => ({ value: e.id, label: `${e.code ?? ''} — ${e.fullName}` })),
    [employees],
  );

  const shiftOptions = useMemo(
    () => shifts.map((s) => ({ value: s.id, label: `${s.name} (${s.code})` })),
    [shifts],
  );

  // ── Shift columns ──
  const shiftColumns: ColumnsType<WorkShift> = [
    {
      title: 'Tên ca',
      key: 'name',
      render: (_, r) => <Text style={{ color: textPrimary, fontWeight: 600 }}>{r.name}</Text>,
    },
    {
      title: 'Mã ca',
      key: 'code',
      width: 100,
      render: (_, r) => <Text code style={{ color: linkColor, fontSize: 12 }}>{r.code}</Text>,
    },
    {
      title: 'Loại',
      key: 'type',
      width: 120,
      render: (_, r) => <ShiftTypeTag type={r.type} isDark={isDark} />,
    },
    {
      title: 'Giờ làm',
      key: 'time',
      width: 130,
      render: (_, r) => <Text style={{ color: textPrimary }}>{r.startTime} – {r.endTime}</Text>,
    },
    {
      title: 'Nghỉ giữa ca',
      key: 'break',
      width: 110,
      render: (_, r) => <Text style={{ color: textMuted }}>{r.breakMinutes} phút</Text>,
    },
    {
      title: 'Net giờ',
      key: 'netHours',
      width: 90,
      render: (_, r) => {
        const net = calcNetHours(r.startTime, r.endTime, r.breakMinutes);
        return <Text style={{ color: textPrimary, fontWeight: 600 }}>{net.toFixed(1)} giờ</Text>;
      },
    },
    {
      title: 'Trạng thái',
      key: 'isActive',
      width: 110,
      render: (_, r) => r.isActive
        ? <Tag color="success">Hoạt động</Tag>
        : <Tag color="default">Dừng</Tag>,
    },
    {
      title: '',
      key: 'actions',
      width: 80,
      render: (_, r) => (
        <Space size={4}>
          <Button type="text" size="small" icon={<EditOutlined />} style={{ color: textMuted }} onClick={() => openEditShift(r)} />
          <Button
            type="text" size="small" danger icon={<DeleteOutlined />}
            onClick={() => confirmDelete({ itemName: r.name, onConfirm: () => deleteShiftMutation.mutateAsync(r.id) })}
          />
        </Space>
      ),
    },
  ];

  // ── Assignment columns ──
  const today = dayjs().format('YYYY-MM-DD');
  const assignColumns: ColumnsType<ShiftAssignment> = [
    {
      title: 'Nhân viên',
      key: 'employee',
      render: (_, r) => <Text style={{ color: textPrimary, fontWeight: 500 }}>{r.employee?.fullName ?? r.employeeId}</Text>,
    },
    {
      title: 'Ca làm việc',
      key: 'shift',
      render: (_, r) => (
        <Space size={4}>
          <Text style={{ color: textPrimary }}>{r.shift?.name ?? r.shiftId}</Text>
          {r.shift?.code && <Text code style={{ color: linkColor, fontSize: 11 }}>{r.shift.code}</Text>}
        </Space>
      ),
    },
    {
      title: 'Hiệu lực từ',
      key: 'effectiveFrom',
      width: 120,
      render: (_, r) => <Text style={{ color: textMuted }}>{dayjs(r.effectiveFrom).format('DD/MM/YYYY')}</Text>,
    },
    {
      title: 'Đến ngày',
      key: 'effectiveTo',
      width: 120,
      render: (_, r) => r.effectiveTo
        ? <Text style={{ color: textMuted }}>{dayjs(r.effectiveTo).format('DD/MM/YYYY')}</Text>
        : <Text style={{ color: textMuted, fontStyle: 'italic' }}>Hiện tại</Text>,
    },
    {
      title: 'Trạng thái',
      key: 'status',
      width: 130,
      render: (_, r) => {
        const active = !r.effectiveTo || r.effectiveTo >= today;
        return active ? <Tag color="success">Đang áp dụng</Tag> : <Tag color="default">Đã kết thúc</Tag>;
      },
    },
    {
      title: '',
      key: 'actions',
      width: 60,
      render: (_, r) => (
        <Button
          type="text" size="small" danger icon={<DeleteOutlined />}
          onClick={() => confirmDelete({
            itemName: `phân công của ${r.employee?.fullName ?? r.employeeId}`,
            onConfirm: () => deleteAssignmentMutation.mutateAsync(r.id),
          })}
        />
      ),
    },
  ];

  // ── Schedule (template) columns ──
  const scheduleColumns: ColumnsType<WorkSchedule> = [
    {
      title: 'Tên lịch',
      key: 'name',
      render: (_, r) => (
        <div>
          <Text style={{ color: textPrimary, fontWeight: 600 }}>{r.name}</Text>
          {r.description && (
            <>
              <br />
              <Text style={{ color: textMuted, fontSize: 12 }}>{r.description}</Text>
            </>
          )}
        </div>
      ),
    },
    {
      title: 'Kiểu lặp',
      dataIndex: 'repeatType',
      width: 130,
      render: (v: ScheduleRepeatType) => {
        const meta = REPEAT_META[v];
        return (
          <Tag
            style={isDark ? { background: `${meta.color}20`, color: meta.color, borderColor: `${meta.color}40` } : {}}
            color={isDark ? undefined : v === 'DAILY' ? 'green' : v === 'WEEKLY' ? 'blue' : 'purple'}
          >
            {meta.label}
          </Tag>
        );
      },
    },
    {
      title: 'Chu kỳ ca',
      key: 'phases',
      render: (_, r) => (
        <Space size={4} wrap>
          {r.phases.map((phase, idx) => (
            <Space key={phase.id} size={2}>
              <Tooltip title={`${REPEAT_META[r.repeatType].phaseLabel} ${idx + 1}`}>
                <Tag style={{ margin: 0, fontSize: 12 }} color="default">
                  {phase.shift?.name ?? '(Ngày nghỉ)'}
                </Tag>
              </Tooltip>
              {idx < r.phases.length - 1 && (
                <ArrowRightOutlined style={{ color: textMuted, fontSize: 10 }} />
              )}
            </Space>
          ))}
          {r.phases.length > 1 && (
            <Tag style={{ margin: 0, fontSize: 11, cursor: 'default' }} color="default">↩</Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Nhân sự',
      key: 'enrolled',
      width: 130,
      render: (_, r) => (
        <EnrollmentPopover
          scheduleId={r.id}
          count={r._count?.enrollments ?? 0}
          onRemove={(id) => removeEnrollmentMutation.mutate(id)}
          isDark={isDark}
          textPrimary={textPrimary}
          textMuted={textMuted}
          borderColor={borderColor}
        />
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      width: 120,
      render: (v: boolean) => v
        ? <Badge status="success" text={<Text style={{ color: textPrimary }}>Đang dùng</Text>} />
        : <Badge status="default" text={<Text style={{ color: textMuted }}>Đã tắt</Text>} />,
    },
    {
      title: '',
      key: 'actions',
      width: 140,
      render: (_, r) => (
        <Space size={4}>
          <Button
            type="primary" ghost size="small" icon={<UserAddOutlined />}
            onClick={() => openEnrollModal(r)}
          >
            Gán nhân sự
          </Button>
          <Button
            type="text" size="small" danger icon={<DeleteOutlined />}
            onClick={() => confirmDelete({
              itemName: `lịch "${r.name}"`,
              onConfirm: () => deleteScheduleMutation.mutateAsync(r.id),
            })}
          />
        </Space>
      ),
    },
  ];

  // ── Tab action buttons ──
  const tabActions = {
    shifts: <Button type="primary" icon={<PlusOutlined />} onClick={openCreateShift}>Thêm ca</Button>,
    assignments: (
      <Button type="primary" icon={<PlusOutlined />} onClick={() => { assignForm.resetFields(); setAssignModalOpen(true); }}>
        Phân công ca mới
      </Button>
    ),
    schedules: (
      <Button type="primary" icon={<CalendarOutlined />} onClick={() => { scheduleForm.resetFields(); setScheduleRepeatType('WEEKLY'); setScheduleModalOpen(true); }}>
        Tạo lịch mới
      </Button>
    ),
  };

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Ca làm việc"
        icon={<ClockCircleOutlined />}
        iconColor="#F59E0B"
        actions={tabActions[activeTab]}
      />

      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={6}>
          <StatCard label="Tổng ca định nghĩa" value={totalShifts} color="#6366F1" icon={<ClockCircleOutlined />} />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard label="Ca đang hoạt động" value={activeShifts} color="#10B981" icon={<CheckCircleOutlined />} />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard label="Lịch xoay ca" value={totalSchedules} color="#3B82F6" icon={<CalendarOutlined />} />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard label="Nhân sự đã gán" value={totalEnrolled} color="#8B5CF6" icon={<TeamOutlined />} />
        </Col>
      </Row>

      <Tabs
        activeKey={activeTab}
        onChange={(k) => setActiveTab(k as typeof activeTab)}
        items={[
          {
            key: 'schedules',
            label: 'Lịch làm việc',
            children: (
              <>
                <FilterBar>
                  <Input
                    placeholder="Tìm kiếm lịch..."
                    style={{ width: 260 }}
                    allowClear
                    value={scheduleSearch}
                    onChange={(e) => setScheduleSearch(e.target.value)}
                  />
                </FilterBar>
                <div style={{ background: bgContainer, borderRadius: 12, border: `1px solid ${borderColor}`, overflow: 'hidden' }}>
                  <Table
                    rowKey="id"
                    columns={scheduleColumns}
                    dataSource={schedules}
                    loading={schedulesLoading}
                    pagination={{ pageSize: 20, showTotal: (t) => <Text style={{ color: textMuted }}>Tổng {t} lịch</Text> }}
                    scroll={{ x: 900 }}
                  />
                </div>
              </>
            ),
          },
          {
            key: 'shifts',
            label: 'Định nghĩa ca',
            children: (
              <div style={{ background: bgContainer, borderRadius: 12, border: `1px solid ${borderColor}`, overflow: 'hidden' }}>
                <Table
                  rowKey="id"
                  columns={shiftColumns}
                  dataSource={shifts}
                  loading={shiftsLoading}
                  pagination={false}
                  scroll={{ x: 800 }}
                />
              </div>
            ),
          },
          {
            key: 'assignments',
            label: 'Phân công đơn lẻ',
            children: (
              <>
                <FilterBar>
                  <Select
                    placeholder="Lọc nhân viên"
                    style={{ width: 220 }}
                    allowClear showSearch optionFilterProp="label"
                    options={employeeOptions}
                    value={filterEmpId}
                    onChange={setFilterEmpId}
                  />
                  <Select
                    placeholder="Lọc ca làm việc"
                    style={{ width: 200 }}
                    allowClear showSearch optionFilterProp="label"
                    options={shiftOptions}
                    value={filterShiftId}
                    onChange={setFilterShiftId}
                  />
                </FilterBar>
                <div style={{ background: bgContainer, borderRadius: 12, border: `1px solid ${borderColor}`, overflow: 'hidden' }}>
                  <Table
                    rowKey="id"
                    columns={assignColumns}
                    dataSource={assignments}
                    loading={assignmentsLoading}
                    pagination={{ pageSize: 20, showTotal: (t) => <Text style={{ color: textMuted }}>Tổng {t} phân công</Text> }}
                    scroll={{ x: 900 }}
                  />
                </div>
              </>
            ),
          },
        ]}
      />

      {/* ── Modal: Tạo/Sửa ca ──────────────────────────────────────────────── */}
      <CenteredModal
        open={shiftModalOpen}
        onClose={() => { setShiftModalOpen(false); setEditShift(null); shiftForm.resetFields(); }}
        title={editShift ? `Sửa ca: ${editShift.name}` : 'Thêm ca làm việc'}
        width={540}
        footer={
          <Space>
            <Button onClick={() => { setShiftModalOpen(false); setEditShift(null); shiftForm.resetFields(); }}>Huỷ</Button>
            <Button type="primary" loading={createShiftMutation.isPending || updateShiftMutation.isPending} onClick={handleShiftSave}>
              {editShift ? 'Lưu thay đổi' : 'Tạo ca'}
            </Button>
          </Space>
        }
      >
        <Form form={shiftForm} layout="vertical" requiredMark="optional">
          <Row gutter={12}>
            <Col span={14}>
              <Form.Item name="name" label="Tên ca" rules={[{ required: true, message: 'Nhập tên ca' }]}>
                <Input placeholder="VD: Ca Hành Chính" />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item name="code" label="Mã ca" rules={[{ required: true }, { pattern: /^[A-Z0-9_-]+$/, message: 'Chỉ dùng chữ hoa, số' }]}>
                <Input placeholder="VD: HC" onChange={(e) => shiftForm.setFieldValue('code', e.target.value.toUpperCase())} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="type" label="Loại ca" rules={[{ required: true }]}>
            <Select placeholder="Chọn loại ca" options={Object.entries(SHIFT_TYPE_MAP).map(([k, v]) => ({ value: k, label: v.label }))} />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="startTime" label="Giờ bắt đầu" rules={[{ required: true }]}>
                <Input placeholder="HH:mm — VD: 08:00" maxLength={5} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="endTime" label="Giờ kết thúc" rules={[{ required: true }]}>
                <Input placeholder="HH:mm — VD: 17:00" maxLength={5} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="breakMinutes" label="Nghỉ giữa ca (phút)" initialValue={60}>
            <InputNumber min={0} max={120} style={{ width: '100%' }} />
          </Form.Item>
          {editShift && (
            <Form.Item name="isActive" label="Trạng thái" initialValue={true}>
              <Select options={[{ value: true, label: 'Hoạt động' }, { value: false, label: 'Dừng' }]} />
            </Form.Item>
          )}
          <Form.Item name="description" label="Ghi chú">
            <Input.TextArea rows={2} placeholder="Mô tả thêm..." />
          </Form.Item>
        </Form>
      </CenteredModal>

      {/* ── Modal: Phân công ca ────────────────────────────────────────────── */}
      <CenteredModal
        open={assignModalOpen}
        onClose={() => { setAssignModalOpen(false); assignForm.resetFields(); }}
        title="Phân công ca làm việc"
        width={520}
        footer={
          <Space>
            <Button onClick={() => { setAssignModalOpen(false); assignForm.resetFields(); }}>Huỷ</Button>
            <Button type="primary" loading={createAssignmentMutation.isPending} onClick={handleAssignSave}>Phân công</Button>
          </Space>
        }
      >
        <Form form={assignForm} layout="vertical" requiredMark="optional">
          <Form.Item name="employeeId" label="Nhân viên" rules={[{ required: true }]}>
            <Select showSearch placeholder="Tìm và chọn nhân viên..." optionFilterProp="label" options={employeeOptions} />
          </Form.Item>
          <Form.Item name="shiftId" label="Ca làm việc" rules={[{ required: true }]}>
            <Select showSearch placeholder="Chọn ca làm việc" optionFilterProp="label" options={shiftOptions} />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="effectiveFrom" label="Hiệu lực từ ngày" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="effectiveTo" label="Đến ngày (nếu có)">
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="note" label="Ghi chú">
            <Input.TextArea rows={2} placeholder="Ghi chú thêm..." />
          </Form.Item>
        </Form>
      </CenteredModal>

      {/* ── Modal: Tạo lịch làm việc (template) ──────────────────────────── */}
      <CenteredModal
        open={scheduleModalOpen}
        onClose={() => { setScheduleModalOpen(false); scheduleForm.resetFields(); setScheduleRepeatType('WEEKLY'); }}
        title="Tạo lịch làm việc xoay ca"
        width={600}
        footer={
          <Space>
            <Button onClick={() => { setScheduleModalOpen(false); scheduleForm.resetFields(); }}>Huỷ</Button>
            <Button type="primary" loading={createScheduleMutation.isPending} onClick={handleScheduleSave}>Tạo lịch</Button>
          </Space>
        }
      >
        <Form form={scheduleForm} layout="vertical" requiredMark="optional"
          initialValues={{ repeatType: 'WEEKLY', phases: [{ shiftId: undefined }] }}>
          <Row gutter={12}>
            <Col span={24}>
              <Form.Item name="name" label="Tên lịch" rules={[{ required: true, message: 'Nhập tên lịch' }]}>
                <Input placeholder="VD: Lịch xoay ca sáng-chiều nhà máy A" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="Mô tả">
            <Input placeholder="Mô tả ngắn về lịch này..." />
          </Form.Item>

          <Form.Item name="repeatType" label="Kiểu lặp" rules={[{ required: true }]}>
            <Segmented
              block
              value={scheduleRepeatType}
              options={[
                { label: '🌅 Theo ngày', value: 'DAILY' },
                { label: '📅 Theo tuần', value: 'WEEKLY' },
                { label: '🗓️ Theo tháng', value: 'MONTHLY' },
              ]}
              onChange={(v) => {
                setScheduleRepeatType(v as ScheduleRepeatType);
                scheduleForm.setFieldValue('repeatType', v);
              }}
            />
          </Form.Item>

          <div style={{
            background: isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC',
            borderRadius: 8, padding: '6px 10px', marginBottom: 12, fontSize: 12, color: textMuted,
          }}>
            {scheduleRepeatType === 'DAILY' && '💡 Mỗi ngày đổi sang ca tiếp theo. VD: Ca sáng → Ca chiều → Ca đêm → Ca sáng → …'}
            {scheduleRepeatType === 'WEEKLY' && '💡 Mỗi tuần đổi ca. VD: Tuần 1 ca sáng, tuần 2 ca chiều, rồi lặp lại.'}
            {scheduleRepeatType === 'MONTHLY' && '💡 Mỗi tháng đổi ca. VD: 1 tháng hành chính, 1 tháng ca đêm.'}
          </div>

          <Divider style={{ margin: '8px 0 16px' }}>
            <Text style={{ color: textMuted, fontSize: 12 }}>Các ca trong chu kỳ</Text>
          </Divider>

          <Form.List name="phases" rules={[{
            validator: async (_, phases) => {
              if (!phases || phases.length < 1) return Promise.reject('Cần ít nhất 1 ca');
            },
          }]}>
            {(fields, { add, remove }, { errors }) => (
              <>
                {fields.map((field, index) => (
                  <Form.Item key={field.key} style={{ marginBottom: 8 }}>
                    <Row gutter={8} align="middle">
                      <Col flex="100px">
                        <Text style={{ color: textMuted, fontSize: 13 }}>
                          {REPEAT_META[scheduleRepeatType].phaseLabel} {index + 1}
                        </Text>
                      </Col>
                      <Col flex="auto">
                        <Form.Item {...field} name={[field.name, 'shiftId']} noStyle rules={[{ required: true, message: 'Chọn ca' }]}>
                          <Select
                            placeholder="Chọn ca làm việc"
                            showSearch optionFilterProp="label"
                            options={shifts.map((s) => ({ value: s.id, label: `${s.name} (${s.startTime}–${s.endTime})` }))}
                          />
                        </Form.Item>
                      </Col>
                      {fields.length > 1 && (
                        <Col flex="32px">
                          <Button type="text" size="small" danger icon={<MinusCircleOutlined />} onClick={() => remove(field.name)} />
                        </Col>
                      )}
                    </Row>
                  </Form.Item>
                ))}
                <Form.Item>
                  <Button
                    type="dashed" onClick={() => add()} block icon={<PlusOutlined />}
                    style={{ color: textMuted, borderColor }}
                  >
                    Thêm {REPEAT_META[scheduleRepeatType].phaseLabel.toLowerCase()} tiếp theo
                  </Button>
                  <Form.ErrorList errors={errors} />
                </Form.Item>
              </>
            )}
          </Form.List>
        </Form>
      </CenteredModal>

      {/* ── Modal: Gán nhân sự vào lịch ─────────────────────────────────── */}
      <CenteredModal
        open={enrollModalOpen}
        onClose={() => { setEnrollModalOpen(false); enrollForm.resetFields(); setEnrollTargetSchedule(null); }}
        title={`Gán nhân sự — ${enrollTargetSchedule?.name ?? ''}`}
        width={540}
        footer={
          <Space>
            <Button onClick={() => { setEnrollModalOpen(false); enrollForm.resetFields(); }}>Huỷ</Button>
            <Button type="primary" loading={enrollMutation.isPending} onClick={handleEnrollSave}>Gán vào lịch</Button>
          </Space>
        }
      >
        <Form form={enrollForm} layout="vertical" requiredMark="optional">
          <div style={{
            background: isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC',
            borderRadius: 8, padding: '8px 12px', marginBottom: 16, fontSize: 12, color: textMuted,
          }}>
            Chọn nhân viên hoặc phòng ban để áp dụng lịch xoay ca <strong style={{ color: textPrimary }}>
              {enrollTargetSchedule?.name}
            </strong>. Nhân sự trong lịch sẽ tự động nhận ca theo chu kỳ đã cấu hình.
          </div>

          <Form.Item name="employeeIds" label="Nhân viên (chọn nhiều)">
            <Select
              mode="multiple" showSearch placeholder="Tìm và chọn nhân viên..."
              optionFilterProp="label" options={employeeOptions}
            />
          </Form.Item>

          <Divider style={{ margin: '4px 0 12px' }}>
            <Text style={{ color: textMuted, fontSize: 11 }}>hoặc theo phòng ban</Text>
          </Divider>

          <Form.Item name="orgUnitId" label="Phòng ban (tất cả nhân viên trong phòng)">
            <Select allowClear placeholder="Chọn phòng ban..." options={[]} disabled />
          </Form.Item>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="effectiveFrom" label="Hiệu lực từ ngày" rules={[{ required: true, message: 'Chọn ngày bắt đầu' }]}>
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="effectiveTo" label="Đến ngày (để trống = vô thời hạn)">
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="note" label="Ghi chú">
            <Input.TextArea rows={2} placeholder="VD: Áp dụng từ kỳ mới..." />
          </Form.Item>
        </Form>
      </CenteredModal>
    </div>
  );
}
