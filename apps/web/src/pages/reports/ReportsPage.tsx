import { useState } from 'react';
import {
  Row, Col, Card, Table, Typography, Select, Tabs, Space,
  Form, DatePicker, Button, App, Divider,
} from 'antd';
import { DownloadOutlined, ClockCircleOutlined, CheckCircleOutlined, BugOutlined, TeamOutlined, ShopOutlined, UsergroupAddOutlined, LaptopOutlined } from '@ant-design/icons';
import { SparklineCard } from '../../components/ui/SparklineCard';
import type { ReportType } from '../../api/reports';
import { ProgressRing } from '../../components/ui/ProgressRing';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip as RTooltip,
  ResponsiveContainer, CartesianGrid, Legend, PieChart, Pie, Cell,
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '../../api/reports';
import { projectsApi } from '../../api/projects';
import { useThemeStore } from '../../store/theme.store';
import { useGetDeals } from '../../api/crm';
import { useGetCandidates, useGetJobs } from '../../api/recruit';
import { useGetAssets } from '../../api/assets';
import dayjs from 'dayjs';

const { Text } = Typography;

const LEVEL_BADGE: Record<string, { bg: string; color: string }> = {
  JUNIOR:  { bg: '#ECFDF5', color: '#065F46' },
  MID:     { bg: '#EEF2FF', color: '#4338CA' },
  SENIOR:  { bg: '#FFFBEB', color: '#92400E' },
  EXPERT:  { bg: '#FEF2F2', color: '#991B1B' },
};

// ─── Phase 3 Report Tabs ──────────────────────────────────────────────────────

interface ChartProps {
  axisColor: string;
  gridColor: string;
  tooltipBg: string;
  primary: string;
  chartCardStyle: React.CSSProperties;
}

const DEAL_STAGE_COLORS: Record<string, string> = {
  QUALIFICATION: '#6366F1', PROPOSAL: '#3B82F6', NEGOTIATION: '#F59E0B', WON: '#10B981', LOST: '#EF4444',
};

const CANDIDATE_STAGE_COLORS: Record<string, string> = {
  APPLIED: '#94A3B8', SCREENING: '#6366F1', INTERVIEW: '#3B82F6', OFFER: '#F59E0B', HIRED: '#10B981', REJECTED: '#EF4444',
};

function CrmReportTab({ axisColor, gridColor, tooltipBg, primary, chartCardStyle }: ChartProps) {
  const { data: dealsData } = useGetDeals({ limit: 500 });
  const deals = dealsData?.data ?? [];

  const stageCounts = Object.entries(
    deals.reduce((acc, d) => { acc[d.stage] = (acc[d.stage] ?? 0) + 1; return acc; }, {} as Record<string, number>)
  ).map(([stage, count]) => ({ stage, count }));

  const monthlyWon = deals
    .filter(d => d.stage === 'WON' && d.wonAt)
    .reduce((acc, d) => {
      const m = dayjs(d.wonAt!).format('MM/YYYY');
      acc[m] = (acc[m] ?? 0) + Number(d.value ?? 0);
      return acc;
    }, {} as Record<string, number>);
  const monthlyWonData = Object.entries(monthlyWon).slice(-6).map(([month, value]) => ({ month, value }));

  const total = deals.length || 1;
  const won   = deals.filter(d => d.stage === 'WON').length;
  const lost  = deals.filter(d => d.stage === 'LOST').length;

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} md={8}>
        <Card title="Win / Lose Ratio" style={chartCardStyle}>
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: 36, fontWeight: 700, color: '#10B981' }}>{Math.round(won / total * 100)}%</div>
            <div style={{ color: axisColor }}>Win rate</div>
            <div style={{ marginTop: 8 }}>
              <span style={{ color: '#10B981', marginRight: 16 }}>✓ Won: {won}</span>
              <span style={{ color: '#EF4444' }}>✗ Lost: {lost}</span>
            </div>
          </div>
        </Card>
      </Col>
      <Col xs={24} md={16}>
        <Card title="Deal funnel theo stage" style={chartCardStyle}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stageCounts} layout="vertical" margin={{ left: 80, right: 20 }}>
              <XAxis type="number" tick={{ fill: axisColor, fontSize: 12 }} />
              <YAxis type="category" dataKey="stage" tick={{ fill: axisColor, fontSize: 12 }} />
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
              <RTooltip contentStyle={{ background: tooltipBg, border: '1px solid #333' }} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {stageCounts.map(s => <Cell key={s.stage} fill={DEAL_STAGE_COLORS[s.stage] ?? primary} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </Col>
      <Col xs={24}>
        <Card title="Deal value WON theo tháng (6 tháng gần nhất)" style={chartCardStyle}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyWonData} margin={{ top: 8, right: 20, left: 16, bottom: 0 }}>
              <XAxis dataKey="month" tick={{ fill: axisColor, fontSize: 12 }} />
              <YAxis tick={{ fill: axisColor, fontSize: 12 }} tickFormatter={(v: number) => v >= 1e9 ? `${(v/1e9).toFixed(1)}B` : v >= 1e6 ? `${(v/1e6).toFixed(0)}M` : String(v)} />
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <RTooltip formatter={(v: number) => [new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v), 'Value']} contentStyle={{ background: tooltipBg, border: '1px solid #333' }} />
              <Bar dataKey="value" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </Col>
    </Row>
  );
}

