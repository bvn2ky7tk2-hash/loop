import { Row, Col, Card, Table, Typography, Progress, Tag } from 'antd';
import {
  ProjectOutlined,
  FundOutlined,
  CheckCircleOutlined,
  PauseCircleOutlined,
  DollarOutlined,
  FieldTimeOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip as RTooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import { useThemePalette } from '../../hooks/useThemePalette';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { SparklineCard } from '../../components/ui/SparklineCard';
import { FilterBar } from '../../components/FilterBar';

const { Text } = Typography;

// TODO: replace with real API call to GET /analytics/projects
const MOCK_STATS = {
  active: 12,
  completed: 38,
  onHold: 4,
  revenueYtd: '4.850.000.000',
  avgUtilization: 78,
  overdueTasks: 23,
};

// TODO: replace with real API call to GET /analytics/projects/revenue-cost?months=6
const MOCK_REVENUE_COST = [
  { month: 'T1', revenue: 820, cost: 640 },
  { month: 'T2', revenue: 910, cost: 700 },
  { month: 'T3', revenue: 780, cost: 590 },
  { month: 'T4', revenue: 1050, cost: 810 },
  { month: 'T5', revenue: 960, cost: 730 },
  { month: 'T6', revenue: 1120, cost: 850 },
];

// TODO: replace with real API call to GET /analytics/projects/task-completion?days=30
const MOCK_TASK_COMPLETION = Array.from({ length: 30 }, (_, i) => ({
  day: `${i + 1}`,
  completed: Math.floor(Math.random() * 18) + 4,
}));

// TODO: replace with real API call to GET /analytics/projects/portfolio
interface PortfolioRow {
  id: string;
  name: string;
  pm: string;
  budget: number;
  cost: number;
  margin: number;
  status: string;
}

const MOCK_PORTFOLIO: PortfolioRow[] = [
  { id: '1', name: 'Loop ERP v5',       pm: 'Nguyễn Minh',   budget: 850, cost: 620, margin: 27, status: 'ACTIVE' },
  { id: '2', name: 'CRM Integration',   pm: 'Trần Hoa',      budget: 320, cost: 210, margin: 34, status: 'ACTIVE' },
  { id: '3', name: 'Mobile App v2',     pm: 'Lê Văn Đức',    budget: 500, cost: 480, margin: 4,  status: 'ON_HOLD' },
  { id: '4', name: 'HR Revamp',         pm: 'Phạm Thu',      budget: 400, cost: 395, margin: 1,  status: 'ON_HOLD' },
  { id: '5', name: 'Finance Analytics', pm: 'Nguyễn Minh',   budget: 280, cost: 165, margin: 41, status: 'ACTIVE' },
  { id: '6', name: 'Portal v3',         pm: 'Hoàng Lan',     budget: 200, cost: 195, margin: 3,  status: 'COMPLETED' },
  { id: '7', name: 'Payroll Engine',    pm: 'Trần Hoa',      budget: 350, cost: 220, margin: 37, status: 'COMPLETED' },
];

const STATUS_MAP: Record<string, { label: string; lightColor: string; darkBg: string; darkColor: string; darkBorder: string }> = {
  ACTIVE:    { label: 'Đang chạy',  lightColor: 'green',  darkBg: 'rgba(52,211,153,0.15)', darkColor: '#6EE7B7', darkBorder: 'rgba(52,211,153,0.3)' },
  COMPLETED: { label: 'Hoàn thành', lightColor: 'blue',   darkBg: 'rgba(96,165,250,0.15)', darkColor: '#93C5FD', darkBorder: 'rgba(96,165,250,0.3)' },
  ON_HOLD:   { label: 'Tạm dừng',   lightColor: 'orange', darkBg: 'rgba(251,191,36,0.15)', darkColor: '#FCD34D', darkBorder: 'rgba(251,191,36,0.3)' },
};

function MarginBar({ margin }: { margin: number }) {
  const color = margin > 30 ? '#10B981' : margin >= 10 ? '#F59E0B' : '#EF4444';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Progress
        percent={Math.min(margin, 100)}
        strokeColor={color}
        showInfo={false}
        style={{ width: 80, marginBottom: 0 }}
        size="small"
      />
      <Text style={{ color, fontWeight: 600, fontSize: 13 }}>{margin}%</Text>
    </div>
  );
}

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

  const columns = [
    {
      title: 'Dự án',
      dataIndex: 'name',
      key: 'name',
      render: (v: string) => <Text style={{ color: textPrimary, fontWeight: 500 }}>{v}</Text>,
    },
    {
      title: 'PM',
      dataIndex: 'pm',
      key: 'pm',
      render: (v: string) => <Text style={{ color: textMuted }}>{v}</Text>,
    },
    {
      title: 'Budget (tr.đ)',
      dataIndex: 'budget',
      key: 'budget',
      align: 'right' as const,
      render: (v: number) => <Text style={{ color: textPrimary }}>{v.toLocaleString('vi-VN')}</Text>,
    },
    {
      title: 'Cost (tr.đ)',
      dataIndex: 'cost',
      key: 'cost',
      align: 'right' as const,
      render: (v: number) => <Text style={{ color: textMuted }}>{v.toLocaleString('vi-VN')}</Text>,
    },
    {
      title: 'Margin%',
      dataIndex: 'margin',
      key: 'margin',
      render: (v: number) => <MarginBar margin={v} />,
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
        {/* TODO: thêm filter theo năm, PM, trạng thái khi kết nối API thực */}
      </FilterBar>

      {/* ── StatCards ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={8} lg={4}>
          <StatCard
            label="Dự án đang chạy"
            value={MOCK_STATS.active}
            color="#6366F1"
            icon={<ProjectOutlined />}
          />
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <StatCard
            label="Đã hoàn thành"
            value={MOCK_STATS.completed}
            color="#10B981"
            icon={<CheckCircleOutlined />}
          />
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <StatCard
            label="Tạm dừng"
            value={MOCK_STATS.onHold}
            color="#F59E0B"
            icon={<PauseCircleOutlined />}
          />
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <StatCard
            label="Doanh thu YTD"
            value={MOCK_STATS.revenueYtd}
            color="#3B82F6"
            icon={<DollarOutlined />}
          />
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <StatCard
            label="Avg Utilization"
            value={`${MOCK_STATS.avgUtilization}%`}
            color="#F97316"
            icon={<FieldTimeOutlined />}
          />
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <StatCard
            label="Task quá hạn"
            value={MOCK_STATS.overdueTasks}
            color="#EF4444"
            icon={<ExclamationCircleOutlined />}
          />
        </Col>
      </Row>

      {/* ── Charts row ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {/* SparklineCard: Revenue vs Cost 6 tháng */}
        <Col xs={24} lg={12}>
          <SparklineCard
            label="Revenue vs Cost"
            value="6 tháng"
            color="#3B82F6"
            filled
            icon={<FundOutlined />}
            data={MOCK_REVENUE_COST.map(d => ({ day: d.month, value: d.revenue }))}
            variant="line"
            style={{ height: '100%' }}
          />
          {/* TODO: upgrade SparklineCard dual-line khi có requirement — hiện tại hiển thị revenue line */}
        </Col>

        {/* BarChart: Task completion rate 30 ngày */}
        <Col xs={24} lg={12}>
          <Card title={<Text style={{ color: textPrimary, fontWeight: 600 }}>Task hoàn thành — 30 ngày qua</Text>} style={chartCardStyle}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={MOCK_TASK_COMPLETION} margin={{ top: 8, right: 12, left: -16, bottom: 0 }} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis
                  dataKey="day"
                  tick={{ fill: axisColor, fontSize: 10 }}
                  interval={4}
                  tickLine={false}
                />
                <YAxis tick={{ fill: axisColor, fontSize: 12 }} />
                <RTooltip
                  contentStyle={{ background: tooltipBg, border: `1px solid ${borderColor}`, borderRadius: 8 }}
                  formatter={(v: number) => [v, 'Tasks hoàn thành']}
                />
                <Bar dataKey="completed" name="Hoàn thành" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* ── Revenue vs Cost dual-line chart ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24}>
          <Card title={<Text style={{ color: textPrimary, fontWeight: 600 }}>Revenue vs Cost — 6 tháng (chi tiết)</Text>} style={chartCardStyle}>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={MOCK_REVENUE_COST} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="month" tick={{ fill: axisColor, fontSize: 12 }} />
                <YAxis tick={{ fill: axisColor, fontSize: 12 }} tickFormatter={v => `${v}M`} />
                <RTooltip
                  contentStyle={{ background: tooltipBg, border: `1px solid ${borderColor}`, borderRadius: 8 }}
                  formatter={(v: number, name: string) => [`${v}M ₫`, name === 'revenue' ? 'Doanh thu' : 'Chi phí']}
                />
                <Legend iconType="circle" iconSize={8} />
                <Line type="monotone" dataKey="revenue" name="Doanh thu" stroke="#3B82F6" strokeWidth={2.5} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="cost"    name="Chi phí"   stroke="#EF4444" strokeWidth={2.5} dot={{ r: 4 }} strokeDasharray="5 3" />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* ── Project portfolio table ── */}
      <Card
        title={<Text style={{ color: textPrimary, fontWeight: 600 }}>Project Portfolio</Text>}
        style={chartCardStyle}
      >
        {/* TODO: kết nối GET /analytics/projects/portfolio?page=1&limit=50 */}
        <Table
          rowKey="id"
          dataSource={MOCK_PORTFOLIO}
          columns={columns}
          pagination={false}
          size="middle"
          scroll={{ x: 700 }}
        />
      </Card>
    </div>
  );
}
