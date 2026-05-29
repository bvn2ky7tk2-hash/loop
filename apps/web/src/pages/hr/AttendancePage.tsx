import { useState } from 'react';
import {
  Table, Button, Space, Typography, Tag, Form,
  Select, DatePicker, TimePicker, Input, Tabs,
  Popconfirm, message, App, Tooltip,
} from 'antd';
import {
  ScheduleOutlined, CheckOutlined, LockOutlined,
  SwapOutlined, ReloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { type Dayjs } from 'dayjs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useThemePalette } from '../../hooks/useThemePalette';
import { PageHeader } from '../../components/ui/PageHeader';
import { FilterBar } from '../../components/FilterBar';
import { CenteredModal } from '../../components/ui/CenteredModal';
import { employeesApi } from '../../api/employees';
import {
  hrAttendanceApi,
  type AttendanceRecord,
  type MonthlyAttendance,
  type AttendanceStatus,
} from '../../api/hr-attendance';
import { workShiftsApi } from '../../api/work-shifts';

const { Text } = Typography;
const { RangePicker } = DatePicker;

const ATTENDANCE_STATUS_MAP: Record<string, { label: string; color: string }> = {
  PRESENT: { label: 'Đi làm',    color: '#10B981' },
  ABSENT:  { label: 'Vắng mặt',  color: '#EF4444' },
  LEAVE:   { label: 'Nghỉ phép', color: '#F59E0B' },
  HOLIDAY: { label: 'Ngày lễ',   color: '#8B5CF6' },
  OT:      { label: 'Tăng ca',   color: '#F97316' },
};

function StatusTag({ status, isDark }: { status: string; isDark: boolean }) {
  const meta = ATTENDANCE_STATUS_MAP[status];
  if (!meta) return <Text>{status}</Text>;
  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  };
  return (
    <Tag
      style={isDark ? {
        background: hexToRgba(meta.color, 0.15),
        color: meta.color,
        borderColor: hexToRgba(meta.color, 0.35),
      } : {}}
      color={isDark ? undefined : meta.color}
    >
      {meta.label}
    </Tag>
  );
}

// ─── Tab 1: Bảng công tháng ───────────────────────────────────────────────────

