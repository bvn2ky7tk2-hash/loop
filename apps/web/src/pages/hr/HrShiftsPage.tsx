import { useState, useMemo, useEffect } from 'react';
import {
  Button, Form, Input, Select,
  Space, Table, Tag, Tabs, Typography, Row, Col, App,
  Tooltip, Badge,
} from 'antd';
import {
  ClockCircleOutlined, PlusOutlined, EditOutlined, DeleteOutlined,
  TeamOutlined, CheckCircleOutlined, CalendarOutlined,
  ArrowRightOutlined, UserAddOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';

import { useThemePalette } from '../../hooks/useThemePalette';
import { usePagination } from '../../hooks/usePagination';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { FilterBar } from '../../components/FilterBar';
import { confirmDelete } from '../../components/ui/confirmDelete';
import { EmployeeInfoCell } from '../../components/ui/EmployeeInfoCell';
import {
  workShiftsApi,
  type WorkShift, type ShiftAssignment,
  type WorkSchedule, type ScheduleRepeatType,
} from '../../api/work-shifts';
import { employeesApi } from '../../api/employees';

import { REPEAT_META, calcNetHours, ShiftTypeTag } from './hr-shifts/components/constants';
import { EnrollmentPopover } from './hr-shifts/components/EnrollmentPopover';
import { ShiftFormModal } from './hr-shifts/components/ShiftFormModal';
import { AssignmentFormModal } from './hr-shifts/components/AssignmentFormModal';
import { ScheduleFormModal } from './hr-shifts/components/ScheduleFormModal';
import { EnrollModal } from './hr-shifts/components/EnrollModal';

const { Text } = Typography;

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function HrShiftsPage() {
  const { textPrimary, textMuted, borderColor, bgContainer, linkColor, isDark } = useThemePalette();
  const { message } = App.useApp();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<'shifts' | 'assignments' | 'schedules'>('schedules');

  // ── Pagination ──
  const { resetPage: resetSchedulePage, paginationProps: schedulePagination } = usePagination(20);
  const { resetPage: resetAssignPage, paginationProps: assignPagination } = usePagination(50);

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

  useEffect(() => { resetSchedulePage(); }, [scheduleSearch, resetSchedulePage]);
  useEffect(() => { resetAssignPage(); }, [filterEmpId, filterShiftId, resetAssignPage]);

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
    queryFn: () => employeesApi.list(),
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
    onSuccess: () => {
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
      const hasEmployees = values.employeeIds?.length > 0;
      const hasOrgUnit = !!values.orgUnitId;
      if (!hasEmployees && !hasOrgUnit) {
        message.warning('Vui lòng chọn ít nhất 1 nhân viên trước khi gán vào lịch');
        return;
      }
      enrollMutation.mutate({
        scheduleId: enrollTargetSchedule.id,
        dto: {
          employeeIds: hasEmployees ? values.employeeIds : undefined,
          orgUnitId: hasOrgUnit ? values.orgUnitId : undefined,
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
      render: (_, r) => r.employee
        ? <EmployeeInfoCell employee={r.employee} />
        : <Text style={{ color: textMuted }}>{r.employeeId}</Text>,
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
                    pagination={schedulePagination(schedules.length, 'lịch')}
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
                    pagination={assignPagination(assignments.length, 'phân công')}
                    scroll={{ x: 900 }}
                  />
                </div>
              </>
            ),
          },
        ]}
      />

      {/* ── Modal: Tạo/Sửa ca ──────────────────────────────────────────────── */}
      <ShiftFormModal
        open={shiftModalOpen}
        onClose={() => { setShiftModalOpen(false); setEditShift(null); shiftForm.resetFields(); }}
        form={shiftForm}
        editShift={editShift}
        onSave={handleShiftSave}
        saving={createShiftMutation.isPending || updateShiftMutation.isPending}
      />

      {/* ── Modal: Phân công ca ────────────────────────────────────────────── */}
      <AssignmentFormModal
        open={assignModalOpen}
        onClose={() => { setAssignModalOpen(false); assignForm.resetFields(); }}
        form={assignForm}
        employeeOptions={employeeOptions}
        shiftOptions={shiftOptions}
        onSave={handleAssignSave}
        saving={createAssignmentMutation.isPending}
      />

      {/* ── Modal: Tạo lịch làm việc (template) ──────────────────────────── */}
      <ScheduleFormModal
        open={scheduleModalOpen}
        onClose={() => { setScheduleModalOpen(false); scheduleForm.resetFields(); setScheduleRepeatType('WEEKLY'); }}
        form={scheduleForm}
        shifts={shifts}
        scheduleRepeatType={scheduleRepeatType}
        setScheduleRepeatType={setScheduleRepeatType}
        onSave={handleScheduleSave}
        saving={createScheduleMutation.isPending}
        isDark={isDark}
        textMuted={textMuted}
        borderColor={borderColor}
      />

      {/* ── Modal: Gán nhân sự vào lịch ─────────────────────────────────── */}
      <EnrollModal
        open={enrollModalOpen}
        onClose={() => { setEnrollModalOpen(false); enrollForm.resetFields(); setEnrollTargetSchedule(null); }}
        form={enrollForm}
        target={enrollTargetSchedule}
        employeeOptions={employeeOptions}
        onSave={handleEnrollSave}
        saving={enrollMutation.isPending}
        isDark={isDark}
        textPrimary={textPrimary}
        textMuted={textMuted}
      />
    </div>
  );
}
