import { useState } from 'react';
import { Row, Col, Typography, Alert, Badge, Card, List, Tag, Tooltip, Button, Skeleton } from 'antd';
import {
  BarChartOutlined, TeamOutlined, ProjectOutlined, ShopOutlined,
  WalletOutlined, WarningOutlined, ClockCircleOutlined, RiseOutlined,
  FallOutlined, FundOutlined, CheckCircleOutlined, FileDoneOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip as RTooltip,
  ResponsiveContainer, CartesianGrid, Legend, PieChart, Pie, Cell,
} from 'recharts';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { useThemePalette } from '../../hooks/useThemePalette';
import { SparklineCard } from '../../components/ui/SparklineCard';
import { StatCard } from '../../components/ui/StatCard';
import { PageHeader } from '../../components/ui/PageHeader';

const { Text } = Typography;

// ── Types ─────────────────────────────────────────────────────────────────────

interface OverviewKpis {
  revenue: { ytd: number; thisMonth: number; growth: number };
  finance: { grossProfit: number; grossMargin: number; arOutstanding: number; expenseYtd: number };
  headcount: { total: number; newThisMonth: number; attritionRate: number };
  projects: { active: number; overdue: number; taskCompletion: number; overdueTasks: number };
  crm: { pipelineValue: number; wonThisMonth: number; stageBreakdown: Record<string, number> };
  budget: { utilization: number; allocated: number; used: number };
  okr: { avgProgress: number; totalObjectives: number };
  attendance: { rate: number };
}

interface OverviewRisks {
  overdueInvoices: Array<{ code: string; amount: number; daysOverdue: number }>;
  expiringContracts: Array<{ name: string; endDate: string | null; daysLeft: number | null }>;
  budgetAtRisk: Array<{ lineName: string; utilization: number }>;
  pendingApprovals: number;
}

interface OverviewAlert {
  type: string;
  level: 'error' | 'warning' | 'info';
  message: string;
}

interface OverviewData {
  kpis: OverviewKpis;
  risks: OverviewRisks;
  alerts: OverviewAlert[];
}

interface RevenueTrendPoint { month: string; revenue: number }
interface HeadcountDeptPoint { dept: string; count: number }

const DEAL_STAGE_COLORS = ['#6366F1', '#3B82F6', '#F59E0B', '#10B981', '#EF4444'];

