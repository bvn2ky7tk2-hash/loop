import { useState } from 'react';
import { Row, Col, Table, Typography, Tag, Avatar, Space, Skeleton } from 'antd';
import {
  FunnelPlotOutlined,
  TrophyOutlined,
  DollarOutlined,
  RiseOutlined,
  ClockCircleOutlined,
  UserOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip,
  LineChart, Line,
  ResponsiveContainer, CartesianGrid, Cell, Legend,
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useThemePalette } from '../../hooks/useThemePalette';
import { SparklineCard } from '../../components/ui/SparklineCard';
import { PageHeader } from '../../components/ui/PageHeader';

const { Text } = Typography;

// ─── API response types ───────────────────────────────────────────────────────

interface CrmSummary {
  totalDeals: number;
  openDeals: number;
  winRate: number;
  pipelineValue: number;
  avgDealSize: number;
}

interface PipelineStage {
  stage: string;
  label: string;
  count: number;
  value: number;
  color: string;
}

interface WinLossMonth {
  month: string;
  won: number;
  lost: number;
}

interface TopCustomer {
  customerId: string;
  name: string;
  revenue: number;
  wonDeals: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatValue(v: number) {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(0)}M`;
  return String(v);
}

export default function CrmAnalyticsPage() {
  const { bgContainer, borderColor, textPrimary, textMuted, isDark } = useThemePalette();
  const [_selectedStage, setSelectedStage] = useState<string | null>(null);

  const { data: crmSummary, isLoading: loadingSummary } = useQuery<CrmSummary>({
    queryKey: ['crm-analytics-summary'],
    queryFn:  () => axios.get('/api/v1/crm/analytics/summary').then(r => r.data),
    staleTime: 300_000,
  });

  const { data: pipelineStages = [], isLoading: loadingPipeline } = useQuery<PipelineStage[]>({
    queryKey: ['crm-analytics-pipeline'],
    queryFn:  () => axios.get('/api/v1/crm/analytics/pipeline-by-stage').then(r => r.data),
    staleTime: 300_000,
  });

  const { data: winLossMonthly = [] } = useQuery<WinLossMonth[]>({
    queryKey: ['crm-analytics-winloss'],
    queryFn:  () => axios.get('/api/v1/crm/analytics/win-loss-monthly', { params: { months: 6 } }).then(r => r.data),
    staleTime: 300_000,
  });

  const { data: topCustomers = [] } = useQuery<TopCustomer[]>({
    queryKey: ['crm-analytics-top-customers'],
    queryFn:  () => axios.get('/api/v1/crm/analytics/top-customers', { params: { limit: 5 } }).then(r => r.data),
    staleTime: 300_000,
  });

  if (loadingSummary) {
    return <div style={{ padding: 40 }}><Skeleton active /></div>;
  }

  const totalDeals    = crmSummary?.totalDeals    ?? 0;
  const winRate       = crmSummary?.winRate       ?? 0;
  const avgDealSize   = crmSummary?.avgDealSize   ?? 0;
  const pipelineValue = crmSummary?.pipelineValue ?? 0;

  const cardStyle = {
    background: bgContainer,
    border: `1px solid ${borderColor}`,
    borderRadius: 12,
    padding: '16px 20px',
  };

  const sectionTitle = (icon: React.ReactNode, label: string, color: string) => (
    <div style={{ fontSize: 14, fontWeight: 600, color: textPrimary, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ color }}>{icon}</span>
      {label}
    </div>
  );

  // Top customers table columns
  const topCustomersColumns = [
    {
      title: <Text style={{ color: textMuted }}>#</Text>,
      width: 36,
      render: (_: unknown, __: unknown, index: number) => (
        <Text style={{ color: index < 3 ? '#F59E0B' : textMuted, fontWeight: 700, fontSize: 14 }}>
          {index + 1}
        </Text>
      ),
    },
    {
      title: <Text style={{ color: textMuted }}>Khách hàng</Text>,
      dataIndex: 'name',
      render: (v: string) => (
        <Space>
          <Avatar size={28} icon={<UserOutlined />} style={{ background: '#6366F1' }} />
          <Text style={{ color: textPrimary, fontSize: 13 }}>{v}</Text>
        </Space>
      ),
    },
    {
      title: <Text style={{ color: textMuted }}>Doanh thu Won</Text>,
      dataIndex: 'revenue',
      width: 140,
      render: (v: number) => <Text style={{ color: '#10B981', fontWeight: 700, fontSize: 13 }}>{formatValue(v)}</Text>,
    },
    {
      title: <Text style={{ color: textMuted }}>Won Deals</Text>,
      dataIndex: 'wonDeals',
      width: 100,
      render: (v: number) => <Text style={{ color: textPrimary, fontSize: 13 }}>{v}</Text>,
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="CRM Analytics"
        icon={<FunnelPlotOutlined />}
        iconColor="#DC2626"
      />

      {/* Row 1 — 4 SparklineCard filled */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <SparklineCard
            label="Tổng Deals"
            value={totalDeals}
            delta={0}
            data={[]}
            variant="bar"
            color="#6366F1"
            icon={<FunnelPlotOutlined />}
            filled
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <SparklineCard
            label="Win Rate"
            value={`${winRate}%`}
            delta={0}
            data={[]}
            variant="line"
            color="#10B981"
            icon={<TrophyOutlined />}
            filled
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <SparklineCard
            label="Avg Deal Size"
            value={formatValue(avgDealSize)}
            unit="VNĐ"
            delta={0}
            data={[]}
            variant="bar"
            color="#3B82F6"
            icon={<DollarOutlined />}
            filled
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <SparklineCard
            label="Pipeline Value"
            value={formatValue(pipelineValue)}
            unit="VNĐ"
            delta={0}
            data={[]}
            variant="line"
            color="#F97316"
            icon={<RiseOutlined />}
            filled
          />
        </Col>
      </Row>

      {/* Row 2 — Pipeline by stage (real data) */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24}>
          <div style={cardStyle}>
            {sectionTitle(<FunnelPlotOutlined />, 'Phễu bán hàng theo giai đoạn', '#6366F1')}
            {loadingPipeline ? (
              <Skeleton active paragraph={{ rows: 4 }} />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={pipelineStages}
                  margin={{ top: 4, right: 24, left: 0, bottom: 0 }}
                  onClick={(d) => d && setSelectedStage(d.activeLabel ?? null)}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#E2E8F0'} vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 12, fill: textMuted as string }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="count"
                    orientation="left"
                    tick={{ fontSize: 11, fill: textMuted as string }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                    label={{ value: 'Số deals', angle: -90, position: 'insideLeft', fontSize: 11, fill: textMuted as string, dy: 40 }}
                  />
                  <YAxis
                    yAxisId="value"
                    orientation="right"
                    tick={{ fontSize: 11, fill: textMuted as string }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => formatValue(v)}
                    label={{ value: 'Giá trị', angle: 90, position: 'insideRight', fontSize: 11, fill: textMuted as string, dy: -40 }}
                  />
                  <RTooltip
                    contentStyle={{
                      background: bgContainer,
                      border: `1px solid ${borderColor}`,
                      borderRadius: 8,
                      fontSize: 12,
                      color: textPrimary as string,
                    }}
                    formatter={(value: number, name: string) =>
                      name === 'count'
                        ? [`${value} deals`, 'Số lượng']
                        : [formatValue(value), 'Giá trị']
                    }
                  />
                  <Bar yAxisId="count" dataKey="count" name="count" radius={[6, 6, 0, 0]} maxBarSize={64}>
                    {pipelineStages.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                  <Bar yAxisId="value" dataKey="value" name="value" radius={[4, 4, 0, 0]} maxBarSize={40} opacity={0.35}>
                    {pipelineStages.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Col>
      </Row>

      {/* Row 3 — Win/Loss monthly (LineChart) + Top Customers */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={14}>
          <div style={{ ...cardStyle, height: '100%' }}>
            {sectionTitle(<ClockCircleOutlined />, 'Win / Loss theo tháng (6 tháng gần nhất)', '#6366F1')}
            {winLossMonthly.length === 0 ? (
              <div style={{ color: textMuted, textAlign: 'center', padding: 32 }}>Chưa có dữ liệu</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart
                  data={winLossMonthly}
                  margin={{ top: 4, right: 24, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#E2E8F0'} vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12, fill: textMuted as string }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: textMuted as string }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <RTooltip
                    contentStyle={{
                      background: bgContainer,
                      border: `1px solid ${borderColor}`,
                      borderRadius: 8,
                      fontSize: 12,
                      color: textPrimary as string,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, color: textMuted as string }} />
                  <Line type="monotone" dataKey="won"  stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} name="Won" />
                  <Line type="monotone" dataKey="lost" stroke="#EF4444" strokeWidth={2} dot={{ r: 3 }} name="Lost" strokeDasharray="5 3" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </Col>

        <Col xs={24} lg={10}>
          <div style={{ ...cardStyle, height: '100%' }}>
            {sectionTitle(<ThunderboltOutlined />, 'Top 5 khách hàng theo doanh thu', '#F59E0B')}
            <Table
              dataSource={topCustomers}
              columns={topCustomersColumns}
              rowKey="customerId"
              size="small"
              pagination={false}
              locale={{ emptyText: <Text style={{ color: textMuted }}>Chưa có dữ liệu</Text> }}
            />
          </div>
        </Col>
      </Row>

      {/* Row 4 — Win Rate bar chart */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={10}>
          <div style={cardStyle}>
            {sectionTitle(<RiseOutlined />, 'Doanh thu theo khách hàng', '#10B981')}
            {topCustomers.length === 0 ? (
              <div style={{ color: textMuted, textAlign: 'center', padding: 32 }}>Chưa có dữ liệu</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={topCustomers}
                  layout="vertical"
                  margin={{ top: 2, right: 24, left: 8, bottom: 0 }}
                >
                  <XAxis type="number" tick={{ fontSize: 11, fill: textMuted as string }} tickFormatter={(v) => formatValue(v)} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: textPrimary as string }} width={110} />
                  <RTooltip
                    contentStyle={{
                      background: bgContainer,
                      border: `1px solid ${borderColor}`,
                      borderRadius: 8, fontSize: 12, color: textPrimary as string,
                    }}
                    formatter={(v: number) => [formatValue(v), 'Doanh thu Won']}
                  />
                  <Bar dataKey="revenue" radius={[0, 4, 4, 0]} maxBarSize={18}>
                    {topCustomers.map((_, i) => (
                      <Cell key={i} fill={['#10B981', '#6366F1', '#3B82F6', '#F59E0B', '#F97316'][i % 5]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Col>

        <Col xs={24} lg={14}>
          <div style={cardStyle}>
            {sectionTitle(<TrophyOutlined />, 'Top khách hàng — Won Deals & Doanh thu', '#F59E0B')}
            <Table
              dataSource={topCustomers}
              columns={topCustomersColumns}
              rowKey="customerId"
              size="small"
              pagination={false}
              locale={{ emptyText: <Text style={{ color: textMuted }}>Chưa có dữ liệu</Text> }}
            />
          </div>
        </Col>
      </Row>
    </div>
  );
}
