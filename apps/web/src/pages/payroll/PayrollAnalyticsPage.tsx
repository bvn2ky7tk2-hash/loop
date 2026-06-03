import { Row, Col, Card, Table, Tag, Typography, Spin, Empty } from 'antd';
import {
  CreditCardOutlined, DollarOutlined, FieldTimeOutlined, FileDoneOutlined,
} from '@ant-design/icons';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip,
  ResponsiveContainer, CartesianGrid, Cell,
  AreaChart, Area, Legend,
} from 'recharts';
import type { ColumnsType } from 'antd/es/table';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useThemePalette } from '../../hooks/useThemePalette';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { EmployeeInfoCell } from '../../components/ui/EmployeeInfoCell';
import { useAuthStore } from '../../store/auth.store';
import { formatCurrency } from '../../utils/format';

const { Text } = Typography;

/* ---- Interfaces ---- */
interface PayrollSummary {
  totalGross:        number;
  totalNet:          number;
  totalEmployerCost: number;
  avgNetSalary:      number;
}

interface SalaryTrendItem {
  month:       string;
  baseSalary:  number;
  allowances:  number;
  bonus:       number;
  overtimePay: number;
}

interface OtByDeptItem {
  deptName: string;
  otHours:  number;
  otPay:    number;
}

interface TopEarner {
  rank:     number;
  employee: {
    fullName: string;
    code?:    string;
    orgUnit?: { name: string } | null;
    position?: { jobTitle?: { name: string } | null } | null;
  };
  gross: number;
  net:   number;
}

/* ---- API fetchers ---- */
const fetchSummary    = () => axios.get<PayrollSummary>('/api/v1/payroll/analytics/summary').then(r => r.data);
const fetchTrend      = (months: number) =>
  axios.get<SalaryTrendItem[]>(`/api/v1/payroll/analytics/salary-trend?months=${months}`).then(r => r.data);
const fetchOtByDept   = () => axios.get<OtByDeptItem[]>('/api/v1/payroll/analytics/ot-by-dept').then(r => r.data);
const fetchTopEarners = (limit: number) =>
  axios.get<TopEarner[]>(`/api/v1/payroll/analytics/top-earners?limit=${limit}`).then(r => r.data);