function formatM(n: number) {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)} tỷ`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)} K`;
  return String(n);
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AnalyticsOverviewPage() {
  const { isDark, textPrimary, textMuted, bgCard, bgContainer, borderColor, linkColor, preset } = useThemePalette();
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading } = useQuery<OverviewData>({
    queryKey: ['analytics', 'overview'],
    queryFn: () => apiClient.get('/api/v1/analytics/overview').then(r => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const { data: revTrend = [] } = useQuery<RevenueTrendPoint[]>({
    queryKey: ['analytics', 'revenue-trend'],
    queryFn: () => apiClient.get('/api/v1/analytics/revenue-trend').then(r => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const { data: headcountDept = [] } = useQuery<HeadcountDeptPoint[]>({
    queryKey: ['analytics', 'headcount-dept'],
    queryFn: () => apiClient.get('/api/v1/analytics/headcount-by-dept').then(r => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await qc.invalidateQueries({ queryKey: ['analytics'] });
    setRefreshing(false);
  };

  const axisColor  = isDark ? 'rgba(255,255,255,0.4)' : '#94A3B8';
  const gridColor  = isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9';
  const tooltipBg  = bgContainer;

  const chartCardStyle: React.CSSProperties = {
    background: bgCard,
    border: `1px solid ${borderColor}`,
    borderRadius: 12,
    marginBottom: 0,
  };

  const kpis = data?.kpis;
  const risks = data?.risks;
  const alerts = data?.alerts ?? [];

  const dealStages = kpis?.crm.stageBreakdown
    ? Object.entries(kpis.crm.stageBreakdown).map(([stage, count]) => ({ stage, count }))
    : [];

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Tổng quan Lãnh đạo"
        icon={<BarChartOutlined />}
        iconColor="#6366F1"
        actions={
          <Button icon={<ReloadOutlined spin={refreshing} />} onClick={handleRefresh}>
            Làm mới
          </Button>
        }
      />

      {/* ── Cảnh báo thông minh ───────────────────────────────────────────── */}
      {alerts.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          {alerts.map((a, i) => (
            <Alert
              key={i}
              type={a.level === 'error' ? 'error' : a.level === 'warning' ? 'warning' : 'info'}
              message={a.message}
              showIcon
              style={{ marginBottom: 8 }}
            />
          ))}
        </div>
      )}

      {/* ── KPI Row — Tài chính ───────────────────────────────────────────── */}
      {isLoading ? (
        <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
          {[...Array(4)].map((_, i) => <Col key={i} xs={12} sm={6}><Skeleton.Button active block style={{ height: 100 }} /></Col>)}
        </Row>
      ) : (
        <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
          <Col xs={12} sm={6}>
            <StatCard
              label="Doanh thu YTD"
              value={formatM(kpis?.revenue.ytd ?? 0)}
              subValue={`Tháng này: ${formatM(kpis?.revenue.thisMonth ?? 0)}`}
              color="#10B981"
              icon={<RiseOutlined />}
            />
          </Col>
          <Col xs={12} sm={6}>
            <StatCard
              label="Lợi nhuận gộp"
              value={formatM(kpis?.finance.grossProfit ?? 0)}
              subValue={`Biên ${kpis?.finance.grossMargin ?? 0}%`}
              color="#6366F1"
              icon={<FundOutlined />}
            />
          </Col>
          <Col xs={12} sm={6}>
            <StatCard
              label="Phải thu (AR)"
              value={formatM(kpis?.finance.arOutstanding ?? 0)}
              color="#F59E0B"
              icon={<WalletOutlined />}
            />
          </Col>
          <Col xs={12} sm={6}>
            <StatCard
              label="Pipeline CRM"
              value={formatM(kpis?.crm.pipelineValue ?? 0)}
              subValue={`Won tháng này: ${kpis?.crm.wonThisMonth ?? 0} deals`}
              color="#3B82F6"
              icon={<ShopOutlined />}
            />
          </Col>
        </Row>
      )}

      {/* ── KPI Row — Nhân sự & Dự án ────────────────────────────────────── */}
      {!isLoading && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={12} sm={6}>
            <StatCard
              label="Nhân sự đang làm"
              value={kpis?.headcount.total ?? 0}
              subValue={`Mới tháng này: ${kpis?.headcount.newThisMonth ?? 0}`}
              color="#8B5CF6"
              icon={<TeamOutlined />}
            />
          </Col>
          <Col xs={12} sm={6}>
            <StatCard
              label="Dự án đang chạy"
              value={kpis?.projects.active ?? 0}
              subValue={`Trễ deadline: ${kpis?.projects.overdue ?? 0}`}
              color="#F97316"
              icon={<ProjectOutlined />}
            />
          </Col>
          <Col xs={12} sm={6}>
            <StatCard
              label="Task hoàn thành"
              value={`${kpis?.projects.taskCompletion ?? 0}%`}
              subValue={`Quá hạn: ${kpis?.projects.overdueTasks ?? 0}`}
              color="#10B981"
              icon={<CheckCircleOutlined />}
            />
          </Col>
          <Col xs={12} sm={6}>
            <StatCard
              label="Ngân sách sử dụng"
              value={`${kpis?.budget.utilization ?? 0}%`}
              subValue={`${formatM(kpis?.budget.used ?? 0)} / ${formatM(kpis?.budget.allocated ?? 0)}`}
              color={
                (kpis?.budget.utilization ?? 0) >= 90 ? '#EF4444'
                : (kpis?.budget.utilization ?? 0) >= 75 ? '#F59E0B'
                : '#10B981'
              }
              icon={<WalletOutlined />}
            />
          </Col>
        </Row>
      )}

      {/* ── Charts Row 1: Revenue Trend + Deal Stage ─────────────────────── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} md={14}>
          <Card title={<Text style={{ color: textPrimary }}>Doanh thu 6 tháng (triệu đ)</Text>} style={chartCardStyle}>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={revTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="month" tick={{ fill: axisColor, fontSize: 12 }} />
                <YAxis tick={{ fill: axisColor, fontSize: 12 }} />
                <RTooltip
                  contentStyle={{ background: tooltipBg, border: `1px solid ${borderColor}`, color: textPrimary }}
                  formatter={(v: number) => [`${v}M đ`, 'Doanh thu']}
                />
                <Line type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={2.5} dot={{ fill: '#10B981', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        <Col xs={24} md={10}>
          <Card title={<Text style={{ color: textPrimary }}>Pipeline theo giai đoạn</Text>} style={chartCardStyle}>
            {dealStages.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={dealStages} dataKey="count" nameKey="stage" cx="50%" cy="50%" outerRadius={80} label={({ stage, count }) => `${stage}: ${count}`}>
                    {dealStages.map((_, i) => (
                      <Cell key={i} fill={DEAL_STAGE_COLORS[i % DEAL_STAGE_COLORS.length]} />
                    ))}
                  </Pie>
                  <RTooltip contentStyle={{ background: tooltipBg, border: `1px solid ${borderColor}`, color: textPrimary }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 220 }}>
                <Text style={{ color: textMuted }}>Chưa có dữ liệu deal</Text>
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* ── Charts Row 2: Headcount by Dept + OKR + Attendance ───────────── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} md={12}>
          <Card title={<Text style={{ color: textPrimary }}>Headcount theo phòng ban</Text>} style={chartCardStyle}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={headcountDept} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis type="number" tick={{ fill: axisColor, fontSize: 12 }} />
                <YAxis dataKey="dept" type="category" tick={{ fill: axisColor, fontSize: 11 }} width={120} />
                <RTooltip contentStyle={{ background: tooltipBg, border: `1px solid ${borderColor}`, color: textPrimary }} />
                <Bar dataKey="count" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Row gutter={[12, 12]}>
            <Col span={24}>
              <Card
                style={{ ...chartCardStyle, minHeight: 100 }}
                bodyStyle={{ padding: '16px 20px' }}
              >
                <div style={{ display: 'flex', gap: 32, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div>
                    <Text style={{ color: textMuted, fontSize: 12, display: 'block' }}>OKR Progress TB</Text>
                    <div style={{ fontSize: 32, fontWeight: 700, color: linkColor }}>
                      {kpis?.okr.avgProgress ?? 0}%
                    </div>
                    <Text style={{ color: textMuted, fontSize: 12 }}>{kpis?.okr.totalObjectives ?? 0} mục tiêu</Text>
                  </div>
                  <div>
                    <Text style={{ color: textMuted, fontSize: 12, display: 'block' }}>Tỉ lệ đi làm (30 ngày)</Text>
                    <div style={{ fontSize: 32, fontWeight: 700, color: (kpis?.attendance.rate ?? 0) >= 90 ? '#10B981' : '#F59E0B' }}>
                      {kpis?.attendance.rate ?? 0}%
                    </div>
                  </div>
                  <div>
                    <Text style={{ color: textMuted, fontSize: 12, display: 'block' }}>Attrition rate</Text>
                    <div style={{ fontSize: 32, fontWeight: 700, color: (kpis?.headcount.attritionRate ?? 0) > 5 ? '#EF4444' : '#10B981' }}>
                      {kpis?.headcount.attritionRate ?? 0}%
                    </div>
                  </div>
                </div>
              </Card>
            </Col>

            {/* Phê duyệt chờ xử lý */}
            <Col span={24}>
              <Card
                style={{ ...chartCardStyle }}
                bodyStyle={{ padding: '12px 16px' }}
                title={<Text style={{ color: textPrimary }}>Rủi ro nhanh</Text>}
              >
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {risks?.overdueInvoices?.length > 0 && (
                    <Tag color="error">
                      <WarningOutlined /> {risks.overdueInvoices.length} HĐ quá hạn
                    </Tag>
                  )}
                  {risks?.expiringContracts?.filter(c => (c.daysLeft ?? 99) <= 30).length > 0 && (
                    <Tag color="error">
                      <ClockCircleOutlined /> {risks.expiringContracts.filter(c => (c.daysLeft ?? 99) <= 30).length} HĐ LĐ hết hạn
                    </Tag>
                  )}
                  {risks?.budgetAtRisk?.length > 0 && (
                    <Tag color="warning">
                      <FallOutlined /> {risks.budgetAtRisk.length} NS vượt ngưỡng
                    </Tag>
                  )}
                  {(risks?.pendingApprovals ?? 0) > 0 && (
                    <Tag color="blue">
                      <FileDoneOutlined /> {risks.pendingApprovals} phê duyệt chờ
                    </Tag>
                  )}
                  {!risks?.overdueInvoices?.length && !risks?.budgetAtRisk?.length && !risks?.pendingApprovals && (
                    <Tag color="success"><CheckCircleOutlined /> Không có rủi ro</Tag>
                  )}
                </div>
              </Card>
            </Col>
          </Row>
        </Col>
      </Row>

      {/* ── Risk Detail Lists ─────────────────────────────────────────────── */}
      <Row gutter={[16, 16]}>
        {(risks?.overdueInvoices?.length ?? 0) > 0 && (
          <Col xs={24} md={12}>
            <Card
              title={<Text style={{ color: textPrimary }}><WarningOutlined style={{ color: '#EF4444', marginRight: 6 }} />Hóa đơn quá hạn</Text>}
              style={chartCardStyle}
            >
              <List
                size="small"
                dataSource={risks?.overdueInvoices?.slice(0, 5) ?? []}
                renderItem={inv => (
                  <List.Item>
                    <Text style={{ color: textPrimary }}>{inv.code}</Text>
                    <span style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
                      <Text style={{ color: '#EF4444', fontWeight: 600 }}>{formatM(inv.amount)} đ</Text>
                      <Tag color="error">{inv.daysOverdue} ngày</Tag>
                    </span>
                  </List.Item>
                )}
              />
            </Card>
          </Col>
        )}

        {(risks?.expiringContracts?.length ?? 0) > 0 && (
          <Col xs={24} md={12}>
            <Card
              title={<Text style={{ color: textPrimary }}><ClockCircleOutlined style={{ color: '#F59E0B', marginRight: 6 }} />Hợp đồng sắp hết hạn</Text>}
              style={chartCardStyle}
            >
              <List
                size="small"
                dataSource={risks?.expiringContracts?.slice(0, 5) ?? []}
                renderItem={c => (
                  <List.Item>
                    <Text style={{ color: textPrimary }}>{c.name}</Text>
                    <span style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
                      <Text style={{ color: textMuted }}>{c.endDate ?? '—'}</Text>
                      <Tag color={(c.daysLeft ?? 99) <= 30 ? 'error' : 'warning'}>
                        {c.daysLeft ?? '?'} ngày
                      </Tag>
                    </span>
                  </List.Item>
                )}
              />
            </Card>
          </Col>
        )}
      </Row>
    </div>
  );
}