function MonthlyTab() {
  const { textPrimary, textMuted, bgContainer, borderColor, isDark } = useThemePalette();
  const qc = useQueryClient();

  const [selectedMonth, setSelectedMonth] = useState<Dayjs>(dayjs());
  const [orgUnitId, setOrgUnitId] = useState<string | undefined>();

  const year = selectedMonth.year();
  const month = selectedMonth.month() + 1;

  const { data: monthly = [], isLoading, refetch } = useQuery({
    queryKey: ['attendance-monthly', year, month, orgUnitId],
    queryFn: () => hrAttendanceApi.monthlyReport({ year, month, orgUnitId }),
  });

  const summarizeMutation = useMutation({
    mutationFn: () => hrAttendanceApi.summarize({ year, month, orgUnitId }),
    onSuccess: () => { refetch(); message.success('Đã tổng hợp bảng công'); },
    onError: () => message.error('Tổng hợp thất bại'),
  });

  const lockMutation = useMutation({
    mutationFn: () => hrAttendanceApi.lock({ year, month, orgUnitId }),
    onSuccess: () => { refetch(); message.success('Đã khóa bảng công'); },
    onError: () => message.error('Khóa thất bại'),
  });

  const rows: MonthlyAttendance[] = Array.isArray(monthly?.data) ? monthly.data : Array.isArray(monthly) ? monthly : [];

  const columns: ColumnsType<MonthlyAttendance> = [
    {
      title: 'Nhân viên',
      key: 'employee',
      render: (_: unknown, r: MonthlyAttendance) => (
        <div>
          <Text style={{ color: textPrimary, fontWeight: 500 }}>{r.employee?.fullName ?? '—'}</Text>
          <br />
          <Text style={{ color: textMuted, fontSize: 12 }}>{r.employee?.code ?? ''}</Text>
        </div>
      ),
    },
    {
      title: 'Phòng ban',
      key: 'orgUnit',
      render: (_: unknown, r: MonthlyAttendance) => (
        <Text style={{ color: textMuted }}>{r.employee?.orgUnit?.name ?? '—'}</Text>
      ),
    },
    {
      title: 'Ngày công',
      dataIndex: 'workDays',
      width: 100,
      render: (v: number) => <Text style={{ color: textPrimary }}>{v}</Text>,
    },
    {
      title: 'Nghỉ phép',
      dataIndex: 'paidLeaveDays',
      width: 100,
      render: (v: number) => <Text style={{ color: textPrimary }}>{v}</Text>,
    },
    {
      title: 'Nghỉ không lương',
      dataIndex: 'unpaidLeaveDays',
      width: 130,
      render: (v: number) => <Text style={{ color: v > 0 ? '#EF4444' : textMuted }}>{v}</Text>,
    },
    {
      title: 'OT (giờ)',
      dataIndex: 'otHours',
      width: 100,
      render: (v: number) => <Text style={{ color: v > 0 ? '#F97316' : textPrimary }}>{v}h</Text>,
    },
    {
      title: 'Vắng mặt',
      dataIndex: 'absentDays',
      width: 100,
      render: (v: number) => <Text style={{ color: v > 0 ? '#EF4444' : textPrimary }}>{v}</Text>,
    },
    {
      title: 'Ngày lễ',
      dataIndex: 'holidayDays',
      width: 90,
      render: (v: number) => <Text style={{ color: textPrimary }}>{v}</Text>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      width: 110,
      render: (v: string) => (
        <Tag
          style={isDark
            ? v === 'LOCKED'
              ? { background: 'rgba(248,113,113,0.15)', color: '#FCA5A5', borderColor: 'rgba(248,113,113,0.3)' }
              : { background: 'rgba(96,165,250,0.15)', color: '#93C5FD', borderColor: 'rgba(96,165,250,0.3)' }
            : {}}
          color={isDark ? undefined : v === 'LOCKED' ? 'red' : 'blue'}
        >
          {v === 'LOCKED' ? 'Đã khóa' : 'Mở'}
        </Tag>
      ),
    },
  ];

  return (
    <div>
      <FilterBar
        right={
          <Space>
            <Button
              icon={<CheckOutlined />}
              loading={summarizeMutation.isPending}
              disabled={summarizeMutation.isPending}
              onClick={() => summarizeMutation.mutate()}
            >
              Tổng hợp tháng
            </Button>
            <Popconfirm
              title="Khóa bảng công"
              description="Sau khi khóa không thể sửa. Xác nhận?"
              onConfirm={() => lockMutation.mutate()}
              okText="Khóa"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
            >
              <Button danger icon={<LockOutlined />} loading={lockMutation.isPending} disabled={lockMutation.isPending}>
                Khóa bảng công
              </Button>
            </Popconfirm>
          </Space>
        }
      >
        <DatePicker
          picker="month"
          value={selectedMonth}
          onChange={v => v && setSelectedMonth(v)}
          format="MM/YYYY"
          allowClear={false}
          style={{ width: 150 }}
        />
        <Select
          placeholder="Phòng ban"
          allowClear
          style={{ width: 200 }}
          value={orgUnitId}
          onChange={setOrgUnitId}
        />
      </FilterBar>

      <div style={{ background: bgContainer, border: `1px solid ${borderColor}`, borderRadius: 8, overflow: 'hidden' }}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={rows}
          loading={isLoading}
          pagination={{ pageSize: 20 }}
          size="middle"
        />
      </div>
    </div>
  );
}

// ─── Tab 2: Chi tiết chấm công ────────────────────────────────────────────────

