import { Row, Col, Card, Typography, Progress, Tag, Skeleton } from 'antd';
import {
  ProjectOutlined,
  FundOutlined,
  CheckCircleOutlined,
  DollarOutlined,
  FieldTimeOutlined,
  ExclamationCircleOutlined,
  UserOutlined,
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
import { FilterBar } from '../../components/FilterBar';
import { formatCompact } from '../../utils/format';

const { Text } = Typography;

// ── API types ──────────────────────────────────────────────────────────────────

interface ProjectSummary {
  activeProjects:   number;
  completedProjects: number;
  totalRevenue:     number;
  grossMarginPct:   number;
  avgUtilization:   number;
  overdueTasks:     number;
}

interface PortfolioItem {
  id:          string;
  name:        string;
  code:        string;
  status:      string;
  revenue:     number;
  cost:        number;
  margin:      number;
  duration:    number;
  actualHours: number;
  memberCount: number;
  progress:    number;
}

interface RevenueVsCostItem {
  month:   string;
  revenue: number;
  cost:    number;
  margin:  number;
}

interface UtilizationItem {
  employeeId:   string;
  employeeName: string;
  employeeCode: string;
  totalHours:   number;
  laborCost:    number;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const STATUS_MAP: Record<string, {
  label:       string;
  lightColor:  string;
  darkBg:      string;
  darkColor:   string;
  darkBorder:  string;
}> = {
  ACTIVE:    { label: 'Đang chạy',  lightColor: 'green',  darkBg: 'rgba(52,211,153,0.15)', darkColor: '#6EE7B7', darkBorder: 'rgba(52,211,153,0.3)' },
  CLOSED:    { label: 'Hoàn thành', lightColor: 'blue',   darkBg: 'rgba(96,165,250,0.15)', darkColor: '#93C5FD', darkBorder: 'rgba(96,165,250,0.3)' },
  ON_HOLD:   { label: 'Tạm dừng',   lightColor: 'orange', darkBg: 'rgba(251,191,36,0.15)', darkColor: '#FCD34D', darkBorder: 'rgba(251,191,36,0.3)' },
  CANCELLED: { label: 'Hủy',        lightColor: 'red',    darkBg: 'rgba(248,113,113,0.15)', darkColor: '#FCA5A5', darkBorder: 'rgba(248,113,113,0.3)' },
};

function MarginBar({ margin }: { margin: number }) {
  const color = margin > 30 ? '#10B981' : margin >= 10 ? '#F59E0B' : '#EF4444';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Progress
        percent={Math.min(Math.max(margin, 0), 100)}
        strokeColor={color}
        showInfo={false}
        style={{ width: 80, marginBottom: 0 }}
        size="small"
      />
      <Text style={{ color, fontWeight: 600, fontSize: 13 }}>{margin}%</Text>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ProjectAnalyticsPage() {
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
  const { data: summary, isLoading: loadingSummary } = useQuery<ProjectSummary>({
    queryKey: ['project-analytics-summary'],
    queryFn: () => axios.get('/api/v1/projects/analytics/summary').then(r => r.data),
    staleTime: 300_000,
  });

  const { data: portfolio = [], isLoading: loadingPortfolio } = useQuery<PortfolioItem[]>({
    queryKey: ['project-analytics-portfolio'],
    queryFn: () => axios.get('/api/v1/projects/analytics/portfolio').then(r => r.data),
    staleTime: 300_000,
  });

  const { data: revenueCost = [], isLoading: loadingRevCost } = useQuery<RevenueVsCostItem[]>({
    queryKey: ['project-analytics-revenue-vs-cost'],
    queryFn: () => axios.get('/api/v1/projects/analytics/revenue-vs-cost?months=12').then(r => r.data),
    staleTime: 300_000,
  });

  const { data: utilization = [], isLoading: loadingUtil } = useQuery<UtilizationItem[]>({
    queryKey: ['project-analytics-utilization'],
    queryFn: () => axios.get('/api/v1/projects/analytics/utilization').then(r => r.data),
    staleTime: 300_000,
  });

  const isLoading = loadingSummary || loadingPortfolio || loadingRevCost || loadingUtil;

  if (isLoading) {
    return <div style={{ padding: 40 }}><Skeleton active /></div>;
  }

  // ── Columns ──
  const columns = [
    {
      title: 'Dự án',
      dataIndex: 'name',
      key: 'name',
      render: (v: string) => <Text style={{ color: textPrimary, fontWeight: 500 }}>{v}</Text>,
    },
    {
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
      render: (v: string) => <Text style={{ color: textMuted, fontSize: 12 }}>{v}</Text>,
    },
    {
      title: 'Tiến độ',
      dataIndex: 'progress',
      key: 'progress',
      render: (v: number) => (
        <Progress
          percent={v}
          size="small"
          strokeColor="#6366F1"
          style={{ width: 100, marginBottom: 0 }}
        />
      ),
    },
    {
      title: 'Doanh thu',
      dataIndex: 'revenue',
      key: 'revenue',
      align: 'right' as const,
      render: (v: number) => <Text style={{ color: textPrimary }}>{formatCompact(v)}</Text>,
    },
    {
      title: 'Chi phí',
      dataIndex: 'cost',
      key: 'cost',
      align: 'right' as const,
      render: (v: number) => <Text style={{ color: textMuted }}>{formatCompact(v)}</Text>,
    },
    {
      title: 'Margin',
      dataIndex: 'margin',
      key: 'margin',
      render: (v: number) => <MarginBar margin={v} />,
    },
    {
      title: 'Nhân sự',
      dataIndex: 'memberCount',
      key: 'memberCount',
      align: 'right' as const,
      render: (v: number) => <Text style={{ color: textMuted }}>{v}</Text>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (v: string) => {
        const cfg = STATUS_MAP[v] ?? STATUS_MAP['ACTIVE'];
        return (
          <Tag
            style={isDark ? { background: cfg.darkBg, color: cfg.darkColor, borderColor: cfg.darkBorder } : {}}
            color={isDark ? undefined : cfg.lightColor}
          >
            {cfg.label}
          </Tag>
        );
      },
    },
  ];


  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Project Analytics"
        icon={<ProjectOutlined />}
        iconColor="#3B82F6"
      />

      <FilterBar>
        {/* Placeholder — có thể thêm filter năm, PM, status khi cần */}
        <></>
      </FilterBar>

      {/* ── StatCards ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={8} lg={4}>
          <StatCard
            label="Dự án đang chạy"
            value={summary?.activeProjects ?? 0}
            color="#6366F1"
            icon={<ProjectOutlined />}
          />
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <StatCard
            label="Đã hoàn thành"
            value={summary?.completedProjects ?? 0}
            color="#10B981"
            icon={<CheckCircleOutlined />}
          />
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <StatCard
            label="Doanh thu YTD"
            value={formatCompact(summary?.totalRevenue)}
            color="#3B82F6"
            icon={<DollarOutlined />}
          />
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <StatCard
            label="Gross Margin"
            value={`${summary?.grossMarginPct ?? 0}%`}
            color="#F97316"
            icon={<FundOutlined />}
          />
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <StatCard
            label="Avg Utilization"
            value={`${summary?.avgUtilization ?? 0}%`}
            color="#8B5CF6"
            icon={<FieldTimeOutlined />}
          />
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <StatCard
            label="Task quá hạn"
            value={summary?.overdueTasks ?? 0}
            color="#EF4444"
            icon={<ExclamationCircleOutlined />}
          />
        </Col>
      </Row>

      {/* ── Revenue vs Cost grouped bar chart ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24}>
          <Card
            title={<Text style={{ color: textPrimary, fontWeight: 600 }}>Revenue vs Cost — 12 tháng gần nhất</Text>}
            style={chartCardStyle}
          >
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={revenueCost}
                margin={{ top: 8, right: 16, left: -8, bottom: 0 }}
                barCategoryGap="25%"
                barGap={4}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="month" tick={{ fill: axisColor, fontSize: 11 }} />
                <YAxis tick={{ fill: axisColor, fontSize: 12 }} tickFormatter={v => formatCompact(v)} />
                <RTooltip
                  contentStyle={{ background: tooltipBg, border: `1px solid ${borderColor}`, borderRadius: 8 }}
                  formatter={(v, name) => [
                    formatCompact(Number(v)) + ' đ',
                    name === 'revenue' ? 'Doanh thu' : name === 'cost' ? 'Chi phí' : 'Margin%',
                  ]}
                />
                <Legend iconType="circle" iconSize={8} />
                <Bar dataKey="revenue" name="Doanh thu" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="cost"    name="Chi phí"   fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* ── Revenue vs Cost line + Portfolio table ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {/* Line chart margin trend */}
        <Col xs={24} lg={10}>
          <Card
            title={<Text style={{ color: textPrimary, fontWeight: 600 }}>Margin trend — 12 tháng</Text>}
            style={{ ...chartCardStyle, height: '100%' }}
          >
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={revenueCost} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="month" tick={{ fill: axisColor, fontSize: 11 }} />
                <YAxis tick={{ fill: axisColor, fontSize: 12 }} tickFormatter={v => `${v}%`} />
                <RTooltip
                  contentStyle={{ background: tooltipBg, border: `1px solid ${borderColor}`, borderRadius: 8 }}
                  formatter={(v) => [`${Number(v)}%`, 'Margin']}
                />
                <Line
                  type="monotone"
                  dataKey="margin"
                  name="Margin%"
                  stroke="#10B981"
                  strokeWidth={2.5}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* Utilization per employee — horizontal bar */}
        <Col xs={24} lg={14}>
          <Card
            title={<Text style={{ color: textPrimary, fontWeight: 600 }}><UserOutlined /> Utilization — Top nhân viên</Text>}
            style={{ ...chartCardStyle, height: '100%' }}
          >
            {utilization.length === 0 ? (
              <Text style={{ color: textMuted }}>Chưa có dữ liệu snapshot</Text>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  layout="vertical"
                  data={utilization.slice(0, 10)}
                  margin={{ top: 8, right: 32, left: 8, bottom: 0 }}
                  barCategoryGap="30%"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fill: axisColor, fontSize: 11 }}
                    tickFormatter={v => `${v}h`}
                  />
                  <YAxis
                    type="category"
                    dataKey="employeeName"
                    tick={{ fill: textMuted, fontSize: 11 }}
                    width={110}
                  />
                  <RTooltip
                    contentStyle={{ background: tooltipBg, border: `1px solid ${borderColor}`, borderRadius: 8 }}
                    formatter={(v, name) => [
                      name === 'totalHours' ? `${Number(v)}h` : formatCompact(Number(v)) + ' đ',
                      name === 'totalHours' ? 'Giờ làm việc' : 'Labor Cost',
                    ]}
                  />
                  <Legend iconType="circle" iconSize={8} />
                  <Bar dataKey="totalHours" name="Giờ làm việc" fill="#6366F1" radius={[0, 4, 4, 0]}>
                    {utilization.slice(0, 10).map((_, i) => (
                      <Cell key={i} fill={i % 2 === 0 ? '#6366F1' : '#8B5CF6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Col>
      </Row>

      {/* ── Project portfolio table ── */}
      <Card
        title={<Text style={{ color: textPrimary, fontWeight: 600 }}>Project Portfolio</Text>}
        style={chartCardStyle}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {columns.map(col => (
                  <th
                    key={col.key}
                    style={{
                      padding: '10px 12px',
                      textAlign: (col as any).align ?? 'left',
                      color: textMuted,
                      fontSize: 12,
                      fontWeight: 600,
                      borderBottom: `1px solid ${borderColor}`,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {col.title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {portfolio.map((row) => (
                <tr key={row.id} style={{ borderBottom: `1px solid ${borderColor}` }}>
                  {columns.map(col => (
                    <td
                      key={col.key}
                      style={{
                        padding: '10px 12px',
                        textAlign: (col as any).align ?? 'left',
                        verticalAlign: 'middle',
                      }}
                    >
                      {(col.render as any)?.(
                        (row as any)[col.dataIndex as string],
                        row,
                      ) ?? (row as any)[col.dataIndex as string]}
                    </td>
                  ))}
                </tr>
              ))}
              {portfolio.length === 0 && (
                <tr>
                  <td
                    colSpan={columns.length}
                    style={{ padding: 24, textAlign: 'center', color: textMuted }}
                  >
                    Không có dữ liệu
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
