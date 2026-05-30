import { useState, useEffect } from 'react';
import {
  Row, Col, Typography, Button, Tag, Table, Progress, Spin,
  Space, Tabs, Modal, Form, message, Popconfirm,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  UserOutlined, CalendarOutlined, DollarOutlined, ClockCircleOutlined,
  FileTextOutlined, RightOutlined, PlusOutlined, SendOutlined,
  FieldTimeOutlined, ApartmentOutlined, StopOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useThemePalette } from '../../hooks/useThemePalette';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { employeesApi } from '../../api/employees';
import { leavesApi, type LeaveBalance, type LeaveRequest } from '../../api/leaves';
import { payrollApi, type PayrollRecord } from '../../api/payroll';
import { overtimeApi, otApi, type OvertimeRequest, type FormField } from '../../api/overtime';
import { DynamicFormFields } from '../processes/components/DynamicFormFields';

const DEFAULT_OT_FIELDS: FormField[] = [
  { name: 'date',     label: 'Ngày làm thêm', type: 'date',     required: true },
  { name: 'fromTime', label: 'Từ giờ',         type: 'time',     required: false },
  { name: 'toTime',   label: 'Đến giờ',        type: 'time',     required: false },
  { name: 'hours',    label: 'Số giờ OT',      type: 'number',   required: true, min: 0.5, max: 12 },
  { name: 'reason',   label: 'Lý do',          type: 'textarea', required: false },
];
import { useAuthStore } from '../../store/auth.store';
import { formatCurrency } from '../../utils/format';
import { timesheetApi } from '../../api/timesheet';

const { Text, Title } = Typography;

const LEAVE_STATUS_COLOR: Record<string, string> = {
  PENDING: '#F59E0B', APPROVED: '#10B981', REJECTED: '#EF4444', CANCELLED: '#94A3B8',
};
const LEAVE_STATUS_LABEL: Record<string, string> = {
  PENDING: 'Chờ duyệt', APPROVED: 'Đã duyệt', REJECTED: 'Từ chối', CANCELLED: 'Đã hủy',
};

const OT_STATUS_COLOR: Record<string, string> = {
  PENDING: '#F59E0B', APPROVED: '#10B981', REJECTED: '#EF4444', CANCELLED: '#94A3B8',
};
const OT_STATUS_LABEL: Record<string, string> = {
  PENDING: 'Chờ duyệt', APPROVED: 'Đã duyệt', REJECTED: 'Từ chối', CANCELLED: 'Đã hủy',
};