function DetailTab() {
  const { textPrimary, textMuted, bgContainer, borderColor, isDark } = useThemePalette();
  const { message: msg } = App.useApp();
  const qc = useQueryClient();

  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [employeeId, setEmployeeId] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<AttendanceStatus | undefined>();

  // ── Đổi ca nhanh ──
  const [swapOpen, setSwapOpen] = useState(false);
  const [swapForm] = Form.useForm();

  // ── Tính lại ngày công ──
  const [recalcOpen, setRecalcOpen] = useState(false);
  const [recalcForm] = Form.useForm();

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => employeesApi.list(),
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ['work-shifts'],
    queryFn: workShiftsApi.listShifts,
  });

  const { data: attendanceData, isLoading, refetch } = useQuery({
    queryKey: ['attendance-detail', dateRange, employeeId, statusFilter],
    queryFn: () => hrAttendanceApi.list({
      employeeId,
      dateFrom: dateRange?.[0]?.format('YYYY-MM-DD'),
      dateTo: dateRange?.[1]?.format('YYYY-MM-DD'),
      status: statusFilter,
      limit: 100,
    }),
  });

  const swapMutation = useMutation({
    mutationFn: workShiftsApi.swapShift,
    onSuccess: (res) => {
      msg.success(`Đã đổi ca cho ${res.updated} ngày`);
      setSwapOpen(false);
      swapForm.resetFields();
      qc.invalidateQueries({ queryKey: ['attendance-detail'] });
    },
    onError: () => msg.error('Đổi ca thất bại'),
  });

  const recalcMutation = useMutation({
    mutationFn: workShiftsApi.recalculate,
    onSuccess: (res) => {
      msg.success(`Đã tính lại ${res.updated}/${res.total} bản ghi`);
      setRecalcOpen(false);
      recalcForm.resetFields();
      refetch();
    },
    onError: () => msg.error('Tính lại thất bại'),
  });

  function handleSwapSave() {
    swapForm.validateFields().then((values) => {
      const [from, to] = values.dateRange as [Dayjs, Dayjs];
      const dates: string[] = [];
      let cur = from.clone();
      while (!cur.isAfter(to)) {
        dates.push(cur.format('YYYY-MM-DD'));
        cur = cur.add(1, 'day');
      }
      swapMutation.mutate({
        employeeId: values.employeeId,
        newShiftId: values.newShiftId,
        dates,
        reason: values.reason,
      });
    });
  }

  function handleRecalcSave() {
    recalcForm.validateFields().then((values) => {
      recalcMutation.mutate({
        employeeId: values.employeeId,
        year: (values.month as Dayjs).year(),
        month: (values.month as Dayjs).month() + 1,
      });
    });
  }

  const records: AttendanceRecord[] = Array.isArray(attendanceData?.data)
    ? attendanceData.data
    : Array.isArray(attendanceData)
    ? attendanceData
    : [];

  const columns: ColumnsType<AttendanceRecord> = [
    {
      title: 'Nhân viên',
      key: 'employee',
      render: (_: unknown, r: AttendanceRecord) => (
        <div>
          <Text style={{ color: textPrimary }}>{r.employee?.fullName ?? '—'}</Text>
          <br />
          <Text style={{ color: textMuted, fontSize: 12 }}>{r.employee?.code ?? ''}</Text>
        </div>
      ),
    },
    {
      title: 'Ngày',
      dataIndex: 'date',
      width: 110,
      render: (v: string) => <Text style={{ color: textPrimary }}>{dayjs(v).format('DD/MM/YYYY')}</Text>,
    },
    {
      title: 'Ca',
      key: 'shift',
      width: 90,
      render: (_: unknown, r: AttendanceRecord) => r.plannedStart && r.plannedEnd
        ? <Text style={{ color: textMuted, fontSize: 12 }}>{r.plannedStart}–{r.plannedEnd}</Text>
        : <Text style={{ color: textMuted }}>—</Text>,
    },
    {
      title: 'Check-in',
      dataIndex: 'checkIn',
      width: 90,
      render: (v?: string) => v
        ? <Text style={{ color: textPrimary }}>{dayjs(v).format('HH:mm')}</Text>
        : <Text style={{ color: textMuted }}>—</Text>,
    },
    {
      title: 'Check-out',
      dataIndex: 'checkOut',
      width: 90,
      render: (v?: string) => v
        ? <Text style={{ color: textPrimary }}>{dayjs(v).format('HH:mm')}</Text>
        : <Text style={{ color: textMuted }}>—</Text>,
    },
    {
      title: 'Tổng giờ',
      dataIndex: 'totalHours',
      width: 85,
      render: (v?: number) => v != null
        ? <Text style={{ color: textPrimary, fontWeight: 600 }}>{Number(v).toFixed(1)}h</Text>
        : <Text style={{ color: textMuted }}>—</Text>,
    },
    {
      title: 'Đi muộn',
      dataIndex: 'lateMinutes',
      width: 85,
      render: (v?: number) => v && v > 0
        ? <Text style={{ color: '#EF4444', fontWeight: 500 }}>{v}p</Text>
        : <Text style={{ color: textMuted }}>—</Text>,
    },
    {
      title: 'Về sớm',
      dataIndex: 'earlyLeaveMinutes',
      width: 80,
      render: (v?: number) => v && v > 0
        ? <Text style={{ color: '#F59E0B', fontWeight: 500 }}>{v}p</Text>
        : <Text style={{ color: textMuted }}>—</Text>,
    },
    {
      title: 'OT',
      dataIndex: 'overtimeMinutes',
      width: 75,
      render: (v?: number) => v && v > 0
        ? <Text style={{ color: '#F97316', fontWeight: 500 }}>{(v / 60).toFixed(1)}h</Text>
        : <Text style={{ color: textMuted }}>—</Text>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      width: 110,
      render: (v: string) => <StatusTag status={v} isDark={isDark} />,
    },
    {
      title: 'Phép',
      dataIndex: 'leaveType',
      width: 80,
      render: (v?: string) => v
        ? <Tag color="blue" style={{ fontSize: 11 }}>{v}</Tag>
        : <Text style={{ color: textMuted }}>—</Text>,
    },
    {
      title: 'TC',
      dataIndex: 'isManual',
      width: 55,
      render: (v: boolean) => v
        ? <Tooltip title="Thủ công"><Tag color="orange" style={{ fontSize: 10, padding: '0 4px' }}>TC</Tag></Tooltip>
        : null,
    },
  ];

  const employeeOptions = employees.map(e => ({ value: e.id, label: `${e.code} — ${e.fullName}` }));
  const shiftOptions = shifts.map(s => ({
    value: s.id,
    label: `${s.name} (${s.startTime}–${s.endTime})`,
  }));

  return (
    <div>
      <FilterBar
        right={
          <Space size={8}>
            <Tooltip title="Đổi ca cho nhân viên trong khoảng ngày cụ thể">
              <Button
                icon={<SwapOutlined />}
                onClick={() => setSwapOpen(true)}
              >
                Đổi ca nhanh
              </Button>
            </Tooltip>
            <Tooltip title="Tính lại giờ đi muộn / về sớm / OT theo ca làm việc">
              <Button
                icon={<ReloadOutlined />}
                onClick={() => setRecalcOpen(true)}
              >
                Tính lại ngày công
              </Button>
            </Tooltip>
          </Space>
        }
      >
        <RangePicker
          style={{ width: 260 }}
          onChange={v => setDateRange(v ? [v[0]!, v[1]!] : null)}
          format="DD/MM/YYYY"
        />
        <Select
          showSearch
          placeholder="Nhân viên"
          allowClear
          style={{ width: 220 }}
          value={employeeId}
          onChange={setEmployeeId}
          filterOption={(input, opt) =>
            String(opt?.label ?? '').toLowerCase().includes(input.toLowerCase())
          }
          options={employeeOptions}
        />
        <Select
          placeholder="Trạng thái"
          allowClear
          style={{ width: 150 }}
          value={statusFilter}
          onChange={setStatusFilter}
          options={Object.entries(ATTENDANCE_STATUS_MAP).map(([k, v]) => ({ value: k, label: v.label }))}
        />
      </FilterBar>

      <div style={{ background: bgContainer, border: `1px solid ${borderColor}`, borderRadius: 8, overflow: 'hidden' }}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={records}
          loading={isLoading}
          pagination={{ pageSize: 20 }}
          size="small"
          scroll={{ x: 1000 }}
        />
      </div>

      {/* ── Modal: Đổi ca nhanh ──────────────────────────────────────────────── */}
      <CenteredModal
        open={swapOpen}
        onClose={() => { setSwapOpen(false); swapForm.resetFields(); }}
        title="Đổi ca nhanh"
        width={480}
        footer={
          <Space>
            <Button onClick={() => { setSwapOpen(false); swapForm.resetFields(); }}>Huỷ</Button>
            <Button type="primary" icon={<SwapOutlined />} loading={swapMutation.isPending} disabled={swapMutation.isPending} onClick={handleSwapSave}>
              Đổi ca
            </Button>
          </Space>
        }
      >
        <Form form={swapForm} layout="vertical" requiredMark="optional">
          <Form.Item name="employeeId" label="Nhân viên" rules={[{ required: true, message: 'Chọn nhân viên' }]}>
            <Select
              showSearch placeholder="Tìm và chọn nhân viên..."
              optionFilterProp="label" options={employeeOptions}
            />
          </Form.Item>
          <Form.Item name="dateRange" label="Khoảng ngày cần đổi" rules={[{ required: true, message: 'Chọn ngày' }]}>
            <DatePicker.RangePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="newShiftId" label="Ca làm việc mới" rules={[{ required: true, message: 'Chọn ca' }]}>
            <Select showSearch placeholder="Chọn ca làm việc" optionFilterProp="label" options={shiftOptions} />
          </Form.Item>
          <Form.Item name="reason" label="Lý do (tuỳ chọn)">
            <Input placeholder="VD: Đổi ca đột xuất, bổ sung nhân sự ca đêm..." />
          </Form.Item>
          <div style={{
            padding: '8px 12px',
            background: isDark ? 'rgba(251,191,36,0.08)' : '#FFFBEB',
            borderRadius: 6,
            fontSize: 12,
            color: textMuted,
            border: `1px solid ${isDark ? 'rgba(251,191,36,0.2)' : '#FDE68A'}`,
          }}>
            ⚠️ Thao tác này sẽ tạo hoặc cập nhật bản ghi chấm công cho tất cả ngày trong khoảng đã chọn với ca mới. Bản ghi thủ công sẽ ghi đè ca từ lịch làm việc.
          </div>
        </Form>
      </CenteredModal>

      {/* ── Modal: Tính lại ngày công ────────────────────────────────────────── */}
      <CenteredModal
        open={recalcOpen}
        onClose={() => { setRecalcOpen(false); recalcForm.resetFields(); }}
        title="Tính lại ngày công"
        width={420}
        footer={
          <Space>
            <Button onClick={() => { setRecalcOpen(false); recalcForm.resetFields(); }}>Huỷ</Button>
            <Button type="primary" icon={<ReloadOutlined />} loading={recalcMutation.isPending} disabled={recalcMutation.isPending} onClick={handleRecalcSave}>
              Tính lại
            </Button>
          </Space>
        }
      >
        <Form form={recalcForm} layout="vertical" requiredMark="optional">
          <Form.Item name="employeeId" label="Nhân viên" rules={[{ required: true, message: 'Chọn nhân viên' }]}>
            <Select
              showSearch placeholder="Tìm và chọn nhân viên..."
              optionFilterProp="label" options={employeeOptions}
            />
          </Form.Item>
          <Form.Item name="month" label="Tháng tính lại" rules={[{ required: true, message: 'Chọn tháng' }]}>
            <DatePicker picker="month" style={{ width: '100%' }} format="MM/YYYY" />
          </Form.Item>
          <div style={{
            padding: '8px 12px',
            background: isDark ? 'rgba(59,130,246,0.08)' : '#EFF6FF',
            borderRadius: 6,
            fontSize: 12,
            color: textMuted,
            border: `1px solid ${isDark ? 'rgba(59,130,246,0.2)' : '#BFDBFE'}`,
          }}>
            💡 Hệ thống sẽ tra lịch làm việc của nhân viên, so sánh giờ check-in/out thực tế với giờ ca, và cập nhật lại <strong>đi muộn / về sớm / OT</strong> cho từng ngày có dữ liệu.
          </div>
        </Form>
      </CenteredModal>
    </div>
  );
}