function RecruitmentReportTab({ axisColor, gridColor, tooltipBg, primary, chartCardStyle }: ChartProps) {
  const { data: candidatesData } = useGetCandidates({ limit: 500 });
  const { data: jobsData }       = useGetJobs({ limit: 200 });
  const candidates = candidatesData?.data ?? [];
  const jobs       = jobsData?.data ?? [];

  const stageCounts = Object.entries(
    candidates.reduce((acc, c) => { acc[c.stage] = (acc[c.stage] ?? 0) + 1; return acc; }, {} as Record<string, number>)
  ).map(([stage, count]) => ({ stage, count }));

  const openJobs    = jobs.filter(j => j.status === 'OPEN').length;
  const totalHC     = jobs.reduce((s, j) => s + (j.headcount ?? 0), 0);
  const hired       = candidates.filter(c => c.stage === 'HIRED').length;

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} md={8}>
        <Card title="Tổng quan tuyển dụng" style={chartCardStyle}>
          <div style={{ padding: '12px 0' }}>
            {[
              { label: 'Vị trí đang mở', value: openJobs, color: primary },
              { label: 'Tổng chỉ tiêu', value: totalHC, color: '#6366F1' },
              { label: 'Đã tuyển', value: hired, color: '#10B981' },
              { label: 'Tổng ứng viên', value: candidates.length, color: '#F59E0B' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ color: axisColor }}>{item.label}</span>
                <span style={{ fontWeight: 700, fontSize: 18, color: item.color }}>{item.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </Col>
      <Col xs={24} md={16}>
        <Card title="Ứng viên theo stage" style={chartCardStyle}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stageCounts} layout="vertical" margin={{ left: 80, right: 20 }}>
              <XAxis type="number" tick={{ fill: axisColor, fontSize: 12 }} />
              <YAxis type="category" dataKey="stage" tick={{ fill: axisColor, fontSize: 12 }} />
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
              <RTooltip contentStyle={{ background: tooltipBg, border: '1px solid #333' }} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {stageCounts.map(s => <Cell key={s.stage} fill={CANDIDATE_STAGE_COLORS[s.stage] ?? primary} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </Col>
    </Row>
  );
}

function AssetReportTab({ axisColor, gridColor, tooltipBg, primary, chartCardStyle }: ChartProps) {
  const { data: assetsData } = useGetAssets({ limit: 500 });
  const assets = assetsData?.data ?? [];

  const byCategory = Object.entries(
    assets.reduce((acc, a) => { acc[a.category] = (acc[a.category] ?? 0) + 1; return acc; }, {} as Record<string, number>)
  ).map(([category, count]) => ({ category, count }));

  const byStatus = Object.entries(
    assets.reduce((acc, a) => { acc[a.status] = (acc[a.status] ?? 0) + 1; return acc; }, {} as Record<string, number>)
  ).map(([status, count]) => ({ status, count }));

  const totalValue = assets.reduce((s, a) => s + Number(a.purchasePrice ?? 0), 0);
  const deprecEst  = assets.reduce((a, asset) => {
    const years = asset.depreciationYears ?? 5;
    return a + Number(asset.purchasePrice ?? 0) / years;
  }, 0);

  const STATUS_COLORS: Record<string, string> = {
    AVAILABLE: '#10B981', ASSIGNED: '#3B82F6', UNDER_MAINTENANCE: '#F59E0B', RETIRED: '#94A3B8',
  };

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} md={8}>
        <Card title="Tổng quan tài sản" style={chartCardStyle}>
          <div style={{ padding: '12px 0' }}>
            {[
              { label: 'Tổng tài sản', value: assets.length, color: primary },
              { label: 'Tổng giá trị mua', value: totalValue.toLocaleString('vi-VN') + ' ₫', color: '#10B981' },
              { label: 'Khấu hao ước tính/năm', value: deprecEst.toLocaleString('vi-VN', { maximumFractionDigits: 0 }) + ' ₫', color: '#F59E0B' },
            ].map(item => (
              <div key={item.label} style={{ marginBottom: 12 }}>
                <div style={{ color: axisColor, fontSize: 12 }}>{item.label}</div>
                <div style={{ fontWeight: 700, color: item.color }}>{item.value}</div>
              </div>
            ))}
          </div>
        </Card>
      </Col>
      <Col xs={24} md={8}>
        <Card title="Số lượng theo danh mục" style={chartCardStyle}>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={byCategory} dataKey="count" nameKey="category" cx="50%" cy="50%" outerRadius={70} label={({ category, count }) => `${category}:${count}`}>
                {byCategory.map((_, i) => <Cell key={i} fill={[primary, '#6366F1', '#F59E0B', '#10B981', '#EF4444', '#3B82F6', '#8B5CF6', '#EC4899', '#0EA5E9'][i % 9]} />)}
              </Pie>
              <RTooltip contentStyle={{ background: tooltipBg, border: '1px solid #333' }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </Col>
      <Col xs={24} md={8}>
        <Card title="Theo trạng thái" style={chartCardStyle}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={byStatus} layout="vertical" margin={{ left: 120, right: 16 }}>
              <XAxis type="number" tick={{ fill: axisColor, fontSize: 11 }} />
              <YAxis type="category" dataKey="status" tick={{ fill: axisColor, fontSize: 11 }} width={110} />
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
              <RTooltip contentStyle={{ background: tooltipBg, border: '1px solid #333' }} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {byStatus.map(s => <Cell key={s.status} fill={STATUS_COLORS[s.status] ?? primary} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </Col>
    </Row>
  );
}

export default function ReportsPage() {
  const { message } = App.useApp();
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportForm] = Form.useForm<{ reportType: ReportType; dateRange: [import('dayjs').Dayjs, import('dayjs').Dayjs] }>();
  const { mode, preset } = useThemeStore();
  const isDark = mode === 'dark';
  const primary = preset.primary;
  const chartCardStyle = {
    borderRadius: 12,
    background: isDark ? '#1E293B' : `${primary}09`,
    border: `1px solid ${isDark ? '#334155' : `${primary}28`}`,
  };
  const axisColor = isDark ? '#888' : '#555';
  const gridColor = isDark ? '#333' : '#f0f0f0';
  const tooltipBg = isDark ? '#1f1f1f' : '#fff';

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.list,
  });

  const { data: topEmployees = [] } = useQuery({
    queryKey: ['reports-top-employees'],
    queryFn: () => reportsApi.topEmployees(15),
  });

  const { data: monthlyHours = [] } = useQuery({
    queryKey: ['reports-monthly-hours'],
    queryFn: () => reportsApi.monthlyHours(6),
  });

  const { data: orgSummary = [] } = useQuery({
    queryKey: ['reports-org-summary'],
    queryFn: reportsApi.orgSummary,
  });

  const { data: burndown } = useQuery({
    queryKey: ['reports-burndown', selectedProject],
    queryFn: () => reportsApi.projectBurndown(selectedProject!),
    enabled: !!selectedProject,
  });

  const { data: bugStats } = useQuery({
    queryKey: ['bug-stats'],
    queryFn: reportsApi.bugStats,
  });

  const { data: hrStats } = useQuery({
    queryKey: ['hr-stats'],
    queryFn: reportsApi.hrStats,
  });

  const SEVERITY_COLORS: Record<string, string> = {
    CRITICAL: '#EF4444',
    HIGH:     '#F97316',
    MEDIUM:   '#EAB308',
    LOW:      '#22C55E',
  };

  const SEVERITY_LABEL: Record<string, string> = {
    CRITICAL: 'Critical',
    HIGH:     'High',
    MEDIUM:   'Medium',
    LOW:      'Low',
  };

  const BUG_STATUS_LABEL: Record<string, string> = {
    OPEN:        'Open',
    IN_PROGRESS: 'In Progress',
    RESOLVED:    'Resolved',
    CLOSED:      'Closed',
  };

  const BUG_STATUS_COLOR: Record<string, string> = {
    OPEN:        '#EF4444',
    IN_PROGRESS: '#F97316',
    RESOLVED:    '#10B981',
    CLOSED:      '#6B7280',
  };

  const LEAVE_STATUS_COLOR: Record<string, string> = {
    PENDING:  '#F59E0B',
    APPROVED: '#10B981',
    REJECTED: '#EF4444',
  };

  const EXPENSE_STATUS_COLOR: Record<string, string> = {
    PENDING:  '#F59E0B',
    APPROVED: '#10B981',
    REJECTED: '#EF4444',
    PAID:     '#4F46E5',
  };

  const topEmployeeColumns = [
    { title: 'STT', render: (_: unknown, __: unknown, i: number) => i + 1, width: 50 },
    { title: 'Mã', dataIndex: 'code', width: 80 },
    { title: 'Tên', dataIndex: 'name' },
    {
      title: 'Cấp độ', dataIndex: 'level', width: 80,
      render: (v: string) => {
        const cfg = LEVEL_BADGE[v] ?? { bg: '#F1F5F9', color: '#475569' };
        return <span style={{ fontSize: 11, fontWeight: 600, borderRadius: 9999, padding: '2px 8px', background: cfg.bg, color: cfg.color }}>{v}</span>;
      },
    },
    { title: 'Đơn vị', dataIndex: 'orgUnit', ellipsis: true },
    {
      title: 'Tổng giờ', dataIndex: 'totalHours', width: 100,
      render: (v: number) => <Text strong>{v}h</Text>,
      sorter: (a: { totalHours: number }, b: { totalHours: number }) => a.totalHours - b.totalHours,
      defaultSortOrder: 'descend' as const,
    },
  ];

  const orgColumns = [
    { title: 'Đơn vị', dataIndex: 'name' },
    { title: 'Mã', dataIndex: 'code', width: 80 },
    { title: 'Nhân sự', dataIndex: 'employeeCount', width: 90, render: (v: number) => <span style={{ fontSize: 12, fontWeight: 700, color: '#4338CA' }}>{v}</span> },
    { title: 'Dự án', dataIndex: 'projectCount', width: 80, render: (v: number) => <span style={{ fontSize: 12, fontWeight: 700, color: '#6D28D9' }}>{v}</span> },
  ];

  const monthlyChartData = monthlyHours.map((m) => ({
    month: dayjs(m.month + '-01').format('MM/YYYY'),
    hours: m.totalHours,
  }));

  const topBarData = topEmployees.slice(0, 10).map((e) => ({
    name: e.name.split(' ').slice(-2).join(' '),
    hours: e.totalHours,
    level: e.level,
  }));

  return (
    <div className="page-wrapper">
      <div className="page-header" style={{ marginBottom: 20 }}>
        <h1 className="page-title">Reports</h1>
      </div>

      <Tabs
        items={[
          {
            key: 'hours',
            label: 'Giờ làm việc',
            children: (
              <Row gutter={[16, 16]}>
                <Col xs={24} lg={14}>
                  <Card title="Top 10 nhân sự theo tổng giờ" style={chartCardStyle}>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={topBarData} layout="vertical" margin={{ left: 60, right: 20 }}>
                        <XAxis type="number" tick={{ fill: axisColor, fontSize: 12 }} />
                        <YAxis type="category" dataKey="name" tick={{ fill: axisColor, fontSize: 12 }} width={90} />
                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                        <RTooltip
                          formatter={(v: any) => [`${v}h`, 'Tổng giờ']}
                          contentStyle={{ background: tooltipBg, border: '1px solid #333' }}
                        />
                        <Bar dataKey="hours" fill="#4F46E5" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>
                </Col>
                <Col xs={24} lg={10}>
                  <Card title="Giờ làm theo tháng (6 tháng gần nhất)" style={chartCardStyle}>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={monthlyChartData} margin={{ top: 8, right: 20, left: -16, bottom: 0 }}>
                        <XAxis dataKey="month" tick={{ fill: axisColor, fontSize: 12 }} />
                        <YAxis tick={{ fill: axisColor, fontSize: 12 }} />
                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                        <RTooltip
                          formatter={(v: any) => [`${v}h`, 'Giờ làm']}
                          contentStyle={{ background: tooltipBg, border: '1px solid #333' }}
                        />
                        <Line type="monotone" dataKey="hours" stroke="#10B981" strokeWidth={2} dot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </Card>
                </Col>
                <Col xs={24}>
                  <Card title="Danh sách top nhân sự" style={chartCardStyle}>
                    <Table
                      dataSource={topEmployees}
                      columns={topEmployeeColumns}
                      rowKey="userId"
                      size="small"
                      pagination={false}
                    />
                  </Card>
                </Col>
              </Row>
            ),
          },
          {
            key: 'burndown',
            label: 'Tiến độ dự án',
            children: (
              <Row gutter={[16, 16]}>
                <Col xs={24}>
                  <Card>
                    <Space>
                      <Text>Chọn dự án:</Text>
                      <Select
                        style={{ width: 320 }}
                        placeholder="Chọn dự án để xem burndown..."
                        onChange={setSelectedProject}
                        showSearch={{ optionFilterProp: 'label' }}
                        options={projects.map((p) => ({ value: p.id, label: `${p.code} — ${p.name}` }))}
                      />
                    </Space>
                  </Card>
                </Col>

                {burndown && (
                  <>
                    <Col xs={24} lg={6}>
                      <SparklineCard
                        label="Giờ ước tính"
                        value={burndown.summary.totalEstimate}
                        unit="h"
                        color={primary}
                        icon={<ClockCircleOutlined />}
                        filled
                      />
                    </Col>
                    <Col xs={24} lg={6}>
                      <SparklineCard
                        label="Giờ thực tế"
                        value={burndown.summary.totalActual}
                        unit="h"
                        color={burndown.summary.totalActual > burndown.summary.totalEstimate ? '#EF4444' : '#10B981'}
                        icon={<ClockCircleOutlined />}
                        filled
                      />
                    </Col>
                    <Col xs={24} lg={6}>
                      <SparklineCard
                        label="Giờ đã hoàn thành"
                        value={burndown.summary.doneEstimate}
                        unit="h"
                        color="#4F46E5"
                        icon={<CheckCircleOutlined />}
                        filled
                      />
                    </Col>
                    <Col xs={24} lg={6}>
                      <Card style={chartCardStyle}>
                        <div style={{ marginBottom: 8 }}>
                          <Text type="secondary">Tiến độ tổng thể</Text>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 4 }}>
                          <ProgressRing percent={burndown.summary.progress} size="md" />
                        </div>
                      </Card>
                    </Col>
                    <Col xs={24}>
                      <Card title={`Cumulative hours — ${burndown.project.name}`} style={chartCardStyle}>
                        <ResponsiveContainer width="100%" height={320}>
                          <LineChart data={burndown.burndown} margin={{ top: 8, right: 20, left: -8, bottom: 0 }}>
                            <XAxis
                              dataKey="date"
                              tick={{ fill: axisColor, fontSize: 11 }}
                              tickFormatter={(v) => dayjs(v).format('DD/MM')}
                            />
                            <YAxis tick={{ fill: axisColor, fontSize: 12 }} />
                            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                            <RTooltip
                              labelFormatter={(v) => dayjs(v).format('DD/MM/YYYY')}
                              formatter={(v: any, name: any) => [`${v}h`, name === 'cumulativeHours' ? 'Tích lũy' : 'Trong ngày']}
                              contentStyle={{ background: tooltipBg, border: '1px solid #333' }}
                            />
                            <Legend formatter={(v) => v === 'cumulativeHours' ? 'Giờ tích lũy' : 'Giờ trong ngày'} />
                            <Bar dataKey="dailyHours" fill="#4F46E5" opacity={0.4} />
                            <Line type="monotone" dataKey="cumulativeHours" stroke="#10B981" strokeWidth={2} dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </Card>
                    </Col>
                  </>
                )}
              </Row>
            ),
          },
          {
            key: 'org',
            label: 'Theo đơn vị',
            children: (
              <Row gutter={[16, 16]}>
                <Col xs={24} lg={14}>
                  <Card title="Biểu đồ nhân sự theo đơn vị" style={chartCardStyle}>
                    <ResponsiveContainer width="100%" height={320}>
                      <BarChart
                        data={orgSummary.filter((o) => o.employeeCount > 0)}
                        margin={{ top: 8, right: 16, left: -16, bottom: 60 }}
                      >
                        <XAxis
                          dataKey="code"
                          tick={{ fill: axisColor, fontSize: 12 }}
                          angle={-30}
                          textAnchor="end"
                          interval={0}
                        />
                        <YAxis tick={{ fill: axisColor, fontSize: 12 }} />
                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                        <RTooltip
                          formatter={(v: any, name: any) => [v, name === 'employeeCount' ? 'Nhân sự' : 'Dự án']}
                          contentStyle={{ background: tooltipBg, border: '1px solid #333' }}
                        />
                        <Legend formatter={(v) => v === 'employeeCount' ? 'Nhân sự' : 'Dự án'} />
                        <Bar dataKey="employeeCount" fill="#4F46E5" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="projectCount" fill="#722ed1" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>
                </Col>
                <Col xs={24} lg={10}>
                  <Card title="Chi tiết theo đơn vị" style={chartCardStyle}>
                    <Table
                      dataSource={orgSummary}
                      columns={orgColumns}
                      rowKey="id"
                      size="small"
                      pagination={false}
                    />
                  </Card>
                </Col>
              </Row>
            ),
          },
          {
            key: 'bug-stats',
            label: <span><BugOutlined style={{ marginRight: 4 }} />Bug Statistics</span>,
            children: (
              <Row gutter={[16, 16]}>
                {/* Row 1: Status summary cards */}
                {(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const).map((status) => {
                  const count = bugStats?.byStatus.find((s) => s.status === status)?.count ?? 0;
                  return (
                    <Col xs={24} sm={12} lg={6} key={status}>
                      <SparklineCard
                        label={BUG_STATUS_LABEL[status]}
                        value={count}
                        color={BUG_STATUS_COLOR[status]}
                        filled
                      />
                    </Col>
                  );
                })}

                {/* Row 2 col 6: Pie chart by severity */}
                <Col xs={24} lg={6}>
                  <Card title="By Severity" style={chartCardStyle}>
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie
                          data={(bugStats?.bySeverity ?? []).map((s) => ({
                            name: SEVERITY_LABEL[s.severity] ?? s.severity,
                            value: s.count,
                            fill: SEVERITY_COLORS[s.severity] ?? '#94A3B8',
                          }))}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          label={({ name, percent }) => `${name} ${Math.round((percent ?? 0) * 100)}%`}
                          labelLine={false}
                        >
                          {(bugStats?.bySeverity ?? []).map((s) => (
                            <Cell
                              key={s.severity}
                              fill={SEVERITY_COLORS[s.severity] ?? '#94A3B8'}
                            />
                          ))}
                        </Pie>
                        <RTooltip
                          formatter={(v: any, name: any) => [v, name]}
                          contentStyle={{ background: tooltipBg, border: '1px solid #333' }}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </Card>
                </Col>

                {/* Row 2 col 18: Horizontal bar by project */}
                <Col xs={24} lg={18}>
                  <Card title="Top Projects by Bug Count" style={chartCardStyle}>
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart
                        data={(bugStats?.byProject ?? []).slice(0, 8).map((p) => ({
                          name: p.projectCode,
                          fullName: p.projectName,
                          count: p.count,
                        }))}
                        layout="vertical"
                        margin={{ left: 20, right: 20 }}
                      >
                        <XAxis type="number" tick={{ fill: axisColor, fontSize: 12 }} />
                        <YAxis type="category" dataKey="name" tick={{ fill: axisColor, fontSize: 12 }} width={70} />
                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                        <RTooltip
                          formatter={(v: any, _name: any, props: any) => [v, props.payload?.fullName ?? '']}
                          contentStyle={{ background: tooltipBg, border: '1px solid #333' }}
                        />
                        <Bar dataKey="count" fill={primary} radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>
                </Col>

                {/* Row 3: Monthly trend */}
                <Col xs={24}>
                  <Card title="Monthly Bug Trend (6 months)" style={chartCardStyle}>
                    <ResponsiveContainer width="100%" height={240}>
                      <LineChart
                        data={(bugStats?.monthlyTrend ?? []).map((m) => ({
                          month: dayjs(m.month + '-01').format('MM/YYYY'),
                          count: m.count,
                        }))}
                        margin={{ top: 8, right: 20, left: -16, bottom: 0 }}
                      >
                        <XAxis dataKey="month" tick={{ fill: axisColor, fontSize: 12 }} />
                        <YAxis tick={{ fill: axisColor, fontSize: 12 }} />
                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                        <RTooltip
                          formatter={(v: any) => [v, 'Bugs']}
                          contentStyle={{ background: tooltipBg, border: '1px solid #333' }}
                        />
                        <Line type="monotone" dataKey="count" stroke="#EF4444" strokeWidth={2} dot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </Card>
                </Col>
              </Row>
            ),
          },
          {
            key: 'hr-stats',
            label: <span><TeamOutlined style={{ marginRight: 4 }} />HR Stats</span>,
            children: (
              <Row gutter={[16, 16]}>
                {/* Leave section */}
                <Col xs={24}>
                  <Text strong style={{ fontSize: 15, color: isDark ? '#F1F5F9' : '#0F172A' }}>Leave Requests</Text>
                </Col>

                {/* Leave status cards */}
                {(['PENDING', 'APPROVED', 'REJECTED'] as const).map((status) => {
                  const count = hrStats?.leave.byStatus.find((s) => s.status === status)?.count ?? 0;
                  return (
                    <Col xs={24} sm={8} key={`leave-${status}`}>
                      <SparklineCard
                        label={`Leave — ${status.charAt(0) + status.slice(1).toLowerCase()}`}
                        value={count}
                        color={LEAVE_STATUS_COLOR[status]}
                        filled
                      />
                    </Col>
                  );
                })}

                {/* Leave by type bar chart */}
                <Col xs={24}>
                  <Card title="Leave by Type" style={chartCardStyle}>
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart
                        data={(hrStats?.leave.byType ?? []).map((t) => ({
                          name: t.typeName,
                          count: t.count,
                          fill: t.color || primary,
                        }))}
                        margin={{ top: 8, right: 20, left: -8, bottom: 0 }}
                      >
                        <XAxis dataKey="name" tick={{ fill: axisColor, fontSize: 12 }} />
                        <YAxis tick={{ fill: axisColor, fontSize: 12 }} />
                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                        <RTooltip
                          formatter={(v: any) => [v, 'Requests']}
                          contentStyle={{ background: tooltipBg, border: '1px solid #333' }}
                        />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                          {(hrStats?.leave.byType ?? []).map((t) => (
                            <Cell key={t.typeId} fill={t.color || primary} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>
                </Col>

                {/* Expense section divider */}
                <Col xs={24}>
                  <Divider style={{ borderColor: isDark ? '#334155' : '#E2E8F0', margin: '4px 0 8px' }} />
                  <Text strong style={{ fontSize: 15, color: isDark ? '#F1F5F9' : '#0F172A' }}>Expense Claims</Text>
                </Col>

                {/* Expense status cards */}
                {(['PENDING', 'APPROVED', 'REJECTED', 'PAID'] as const).map((status) => {
                  const count = hrStats?.expense.byStatus.find((s) => s.status === status)?.count ?? 0;
                  return (
                    <Col xs={24} sm={12} lg={6} key={`expense-${status}`}>
                      <SparklineCard
                        label={`Expense — ${status.charAt(0) + status.slice(1).toLowerCase()}`}
                        value={count}
                        color={EXPENSE_STATUS_COLOR[status]}
                        filled
                      />
                    </Col>
                  );
                })}

                {/* Expense by category bar chart (totalAmount) */}
                <Col xs={24}>
                  <Card title="Expense by Category (Total Amount)" style={chartCardStyle}>
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart
                        data={(hrStats?.expense.byCategory ?? []).map((c) => ({
                          name: c.category,
                          amount: c.totalAmount,
                        }))}
                        margin={{ top: 8, right: 20, left: 16, bottom: 0 }}
                      >
                        <XAxis dataKey="name" tick={{ fill: axisColor, fontSize: 12 }} />
                        <YAxis
                          tick={{ fill: axisColor, fontSize: 12 }}
                          tickFormatter={(v: number) =>
                            v >= 1_000_000
                              ? `${Math.round(v / 100_000) / 10}M`
                              : v >= 1_000
                              ? `${Math.round(v / 1_000)}K`
                              : String(v)
                          }
                        />
                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                        <RTooltip
                          formatter={(v: any) => [
                            new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v),
                            'Total',
                          ]}
                          contentStyle={{ background: tooltipBg, border: '1px solid #333' }}
                        />
                        <Bar dataKey="amount" fill={primary} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>
                </Col>
              </Row>
            ),
          },
          {
            key: 'crm-report',
            label: <><ShopOutlined /> CRM</>,
            children: <CrmReportTab axisColor={axisColor} gridColor={gridColor} tooltipBg={tooltipBg} primary={primary} chartCardStyle={chartCardStyle} />,
          },
          {
            key: 'recruitment-report',
            label: <><UsergroupAddOutlined /> Recruitment</>,
            children: <RecruitmentReportTab axisColor={axisColor} gridColor={gridColor} tooltipBg={tooltipBg} primary={primary} chartCardStyle={chartCardStyle} />,
          },
          {
            key: 'asset-report',
            label: <><LaptopOutlined /> Assets</>,
            children: <AssetReportTab axisColor={axisColor} gridColor={gridColor} tooltipBg={tooltipBg} primary={primary} chartCardStyle={chartCardStyle} />,
          },
        ]}
      />

      {/* ── Export Section (Story 8.3) ───────────────────────────────────────── */}
      <Card
        title={<><DownloadOutlined style={{ marginRight: 8 }} />Xuất báo cáo Excel</>}
        style={{ marginTop: 24, ...chartCardStyle }}
      >
        <Form
          form={exportForm}
          layout="inline"
          initialValues={{
            reportType: 'PROJECT_COST' as ReportType,
            dateRange: [dayjs().subtract(1, 'month').startOf('month'), dayjs().endOf('month')],
          }}
          onFinish={async (values) => {
            setExportLoading(true);
            try {
              await reportsApi.generate({
                reportType: values.reportType,
                startDate: values.dateRange[0].format('YYYY-MM-DD'),
                endDate:   values.dateRange[1].format('YYYY-MM-DD'),
              });
              void message.success('Tải xuống thành công');
            } catch {
              void message.error('Không thể tạo báo cáo');
            } finally {
              setExportLoading(false);
            }
          }}
        >
          <Form.Item name="reportType" label="Loại báo cáo">
            <Select style={{ width: 220 }}>
              <Select.Option value="PROJECT_COST">Chi phí dự án</Select.Option>
              <Select.Option value="PERSONNEL_ALLOCATION">Phân bổ nhân sự</Select.Option>
              <Select.Option value="TASK_PROGRESS">Tiến độ công việc</Select.Option>
              <Select.Option value="TIMESHEET_SUMMARY">Tổng hợp bảng công</Select.Option>
              <Select.Option value="ALERT_HISTORY">Lịch sử cảnh báo</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="dateRange" label="Kỳ báo cáo">
            <DatePicker.RangePicker format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              icon={<DownloadOutlined />}
              loading={exportLoading}
            >
              Tải xuống (.xlsx)
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
