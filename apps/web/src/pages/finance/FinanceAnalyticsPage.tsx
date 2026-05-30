import { Row, Col, Card, Typography, Skeleton } from 'antd';
import {
  BarChartOutlined,
  DollarOutlined,
  ClockCircleOutlined,
  RiseOutlined,
  BankOutlined,
  FundOutlined,
} from '@ant-design/icons';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip as RTooltip,
  ResponsiveContainer, CartesianGrid, Legend, Cell,
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useThemePalette } from '../../hooks/useThemePalette';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { SparklineCard } from '../../components/ui/SparklineCard';
import { FilterBar } from '../../components/FilterBar';

const { Text } = Typography;

interface FinanceSummary {
  revenueYtd: string;
  arOutstanding: string;
  apOutstanding: string;
  cashCollectionPct: number;
  avgDaysToPay: number;
}

interface ArAgingItem { bucket: string; amount: number; }
interface PlMonthlyItem { month: string; revenue: number; expense: number; }

const AR_AGING_COLORS = ['#10B981', '#F59E0B', '#F97316', '#EF4444'];

// Static — không cần API
const MOCK_BUDGET_ACTUAL = [
  { category: 'Nhân sự',        budget: 2400, actual: 2250 },
  { category: 'Công nghệ',      budget: 650,  actual: 720  },
  { category: 'Marketing',      budget: 480,  actual: 390  },
  { category: 'Vận hành',       budget: 380,  actual: 410  },
  { category: 'Hành chính',     budget: 220,  actual: 195  },
  { category: 'R&D',            budget: 500,  actual: 465  },
];

