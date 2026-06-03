import { useState, useMemo } from 'react';
import {
  Card, Row, Col, Table, Button, DatePicker, Select,
  Typography, Alert, Space, Popconfirm, Tooltip, Badge,
  Form, Input, Tag, Segmented, InputNumber,
} from 'antd';
import {
  CalendarOutlined, ClockCircleOutlined, CheckCircleOutlined,
  SyncOutlined, SendOutlined, CloseCircleOutlined,
  WarningOutlined, EditOutlined, FileTextOutlined, ScheduleOutlined,
} from '@ant-design/icons';
import { useColumnVisibility } from '../../hooks/useColumnVisibility';
import { ColumnToggle } from '../../components/ColumnToggle';
import { StatCard } from '../../components/ui/StatCard';
import { CenteredModal } from '../../components/ui/CenteredModal';
import { useThemePalette } from '../../hooks/useThemePalette';

const TIMESHEET_COL_DEFS = [
  { key: 'date',              label: 'Ngày' },
  { key: 'shift',             label: 'Ca làm việc' },
  { key: 'checkIn',          label: 'Giờ vào' },
  { key: 'checkOut',         label: 'Giờ ra' },
  { key: 'workHours',        label: 'Giờ làm' },
  { key: 'dayCredit',        label: 'Ngày công' },
  { key: 'lateMinutes',      label: 'Đi muộn' },
  { key: 'earlyLeaveMinutes', label: 'Về sớm' },
  { key: 'leaveInfo',        label: 'Phép' },
  { key: 'overtimeHours',    label: 'OT' },
  { key: 'status',           label: 'Trạng thái' },
];
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { timesheetApi, type TimesheetRecord, type TimeEntryDay } from '../../api/timesheet';
import { attendanceExplanationApi, type ExplanationType } from '../../api/hr-attendance';
import { leavesApi } from '../../api/leaves';
import { employeesApi } from '../../api/employees';
import dayjs, { type Dayjs } from 'dayjs';

const { Text } = Typography;

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_TAG: Record<TimesheetRecord['status'], { label: string; bg: string; color: string; darkBg: string; darkColor: string; icon: React.ReactNode }> = {
  DRAFT:         { label: 'Bản nháp',        bg: '#F1F5F9', color: '#475569', darkBg: '#1E293B', darkColor: '#94A3B8', icon: <ClockCircleOutlined /> },
  SUBMITTED:     { label: 'Chờ duyệt',       bg: '#EEF2FF', color: '#4338CA', darkBg: '#1e1b4b', darkColor: '#a5b4fc', icon: <SyncOutlined spin /> },
  APPROVED:      { label: 'Đã duyệt',        bg: '#ECFDF5', color: '#065F46', darkBg: '#052e16', darkColor: '#6ee7b7', icon: <CheckCircleOutlined /> },
  REJECTED:      { label: 'Bị từ chối',      bg: '#FEF2F2', color: '#DC2626', darkBg: '#450a0a', darkColor: '#fca5a5', icon: <CloseCircleOutlined /> },
  MISSING_SHIFT: { label: 'Thiếu ca làm việc', bg: '#FFF7ED', color: '#C2410C', darkBg: '#431407', darkColor: '#FB923C', icon: <ClockCircleOutlined /> },
};

const EXPLANATION_TYPE_LABEL: Record<ExplanationType, string> = {
  MISSING_CHECKIN:  'Thiếu giờ vào',
  MISSING_CHECKOUT: 'Thiếu giờ ra',
  LATE_ARRIVAL:     'Đến muộn',
  EARLY_DEPARTURE:  'Về sớm',
  BUSINESS_TRIP:    'Công tác',
  ONSITE:           'Làm việc tại công trình',
  WFH:              'Làm việc từ xa (WFH)',
};

// ─── Helper: Phát hiện loại lỗi chấm công ────────────────────────────────────

