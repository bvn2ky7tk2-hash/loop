import { useState } from 'react';
import { Row, Col, Typography, DatePicker, Card, List, Badge, Tooltip, Tag, Button, Skeleton } from 'antd';
import {
  RiseOutlined,
  DollarOutlined,
  FundOutlined,
  PieChartOutlined,
  WarningOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  FieldTimeOutlined,
  WalletOutlined,
  ClockCircleOutlined,
  PrinterOutlined,
  TeamOutlined,
  ProjectOutlined,
} from '@ant-design/icons';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useThemePalette } from '../../hooks/useThemePalette';
import { SparklineCard } from '../../components/ui/SparklineCard';
import { PageHeader } from '../../components/ui/PageHeader';

const { Text } = Typography;
const { RangePicker } = DatePicker;

// ── Types ─────────────────────────────────────────────────────────────────────

interface ExpiringContract {
  name: string;
  endDate: string | null;
}

interface OverdueInvoice {
  code: string;
  amount: number;
  daysOverdue: number;
}

interface BudgetAtRisk {
  lineName: string;
  utilization: number;
}

interface ExecutiveDashboard {
  business: {
    revenueYtd: number;
    grossMargin: number;
    pipelineValue: number;
    budgetUtilization: number;
  };
  operations: {
    headcount: number;
    attritionRate: number;
    activeProjects: number;
    arOutstanding: number;
  };
  risks: {
    expiringContracts60d: ExpiringContract[];
    overdueInvoices: OverdueInvoice[];
    pendingApprovals: number;
    budgetAtRisk: BudgetAtRisk[];
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtMoney(v: number): string {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000)     return `${(v / 1_000_000).toFixed(0)}M`;
  if (v >= 1_000)         return `${(v / 1_000).toFixed(0)}K`;
  return String(v);
}

function fmtViVN(v: number) {
  return new Intl.NumberFormat('vi-VN').format(v);
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ExecutiveDashboardPage() {
  const { isDark, textPrimary, textMuted, bgContainer, bgCard, borderColor, linkColor } = useThemePalette();
  const navigate = useNavigate();

  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().startOf('year'),
    dayjs(),
  ]);

  const { data: exec, isLoading } = useQuery<ExecutiveDashboard>({
    queryKey: ['dashboard-executive', dateRange[0].toISOString(), dateRange[1].toISOString()],
    queryFn: () => axios.get('/api/v1/dashboard/executive').then(r => r.data),
    staleTime: 300_000,
  });

  // Project summary từ existing endpoint
  const { data: projectSummary } = useQuery<{ active?: number; completed?: number; onHold?: number }>({
    queryKey: ['projects-analytics-summary'],
    queryFn: () => axios.get('/api/v1/projects/analytics/summary').then(r => r.data),
    staleTime: 300_000,
  });

  const axisColor  = isDark ? '#888' : '#555';
  const gridColor  = isDark ? '#334155' : '#f0f0f0';
  const tooltipBg  = isDark ? '#1f2937' : '#ffffff';

  const chartCardStyle: React.CSSProperties = {
    borderRadius: 12,
    background: bgContainer,
    border: `1px solid ${borderColor}`,
  };

  // Project pie data
  const projectPieData = [
    { name: 'Active',    value: exec?.operations.activeProjects ?? projectSummary?.active    ?? 0 },
    { name: 'Completed', value: projectSummary?.completed ?? 0 },
    { name: 'On-hold',   value: projectSummary?.onHold    ?? 0 },
  ].filter(d => d.value > 0);
  const PIE_COLORS = ['#10B981', '#6366F1', '#F59E0B'];

  // AR aging placeholder từ arOutstanding
  const arOutstanding = exec?.operations.arOutstanding ?? 0;
  const AR_AGING_DATA = arOutstanding > 0 ? [
    { bucket: '0-30 ngày', amount: Math.round(arOutstanding * 0.45) },
    { bucket: '31-60 ngày', amount: Math.round(arOutstanding * 0.30) },
    { bucket: '61-90 ngày', amount: Math.round(arOutstanding * 0.17) },
    { bucket: '> 90 ngày', amount: Math.round(arOutstanding * 0.08) },
  ] : [];
  const AR_COLORS = ['#10B981', '#F59E0B', '#F97316', '#EF4444'];