export default function SelfServicePage() {
  const { isDark, textPrimary, textMuted, bgContainer, bgCard, borderColor, linkColor, preset } = useThemePalette();
  const user = useAuthStore(s => s.user);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const thisYear = dayjs().year();
  const monthStart = dayjs().startOf('month').format('YYYY-MM-DD');
  const monthEnd   = dayjs().endOf('month').format('YYYY-MM-DD');

  const [otModalOpen, setOtModalOpen] = useState(false);
  const [otForm] = Form.useForm();
  const [otFormFields, setOtFormFields] = useState<FormField[]>(DEFAULT_OT_FIELDS);

  useEffect(() => {
    otApi.getFormSchema()
      .then(res => setOtFormFields(res.fields))
      .catch(() => setOtFormFields(DEFAULT_OT_FIELDS));
  }, []);

  const { data: myEmployee, isLoading: empLoading } = useQuery({
    queryKey: ['employee-me'],
    queryFn: employeesApi.me,
    retry: false,
  });

  const { data: leaveBalances } = useQuery({
    queryKey: ['my-leave-balance', myEmployee?.id, thisYear],
    queryFn: () => leavesApi.getBalance(myEmployee!.id, thisYear),
    enabled: !!myEmployee?.id,
  });

  const { data: myLeaves } = useQuery({
    queryKey: ['my-leaves', myEmployee?.id],
    queryFn: () => leavesApi.list({ employeeId: myEmployee!.id, page: 1, pageSize: 20 }),
    enabled: !!myEmployee?.id,
  });

  const { data: timesheetData } = useQuery({
    queryKey: ['timesheet-month', monthStart, monthEnd],
    queryFn: () => timesheetApi.periodDetail(monthStart, monthEnd),
    retry: false,
  });

  // Payslips: scan approved periods
  const { data: allPeriodsData } = useQuery({
    queryKey: ['payroll-periods-all'],
    queryFn: () => payrollApi.listPeriods(1, 100),
  });
  const approvedPeriods = (allPeriodsData?.data ?? []).filter(p => p.status === 'APPROVED' || p.status === 'PAID');
  const { data: myPayslips } = useQuery({
    queryKey: ['my-payslips-self', approvedPeriods.map(p => p.id).join(',')],
    queryFn: async () => {
      const results: Array<PayrollRecord & { periodName: string; periodStart: string }> = [];
      for (const period of approvedPeriods.slice(0, 6)) {
        const records = await payrollApi.getPeriodRecords(period.id, 1, 100);
        const mine = records.data.find(r => r.employee?.user?.id === user?.id);
        if (mine) results.push({ ...mine, periodName: period.name, periodStart: period.startDate });
      }
      return results.reverse().slice(0, 3);
    },
    enabled: approvedPeriods.length > 0,
  });

  // OT requests
  const { data: myOvertimes, isLoading: otLoading } = useQuery({
    queryKey: ['my-overtime', myEmployee?.id],
    queryFn: () => overtimeApi.list({ employeeId: myEmployee!.id, page: 1, limit: 20 }),
    enabled: !!myEmployee?.id,
  });

  // Mutations
  const createOtMutation = useMutation({
    mutationFn: overtimeApi.create,
    onSuccess: () => {
      message.success('Đã gửi đơn OT — đang chờ duyệt qua BPM');
      setOtModalOpen(false);
      otForm.resetFields();
      qc.invalidateQueries({ queryKey: ['my-overtime', myEmployee?.id] });
    },
    onError: () => {
      message.error('Gửi đơn OT thất bại. Vui lòng thử lại.');
    },
  });

  const cancelOtMutation = useMutation({
    mutationFn: overtimeApi.cancel,
    onSuccess: () => {
      message.success('Đã hủy đơn OT');
      qc.invalidateQueries({ queryKey: ['my-overtime', myEmployee?.id] });
    },
    onError: () => {
      message.error('Hủy đơn OT thất bại.');
    },
  });

  if (empLoading) {
    return <div style={{ padding: 24, display: 'flex', justifyContent: 'center', paddingTop: 80 }}><Spin size="large" /></div>;
  }

  const totalLeaves = (leaveBalances ?? []).reduce((s, b) => s + Number(b.totalDays), 0);
  const usedLeaves  = (leaveBalances ?? []).reduce((s, b) => s + Number(b.usedDays), 0);
  const remainLeaves = totalLeaves - usedLeaves;
  const lastNetSalary = myPayslips?.[0] ? Number(myPayslips[0].netSalary) : null;
  const overtimeHrs = timesheetData?.record?.overtimeHours ?? 0;

  const cardBg   = isDark ? bgCard : '#FAFAFA';
  const cardStyle = { background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 10, padding: 20 };

  // ─── OT submit handler ─────────────────────────────────────────────────────
  const handleOtSubmit = async () => {
    try {
      const values = await otForm.validateFields();
      if (!myEmployee?.id) {
        message.error('Không xác định được nhân viên.');
        return;
      }
      createOtMutation.mutate({
        employeeId: myEmployee.id,
        date: (values.date as dayjs.Dayjs).format('YYYY-MM-DD'),
        fromTime: values.fromTime ? (values.fromTime as dayjs.Dayjs).format('HH:mm') : undefined,
        toTime: values.toTime ? (values.toTime as dayjs.Dayjs).format('HH:mm') : undefined,
        hours: values.hours,
        reason: values.reason || undefined,
      });
    } catch {
      // validation failed — form shows inline errors
    }
  };

  // ─── Leave Balance Cards ───────────────────────────────────────────────────
  const LeaveBalanceSection = () => (
    <div style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={5} style={{ margin: 0, color: textPrimary }}>
          <CalendarOutlined style={{ marginRight: 8, color: '#10B981' }} />Số dư nghỉ phép {thisYear}
        </Title>
        <Button type="link" size="small" style={{ color: linkColor, padding: 0 }}
          onClick={() => navigate('/leaves')}>
          Xem lịch sử <RightOutlined />
        </Button>
      </div>

      {!leaveBalances || leaveBalances.length === 0 ? (
        <Text style={{ color: textMuted }}>Chưa có thông tin phép năm.</Text>
      ) : (
        <Row gutter={[16, 16]}>
          {leaveBalances.map((b: LeaveBalance) => {
            const total   = Number(b.totalDays);
            const used    = Number(b.usedDays);
            const remain  = total - used;
            const pct     = total > 0 ? Math.round((used / total) * 100) : 0;
            const color   = pct >= 80 ? '#EF4444' : pct >= 50 ? '#F59E0B' : '#10B981';
            return (
              <Col xs={24} sm={12} md={8} key={b.id}>
                <div style={{ background: isDark ? `${color}18` : `${color}10`, border: `1px solid ${color}30`, borderRadius: 8, padding: '12px 16px' }}>
                  <Text style={{ color: textMuted, fontSize: 12, display: 'block', marginBottom: 6 }}>{b.leaveType?.name ?? 'Nghỉ phép'}</Text>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 8 }}>
                    <Text style={{ fontSize: 24, fontWeight: 700, color }}>{remain}</Text>
                    <Text style={{ color: textMuted, fontSize: 13 }}>/ {total} ngày</Text>
                  </div>
                  <Progress percent={pct} showInfo={false} strokeColor={color} trailColor={`${color}25`} size="small" />
                  <Text style={{ color: textMuted, fontSize: 11, marginTop: 4, display: 'block' }}>Đã dùng {used} ngày</Text>
                </div>
              </Col>
            );
          })}
        </Row>
      )}
    </div>
  );

  // ─── Recent Leave Requests with BPM status ─────────────────────────────────
  const leaveColumns: ColumnsType<LeaveRequest> = [
    {
      title: <Text style={{ color: textMuted }}>Loại</Text>,
      dataIndex: ['leaveType', 'name'], width: 130,
      render: (v?: string) => <Text style={{ color: textPrimary }}>{v ?? '—'}</Text>,
    },
    {
      title: <Text style={{ color: textMuted }}>Từ — Đến</Text>,
      render: (_: any, r: LeaveRequest) => (
        <Text style={{ color: textMuted, fontSize: 13 }}>
          {dayjs(r.startDate).format('DD/MM')} — {dayjs(r.endDate).format('DD/MM/YYYY')}
        </Text>
      ),
    },
    {
      title: <Text style={{ color: textMuted }}>Ngày</Text>,
      dataIndex: 'totalDays', width: 65, align: 'center' as const,
      render: (v: number) => <Text style={{ color: textPrimary }}>{v}</Text>,
    },
    {
      title: <Text style={{ color: textMuted }}>Trạng thái</Text>, width: 105, align: 'center' as const,
      dataIndex: 'status',
      render: (v: string) => (
        <Tag style={{ border: 'none', background: `${LEAVE_STATUS_COLOR[v]}22`, color: LEAVE_STATUS_COLOR[v] }}>
          {LEAVE_STATUS_LABEL[v] ?? v}
        </Tag>
      ),
    },
    {
      title: <Text style={{ color: textMuted }}>Quy trình BPM</Text>, width: 140, align: 'center' as const,
      dataIndex: 'processInstanceId',
      render: (pid?: string | null) => pid
        ? (
          <Tag
            icon={<ApartmentOutlined />}
            style={isDark
              ? { background: 'rgba(96,165,250,0.15)', color: '#93C5FD', borderColor: 'rgba(96,165,250,0.3)' }
              : { color: '#2563EB', borderColor: '#93C5FD' }
            }
            color={isDark ? undefined : 'blue'}
          >
            Đang qua BPM
          </Tag>
        )
        : <Text style={{ color: textMuted }}>—</Text>,
    },
  ];

  // ─── OT columns ────────────────────────────────────────────────────────────
  const otColumns: ColumnsType<OvertimeRequest> = [
    {
      title: <Text style={{ color: textMuted }}>Ngày</Text>, dataIndex: 'date', width: 110,
      render: (v: string) => <Text style={{ color: textPrimary }}>{dayjs(v).format('DD/MM/YYYY')}</Text>,
    },
    {
      title: <Text style={{ color: textMuted }}>Số giờ</Text>, dataIndex: 'hours', width: 80, align: 'center' as const,
      render: (v: number) => <Text style={{ color: textPrimary }}>{v}h</Text>,
    },
    {
      title: <Text style={{ color: textMuted }}>Lý do</Text>, dataIndex: 'reason',
      render: (v?: string | null) => v
        ? <Text style={{ color: textPrimary }}>{v}</Text>
        : <Text style={{ color: textMuted }}>—</Text>,
    },
    {
      title: <Text style={{ color: textMuted }}>Trạng thái</Text>, dataIndex: 'status', width: 105, align: 'center' as const,
      render: (v: string) => (
        <Tag style={{ border: 'none', background: `${OT_STATUS_COLOR[v] ?? '#94A3B8'}22`, color: OT_STATUS_COLOR[v] ?? '#94A3B8' }}>
          {OT_STATUS_LABEL[v] ?? v}
        </Tag>
      ),
    },
    {
      title: <Text style={{ color: textMuted }}>BPM</Text>, dataIndex: 'processInstanceId', width: 145, align: 'center' as const,
      render: (pid?: string | null) => pid
        ? (
          <Tag
            icon={<ApartmentOutlined />}
            style={isDark
              ? { background: 'rgba(96,165,250,0.15)', color: '#93C5FD', borderColor: 'rgba(96,165,250,0.3)' }
              : { color: '#2563EB', borderColor: '#93C5FD' }
            }
            color={isDark ? undefined : 'blue'}
          >
            Đang qua quy trình
          </Tag>
        )
        : <Text style={{ color: textMuted, fontSize: 12 }}>Duyệt trực tiếp</Text>,
    },
    {
      title: <Text style={{ color: textMuted }}>Hành động</Text>, width: 90, align: 'center' as const,
      render: (_: any, r: OvertimeRequest) => r.status === 'PENDING'
        ? (
          <Popconfirm
            title="Hủy đơn OT này?"
            okText="Hủy đơn"
            cancelText="Thôi"
            okButtonProps={{ danger: true }}
            onConfirm={() => cancelOtMutation.mutate(r.id)}
          >
            <Button
              size="small"
              danger
              icon={<StopOutlined />}
              loading={cancelOtMutation.isPending}
            >
              Hủy
            </Button>
          </Popconfirm>
        )
        : <Text style={{ color: textMuted }}>—</Text>,
    },
  ];

  // ─── OT Tab content ────────────────────────────────────────────────────────
  const OvertimeTab = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Text style={{ color: textMuted }}>Lịch sử đăng ký OT của bạn</Text>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setOtModalOpen(true)}
          disabled={!myEmployee?.id}
        >
          Đăng ký OT mới
        </Button>
      </div>
      <Table
        rowKey="id"
        size="small"
        columns={otColumns}
        dataSource={myOvertimes?.data ?? []}
        loading={otLoading}
        pagination={{ pageSize: 10, showTotal: (t) => `${t} đơn` }}
        style={{ fontSize: 13 }}
      />
    </div>
  );

  // ─── Recent Payslips ───────────────────────────────────────────────────────
  const PayslipSection = () => (
    <div style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={5} style={{ margin: 0, color: textPrimary }}>
          <FileTextOutlined style={{ marginRight: 8, color: '#6366F1' }} />Phiếu lương gần nhất
        </Title>
        <Button type="link" size="small" style={{ color: linkColor, padding: 0 }}
          onClick={() => navigate('/payroll/my-payslips')}>
          Xem tất cả <RightOutlined />
        </Button>
      </div>
      {!myPayslips || myPayslips.length === 0 ? (
        <Text style={{ color: textMuted }}>Chưa có phiếu lương nào được duyệt.</Text>
      ) : (
        <Space direction="vertical" style={{ width: '100%' }} size={8}>
          {myPayslips.map((r) => (
            <div key={r.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 14px', background: isDark ? `${preset.primary}18` : `${preset.primary}08`,
              borderRadius: 8, border: `1px solid ${preset.primary}30`,
            }}>
              <div>
                <Text style={{ color: textPrimary, fontWeight: 600, display: 'block' }}>{r.periodName}</Text>
                <Text style={{ color: textMuted, fontSize: 12 }}>{dayjs(r.periodStart).format('MM/YYYY')}</Text>
              </div>
              <div style={{ textAlign: 'right' }}>
                <Text style={{ color: linkColor, fontWeight: 700, fontSize: 16, display: 'block' }}>
                  {formatCurrency(Number(r.netSalary))}
                </Text>
                <Text style={{ color: textMuted, fontSize: 11 }}>Thực nhận</Text>
              </div>
            </div>
          ))}
        </Space>
      )}
    </div>
  );

  // ─── Timesheet Summary ─────────────────────────────────────────────────────
  const TimesheetSection = () => {
    const workDays = timesheetData?.record?.workingDays ?? 0;
    const totalHrs = (timesheetData?.days ?? []).reduce((s, d) => s + (d.workHours ?? 0), 0);
    const expected = workDays * 8;
    const pct = expected > 0 ? Math.min(100, Math.round((totalHrs / expected) * 100)) : 0;

    return (
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Title level={5} style={{ margin: 0, color: textPrimary }}>
            <ClockCircleOutlined style={{ marginRight: 8, color: '#F59E0B' }} />
            Bảng công tháng {dayjs().format('MM/YYYY')}
          </Title>
          <Button type="link" size="small" style={{ color: linkColor, padding: 0 }}
            onClick={() => navigate('/timesheet')}>
            Chi tiết <RightOutlined />
          </Button>
        </div>
        <Row gutter={16}>
          <Col span={8}>
            <div style={{ textAlign: 'center' }}>
              <Text style={{ fontSize: 28, fontWeight: 700, color: '#10B981', display: 'block' }}>{workDays}</Text>
              <Text style={{ color: textMuted, fontSize: 12 }}>Ngày làm</Text>
            </div>
          </Col>
          <Col span={8}>
            <div style={{ textAlign: 'center' }}>
              <Text style={{ fontSize: 28, fontWeight: 700, color: '#6366F1', display: 'block' }}>{totalHrs.toFixed(1)}</Text>
              <Text style={{ color: textMuted, fontSize: 12 }}>Giờ làm</Text>
            </div>
          </Col>
          <Col span={8}>
            <div style={{ textAlign: 'center' }}>
              <Text style={{ fontSize: 28, fontWeight: 700, color: overtimeHrs > 0 ? '#F97316' : textMuted, display: 'block' }}>{overtimeHrs.toFixed(1)}</Text>
              <Text style={{ color: textMuted, fontSize: 12 }}>Giờ OT</Text>
            </div>
          </Col>
        </Row>
        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={{ color: textMuted, fontSize: 12 }}>Tiến độ giờ làm</Text>
            <Text style={{ color: textMuted, fontSize: 12 }}>{pct}%</Text>
          </div>
          <Progress percent={pct} showInfo={false} strokeColor="#6366F1" trailColor={isDark ? '#334155' : '#E2E8F0'} />
          <Text style={{ color: textMuted, fontSize: 11 }}>{totalHrs.toFixed(1)} / {expected} giờ dự kiến</Text>
        </div>
      </div>
    );
  };

  // ─── Tab items ─────────────────────────────────────────────────────────────
  const tabItems = [
    {
      key: 'overview',
      label: <span><UserOutlined style={{ marginRight: 6 }} />Tổng quan</span>,
      children: (
        <Row gutter={20}>
          {/* Left column */}
          <Col xs={24} lg={14}>
            <Space direction="vertical" size={20} style={{ width: '100%' }}>
              <LeaveBalanceSection />
              <TimesheetSection />
            </Space>
          </Col>

          {/* Right column */}
          <Col xs={24} lg={10} style={{ marginTop: window.innerWidth < 992 ? 20 : 0 }}>
            <Space direction="vertical" size={20} style={{ width: '100%' }}>
              <PayslipSection />

              {/* Recent leave requests */}
              <div style={cardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <Title level={5} style={{ margin: 0, color: textPrimary }}>
                    <CalendarOutlined style={{ marginRight: 8, color: '#F59E0B' }} />Đơn nghỉ phép gần đây
                  </Title>
                </div>
                <Table
                  rowKey="id"
                  size="small"
                  columns={leaveColumns}
                  dataSource={myLeaves?.data ?? []}
                  pagination={false}
                  style={{ fontSize: 13 }}
                  scroll={{ x: 600 }}
                />
              </div>
            </Space>
          </Col>
        </Row>
      ),
    },
    {
      key: 'leaves',
      label: <span><CalendarOutlined style={{ marginRight: 6 }} />Đơn nghỉ phép</span>,
      children: (
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Title level={5} style={{ margin: 0, color: textPrimary }}>
              <CalendarOutlined style={{ marginRight: 8, color: '#F59E0B' }} />Lịch sử đơn nghỉ phép
            </Title>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/leaves')}>
              Xin nghỉ phép
            </Button>
          </div>
          <Table
            rowKey="id"
            size="small"
            columns={leaveColumns}
            dataSource={myLeaves?.data ?? []}
            pagination={{ pageSize: 10, showTotal: (t) => `${t} đơn` }}
            style={{ fontSize: 13 }}
            scroll={{ x: 700 }}
          />
        </div>
      ),
    },
    {
      key: 'overtime',
      label: <span><FieldTimeOutlined style={{ marginRight: 6 }} />Đăng ký OT</span>,
      children: (
        <div style={cardStyle}>
          <OvertimeTab />
        </div>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title={`Xin chào, ${user?.name ?? '—'}`}
        icon={<UserOutlined />}
        iconColor="#6366F1"
        actions={
          <Space>
            <Button icon={<PlusOutlined />} onClick={() => navigate('/leaves')}>Xin nghỉ phép</Button>
            <Button icon={<SendOutlined />} onClick={() => navigate('/expenses')}>Khai chi phí</Button>
          </Space>
        }
      />

      {/* Employee info strip */}
      {myEmployee && (
        <div style={{
          background: isDark ? `${preset.primary}18` : `${preset.primary}0A`,
          border: `1px solid ${preset.primary}30`, borderRadius: 10,
          padding: '12px 20px', marginBottom: 20,
          display: 'flex', gap: 32, flexWrap: 'wrap',
        }}>
          <div><Text style={{ color: textMuted, fontSize: 12, display: 'block' }}>Mã NV</Text><Text style={{ color: textPrimary, fontWeight: 600 }}>{myEmployee.code}</Text></div>
          <div><Text style={{ color: textMuted, fontSize: 12, display: 'block' }}>Chức danh</Text><Text style={{ color: textPrimary }}>{myEmployee.level}</Text></div>
          {myEmployee.orgUnit && <div><Text style={{ color: textMuted, fontSize: 12, display: 'block' }}>Phòng ban</Text><Text style={{ color: textPrimary }}>{(myEmployee as any).orgUnit?.name}</Text></div>}
          <div><Text style={{ color: textMuted, fontSize: 12, display: 'block' }}>Ngày vào</Text><Text style={{ color: textPrimary }}>{myEmployee.startDate ? dayjs(myEmployee.startDate).format('DD/MM/YYYY') : '—'}</Text></div>
        </div>
      )}

      {/* Summary stats */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={6}>
          <StatCard label="Phép còn lại" value={`${remainLeaves} ngày`} color="#10B981" icon={<CalendarOutlined />} />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard label="Lương tháng gần nhất" value={lastNetSalary ? formatCurrency(lastNetSalary) : '—'} color="#6366F1" icon={<DollarOutlined />} />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard label="Giờ OT tháng này" value={`${overtimeHrs.toFixed(1)}h`} color="#F97316" icon={<ClockCircleOutlined />} />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard label="Đơn nghỉ chờ duyệt"
            value={(myLeaves?.data ?? []).filter(l => l.status === 'PENDING').length}
            color="#F59E0B" icon={<FileTextOutlined />} />
        </Col>
      </Row>

      {/* Main tabs */}
      <Tabs
        items={tabItems}
        defaultActiveKey="overview"
        style={{ background: 'transparent' }}
      />

      {/* OT Registration Modal */}
      <Modal
        title={
          <Text style={{ color: textPrimary, fontWeight: 600 }}>
            <FieldTimeOutlined style={{ marginRight: 8, color: '#F97316' }} />
            Đăng ký làm thêm giờ (OT)
          </Text>
        }
        open={otModalOpen}
        onCancel={() => { setOtModalOpen(false); otForm.resetFields(); }}
        onOk={handleOtSubmit}
        okText="Gửi đơn OT"
        cancelText="Huỷ"
        confirmLoading={createOtMutation.isPending}
        destroyOnClose
      >
        <Form form={otForm} layout="vertical" style={{ marginTop: 16 }}>
          <DynamicFormFields fields={otFormFields} />
        </Form>
      </Modal>
    </div>
  );
}
