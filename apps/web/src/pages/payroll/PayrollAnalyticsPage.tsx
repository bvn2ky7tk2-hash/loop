import { Row, Col, Card, Table, Tag, Typography } from 'antd';
import {
  CreditCardOutlined, DollarOutlined, FieldTimeOutlined, FileDoneOutlined,
} from '@ant-design/icons';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip,
  ResponsiveContainer, CartesianGrid, Cell,
  AreaChart, Area,
} from 'recharts';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useThemePalette } from '../../hooks/useThemePalette';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { SparklineCard } from '../../components/ui/SparklineCard';
import { useAuthStore } from '../../store/auth.store';
import { formatCurrency } from '../../utils/format';

const { Text } = Typography;

// TODO: GET /reports/payroll/analytics/summary
const MOCK_SUMMARY = {
  totalSalaryCost:    1_240_000_000,
  laborCostRatio:     0.42,
  otThisMonth:        312,
  payslipsIssued:     248,
};

// TODO: GET /reports/payroll/salary-trend?months=12
const SALARY_TREND = Array.from({ length: 12 }, (_, i) => {
  const month = dayjs().subtract(11 - i, 'month');
  const base = 1_100_000_000 + i * 12_000_000;
  return {
    month: month.format('T[M]M'),
    grossSalary: base,
    allowances:  Math.round(base * 0.12),
    otPay:       Math.round(base * 0.05),
  };
});

// TODO: GET /reports/payroll/ot-by-department
const OT_BY_DEPT = [
  { dept: 'Engineering', hours: 98 },
  { dept: 'Sales',       hours: 72 },
  { dept: 'Operations',  hours: 56 },
  { dept: 'Finance',     hours: 34 },
  { dept: 'HR',          hours: 28 },
  { dept: 'Marketing',   hours: 24 },
];

// SparklineCard data — lấy tổng salary mỗi tháng (triệu)
const SALARY_SPARKLINE = SALARY_TREND.map(d => ({
  day: d.month,
  value: Math.round(d.grossSalary / 1_000_000),
}));

// TODO: GET /reports/payroll/top-earners?limit=10
interface TopEarner {
  key: string;
  rank: number;
  name: string;
  department: string;
  position: string;
  grossSalary: number;
}

const TOP_EARNERS: TopEarner[] = [
  { key: '1',  rank: 1,  name: 'Nguyễn Minh A',  department: 'Engineering',  position: 'Lead Engineer',       grossSalary: 65_000_000 },
  { key: '2',  rank: 2,  name: 'Trần Thị B',      department: 'Engineering',  position: 'Senior Engineer',     grossSalary: 58_000_000 },
  { key: '3',  rank: 3,  name: 'Lê Văn C',        department: 'Sales',        position: 'Sales Director',      grossSalary: 55_000_000 },
  { key: '4',  rank: 4,  name: 'Phạm Thu D',      department: 'Finance',      position: 'CFO',                 grossSalary: 52_000_000 },
  { key: '5',  rank: 5,  name: 'Hoàng Văn E',     department: 'Engineering',  position: 'Senior Engineer',     grossSalary: 50_000_000 },
  { key: '6',  rank: 6,  name: 'Đỗ Ngọc F',       department: 'Operations',   position: 'Ops Manager',         grossSalary: 48_000_000 },
  { key: '7',  rank: 7,  name: 'Vũ Quốc G',       department: 'Marketing',    position: 'Marketing Director',  grossSalary: 46_000_000 },
  { key: '8',  rank: 8,  name: 'Bùi Thị H',       department: 'HR',           position: 'HR Manager',          grossSalary: 44_000_000 },
  { key: '9',  rank: 9,  name: 'Đinh Văn I',      department: 'Engineering',  position: 'Backend Engineer',    grossSalary: 42_000_000 },
  { key: '10', rank: 10, name: 'Ngô Thị K',       department: 'Finance',      position: 'Senior Accountant',   grossSalary: 40_000_000 },
];

