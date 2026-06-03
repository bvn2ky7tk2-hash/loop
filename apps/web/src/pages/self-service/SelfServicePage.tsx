import {
  Row, Col, Typography, Button, Tag, Table, Progress, Spin,
  Space, Tabs,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  UserOutlined, CalendarOutlined, DollarOutlined, ClockCircleOutlined,
  FileTextOutlined, RightOutlined, PlusOutlined,
  ApartmentOutlined, IdcardOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useThemePalette } from '../../hooks/useThemePalette';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { EmployeeInfoCell } from '../../components/ui/EmployeeInfoCell';
import { employeesApi } from '../../api/employees';
import { leavesApi, type LeaveBalance, type LeaveRequest } from '../../api/leaves';
import { payrollApi, type PayrollRecord } from '../../api/payroll';

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

export default function SelfServicePage() {
  const { isDark, textPrimary, textMuted, bgCard, borderColor, linkColor, preset } = useThemePalette();
  const user = useAuthStore(s => s.user);
  const navigate = useNavigate();
  const thisYear = dayjs().year();
  const monthStart = dayjs().startOf('month').format('YYYY-MM-DD');
  const monthEnd   = dayjs().endOf('month').format('YYYY-MM-DD');

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
              : { color: linkColor, borderColor: '#93C5FD' }
            }
            color={isDark ? undefined : 'blue'}
          >
            Đang qua BPM
          </Tag>
        )
        : <Text style={{ color: textMuted }}>—</Text>,
    },
  ];


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
  ];

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title={`Xin chào, ${user?.name ?? '—'}`}
        icon={<UserOutlined />}
        iconColor="#6366F1"
        actions={
          <Space>
            {myEmployee?.id && (
              <Button type="primary" icon={<IdcardOutlined />} onClick={() => navigate(`/hr/employees/${myEmployee.id}`)}>
                Xem hồ sơ đầy đủ
              </Button>
            )}
            <Button icon={<PlusOutlined />} onClick={() => navigate('/leaves')}>Xin nghỉ phép</Button>
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
          <EmployeeInfoCell employee={myEmployee} variant="inline" />
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

    </div>
  );
}
