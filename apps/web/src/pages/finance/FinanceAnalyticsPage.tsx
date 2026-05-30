import { Row, Col, Card, Typography, Progress, Skeleton } from 'antd';
import {
  BarChartOutlined,
  DollarOutlined,
  ClockCircleOutlined,
  RiseOutlined,
  BankOutlined,
  FundOutlined,
} from '@ant-design/icons';
import {
  BarChart, Bar, ComposedChart, Line, XAxis, YAxis, Tooltip as RTooltip,
  ResponsiveContainer, CartesianGrid, Legend, Cell,
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useThemePalette } from '../../hooks/useThemePalette';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { FilterBar } from '../../components/FilterBar';
import { formatCompact, formatPercent } from '../../utils/format';

const { Text } = Typography;

// ── API types ──────────────────────────────────────────────────────────────────

interface FinanceSummary {
  revenueYTD:        number;
  arOutstanding:     number;
  apOutstanding:     number;
  cashCollectionRate: number;
  avgDaysToPay:      number;
}

interface ArAgingItem {
  bucket: string;
  count:  number;
  amount: number;
}

interface PlMonthlyItem {
  month:     string;
  revenue:   number;
  cost:      number;
  netMargin: number;
}

interface BudgetVsActualItem {
  name:        string;
  allocated:   number;
  used:        number;
  utilization: number;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const AR_AGING_COLORS = ['#10B981', '#F59E0B', '#F97316', '#EF4444'];

// ── Component ─────────────────────────────────────────────────────────────────

export default function FinanceAnalyticsPage() {
  const { isDark, textPrimary, textMuted, bgContainer, borderColor } = useThemePalette();

  const axisColor  = isDark ? '#888' : '#555';
  const gridColor  = isDark ? '#333' : '#f0f0f0';
  const tooltipBg  = isDark ? '#1f1f1f' : '#fff';

  const chartCardStyle = {
    borderRadius: 12,
    background: bgContainer,
    border: `1px solid ${borderColor}`,
  };

  // ── Queries ──
  const { data: stats, isLoading: loadingStats } = useQuery<FinanceSummary>({
    queryKey: ['finance-analytics-summary'],
    queryFn: () => axios.get('/api/v1/finance/analytics/summary').then(r => r.data),
    staleTime: 300_000,
  });

  const { data: arAging = [], isLoading: loadingAging } = useQuery<ArAgingItem[]>({
    queryKey: ['finance-analytics-ar-aging'],
    queryFn: () => axios.get('/api/v1/finance/analytics/ar-aging').then(r => r.data),
    staleTime: 300_000,
  });

  const { data: plMonthly = [], isLoading: loadingPl } = useQuery<PlMonthlyItem[]>({
    queryKey: ['finance-analytics-monthly-pl'],
    queryFn: () => axios.get('/api/v1/finance/analytics/monthly-pl').then(r => r.data),
    staleTime: 300_000,
  });

  const { data: budgetVsActual = [], isLoading: loadingBudget } = useQuery<BudgetVsActualItem[]>({
    queryKey: ['finance-analytics-budget-vs-actual'],
    queryFn: () => axios.get('/api/v1/finance/analytics/budget-vs-actual').then(r => r.data),
    staleTime: 300_000,
  });

  if (loadingStats || loadingAging || loadingPl || loadingBudget) {
    return <div style={{ padding: 40 }}><Skeleton active /></div>;
  }

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Finance Analytics"
        icon={<BarChartOutlined />}
        iconColor="#10B981"
      />

      <FilterBar>
        {/* Placeholder — có thể thêm filter năm tài chính, BU khi cần */}
      </FilterBar>

      {/* ── StatCards ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={12} lg={5}>
          <StatCard
            label="Doanh thu YTD"
            value={formatCompact(stats?.revenueYTD)}
            color="#10B981"
            icon={<DollarOutlined />}
          />
        </Col>
        <Col xs={12} sm={12} lg={5}>
          <StatCard
            label="AR Outstanding"
            value={formatCompact(stats?.arOutstanding)}
            color="#F59E0B"
            icon={<FundOutlined />}
          />
        </Col>
        <Col xs={12} sm={12} lg={5}>
          <StatCard
            label="AP Outstanding"
            value={formatCompact(stats?.apOutstanding)}
            color="#6366F1"
            icon={<BankOutlined />}
          />
        </Col>
        <Col xs={12} sm={12} lg={4}>
          <StatCard
            label="Cash Collection"
            value={`${stats?.cashCollectionRate ?? 0}%`}
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

      {/* ── Charts row 1: AR Aging + Monthly P&L Composed ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {/* Grouped BarChart: AR Aging */}
        <Col xs={24} lg={10}>
          <Card
            title={<Text style={{ color: textPrimary, fontWeight: 600 }}>AR Aging — Công nợ phải thu</Text>}
            style={chartCardStyle}
          >
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={arAging}
                margin={{ top: 8, right: 12, left: -8, bottom: 0 }}
                barCategoryGap="35%"
              >
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="bucket" tick={{ fill: axisColor, fontSize: 11 }} />
                <YAxis
                  tick={{ fill: axisColor, fontSize: 12 }}
                  tickFormatter={v => formatCompact(v)}
                />
                <RTooltip
                  contentStyle={{ background: tooltipBg, border: `1px solid ${borderColor}`, borderRadius: 8 }}
                  formatter={(v: number, name: string) => [
                    name === 'amount' ? formatCompact(v) + ' đ' : String(v),
                    name === 'amount' ? 'Giá trị AR' : 'Số hóa đơn',
                  ]}
                />
                <Legend iconType="circle" iconSize={8} />
                <Bar dataKey="amount" name="Giá trị AR" radius={[6, 6, 0, 0]}>
                  {arAging.map((_, i) => (
                    <Cell key={i} fill={AR_AGING_COLORS[i % AR_AGING_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* ComposedChart: Monthly P&L bar + margin line */}
        <Col xs={24} lg={14}>
          <Card
            title={<Text style={{ color: textPrimary, fontWeight: 600 }}>Monthly P&L — 12 tháng</Text>}
            style={{ ...chartCardStyle, height: '100%' }}
          >
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart
                data={plMonthly}
                margin={{ top: 8, right: 40, left: -8, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="month" tick={{ fill: axisColor, fontSize: 11 }} interval={1} />
                <YAxis
                  yAxisId="left"
                  tick={{ fill: axisColor, fontSize: 11 }}
                  tickFormatter={v => formatCompact(v)}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fill: axisColor, fontSize: 11 }}
                  tickFormatter={v => `${v}%`}
                />
                <RTooltip
                  contentStyle={{ background: tooltipBg, border: `1px solid ${borderColor}`, borderRadius: 8 }}
                  formatter={(v: number, name: string) => {
                    if (name === 'revenue') return [formatCompact(v) + ' đ', 'Doanh thu'];
                    if (name === 'cost')    return [formatCompact(v) + ' đ', 'Chi phí'];
                    return [`${v}%`, 'Net Margin'];
                  }}
                />
                <Legend iconType="circle" iconSize={8} />
                <Bar yAxisId="left" dataKey="revenue" name="revenue" fill="#10B981" radius={[3, 3, 0, 0]} barSize={14} />
                <Bar yAxisId="left" dataKey="cost"    name="cost"    fill="#EF4444" radius={[3, 3, 0, 0]} barSize={14} />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="netMargin"
                  name="netMargin"
                  stroke="#F59E0B"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* ── Budget vs Actual progress bars ── */}
      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <Card
            title={<Text style={{ color: textPrimary, fontWeight: 600 }}>Budget vs Actual — theo danh mục</Text>}
            style={chartCardStyle}
          >
            {budgetVsActual.length === 0 ? (
              <Text style={{ color: textMuted }}>Chưa có BudgetPlan ACTIVE</Text>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '8px 0' }}>
                {budgetVsActual.map((item) => {
                  const pct = Math.min(item.utilization, 100);
                  const strokeColor =
                    item.utilization >= 100 ? '#EF4444' :
                    item.utilization >= 80  ? '#F59E0B' : '#10B981';

                  return (
                    <div key={item.name}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={{ color: textPrimary, fontWeight: 500, fontSize: 13 }}>{item.name}</Text>
                        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                          <Text style={{ color: textMuted, fontSize: 12 }}>
                            {formatCompact(item.used)} / {formatCompact(item.allocated)} đ
                          </Text>
                          <Text style={{ color: strokeColor, fontWeight: 600, fontSize: 13, minWidth: 48, textAlign: 'right' }}>
                            {formatPercent(item.utilization)}
                          </Text>
                        </div>
                      </div>
                      <Progress
                        percent={pct}
                        strokeColor={strokeColor}
                        trailColor={isDark ? 'rgba(255,255,255,0.08)' : '#f0f0f0'}
                        showInfo={false}
                        size="small"
                        style={{ marginBottom: 0 }}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