function formatMillions(v: number) {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}T`;
  if (v >= 1_000_000)     return `${(v / 1_000_000).toFixed(0)}M`;
  return String(v);
}

export default function PayrollAnalyticsPage() {
  const { isDark, textPrimary, textMuted, bgContainer, borderColor } = useThemePalette();
  const user = useAuthStore(s => s.user);
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'admin';

  const axisColor     = isDark ? '#888' : '#555';
  const gridColor     = isDark ? '#334155' : '#f0f0f0';
  const tooltipBg     = bgContainer;
  const tooltipBorder = borderColor;

  const chartCardStyle = {
    borderRadius: 12,
    background: bgContainer,
    border: `1px solid ${borderColor}`,
  };

  // Stacked area chart data (triệu VNĐ)
  const areaData = SALARY_TREND.map(d => ({
    month:       d.month,
    grossSalary: Math.round(d.grossSalary / 1_000_000),
    allowances:  Math.round(d.allowances / 1_000_000),
    otPay:       Math.round(d.otPay / 1_000_000),
  }));

  const topEarnerColumns: ColumnsType<TopEarner> = [
    {
      title: '#',
      dataIndex: 'rank',
      width: 48,
      render: (v: number) => (
        <Text style={{ color: textMuted, fontWeight: 600, fontSize: 13 }}>{v}</Text>
      ),
    },
    {
      title: 'Nhân viên',
      dataIndex: 'name',
      render: (v: string) => (
        <Text style={{ color: textPrimary, fontWeight: 500 }}>{v}</Text>
      ),
    },
    {
      title: 'Phòng ban',
      dataIndex: 'department',
      render: (v: string) => {
        const color = isDark
          ? { background: 'rgba(96,165,250,0.15)', color: '#93C5FD', borderColor: 'rgba(96,165,250,0.3)' }
          : {};
        return <Tag style={isDark ? color : {}} color={isDark ? undefined : 'blue'}>{v}</Tag>;
      },
    },
    {
      title: 'Vị trí',
      dataIndex: 'position',
      render: (v: string) => (
        <Text style={{ color: textMuted, fontSize: 13 }}>{v}</Text>
      ),
    },
    {
      title: 'Gross Salary',
      dataIndex: 'grossSalary',
      align: 'right' as const,
      render: (v: number) => isAdmin
        ? <Text style={{ color: '#10B981', fontWeight: 600 }}>{formatCurrency(v)}</Text>
        : <Text style={{ color: textMuted, letterSpacing: 2, fontSize: 16 }}>***</Text>,
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Payroll Analytics"
        icon={<CreditCardOutlined />}
        iconColor="#10B981"
      />

      {/* Row 4 StatCards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={12} lg={6}>
          <StatCard
            label="Tổng chi phí lương"
            value={`${Math.round(MOCK_SUMMARY.totalSalaryCost / 1_000_000)}M`}
            color="#6366F1"
            icon={<DollarOutlined />}
            subValue="tháng này"
          />
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <StatCard
            label="Chi phí lao động"
            value={`${Math.round(MOCK_SUMMARY.laborCostRatio * 100)}%`}
            color="#EF4444"
            icon={<CreditCardOutlined />}
            subValue="% doanh thu"
          />
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <StatCard
            label="OT tháng này"
            value={MOCK_SUMMARY.otThisMonth}
            color="#F97316"
            icon={<FieldTimeOutlined />}
            subValue="giờ tăng ca"
          />
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <StatCard
            label="Phiếu lương đã phát"
            value={MOCK_SUMMARY.payslipsIssued}
            color="#10B981"
            icon={<FileDoneOutlined />}
            subValue="nhân viên"
          />
        </Col>
      </Row>

      {/* Salary Trend SparklineCard + OT BarChart */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={8}>
          <SparklineCard
            label="Salary Trend"
            value={`${Math.round(MOCK_SUMMARY.totalSalaryCost / 1_000_000)}M`}
            unit="VNĐ"
            delta={2}
            data={SALARY_SPARKLINE}
            variant="line"
            color="#6366F1"
            icon={<DollarOutlined />}
            filled
          />
        </Col>

        {/* Salary Stacked Area — 12 tháng */}
        <Col xs={24} lg={16}>
          <Card
            title={<Text style={{ color: textPrimary, fontWeight: 600 }}>Cơ cấu chi phí lương 12 tháng (triệu VNĐ)</Text>}
            style={chartCardStyle}
          >
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart
                data={areaData}
                margin={{ top: 8, right: 16, left: -8, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="gradGross" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6366F1" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0.04} />
                  </linearGradient>
                  <linearGradient id="gradAllowance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#10B981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.04} />
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
                  formatter={(v: number, name: string) => {
                    const labels: Record<string, string> = {
                      grossSalary: 'Lương cơ bản',
                      allowances:  'Phụ cấp',
                      otPay:       'OT',
                    };
                    return [`${v}M`, labels[name] ?? name];
                  }}
                  contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 8 }}
                />
                <Area type="monotone" dataKey="grossSalary" name="grossSalary" stackId="1" stroke="#6366F1" fill="url(#gradGross)"    strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="allowances"  name="allowances"  stackId="1" stroke="#10B981" fill="url(#gradAllowance)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="otPay"       name="otPay"       stackId="1" stroke="#F97316" fill="url(#gradOt)"        strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* OT Hours by Department */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card
            title={<Text style={{ color: textPrimary, fontWeight: 600 }}>OT Hours by Department</Text>}
            style={chartCardStyle}
          >
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={OT_BY_DEPT}
                layout="vertical"
                margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
                barSize={22}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fill: axisColor, fontSize: 12 }}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="dept"
                  tick={{ fill: axisColor, fontSize: 12 }}
                  width={90}
                />
                <RTooltip
                  formatter={(v: number) => [`${v} giờ`, 'OT']}
                  contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 8 }}
                  labelStyle={{ color: axisColor }}
                />
                <Bar dataKey="hours" name="OT" radius={[0, 6, 6, 0]}>
                  {OT_BY_DEPT.map((_, i) => (
                    <Cell key={i} fill={i % 2 === 0 ? '#F97316' : '#FDBA74'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* Top Earners Table */}
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
            <Table<TopEarner>
              rowKey="key"
              dataSource={TOP_EARNERS}
              columns={topEarnerColumns}
              pagination={false}
              size="small"
              scroll={{ y: 280 }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