function detectIssueType(day: TimeEntryDay): ExplanationType | null {
  if (day.status === 'off') return null;   // Ca nghỉ → bỏ qua
  if (day.status === 'leave') return null; // Có đơn phép duyệt → không phải lỗi
  if (day.leaveInfo) return null;          // Có thông tin phép → bỏ qua
  if (!day.checkIn) return 'MISSING_CHECKIN';
  if (!day.checkOut) return 'MISSING_CHECKOUT';
  if (day.workHours !== null && day.workHours > 0 && day.workHours < 8) return 'LATE_ARRIVAL';
  if (day.status === 'absent') return 'MISSING_CHECKIN';
  return null;
}

function issueLabel(type: ExplanationType | null): string {
  if (!type) return '';
  return EXPLANATION_TYPE_LABEL[type] ?? type;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TimesheetPage() {
  const qc = useQueryClient();
  const { isDark, textPrimary, textMuted } = useThemePalette();
  const [month, setMonth]             = useState<Dayjs>(dayjs().startOf('month'));
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Modal state
  const [explainDay, setExplainDay]   = useState<TimeEntryDay | null>(null);
  const [modalTab, setModalTab]       = useState<'explain' | 'leave'>('explain');
  const [explainForm]                 = Form.useForm();
  const [leaveForm]                   = Form.useForm();

  const { isVisible, toggle, reset: resetCols } = useColumnVisibility('timesheet', TIMESHEET_COL_DEFS);

  const periodStart = month.format('YYYY-MM-DD');
  const periodEnd   = month.endOf('month').format('YYYY-MM-DD');

  // Lấy thông tin nhân viên hiện tại
  const { data: myEmployee } = useQuery({
    queryKey: ['my-employee'],
    queryFn: () => employeesApi.me(),
  });

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['timesheet-period', periodStart],
    queryFn: () => timesheetApi.periodDetail(periodStart, periodEnd),
  });

  // Lấy danh sách giải trình trong tháng để hiển thị trạng thái
  const { data: existingExplanations } = useQuery({
    queryKey: ['my-explanations', periodStart, myEmployee?.id],
    queryFn: () => attendanceExplanationApi.list({
      employeeId: myEmployee!.id,
      dateFrom: periodStart,
      dateTo: periodEnd,
      limit: 100,
    }),
    enabled: !!myEmployee?.id,
  });

  // Loại nghỉ phép
  const { data: leaveTypes = [] } = useQuery({
    queryKey: ['leave-types'],
    queryFn: () => leavesApi.getTypes(),
  });

  // Số dư phép của nhân viên hiện tại
  const { data: leaveBalance = [] } = useQuery({
    queryKey: ['leave-balance-me', myEmployee?.id],
    queryFn: () => leavesApi.getBalance(myEmployee!.id, dayjs().year()),
    enabled: !!myEmployee?.id,
  });

  // Map date → explanation status cho nhanh
  const explanationByDate = useMemo(() => {
    const map: Record<string, { status: string; type: ExplanationType }> = {};
    (existingExplanations?.data ?? []).forEach((e) => {
      map[dayjs(e.date).format('YYYY-MM-DD')] = { status: e.status, type: e.type };
    });
    return map;
  }, [existingExplanations]);

  const { mutate: submit, isPending: isSubmitting } = useMutation({
    mutationFn: () => timesheetApi.submit(data!.record!.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['timesheet-period', periodStart] }),
  });

  const createExplanationMutation = useMutation({
    mutationFn: (payload: Parameters<typeof attendanceExplanationApi.create>[0]) =>
      attendanceExplanationApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-explanations', periodStart, myEmployee?.id] });
      closeModal();
    },
  });

  const createLeaveMutation = useMutation({
    mutationFn: (payload: Parameters<typeof leavesApi.create>[0]) =>
      leavesApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leave-balance-me', myEmployee?.id] });
      closeModal();
    },
  });

  const record = data?.record;
  const rawDays = data?.days ?? [];
  const statusCfg = record ? STATUS_TAG[record.status] : null;

  const days = useMemo(() => {
    if (filterStatus === 'all') return rawDays;
    return rawDays.filter((d) => d.status === filterStatus);
  }, [rawDays, filterStatus]);

  // ─── Mở modal giải trình ────────────────────────────────────────────────

  function closeModal() {
    setExplainDay(null);
    setModalTab('explain');
    explainForm.resetFields();
    leaveForm.resetFields();
  }

  function openExplain(day: TimeEntryDay) {
    const suggestedType = detectIssueType(day);
    setExplainDay(day);
    setModalTab('explain');
    explainForm.setFieldsValue({
      type: suggestedType ?? 'MISSING_CHECKIN',
      reason: '',
      requestedCheckIn: day.checkIn ? dayjs(day.checkIn) : undefined,
      requestedCheckOut: day.checkOut ? dayjs(day.checkOut) : undefined,
    });
    leaveForm.setFieldsValue({
      startDate: dayjs(day.date),
      endDate: dayjs(day.date),
      days: 1,
      reason: '',
    });
  }

  function handleSubmitExplanation() {
    if (!myEmployee || !explainDay) return;
    explainForm.validateFields().then((vals) => {
      createExplanationMutation.mutate({
        employeeId: myEmployee.id,
        date: dayjs(explainDay.date).format('YYYY-MM-DD'),
        type: vals.type,
        reason: vals.reason,
        requestedCheckIn: vals.requestedCheckIn ? dayjs(vals.requestedCheckIn).format('YYYY-MM-DDTHH:mm:00') : undefined,
        requestedCheckOut: vals.requestedCheckOut ? dayjs(vals.requestedCheckOut).format('YYYY-MM-DDTHH:mm:00') : undefined,
      });
    });
  }

  function handleSubmitLeave() {
    if (!myEmployee || !explainDay) return;
    leaveForm.validateFields().then((vals) => {
      createLeaveMutation.mutate({
        employeeId: myEmployee.id,
        leaveTypeId: vals.leaveTypeId,
        startDate: dayjs(vals.startDate).format('YYYY-MM-DD'),
        endDate: dayjs(vals.endDate).format('YYYY-MM-DD'),
        days: vals.days,
        reason: vals.reason,
      });
    });
  }

  // ─── Table columns ──────────────────────────────────────────────────────

  const allDayColumns = [
    {
      key: 'date',
      title: 'Ngày', dataIndex: 'date', width: 140,
      render: (v: string, row: TimeEntryDay) => {
        const dateKey = dayjs(v).format('YYYY-MM-DD');
        const exp = explanationByDate[dateKey];
        const issue = detectIssueType(row);
        const isOff = row.status === 'off';
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Text style={{ color: isOff ? textMuted : textPrimary }}>{dayjs(v).format('ddd DD/MM')}</Text>
            {isOff && (
              <Tag style={{ margin: 0, fontSize: 10, padding: '0 4px', lineHeight: '16px',
                background: isDark ? 'rgba(148,163,184,0.12)' : '#F1F5F9',
                color: textMuted, border: 'none' }}>
                Ca Nghỉ
              </Tag>
            )}
            {!isOff && exp && (
              <Tooltip title={`Giải trình: ${EXPLANATION_TYPE_LABEL[exp.type]} — ${exp.status === 'PENDING' ? 'Chờ duyệt' : exp.status === 'APPROVED' ? 'Đã duyệt' : 'Từ chối'}`}>
                <Tag style={{ margin: 0, fontSize: 10, padding: '0 4px', lineHeight: '16px' }}
                  color={exp.status === 'APPROVED' ? 'green' : exp.status === 'REJECTED' ? 'red' : 'blue'}>
                  {exp.status === 'APPROVED' ? '✓' : exp.status === 'REJECTED' ? '✗' : '⏳'}
                </Tag>
              </Tooltip>
            )}
            {!isOff && !exp && issue && (
              <Tooltip title={`Lỗi: ${issueLabel(issue)} — Click để giải trình`}>
                <WarningOutlined style={{ color: '#F59E0B', fontSize: 12 }} />
              </Tooltip>
            )}
          </div>
        );
      },
    },
    {
      key: 'shift',
      title: 'Ca', width: 100,
      render: (_: unknown, row: TimeEntryDay) =>
        row.plannedStart && row.plannedEnd
          ? <Text style={{ color: textMuted, fontSize: 12 }}>{row.plannedStart}–{row.plannedEnd}</Text>
          : <Text style={{ color: textMuted }}>—</Text>,
    },
    {
      key: 'checkIn',
      title: 'Giờ vào', dataIndex: 'checkIn', width: 100,
      render: (v: string | null) => v
        ? <Text style={{ color: textPrimary }}>{dayjs(v).format('HH:mm')}</Text>
        : <Text style={{ color: '#EF4444', fontWeight: 600 }}>—</Text>,
    },
    {
      key: 'checkOut',
      title: 'Giờ ra', dataIndex: 'checkOut', width: 100,
      render: (v: string | null) => v
        ? <Text style={{ color: textPrimary }}>{dayjs(v).format('HH:mm')}</Text>
        : <Text style={{ color: '#EF4444', fontWeight: 600 }}>—</Text>,
    },
    {
      key: 'workHours',
      title: 'Giờ làm', dataIndex: 'workHours', width: 90, align: 'right' as const,
      render: (v: number | null) => {
        if (v == null) return <Text style={{ color: textMuted }}>—</Text>;
        if (v < 8) return <Text style={{ color: isDark ? '#fb923c' : '#D97706', fontWeight: 600 }}>{v}h</Text>;
        return <Text style={{ color: textPrimary }}>{v}h</Text>;
      },
    },
    {
      key: 'dayCredit',
      title: 'Ngày công', dataIndex: 'dayCredit', width: 100, align: 'right' as const,
      render: (v: number, row: TimeEntryDay) => {
        if (row.status === 'off') return <Text style={{ color: textMuted }}>—</Text>;
        if (row.status === 'absent') return <Text style={{ color: '#EF4444', fontWeight: 600 }}>0</Text>;
        if (v >= 1) return <Text style={{ color: '#10B981', fontWeight: 700 }}>1</Text>;
        if (v > 0) return (
          <Text style={{ color: '#F59E0B', fontWeight: 600 }}>
            {v.toFixed(2)}
          </Text>
        );
        return <Text style={{ color: '#EF4444' }}>0</Text>;
      },
    },
    {
      key: 'lateMinutes',
      title: 'Đi muộn', dataIndex: 'lateMinutes', width: 85, align: 'right' as const,
      render: (v: number) => v > 0
        ? <Text style={{ color: '#EF4444', fontWeight: 500 }}>{v}p</Text>
        : <Text style={{ color: textMuted }}>—</Text>,
    },
    {
      key: 'earlyLeaveMinutes',
      title: 'Về sớm', dataIndex: 'earlyLeaveMinutes', width: 80, align: 'right' as const,
      render: (v: number) => v > 0
        ? <Text style={{ color: '#F59E0B', fontWeight: 500 }}>{v}p</Text>
        : <Text style={{ color: textMuted }}>—</Text>,
    },
    {
      key: 'leaveInfo',
      title: 'Phép', dataIndex: 'leaveInfo', width: 130,
      render: (_: unknown, row: TimeEntryDay) => {
        const li = row.leaveInfo;
        if (!li) return <Text style={{ color: textMuted }}>—</Text>;
        return (
          <Tag
            style={{
              background: isDark ? `${li.color}22` : `${li.color}18`,
              color: isDark ? li.color : li.color,
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
      },
    },
    {
      key: 'overtimeHours',
      title: 'OT', dataIndex: 'overtimeHours', width: 80, align: 'right' as const,
      render: (v: number) =>
        v > 0
          ? <Text style={{ color: '#F59E0B', fontWeight: 600 }}>{v}h</Text>
          : <Text style={{ color: textMuted }}>—</Text>,
    },
    {
      key: 'status',
      title: 'Trạng thái', dataIndex: 'status', width: 180,
      render: (v: string, row: TimeEntryDay) => {
        const dateKey = dayjs(row.date).format('YYYY-MM-DD');
        const exp = explanationByDate[dateKey];
        const issue = detectIssueType(row);

        if (v === 'off') {
          return <Text style={{ color: textMuted, fontSize: 12 }}>— Ca nghỉ</Text>;
        }

        if (v === 'leave' || row.leaveInfo) {
          const li = row.leaveInfo;
          return (
            <Space size={4}>
              <Badge
                status="warning"
                text={
                  <Text style={{ color: isDark ? '#FDE68A' : '#92400E', fontWeight: 500 }}>
                    {li ? li.name : 'Nghỉ phép'}
                  </Text>
                }
              />
            </Space>
          );
        }

        return (
          <Space size={4}>
            {v === 'present'
              ? <Badge status="success" text={<Text style={{ color: textPrimary }}>Có mặt</Text>} />
              : <Badge status="error" text={<Text style={{ color: '#EF4444' }}>Vắng</Text>} />}
            {row.isManualCorrection && (
              <Tooltip title="Chỉnh sửa thủ công">
                <span style={{ fontSize: 10, fontWeight: 600, borderRadius: 4, padding: '0 4px', lineHeight: '16px', background: isDark ? '#431407' : '#FFF7ED', color: isDark ? '#fb923c' : '#C2410C', display: 'inline-block' }}>
                  TC
                </span>
              </Tooltip>
            )}
            {/* Nút giải trình nhanh */}
            {issue && !exp && (
              <Button
                size="small"
                type="link"
                icon={<EditOutlined />}
                style={{ padding: '0 4px', fontSize: 11, color: '#F59E0B', height: 18 }}
                onClick={(e) => { e.stopPropagation(); openExplain(row); }}
              >
                Giải trình
              </Button>
            )}
            {exp && (
              <Button
                size="small"
                type="link"
                style={{ padding: '0 4px', fontSize: 11, height: 18,
                  color: exp.status === 'APPROVED' ? '#10B981' : exp.status === 'REJECTED' ? '#EF4444' : '#6366F1' }}
                onClick={(e) => { e.stopPropagation(); openExplain(row); }}
              >
                {exp.status === 'APPROVED' ? 'Đã duyệt' : exp.status === 'REJECTED' ? 'Đã từ chối' : 'Chờ duyệt'}
              </Button>
            )}
          </Space>
        );
      },
    },
  ];

  const dayColumns = allDayColumns.filter((c) => isVisible(c.key));

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">
          <CalendarOutlined style={{ marginRight: 8, fontSize: 18 }} />
          Bảng công
        </h1>

        <Space>
          <DatePicker
            picker="month"
            value={month}
            onChange={(d) => d && setMonth(d.startOf('month'))}
            format="MM/YYYY"
            allowClear={false}
          />
          <Select
            value={filterStatus}
            onChange={setFilterStatus}
            style={{ width: 130 }}
            options={[
              { value: 'all',     label: 'Tất cả ngày' },
              { value: 'present', label: 'Có mặt' },
              { value: 'absent',  label: 'Vắng mặt' },
              { value: 'leave',   label: 'Nghỉ phép' },
            ]}
          />
          <ColumnToggle columns={TIMESHEET_COL_DEFS} isVisible={isVisible} toggle={toggle} reset={resetCols} />
        </Space>
      </div>

      {/* Summary Cards */}
      {record ? (
        <>
          <Row gutter={16} style={{ marginBottom: 20 }}>
            <Col span={5}>
              <StatCard label="Ngày làm việc" value={`${Number(record.workingDays)} / ${Number(record.standardDays)}`} color="#6366F1" icon={<CalendarOutlined />} />
            </Col>
            <Col span={5}>
              <StatCard label="Làm thêm giờ" value={`${Number(record.overtimeHours)}h`} color={Number(record.overtimeHours) > 0 ? '#F59E0B' : '#94A3B8'} icon={<ClockCircleOutlined />} />
            </Col>
            <Col span={5}>
              <StatCard label="Ngày nghỉ phép" value={`${Number(record.leaveDays)} ngày`} color="#8B5CF6" icon={<CheckCircleOutlined />} />
            </Col>
            <Col span={5}>
              <StatCard
                label="Tỷ lệ chuyên cần"
                value={`${record.standardDays > 0 ? Math.round((Number(record.workingDays) / Number(record.standardDays)) * 100) : 0}%`}
                color={(Number(record.workingDays) / Number(record.standardDays)) >= 0.9 ? '#10B981' : '#EF4444'}
              />
            </Col>
            <Col span={4}>
              <Card size="small" style={{ height: '100%' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Trạng thái</Text>
                  {statusCfg && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, borderRadius: 9999, padding: '3px 10px', background: isDark ? statusCfg.darkBg : statusCfg.bg, color: isDark ? statusCfg.darkColor : statusCfg.color, width: 'fit-content' }}>
                      {statusCfg.icon} {statusCfg.label}
                    </span>
                  )}
                </div>
              </Card>
            </Col>
          </Row>

          {record.status === 'REJECTED' && record.rejectionReason && (
            <Alert type="error" message="Bảng công bị từ chối" description={record.rejectionReason} style={{ marginBottom: 16 }} showIcon />
          )}

          {record.status === 'MISSING_SHIFT' && (
            <Alert
              type="warning"
              showIcon
              message="Chưa có ca làm việc"
              description="Nhân viên chưa được phân công ca làm việc cho kỳ này. Vui lòng liên hệ quản trị viên để thiết lập ca, sau đó tính lại bảng công."
              style={{ marginBottom: 16 }}
            />
          )}

          {(record.status === 'DRAFT' || record.status === 'REJECTED') && (
            <div style={{ marginBottom: 16 }}>
              <Popconfirm title="Nộp bảng công" description="Bạn chắc chắn muốn nộp bảng công kỳ này để quản lý duyệt?" onConfirm={() => submit()} okText="Nộp" cancelText="Huỷ">
                <Button type="primary" icon={<SendOutlined />} loading={isSubmitting} disabled={Number(record.workingDays) === 0}>
                  Nộp bảng công
                </Button>
              </Popconfirm>
            </div>
          )}

          {record.status === 'SUBMITTED' && record.submittedAt && (
            <Alert type="info" message={`Đã nộp lúc ${dayjs(record.submittedAt).format('HH:mm DD/MM/YYYY')} — đang chờ quản lý duyệt.`} style={{ marginBottom: 16 }} showIcon />
          )}

          {record.status === 'APPROVED' && record.approvedAt && (
            <Alert type="success" message={`Đã được duyệt lúc ${dayjs(record.approvedAt).format('HH:mm DD/MM/YYYY')}.`} style={{ marginBottom: 16 }} showIcon />
          )}
        </>
      ) : (
        !isLoading && !isFetching && (
          <Alert type="info" message="Chưa có bảng công kỳ này" description="Bảng công do bộ phận HR tổng hợp. Vui lòng liên hệ HR nếu kỳ này chưa có dữ liệu." style={{ marginBottom: 16 }} showIcon />
        )
      )}

      {/* Daily table */}
      <Card
        title={
          <Space>
            Chi tiết ngày công
            {rawDays.filter((d) => d.status !== 'off' && detectIssueType(d) && !explanationByDate[dayjs(d.date).format('YYYY-MM-DD')]).length > 0 && (
              <Tag color="orange" icon={<WarningOutlined />}>
                {rawDays.filter((d) => d.status !== 'off' && detectIssueType(d) && !explanationByDate[dayjs(d.date).format('YYYY-MM-DD')]).length} ngày cần giải trình
              </Tag>
            )}
          </Space>
        }
        size="small"
      >
        <Table
          dataSource={days}
          columns={dayColumns}
          rowKey="date"
          size="small"
          loading={isLoading || isFetching}
          pagination={false}
          onRow={(row) => ({
            onClick: (e) => {
              if (row.status === 'off') return; // Ca off không click
              const target = e.target as HTMLElement;
              if (target.closest('button') || target.closest('.ant-btn')) return;
              const issue = detectIssueType(row);
              if (issue) openExplain(row);
            },
            style: row.status !== 'off' && detectIssueType(row) ? { cursor: 'pointer' } : {},
          })}
          rowClassName={(row) => {
            if (row.status === 'off') return 'ts-row-off';
            if (row.status === 'leave') return 'ts-row-leave';
            if (row.status === 'absent') return 'ts-row-absent';
            if (row.workHours != null && row.workHours > 0 && row.workHours < 8) return 'ts-row-short';
            return '';
          }}
          locale={{ emptyText: 'Chưa có dữ liệu chấm công cho kỳ này' }}
        />
      </Card>

      {/* ── Modal Hành động ngày lỗi chấm công ────────────────────────────── */}
      <CenteredModal
        open={!!explainDay}
        onClose={closeModal}
        title={
          <Space>
            <WarningOutlined style={{ color: '#F59E0B' }} />
            {explainDay ? dayjs(explainDay.date).format('dddd, DD/MM/YYYY') : ''}
          </Space>
        }
        width={540}
        footer={
          <Space>
            <Button onClick={closeModal}>Hủy</Button>
            {modalTab === 'explain' ? (
              <Button
                type="primary"
                icon={<FileTextOutlined />}
                loading={createExplanationMutation.isPending}
                onClick={handleSubmitExplanation}
              >
                Gửi giải trình
              </Button>
            ) : (
              <Button
                type="primary"
                icon={<ScheduleOutlined />}
                loading={createLeaveMutation.isPending}
                onClick={handleSubmitLeave}
              >
                Đăng ký nghỉ
              </Button>
            )}
          </Space>
        }
      >
        {explainDay && (
          <>
            {/* Thông tin chấm công gốc */}
            <div style={{ padding: '10px 14px', background: isDark ? 'rgba(245,158,11,0.08)' : '#FFFBEB', borderRadius: 8, marginBottom: 16, border: `1px solid ${isDark ? 'rgba(245,158,11,0.2)' : '#FDE68A'}` }}>
              <Row gutter={16}>
                <Col span={8}>
                  <Text style={{ color: textMuted, fontSize: 12, display: 'block' }}>Giờ vào</Text>
                  <Text style={{ color: explainDay.checkIn ? textPrimary : '#EF4444', fontWeight: 600 }}>
                    {explainDay.checkIn ? dayjs(explainDay.checkIn).format('HH:mm') : '—'}
                  </Text>
                </Col>
                <Col span={8}>
                  <Text style={{ color: textMuted, fontSize: 12, display: 'block' }}>Giờ ra</Text>
                  <Text style={{ color: explainDay.checkOut ? textPrimary : '#EF4444', fontWeight: 600 }}>
                    {explainDay.checkOut ? dayjs(explainDay.checkOut).format('HH:mm') : '—'}
                  </Text>
                </Col>
                <Col span={8}>
                  <Text style={{ color: textMuted, fontSize: 12, display: 'block' }}>Tổng giờ</Text>
                  <Text style={{ color: (explainDay.workHours ?? 0) < 8 ? '#F59E0B' : textPrimary, fontWeight: 600 }}>
                    {explainDay.workHours != null ? `${explainDay.workHours}h` : '—'}
                  </Text>
                </Col>
              </Row>
            </div>

            {/* Chọn hành động */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
              <Segmented
                value={modalTab}
                onChange={(v) => setModalTab(v as 'explain' | 'leave')}
                options={[
                  { label: <Space><FileTextOutlined />Giải trình chấm công</Space>, value: 'explain' },
                  { label: <Space><ScheduleOutlined />Đăng ký nghỉ phép</Space>, value: 'leave' },
                ]}
              />
            </div>

            {/* Tab Giải trình */}
            {modalTab === 'explain' && (
              <Form form={explainForm} layout="vertical">
                <Form.Item name="type" label="Loại giải trình" rules={[{ required: true }]}>
                  <Select>
                    {(Object.entries(EXPLANATION_TYPE_LABEL) as [ExplanationType, string][]).map(([k, v]) => (
                      <Select.Option key={k} value={k}>{v}</Select.Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item name="reason" label="Lý do" rules={[{ required: true, message: 'Nhập lý do giải trình' }]}>
                  <Input.TextArea rows={3} placeholder="Mô tả lý do cụ thể..." maxLength={1000} showCount />
                </Form.Item>

                <Row gutter={12}>
                  <Col span={12}>
                    <Form.Item name="requestedCheckIn" label="Giờ vào thực tế">
                      <DatePicker showTime={{ format: 'HH:mm' }} format="HH:mm DD/MM/YYYY" style={{ width: '100%' }} placeholder="Giờ vào thực tế" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="requestedCheckOut" label="Giờ ra thực tế">
                      <DatePicker showTime={{ format: 'HH:mm' }} format="HH:mm DD/MM/YYYY" style={{ width: '100%' }} placeholder="Giờ ra thực tế" />
                    </Form.Item>
                  </Col>
                </Row>
              </Form>
            )}

            {/* Tab Đăng ký nghỉ */}
            {modalTab === 'leave' && (
              <Form form={leaveForm} layout="vertical">
                <Form.Item name="leaveTypeId" label="Loại nghỉ phép" rules={[{ required: true, message: 'Chọn loại nghỉ' }]}>
                  <Select placeholder="Chọn loại nghỉ phép">
                    {leaveTypes.filter((t) => t.isActive).map((t) => {
                      const bal = leaveBalance.find((b) => b.leaveTypeId === t.id);
                      const remaining = bal ? bal.totalDays - bal.usedDays : null;
                      return (
                        <Select.Option key={t.id} value={t.id} disabled={remaining !== null && remaining <= 0}>
                          <Space>
                            <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: t.color }} />
                            {t.name}
                            {remaining !== null && (
                              <Text style={{ color: remaining > 0 ? '#10B981' : '#EF4444', fontSize: 12 }}>
                                ({remaining} ngày còn lại)
                              </Text>
                            )}
                          </Space>
                        </Select.Option>
                      );
                    })}
                  </Select>
                </Form.Item>

                <Row gutter={12}>
                  <Col span={10}>
                    <Form.Item name="startDate" label="Từ ngày" rules={[{ required: true }]}>
                      <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                    </Form.Item>
                  </Col>
                  <Col span={10}>
                    <Form.Item name="endDate" label="Đến ngày" rules={[{ required: true }]}>
                      <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                    </Form.Item>
                  </Col>
                  <Col span={4}>
                    <Form.Item name="days" label="Số ngày" rules={[{ required: true }]}>
                      <InputNumber min={0.5} max={30} step={0.5} style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item name="reason" label="Lý do">
                  <Input.TextArea rows={2} placeholder="Lý do xin nghỉ (không bắt buộc)" maxLength={500} />
                </Form.Item>
              </Form>
            )}
          </>
        )}
      </CenteredModal>
    </div>
  );
}