// ─── Tab 3: Nhập chấm công thủ công ─────────────────────────────────────────

function ManualEntryTab() {
  const { textMuted } = useThemePalette();
  const [form] = Form.useForm();

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => employeesApi.list(),
  });

  const upsertMutation = useMutation({
    mutationFn: (data: Parameters<typeof hrAttendanceApi.upsert>[0]) =>
      hrAttendanceApi.upsert(data),
    onSuccess: () => { message.success('Đã lưu chấm công'); form.resetFields(); },
    onError: () => message.error('Có lỗi xảy ra'),
  });

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const { date, checkIn, checkOut, ...rest } = values;
    upsertMutation.mutate({
      ...rest,
      date: (date as Dayjs).format('YYYY-MM-DD'),
      checkIn: checkIn ? (checkIn as Dayjs).toISOString() : undefined,
      checkOut: checkOut ? (checkOut as Dayjs).toISOString() : undefined,
      isManual: true,
    });
  };

  return (
    <div style={{ maxWidth: 560 }}>
      <Form form={form} layout="vertical">
        <Form.Item
          name="employeeId"
          label="Nhân viên"
          rules={[{ required: true, message: 'Vui lòng chọn nhân viên' }]}
        >
          <Select
            showSearch
            placeholder="Chọn nhân viên"
            filterOption={(input, opt) =>
              String(opt?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            options={employees.map(e => ({ value: e.id, label: `${e.code} — ${e.fullName}` }))}
          />
        </Form.Item>

        <Form.Item
          name="date"
          label="Ngày"
          rules={[{ required: true, message: 'Vui lòng chọn ngày' }]}
        >
          <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
        </Form.Item>

        <Form.Item name="checkIn" label="Giờ check-in">
          <TimePicker style={{ width: '100%' }} format="HH:mm" minuteStep={5} />
        </Form.Item>

        <Form.Item name="checkOut" label="Giờ check-out">
          <TimePicker style={{ width: '100%' }} format="HH:mm" minuteStep={5} />
        </Form.Item>

        <Form.Item
          name="status"
          label="Trạng thái"
          rules={[{ required: true, message: 'Vui lòng chọn trạng thái' }]}
          initialValue="PRESENT"
        >
          <Select
            options={Object.entries(ATTENDANCE_STATUS_MAP).map(([k, v]) => ({
              value: k,
              label: v.label,
            }))}
          />
        </Form.Item>

        <Form.Item name="note" label="Ghi chú">
          <Input.TextArea rows={3} placeholder="Lý do nhập thủ công, ghi chú..." />
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            loading={upsertMutation.isPending}
            disabled={upsertMutation.isPending}
            onClick={handleSubmit}
            icon={<CheckOutlined />}
          >
            Lưu chấm công
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AttendancePage() {
  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Bảng công"
        icon={<ScheduleOutlined />}
        iconColor="#3B82F6"
      />

      <Tabs
        defaultActiveKey="monthly"
        items={[
          {
            key: 'monthly',
            label: 'Bảng công tháng',
            children: <MonthlyTab />,
          },
          {
            key: 'detail',
            label: 'Chi tiết chấm công',
            children: <DetailTab />,
          },
          {
            key: 'manual',
            label: 'Nhập chấm công',
            children: <ManualEntryTab />,
          },
        ]}
      />
    </div>
  );
}