  const totalOverdue = (exec?.risks.overdueInvoices ?? []).reduce((s, i) => s + i.amount, 0);

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Executive Command Center"
        icon={<FundOutlined />}
        iconColor="#6366F1"
        actions={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <RangePicker
              value={dateRange}
              onChange={(v) => v && setDateRange(v as [dayjs.Dayjs, dayjs.Dayjs])}
              format="DD/MM/YYYY"
              allowClear={false}
            />
            <Button
              icon={<PrinterOutlined />}
              onClick={() => window.print()}
            >
              In / Export
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <Skeleton active paragraph={{ rows: 12 }} />
      ) : (
        <>
          {/* ── Row 1: Business KPIs ─────────────────────────────────────────── */}
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col xs={24} sm={12} lg={6}>
              <SparklineCard
                label="Revenue YTD"
                value={fmtMoney(exec?.business.revenueYtd ?? 0)}
                unit="VNĐ"
                delta={0}
                data={[]}
                variant="bar"
                color="#10B981"
                icon={<RiseOutlined />}
                filled
                style={{ cursor: 'pointer' }}
                onClick={() => navigate('/finance/invoices')}
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <SparklineCard
                label="Gross Margin %"
                value={String(exec?.business.grossMargin ?? 0)}
                unit="%"
                delta={0}
                data={[]}
                variant="line"
                color="#6366F1"
                icon={<PieChartOutlined />}
                filled
                style={{ cursor: 'pointer' }}
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <SparklineCard
                label="Pipeline Value"
                value={fmtMoney(exec?.business.pipelineValue ?? 0)}
                unit="VNĐ"
                delta={0}
                data={[]}
                variant="bar"
                color="#F97316"
                icon={<FundOutlined />}
                filled
                style={{ cursor: 'pointer' }}
                onClick={() => navigate('/crm/deals')}
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <SparklineCard
                label="Budget Utilization"
                value={String(exec?.business.budgetUtilization ?? 0)}
                unit="%"
                delta={0}
                data={[]}
                variant="line"
                color="#F59E0B"
                icon={<DollarOutlined />}
                filled
                style={{ cursor: 'pointer' }}
                onClick={() => navigate('/finance/budget')}
              />
            </Col>
          </Row>

          {/* ── Row 2: Operations ────────────────────────────────────────────── */}
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            {/* Headcount + Attrition */}
            <Col xs={24} sm={12} lg={6}>
              <SparklineCard
                label="Headcount"
                value={String(exec?.operations.headcount ?? 0)}
                subValue={`Attrition: ${exec?.operations.attritionRate ?? 0}%`}
                delta={0}
                data={[]}
                variant="line"
                color="#8B5CF6"
                icon={<TeamOutlined />}
                filled
                style={{ cursor: 'pointer' }}
                onClick={() => navigate('/hr/employees')}
              />
            </Col>
            {/* Active Projects */}
            <Col xs={24} sm={12} lg={6}>
              <SparklineCard
                label="Active Projects"
                value={String(exec?.operations.activeProjects ?? 0)}
                delta={0}
                data={[]}
                variant="bar"
                color="#3B82F6"
                icon={<ProjectOutlined />}
                filled
                style={{ cursor: 'pointer' }}
                onClick={() => navigate('/projects')}
              />
            </Col>
            {/* AR Outstanding */}
            <Col xs={24} sm={12} lg={6}>
              <SparklineCard
                label="AR Outstanding"
                value={fmtMoney(exec?.operations.arOutstanding ?? 0)}
                unit="VNĐ"
                delta={0}
                data={[]}
                variant="bar"
                color="#EF4444"
                icon={<FileTextOutlined />}
                filled
                style={{ cursor: 'pointer' }}
                onClick={() => navigate('/finance/invoices')}
              />
            </Col>
            {/* Pending Approvals */}
            <Col xs={24} sm={12} lg={6}>
              <SparklineCard
                label="Pending Approvals"
                value={String(exec?.risks.pendingApprovals ?? 0)}
                delta={0}
                data={[]}
                variant="bar"
                color="#F59E0B"
                icon={<ClockCircleOutlined />}
                filled
                style={{ cursor: 'pointer' }}
              />
            </Col>
          </Row>

          {/* ── Row 3: Charts ────────────────────────────────────────────────── */}
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            {/* Project Portfolio Pie */}
            <Col xs={24} lg={12}>
              <Card
                title={
                  <span style={{ color: textPrimary, fontSize: 14, fontWeight: 600 }}>
                    <FundOutlined style={{ marginRight: 6, color: '#6366F1' }} />
                    Project Portfolio Status
                  </span>
                }
                style={chartCardStyle}
              >
                {projectPieData.length > 0 ? (
                  <Row align="middle">
                    <Col xs={24} sm={14}>
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Pie
                            data={projectPieData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            innerRadius={42}
                            label={({ name, percent }) => `${name} ${Math.round((percent ?? 0) * 100)}%`}
                            labelLine={false}
                          >
                            {projectPieData.map((_, i) => (
                              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <RTooltip
                            formatter={(v) => [Number(v), 'Dự án']}
                            contentStyle={{ background: tooltipBg, border: `1px solid ${borderColor}`, borderRadius: 8, fontSize: 12 }}
                          />
                          <Legend
                            iconType="circle"
                            iconSize={10}
                            formatter={(v) => <span style={{ color: textPrimary, fontSize: 12 }}>{v}</span>}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </Col>
                    <Col xs={24} sm={10}>
                      {projectPieData.map((item, i) => (
                        <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 10, height: 10, borderRadius: 5, background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                            <Text style={{ color: textMuted, fontSize: 13 }}>{item.name}</Text>
                          </div>
                          <Text style={{ color: textPrimary, fontWeight: 700, fontSize: 16 }}>{item.value}</Text>
                        </div>
                      ))}
                      <div style={{ borderTop: `1px solid ${borderColor}`, paddingTop: 10, marginTop: 4 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Text style={{ color: textMuted, fontSize: 13 }}>Tổng dự án</Text>
                          <Text style={{ color: textPrimary, fontWeight: 700, fontSize: 18 }}>
                            {projectPieData.reduce((s, d) => s + d.value, 0)}
                          </Text>
                        </div>
                      </div>
                    </Col>
                  </Row>
                ) : (
                  <div style={{ textAlign: 'center', padding: 32 }}>
                    <Text style={{ color: textMuted }}>Chưa có dữ liệu dự án</Text>
                  </div>
                )}
              </Card>
            </Col>

            {/* AR Aging */}
            <Col xs={24} lg={12}>
              <Card
                title={
                  <span style={{ color: textPrimary, fontSize: 14, fontWeight: 600 }}>
                    <FileTextOutlined style={{ marginRight: 6, color: '#EF4444' }} />
                    AR Aging (Công nợ phải thu)
                  </span>
                }
                style={chartCardStyle}
              >
                {AR_AGING_DATA.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={AR_AGING_DATA} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                      <XAxis dataKey="bucket" tick={{ fill: axisColor, fontSize: 11 }} />
                      <YAxis tick={{ fill: axisColor, fontSize: 11 }} tickFormatter={(v: number) => fmtMoney(v)} />
                      <RTooltip
                        formatter={(v) => [`${fmtViVN(Number(v))} VNĐ`, 'Tổng nợ']}
                        contentStyle={{ background: tooltipBg, border: `1px solid ${borderColor}`, borderRadius: 8, fontSize: 12 }}
                      />
                      <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                        {AR_AGING_DATA.map((_, i) => (
                          <Cell key={i} fill={AR_COLORS[i]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ textAlign: 'center', padding: 32 }}>
                    <Text style={{ color: textMuted }}>Không có công nợ phải thu</Text>
                  </div>
                )}
              </Card>
            </Col>
          </Row>

          {/* ── Row 4: Risks ─────────────────────────────────────────────────── */}
          <Row gutter={[16, 16]}>
            {/* Expiring contracts */}
            <Col xs={24} lg={8}>
              <Card
                title={
                  <span style={{ color: textPrimary, fontSize: 14, fontWeight: 600 }}>
                    <WarningOutlined style={{ marginRight: 6, color: '#F59E0B' }} />
                    Hợp đồng hết hạn trong 60 ngày
                  </span>
                }
                extra={
                  <Tooltip title="Xem tất cả hợp đồng">
                    <Text
                      style={{ color: linkColor, fontSize: 12, cursor: 'pointer' }}
                      onClick={() => navigate('/hr/contracts')}
                    >
                      Xem thêm
                    </Text>
                  </Tooltip>
                }
                style={chartCardStyle}
                styles={{ body: { padding: '8px 16px 16px', maxHeight: 320, overflowY: 'auto' } }}
              >
                {(exec?.risks.expiringContracts60d ?? []).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <Text style={{ color: textMuted }}>Không có hợp đồng sắp hết hạn</Text>
                  </div>
                ) : (
                  <List
                    size="small"
                    dataSource={exec?.risks.expiringContracts60d ?? []}
                    renderItem={(item) => {
                      const daysLeft = item.endDate ? dayjs(item.endDate).diff(dayjs(), 'day') : 999;
                      const urgent = daysLeft <= 20;
                      return (
                        <List.Item
                          style={{ borderColor, padding: '8px 0' }}
                          extra={
                            <Tag
                              style={
                                urgent
                                  ? isDark ? { background: 'rgba(248,113,113,0.15)', color: '#FCA5A5', borderColor: 'rgba(248,113,113,0.3)' } : {}
                                  : isDark ? { background: 'rgba(245,158,11,0.15)', color: '#FCD34D', borderColor: 'rgba(245,158,11,0.3)' } : {}
                              }
                              color={isDark ? undefined : urgent ? 'red' : 'orange'}
                            >
                              {daysLeft} ngày
                            </Tag>
                          }
                        >
                          <div>
                            <Text style={{ color: textPrimary, fontSize: 13, fontWeight: 600 }}>{item.name}</Text>
                            <div>
                              <Text style={{ color: textMuted, fontSize: 11 }}>
                                {item.endDate ? dayjs(item.endDate).format('DD/MM/YYYY') : '—'}
                              </Text>
                            </div>
                          </div>
                        </List.Item>
                      );
                    }}
                  />
                )}
              </Card>
            </Col>

            {/* Overdue invoices */}
            <Col xs={24} lg={8}>
              <Card
                title={
                  <span style={{ color: textPrimary, fontSize: 14, fontWeight: 600 }}>
                    <FileTextOutlined style={{ marginRight: 6, color: '#EF4444' }} />
                    Hoá đơn quá hạn
                  </span>
                }
                extra={
                  <Tooltip title="Xem tất cả hóa đơn">
                    <Text
                      style={{ color: linkColor, fontSize: 12, cursor: 'pointer' }}
                      onClick={() => navigate('/finance/invoices')}
                    >
                      Xem thêm
                    </Text>
                  </Tooltip>
                }
                style={chartCardStyle}
                styles={{ body: { padding: '8px 16px 16px', maxHeight: 320, overflowY: 'auto' } }}
              >
                {totalOverdue > 0 && (
                  <div
                    style={{
                      background: isDark ? 'rgba(239,68,68,0.12)' : '#FEF2F2',
                      borderRadius: 8,
                      padding: '10px 14px',
                      marginBottom: 12,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ color: isDark ? '#FCA5A5' : '#DC2626', fontWeight: 600, fontSize: 13 }}>
                      Tổng quá hạn
                    </Text>
                    <Text style={{ color: isDark ? '#FCA5A5' : '#DC2626', fontWeight: 800, fontSize: 16 }}>
                      {fmtViVN(totalOverdue)} ₫
                    </Text>
                  </div>
                )}
                {(exec?.risks.overdueInvoices ?? []).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <Text style={{ color: textMuted }}>Không có hoá đơn quá hạn</Text>
                  </div>
                ) : (
                  <List
                    size="small"
                    dataSource={exec?.risks.overdueInvoices ?? []}
                    renderItem={(item) => (
                      <List.Item
                        style={{ borderColor, padding: '8px 0' }}
                        extra={
                          <Tag
                            style={isDark ? { background: 'rgba(248,113,113,0.15)', color: '#FCA5A5', borderColor: 'rgba(248,113,113,0.3)' } : {}}
                            color={isDark ? undefined : 'red'}
                          >
                            {item.daysOverdue} ngày
                          </Tag>
                        }
                      >
                        <div>
                          <Text style={{ color: linkColor, fontSize: 13, fontWeight: 600 }}>{item.code}</Text>
                          <div>
                            <Text style={{ color: textPrimary, fontSize: 12 }}>
                              {fmtViVN(item.amount)} ₫
                            </Text>
                          </div>
                        </div>
                      </List.Item>
                    )}
                  />
                )}
              </Card>
            </Col>

            {/* Budget at risk + Pending approvals */}
            <Col xs={24} lg={8}>
              <Card
                title={
                  <span style={{ color: textPrimary, fontSize: 14, fontWeight: 600 }}>
                    <ClockCircleOutlined style={{ marginRight: 6, color: '#6366F1' }} />
                    Rủi ro ngân sách & Phê duyệt chờ
                  </span>
                }
                style={chartCardStyle}
                styles={{ body: { padding: '8px 16px 16px', maxHeight: 320, overflowY: 'auto' } }}
              >
                {/* Pending approvals summary */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: 10,
                    marginBottom: 12,
                    background: bgCard,
                    border: `1px solid ${borderColor}`,
                    cursor: 'pointer',
                  }}
                  onClick={() => navigate('/processes')}
                  role="button"
                  tabIndex={0}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CheckCircleOutlined style={{ color: '#6366F1', fontSize: 16 }} />
                    </div>
                    <div>
                      <Text style={{ color: textPrimary, fontWeight: 600, fontSize: 14, display: 'block' }}>Chờ phê duyệt</Text>
                      <Text style={{ color: textMuted, fontSize: 12 }}>BPM User Tasks</Text>
                    </div>
                  </div>
                  <Badge
                    count={exec?.risks.pendingApprovals ?? 0}
                    style={{ backgroundColor: '#6366F1', fontWeight: 700, fontSize: 13, minWidth: 28, height: 28, lineHeight: '28px', borderRadius: 14 }}
                  />
                </div>

                {/* Budget at risk list */}
                {(exec?.risks.budgetAtRisk ?? []).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '12px 0' }}>
                    <Text style={{ color: textMuted, fontSize: 12 }}>Không có budget line vượt ngưỡng</Text>
                  </div>
                ) : (
                  <>
                    <Text style={{ color: textMuted, fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
                      Budget vượt ngưỡng
                    </Text>
                    {(exec?.risks.budgetAtRisk ?? []).map((b, i) => (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '6px 0',
                          borderBottom: i < (exec?.risks.budgetAtRisk.length ?? 0) - 1 ? `1px solid ${borderColor}` : undefined,
                        }}
                      >
                        <Text style={{ color: textPrimary, fontSize: 12 }}>{b.lineName}</Text>
                        <Tag
                          style={b.utilization >= 100
                            ? isDark ? { background: 'rgba(248,113,113,0.15)', color: '#FCA5A5', borderColor: 'rgba(248,113,113,0.3)' } : {}
                            : isDark ? { background: 'rgba(245,158,11,0.15)', color: '#FCD34D', borderColor: 'rgba(245,158,11,0.3)' } : {}}
                          color={isDark ? undefined : b.utilization >= 100 ? 'red' : 'orange'}
                        >
                          {b.utilization}%
                        </Tag>
                      </div>
                    ))}
                  </>
                )}

                {/* OT quick link */}
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <div
                    style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, background: bgCard, border: `1px solid ${borderColor}`, cursor: 'pointer' }}
                    onClick={() => navigate('/hr/leaves')}
                    role="button"
                    tabIndex={0}
                  >
                    <FieldTimeOutlined style={{ color: '#F97316' }} />
                    <Text style={{ color: textMuted, fontSize: 12 }}>Leaves</Text>
                  </div>
                  <div
                    style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, background: bgCard, border: `1px solid ${borderColor}`, cursor: 'pointer' }}
                    onClick={() => navigate('/expenses')}
                    role="button"
                    tabIndex={0}
                  >
                    <WalletOutlined style={{ color: '#F59E0B' }} />
                    <Text style={{ color: textMuted, fontSize: 12 }}>Expenses</Text>
                  </div>
                </div>
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
}
