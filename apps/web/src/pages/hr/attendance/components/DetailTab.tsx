import { useState, useMemo } from 'react';
import {
  Table, Button, Space, Typography, Tag, Form,
  Select, DatePicker, Input,
  Popconfirm, App, Tooltip,
} from 'antd';
import {
  CheckOutlined, LockOutlined,
  SwapOutlined, ReloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { type Dayjs } from 'dayjs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useThemePalette } from '../../../../hooks/useThemePalette';
import { usePagination } from '../../../../hooks/usePagination';
import { EmployeeInfoCell } from '../../../../components/ui/EmployeeInfoCell';
import { FilterBar } from '../../../../components/FilterBar';
import { CenteredModal } from '../../../../components/ui/CenteredModal';
import { SectionCard } from '../../../../components/ui/SectionCard';
import { employeesApi } from '../../../../api/employees';
import {
  hrAttendanceApi,
  type AttendanceRecord,
  type AttendanceStatus,
} from '../../../../api/hr-attendance';
import { workShiftsApi } from '../../../../api/work-shifts';
import { orgUnitsApi } from '../../../../api/org-units';
import { ATTENDANCE_STATUS_MAP, StatusTag, AnomalyTags, flattenOrgTree, type OrgTreeNode } from '../constants';

const { Text } = Typography;
const { RangePicker } = DatePicker;

export function DetailTab() {
  const { textPrimary, textMuted, isDark } = useThemePalette();
  const { paginationProps: detailPaginationProps } = usePagination(20);
  const { message: msg } = App.useApp();
  const qc = useQueryClient();

  // ── Filters: Bảng chi tiết ──
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [employeeId, setEmployeeId] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<AttendanceStatus | undefined>();

  // ── Filters: Bảng tổng hợp tháng ──
  const [selectedMonth, setSelectedMonth] = useState<Dayjs>(dayjs());
  const [monthOrgUnitId, setMonthOrgUnitId] = useState<string | undefined>();

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

  const { data: orgTree = [] } = useQuery({
    queryKey: ['org-units'],
    queryFn: orgUnitsApi.list,
  });

  const { data: attendanceData, isLoading: detailLoading, refetch: detailRefetch } = useQuery({
    queryKey: ['attendance-detail', dateRange, employeeId, statusFilter],
    queryFn: () => hrAttendanceApi.list({
      employeeId,
      dateFrom: dateRange?.[0]?.format('YYYY-MM-DD'),
      dateTo: dateRange?.[1]?.format('YYYY-MM-DD'),
      status: statusFilter,
      limit: 100,
    }),
  });

  const year = selectedMonth.year();
  const month = selectedMonth.month() + 1;

  const { refetch: monthlyRefetch } = useQuery({
    queryKey: ['attendance-monthly', year, month, monthOrgUnitId],
    queryFn: () => hrAttendanceApi.monthlyReport({ year, month, orgUnitId: monthOrgUnitId }),
  });

  const summarizeMutation = useMutation({
    mutationFn: () => hrAttendanceApi.summarize({ year, month, orgUnitId: monthOrgUnitId }),
    onSuccess: () => { monthlyRefetch(); msg.success('Đã tổng hợp bảng công'); },
    onError: () => msg.error('Tổng hợp thất bại'),
  });

  const lockMutation = useMutation({
    mutationFn: () => hrAttendanceApi.lock({ year, month, orgUnitId: monthOrgUnitId }),
    onSuccess: () => { monthlyRefetch(); msg.success('Đã khóa bảng công'); },
    onError: () => msg.error('Khóa thất bại'),
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
      detailRefetch();
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

  const orgUnitOptions = useMemo(
    () => flattenOrgTree(orgTree as OrgTreeNode[]).map((u) => ({ value: u.id, label: u.name })),
    [orgTree],
  );

  const records: AttendanceRecord[] = attendanceData?.data ?? [];

  const detailColumns: ColumnsType<AttendanceRecord> = [
    {
      title: 'Nhân viên',
      key: 'employee',
      render: (_: unknown, r: AttendanceRecord) =>
        r.employee ? <EmployeeInfoCell employee={r.employee} /> : <Text style={{ color: textMuted }}>—</Text>,
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
      title: 'Ngày công',
      dataIndex: 'dayCredit',
      width: 95,
      align: 'right' as const,
      render: (v?: number, r?: AttendanceRecord) => {
        if (r?.status === 'ABSENT') return <Text style={{ color: '#EF4444', fontWeight: 600 }}>0</Text>;
        if (v == null) return <Text style={{ color: textMuted }}>—</Text>;
        const num = Number(v);
        if (num >= 1) return <Text style={{ color: '#10B981', fontWeight: 700 }}>1</Text>;
        if (num > 0) return <Text style={{ color: '#F59E0B', fontWeight: 600 }}>{num.toFixed(2)}</Text>;
        return <Text style={{ color: '#EF4444' }}>0</Text>;
      },
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
        ? <Text style={{ color: '#F97316', fontWeight: 500 }}>{(Number(v) / 60).toFixed(1)}h</Text>
        : <Text style={{ color: textMuted }}>—</Text>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      width: 150,
      render: (v: string, r: AttendanceRecord) => (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
          <StatusTag status={v} isDark={isDark} />
          <AnomalyTags anomalies={r.anomalies} isDark={isDark} />
        </div>
      ),
    },
    {
      title: 'Loại phép',
      key: 'leaveInfo',
      width: 130,
      render: (_: unknown, r: AttendanceRecord) => {
        const li = r.leaveInfo;
        if (li) {
          return (
            <Tag
              style={{
                background: isDark ? `${li.color}22` : `${li.color}18`,
                color: li.color,
                borderColor: `${li.color}55`,
                fontSize: 11,
                maxWidth: 120,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {li.name}
            </Tag>
          );
        }
        // Fallback: leaveType string nếu không có leaveInfo
        if (r.leaveType) return <Tag color="blue" style={{ fontSize: 11 }}>{r.leaveType}</Tag>;
        return <Text style={{ color: textMuted }}>—</Text>;
      },
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
        <RangePicker
          style={{ width: 260 }}
          onChange={v => setDateRange(v ? [v[0]!, v[1]!] : null)}
          format="DD/MM/YYYY"
          placeholder={['Từ ngày', 'Đến ngày']}
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
        <DatePicker
          picker="month"
          value={selectedMonth}
          onChange={v => v && setSelectedMonth(v)}
          format="MM/YYYY"
          allowClear={false}
          style={{ width: 150 }}
          placeholder="Tháng tổng hợp"
        />
        <Select
          showSearch
          placeholder="Phòng ban (tổng hợp)"
          allowClear
          style={{ width: 220 }}
          value={monthOrgUnitId}
          onChange={setMonthOrgUnitId}
          filterOption={(input, opt) =>
            String(opt?.label ?? '').toLowerCase().includes(input.toLowerCase())
          }
          options={orgUnitOptions}
        />
      </FilterBar>

      {/* ── Bảng Chi tiết chấm công ──────────────────────────────────────────── */}
      <SectionCard noPadding style={{ marginBottom: 24 }}>
        <Table
          rowKey="id"
          columns={detailColumns}
          dataSource={records}
          loading={detailLoading}
          pagination={detailPaginationProps(records.length, 'bản ghi')}
          size="small"
          scroll={{ x: 1000 }}
        />
      </SectionCard>

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