export default function FinanceAnalyticsPage() {
  const { isDark, textPrimary, textMuted, bgContainer, borderColor } = useThemePalette();

  const { data: stats, isLoading: loadingStats } = useQuery<FinanceSummary>({
    queryKey: ['finance-analytics-summary'],
    queryFn: () => axios.get('/api/v1/finance/analytics/summary').then(r => r.data),
    staleTime: 300000,
  });

  const { data: arAging = [], isLoading: loadingAging } = useQuery<ArAgingItem[]>({
    queryKey: ['finance-analytics-ar-aging'],
    queryFn: () => axios.get('/api/v1/finance/analytics/ar-aging').then(r => r.data),
    staleTime: 300000,
  });

  const { data: plMonthly = [], isLoading: loadingPl } = useQuery<PlMonthlyItem[]>({
    queryKey: ['finance-analytics-monthly-pl'],
    queryFn: () => axios.get('/api/v1/finance/analytics/monthly-pl').then(r => r.data),
    staleTime: 300000,
  });

  if (loadingStats || loadingAging || loadingPl) {
    return <div style={{ padding: 40 }}><Skeleton active /></div>;
  }

  const axisColor = isDark ? '#888' : '#555';
  const gridColor = isDark ? '#333' : '#f0f0f0';
  const tooltipBg = isDark ? '#1f1f1f' : '#fff';

  const chartCardStyle = {
    borderRadius: 12,
    background: bgContainer,
    border: `1px solid ${borderColor}`,
  };

  // P&L sparkline data — net profit theo tháng
  const plSparklineData = plMonthly.map(d => ({
    day:   d.month,
    value: d.revenue - d.expense,
  }));

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Finance Analytics"
        icon={<BarChartOutlined />}
        iconColor="#10B981"
      />

      <FilterBar>
        {/* TODO: thêm filter theo năm tài chính, BU khi kết nối API thực */}
      </FilterBar>

      {/* ── StatCards ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={12} lg={5}>
          <StatCard
            label="Doanh thu YTD"
            value={stats?.revenueYtd ?? '0'}
            color="#10B981"
            icon={<DollarOutlined />}
          />
        </Col>
        <Col xs={12} sm={12} lg={5}>
          <StatCard
            label="AR Outstanding"
            value={stats?.arOutstanding ?? '0'}
            color="#F59E0B"
            icon={<FundOutlined />}
          />
        </Col>
        <Col xs={12} sm={12} lg={5}>
          <StatCard
            label="AP Outstanding"
            value={stats?.apOutstanding ?? '0'}
            color="#6366F1"
            icon={<BankOutlined />}
          />
        </Col>
        <Col xs={12} sm={12} lg={4}>
          <StatCard
            label="Cash Collection %"
            value={`${stats?.cashCollectionPct ?? 0}%`}
            color="#3B82F6"
            icon={<RiseOutlined />}
          />
        </Col>
        <Col xs={12} sm={12} lg={5}>
          <StatCard
            label="Avg days to pay"
            value={`${stats?.avgDaysToPay ?? 0} ngày`}
            color="#F97316"
            icon={<ClockCircleOutlined />}
          />
        </Col>
      </Row>

      {/* ── Charts row 1 ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {/* BarChart: AR Aging — 4 buckets */}
        <Col xs={24} lg={10}>
          <Card title={<Text style={{ color: textPrimary, fontWeight: 600 }}>AR Aging — Công nợ phải thu</Text>} style={chartCardStyle}>
            {/* TODO: kết nối GET /analytics/finance/ar-aging */}
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={arAging} margin={{ top: 8, right: 12, left: -16, bottom: 0 }} barCategoryGap="35%">
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="bucket" tick={{ fill: axisColor, fontSize: 11 }} />
                <YAxis tick={{ fill: axisColor, fontSize: 12 }} tickFormatter={v => `${v}M`} />
                <RTooltip
                  contentStyle={{ background: tooltipBg, border: `1px solid ${borderColor}`, borderRadius: 8 }}
                  formatter={(v: number) => [`${v}M ₫`, 'Giá trị AR']}
                />
                <Bar dataKey="amount" name="Giá trị AR" radius={[6, 6, 0, 0]}>
                  {arAging.map((_, i) => (
                    <Cell key={i} fill={AR_AGING_COLORS[i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* SparklineCard: Monthly P&L 12 tháng */}
        <Col xs={24} lg={14}>
          <SparklineCard
            label="Monthly P&L — Lợi nhuận ròng 12 tháng"
            value={`${(plSparklineData[plSparklineData.length - 1]?.value ?? 0)}M`}
            unit="₫"
            color="#10B981"
            filled
            icon={<FundOutlined />}
            data={plSparklineData}
            variant="line"
            style={{ height: '100%' }}
          />
          {/* TODO: upgrade sang dual-bar (Revenue/Expense) khi có SparklineCard multi-series */}
        </Col>
      </Row>

      {/* ── Monthly P&L full chart ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24}>
          <Card title={<Text style={{ color: textPrimary, fontWeight: 600 }}>Monthly P&L — Doanh thu & Chi phí 12 tháng</Text>} style={chartCardStyle}>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={plMonthly} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="month" tick={{ fill: axisColor, fontSize: 11 }} interval={1} />
                <YAxis tick={{ fill: axisColor, fontSize: 12 }} tickFormatter={v => `${v}M`} />
                <RTooltip
                  contentStyle={{ background: tooltipBg, border: `1px solid ${borderColor}`, borderRadius: 8 }}
                  formatter={(v: number, name: string) => [`${v}M ₫`, name === 'revenue' ? 'Doanh thu' : 'Chi phí']}
                />
                <Legend iconType="circle" iconSize={8} />
                <Line type="monotone" dataKey="revenue" name="Doanh thu" stroke="#10B981" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="expense" name="Chi phí"   stroke="#EF4444" strokeWidth={2.5} dot={{ r: 3 }} strokeDasharray="5 3" />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* ── Budget vs Actual horizontal bar ── */}
      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <Card title={<Text style={{ color: textPrimary, fontWeight: 600 }}>Budget vs Actual — theo danh mục chi phí</Text>} style={chartCardStyle}>
            {/* TODO: kết nối GET /analytics/finance/budget-vs-actual?limit=50 */}
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                layout="vertical"
                data={MOCK_BUDGET_ACTUAL}
                margin={{ top: 8, right: 32, left: 8, bottom: 0 }}
                barCategoryGap="30%"
                barGap={4}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                <XAxis type="number" tick={{ fill: axisColor, fontSize: 12 }} tickFormatter={v => `${v}M`} />
                <YAxis type="category" dataKey="category" tick={{ fill: textMuted, fontSize: 12 }} width={90} />
                <RTooltip
                  contentStyle={{ background: tooltipBg, border: `1px solid ${borderColor}`, borderRadius: 8 }}
                  formatter={(v: number, name: string) => [`${v}M ₫`, name === 'budget' ? 'Ngân sách' : 'Thực tế']}
                />
                <Legend iconType="circle" iconSize={8} />
                <Bar dataKey="budget" name="Ngân sách" fill="#6366F1" radius={[0, 4, 4, 0]} />
                <Bar dataKey="actual"  name="Thực tế"  fill="#F97316" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