/* ---- Helper ---- */
function formatMillions(v: number): string {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}T`;
  if (v >= 1_000_000)     return `${(v / 1_000_000).toFixed(0)}M`;
  return String(v);
}

export default function PayrollAnalyticsPage() {
  const { isDark, textPrimary, textMuted, bgContainer, borderColor } = useThemePalette();
  const user    = useAuthStore(s => s.user);
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'admin';

  const { data: summary, isLoading: loadingSummary } = useQuery<PayrollSummary>({
    queryKey: ['payroll-analytics-summary'],
    queryFn:  fetchSummary,
    staleTime: 300_000,
  });

  const { data: salaryTrend = [], isLoading: loadingTrend } = useQuery<SalaryTrendItem[]>({
    queryKey: ['payroll-salary-trend', 12],
    queryFn:  () => fetchTrend(12),
    staleTime: 300_000,
  });

  const { data: otByDept = [], isLoading: loadingOt } = useQuery<OtByDeptItem[]>({
    queryKey: ['payroll-ot-by-dept'],
    queryFn:  fetchOtByDept,
    staleTime: 300_000,
  });

  const { data: topEarners = [], isLoading: loadingTop } = useQuery<TopEarner[]>({
    queryKey: ['payroll-top-earners', 10],
    queryFn:  () => fetchTopEarners(10),
    staleTime: 300_000,
  });

  const isLoading = loadingSummary || loadingTrend || loadingOt || loadingTop;

  const axisColor     = isDark ? '#888' : '#555';
  const gridColor     = isDark ? '#334155' : '#f0f0f0';
  const tooltipBg     = bgContainer;
  const tooltipBorder = borderColor;

  const chartCardStyle = {
    borderRadius: 12,
    background: bgContainer,
    border: `1px solid ${borderColor}`,
  };

  // Stacked area data (triệu VNĐ)
  const areaData = salaryTrend.map(d => ({
    month:       d.month,
    baseSalary:  Math.round(d.baseSalary  / 1_000_000),
    allowances:  Math.round(d.allowances  / 1_000_000),
    bonus:       Math.round(d.bonus       / 1_000_000),
    overtimePay: Math.round(d.overtimePay / 1_000_000),
  }));

  const topEarnerColumns: ColumnsType<TopEarner> = [
    {
      title: '#',
      dataIndex: 'rank',
      width: 48,
      render: (v: number) => <Text style={{ color: textMuted, fontWeight: 600, fontSize: 13 }}>{v}</Text>,
    },
    {
      title: 'Nhân viên',
      dataIndex: 'employee',
      render: (_: unknown, r: TopEarner) => <EmployeeInfoCell employee={r.employee} />,
    },
    {
      title: 'Gross Salary',
      dataIndex: 'gross',
      align: 'right' as const,
      render: (v: number) => isAdmin
        ? <Text style={{ color: '#10B981', fontWeight: 600 }}>{formatCurrency(v)}</Text>
        : <Text style={{ color: textMuted, letterSpacing: 2, fontSize: 16 }}>***</Text>,
    },
    {
      title: 'Net Salary',
      dataIndex: 'net',
      align: 'right' as const,
      render: (v: number) => isAdmin
        ? <Text style={{ color: '#6366F1', fontWeight: 600 }}>{formatCurrency(v)}</Text>
        : <Text style={{ color: textMuted, letterSpacing: 2, fontSize: 16 }}>***</Text>,
    },
  ];

  if (isLoading) {
    return (
      <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}>
        <Spin size="large" tip="Đang tải dữ liệu payroll analytics..." />
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Payroll Analytics"
        icon={<CreditCardOutlined />}
        iconColor="#10B981"
      />

      {/* 4 StatCards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={12} lg={6}>
          <StatCard
            label="Tổng Gross"
            value={`${Math.round((summary?.totalGross ?? 0) / 1_000_000)}M`}
            color="#6366F1"
            icon={<DollarOutlined />}
            subValue="tháng này"
          />
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <StatCard
            label="Tổng Net"
            value={`${Math.round((summary?.totalNet ?? 0) / 1_000_000)}M`}
            color="#10B981"
            icon={<FileDoneOutlined />}
            subValue="thực nhận"
          />
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <StatCard
            label="Chi phí NSDLĐ"
            value={`${Math.round((summary?.totalEmployerCost ?? 0) / 1_000_000)}M`}
            color="#EF4444"
            icon={<CreditCardOutlined />}
            subValue="bao gồm BHXH"
          />
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <StatCard
            label="Net tb/người"
            value={`${Math.round((summary?.avgNetSalary ?? 0) / 1_000_000)}M`}
            color="#F97316"
            icon={<FieldTimeOutlined />}
            subValue="trung bình"
          />
        </Col>
      </Row>

      {/* Salary Stacked Area — 12 tháng */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24}>
          <Card
            title={<Text style={{ color: textPrimary, fontWeight: 600 }}>Cơ cấu chi phí lương 12 tháng (triệu VNĐ)</Text>}
            style={chartCardStyle}
          >
            {areaData.length === 0 ? (
              <Empty description={<Text style={{ color: textMuted }}>Chưa có dữ liệu payroll</Text>} />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={areaData} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradBase" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#6366F1" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0.04} />
                    </linearGradient>
                    <linearGradient id="gradAllowance" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#10B981" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.04} />
                    </linearGradient>
                    <linearGradient id="gradBonus" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#3B82F6" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.04} />
                    </linearGradient>
                    <linearGradient id="gradOt" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#F97316" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#F97316" stopOpacity={0.04} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis dataKey="month" tick={{ fill: axisColor, fontSize: 11 }} />
                  <YAxis
                    tick={{ fill: axisColor, fontSize: 11 }}
                    tickFormatter={v => `${v}M`}
                  />
                  <RTooltip
                    formatter={(v, name) => {
                      const labels: Record<string, string> = {
                        baseSalary:  'Lương cơ bản',
                        allowances:  'Phụ cấp',
                        bonus:       'Thưởng',
                        overtimePay: 'OT',
                      };
                      const key = String(name);
                      return [`${formatMillions(Number(v) * 1_000_000)}`, labels[key] ?? key];
                    }}
                    contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 8 }}
                  />
                  <Legend
                    formatter={(v) => {
                      const m: Record<string, string> = {
                        baseSalary: 'Lương cơ bản', allowances: 'Phụ cấp',
                        bonus: 'Thưởng', overtimePay: 'OT',
                      };
                      return <span style={{ color: textMuted, fontSize: 12 }}>{m[v] ?? v}</span>;
                    }}
                  />
                  <Area type="monotone" dataKey="baseSalary"  stackId="1" stroke="#6366F1" fill="url(#gradBase)"     strokeWidth={2} dot={false} />
                  <Area type="monotone" dataKey="allowances"  stackId="1" stroke="#10B981" fill="url(#gradAllowance)" strokeWidth={2} dot={false} />
                  <Area type="monotone" dataKey="bonus"       stackId="1" stroke="#3B82F6" fill="url(#gradBonus)"     strokeWidth={2} dot={false} />
                  <Area type="monotone" dataKey="overtimePay" stackId="1" stroke="#F97316" fill="url(#gradOt)"        strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Col>
      </Row>

      {/* OT by Dept + Top Earners */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card
            title={<Text style={{ color: textPrimary, fontWeight: 600 }}>OT Hours by Department</Text>}
            style={chartCardStyle}
          >
            {otByDept.length === 0 ? (
              <Empty description={<Text style={{ color: textMuted }}>Không có dữ liệu OT tháng này</Text>} />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={otByDept}
                  layout="vertical"
                  margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
                  barSize={22}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                  <XAxis type="number" tick={{ fill: axisColor, fontSize: 12 }} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="deptName"
                    tick={{ fill: axisColor, fontSize: 12 }}
                    width={100}
                  />
                  <RTooltip
                    formatter={(v, name) => {
                      if (name === 'otHours') return [`${v} giờ`, 'OT Hours'];
                      return [`${formatMillions(Number(v))}`, 'OT Pay'];
                    }}
                    contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 8 }}
                    labelStyle={{ color: axisColor }}
                  />
                  <Bar dataKey="otHours" name="otHours" radius={[0, 6, 6, 0]}>
                    {otByDept.map((_, i) => (
                      <Cell key={i} fill={i % 2 === 0 ? '#F97316' : '#FDBA74'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Text style={{ color: textPrimary, fontWeight: 600 }}>Top Earners</Text>
                {!isAdmin && (
                  <Tag
                    style={isDark
                      ? { background: 'rgba(245,158,11,0.15)', color: '#FCD34D', borderColor: 'rgba(245,158,11,0.35)', fontSize: 11 }
                      : { fontSize: 11 }}
                    color={isDark ? undefined : 'gold'}
                  >
                    Yêu cầu ADMIN để xem lương
                  </Tag>
                )}
              </div>
            }
            style={chartCardStyle}
          >
            {topEarners.length === 0 ? (
              <Empty description={<Text style={{ color: textMuted }}>Chưa có dữ liệu payroll</Text>} />
            ) : (
              <Table<TopEarner>
                rowKey="rank"
                dataSource={topEarners}
                columns={topEarnerColumns}
                pagination={false}
                size="small"
                scroll={{ y: 280 }}
              />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
