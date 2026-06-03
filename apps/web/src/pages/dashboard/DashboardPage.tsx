import { Row, Col, Card, Table, Typography, Popover, Button, Divider } from 'antd';
import {
  ProjectOutlined, TeamOutlined, CheckSquareOutlined, WarningOutlined,
  ClockCircleOutlined, SettingOutlined, BugOutlined, SyncOutlined, CheckCircleOutlined,
} from '@ant-design/icons';
import { ThemePanel } from '../../components/ui/ThemePanel';
import { PageHeader } from '../../components/ui/PageHeader';
import {
  PieChart, Pie, Cell, Tooltip as RTooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../../api/dashboard';
import { dashboardV3Api } from '../../api/dashboard-v3';
import { useGetBugStats } from '../../api/bugs.api';
import { useThemePalette } from '../../hooks/useThemePalette';
import { SparklineCard } from '../../components/ui/SparklineCard';
import { ProgressRing } from '../../components/ui/ProgressRing';
import { TaskStatusPill } from '../../components/ui/TaskStatusPill';
import type { TaskStatus, ProjectStatus } from '../../components/ui/TaskStatusPill';
import dayjs from 'dayjs';

const { Text } = Typography;

const STATUS_LABEL: Record<string, string> = {
  PLANNING: 'Lên kế hoạch', ACTIVE: 'Đang chạy', ON_HOLD: 'Tạm dừng', CLOSED: 'Đã đóng',
  TODO: 'Chưa bắt đầu', IN_PROGRESS: 'Đang thực hiện', DONE: 'Hoàn thành',
  PENDING_APPROVAL: 'Chờ duyệt', RETURNED: 'Trả lại', CANCELLED: 'Đã hủy',
};

/** Tiêu đề card nhỏ nhất quán */
function CardTitle({ icon, label, color }: { icon: React.ReactNode; label: string; color: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 26, height: 26, borderRadius: 7,
        background: `${color}18`, color, fontSize: 13,
      }}>
        {icon}
      </span>
      <span style={{ fontSize: 14, fontWeight: 600 }}>{label}</span>
    </span>
  );
}

export default function DashboardPage() {
  const { isDark, primary, textPrimary, textMuted, bgContainer, bgSubPanel, borderColor } = useThemePalette();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: dashboardApi.getSummary,
    refetchInterval: 60_000,
  });

  const { data: workTrend = [] } = useQuery({
    queryKey: ['dashboard-work-trend'],
    queryFn: dashboardV3Api.getWorkTrend,
    staleTime: 5 * 60_000,
  });

  const { data: bugStats, isLoading: bugLoading } = useGetBugStats();

  if (isLoading || !data) {
    return (
      <div style={{ padding: '24px 28px' }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ height: 28, width: 130, background: bgContainer, borderRadius: 6, marginBottom: 8 }} />
          <div style={{ height: 14, width: 200, background: bgContainer, borderRadius: 4 }} />
        </div>
        <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
          {[1, 2, 3, 4].map((i) => (
            <Col xs={12} xl={6} key={i}>
              <Card style={{ borderRadius: 12, borderTop: `3px solid ${isDark ? '#334155' : '#E2E8F0'}` }}>
                <div style={{ height: 90, background: bgSubPanel, borderRadius: 8 }} />
              </Card>
            </Col>
          ))}
        </Row>
      </div>
    );
  }

  const activeProjects = data.projects.byStatus['ACTIVE'] ?? 0;
  const doneTasks      = data.tasks.byStatus['DONE'] ?? 0;
  const totalTasks     = data.tasks.total || 1;
  const overdueCount   = data.overdueTasks.length;
  const completionPct  = Math.round((doneTasks / totalTasks) * 100);

  const taskStatusEntries = Object.entries(data.tasks.byStatus).filter(([, v]) => v > 0);

  // PIE chart: ACTIVE uses the theme preset color
  const PIE_COLORS: Record<string, string> = {
    PLANNING: '#94A3B8', ACTIVE: primary, ON_HOLD: '#F59E0B', CLOSED: '#CBD5E1',
    TODO: '#94A3B8', IN_PROGRESS: primary, DONE: '#10B981',
    PENDING_APPROVAL: '#F59E0B', RETURNED: '#EF4444', CANCELLED: '#D1D5DB',
  };

  const projectPieData = Object.entries(data.projects.byStatus).map(([status, count]) => ({
    name: STATUS_LABEL[status] ?? status,
    value: count,
    color: PIE_COLORS[status] ?? '#94A3B8',
    status,
  }));

  // Sparkline từ work trend thực — 7 ngày gần nhất
  const toDayLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    return ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][d.getDay()];
  };

  const taskSparkData = workTrend.map((t: { date: string; completed: number }) => ({
    day: toDayLabel(t.date), value: t.completed,
  }));

  // Project/member/overdue: dùng giá trị phẳng (không có trend API → không mock)
  const projectSparkData = taskSparkData.map((d: { day: string }) => ({ day: d.day, value: activeProjects }));
  const memberSparkData  = taskSparkData.map((d: { day: string }) => ({ day: d.day, value: data.employees.total }));
  const overdueSparkData = taskSparkData.map((d: { day: string }) => ({ day: d.day, value: overdueCount }));

  const projectCodeTag = (v: string) => (
    <span style={{
      fontSize: 11, color: textMuted,
      background: isDark ? '#334155' : '#F1F5F9',
      borderRadius: 4, padding: '2px 6px',
    }}>
      {v}
    </span>
  );

  const overdueColumns = [
    { title: 'Task', dataIndex: 'title', ellipsis: true },
    { title: 'Dự án', dataIndex: ['project', 'code'], width: 80, render: projectCodeTag },
    {
      title: 'Hạn', dataIndex: 'dueDate', width: 90,
      render: (v: string) => <Text type="danger" style={{ fontSize: 12 }}>{dayjs(v).format('DD/MM/YY')}</Text>,
    },
  ];

  const upcomingColumns = [
    { title: 'Task', dataIndex: 'title', ellipsis: true },
    { title: 'Dự án', dataIndex: ['project', 'code'], width: 80, render: projectCodeTag },
    {
      title: 'Hạn', dataIndex: 'dueDate', width: 90,
      render: (v: string) => <span style={{ fontSize: 12, color: '#F59E0B', fontWeight: 500 }}>{dayjs(v).format('DD/MM/YY')}</span>,
    },
  ];

  const logColumns = [
    { title: 'Người dùng', dataIndex: ['user', 'name'], width: 110, ellipsis: true },
    { title: 'Task', dataIndex: ['task', 'title'], ellipsis: true },
    {
      title: 'Giờ', dataIndex: 'hours', width: 50,
      render: (v: number) => <span style={{ fontWeight: 700, color: primary }}>{v}h</span>,
    },
    {
      title: 'Ngày', dataIndex: 'logDate', width: 85,
      render: (v: string) => <span style={{ fontSize: 12, color: textMuted as string }}>{dayjs(v).format('DD/MM/YY')}</span>,
    },
  ];

  return (
    <div style={{ padding: '24px 28px' }}>
      {/* ── Page header ── */}
      <div style={{ marginBottom: 28, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <PageHeader title="Dashboard" greeting style={{ marginBottom: 0 }} />

        {/* Tuỳ chỉnh button */}
        <Popover
          content={<ThemePanel />}
          title={null}
          trigger="click"
          placement="bottomRight"
          arrow={false}
          overlayInnerStyle={{ padding: '14px 16px', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.14)' }}
        >
          <Button
            icon={<SettingOutlined />}
            style={{
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              color: textMuted,
              borderColor: borderColor,
              background: 'transparent',
            }}
          >
            Tuỳ chỉnh
          </Button>
        </Popover>
      </div>

      {/* ── KPI Cards ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={12} xl={6}>
          <SparklineCard
            label="Dự án đang chạy"
            value={activeProjects}
            data={projectSparkData}
            variant="bar"
            color={primary}
            icon={<ProjectOutlined />}
            filled
          />
        </Col>
        <Col xs={12} xl={6}>
          <SparklineCard
            label="Task hoàn thành"
            value={doneTasks}
            data={taskSparkData}
            variant="bar"
            color="#10B981"
            icon={<CheckSquareOutlined />}
            filled
          />
        </Col>
        <Col xs={12} xl={6}>
          <SparklineCard
            label="Nhân sự"
            value={data.employees.total}
            data={memberSparkData}
            variant="line"
            color="#8B5CF6"
            icon={<TeamOutlined />}
            filled
          />
        </Col>
        <Col xs={12} xl={6}>
          <SparklineCard
            label="Task quá hạn"
            value={overdueCount}
            data={overdueSparkData}
            variant="bar"
            color={overdueCount > 0 ? '#EF4444' : '#10B981'}
            icon={<WarningOutlined />}
            filled
          />
        </Col>
      </Row>

      {/* ── Charts Row ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        {/* Pie: Project status */}
        <Col xs={24} lg={10}>
          <Card
            title={<CardTitle icon={<ProjectOutlined />} label="Trạng thái dự án" color={primary} />}
            style={{ borderRadius: 12, height: '100%', background: isDark ? bgContainer : `${primary}09`, border: `1px solid ${isDark ? borderColor : `${primary}28`}` }}
          >
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={projectPieData}
                  cx="42%"
                  cy="50%"
                  innerRadius={54}
                  outerRadius={88}
                  dataKey="value"
                  paddingAngle={2}
                  label={({ name, percent }) => `${name} ${Math.round((percent ?? 0) * 100)}%`}
                  labelLine={false}
                >
                  {projectPieData.map((entry) => (
                    <Cell key={entry.status} fill={entry.color} />
                  ))}
                </Pie>
                <RTooltip
                  formatter={(value: any, name: any) => [value, name]}
                  contentStyle={{
                    background: bgContainer,
                    border: 'none', borderRadius: 8, fontSize: 12, color: '#F1F5F9',
                  }}
                />
                <Legend iconType="circle" iconSize={8} />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* Progress ring */}
        <Col xs={24} lg={7}>
          <Card
            title={<CardTitle icon={<CheckSquareOutlined />} label="Tiến độ tổng" color={primary} />}
            style={{ borderRadius: 12, height: '100%', background: isDark ? bgContainer : `${primary}09`, border: `1px solid ${isDark ? borderColor : `${primary}28`}` }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 0' }}>
              <ProgressRing percent={completionPct} size="lg" primaryColor={primary} isDark={isDark} />
              <div style={{ marginTop: 14, fontSize: 13, color: textMuted as string, textAlign: 'center' }}>
                {doneTasks} / {data.tasks.total} task hoàn thành
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12, justifyContent: 'center' }}>
              {taskStatusEntries.map(([status, count]) => (
                <span key={status} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: textMuted as string }}>
                  <TaskStatusPill status={status as TaskStatus} size="sm" />
                  <span style={{ fontWeight: 700 }}>{count}</span>
                </span>
              ))}
            </div>
          </Card>
        </Col>

        {/* Status distribution */}
        <Col xs={24} lg={7}>
          <Card
            title={<CardTitle icon={<ProjectOutlined />} label="Phân bổ trạng thái" color={primary} />}
            style={{ borderRadius: 12, height: '100%', background: isDark ? bgContainer : `${primary}09`, border: `1px solid ${isDark ? borderColor : `${primary}28`}` }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {Object.entries(data.projects.byStatus)
                .filter(([, v]) => v > 0)
                .map(([status, count]) => (
                  <div key={status} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <TaskStatusPill status={status as ProjectStatus} size="sm" />
                    <span style={{
                      fontSize: 15, fontWeight: 800,
                      color: textPrimary,
                    }}>{count}</span>
                  </div>
                ))}
            </div>
          </Card>
        </Col>
      </Row>

      {/* ── Bottom Tables ── */}
      <Row gutter={[16, 16]}>
        {/* Overdue */}
        <Col xs={24} lg={8}>
          <Card
            title={
              <CardTitle
                icon={<WarningOutlined />}
                label={`Quá hạn (${overdueCount})`}
                color="#EF4444"
              />
            }
            size="small"
            style={{ borderRadius: 12, borderTop: '3px solid #EF4444' }}
          >
            <Table
              dataSource={data.overdueTasks}
              columns={overdueColumns}
              rowKey="id"
              size="small"
              pagination={false}
              locale={{ emptyText: 'Không có task quá hạn ✓' }}
            />
          </Card>
        </Col>

        {/* Upcoming */}
        <Col xs={24} lg={8}>
          <Card
            title={<CardTitle icon={<ClockCircleOutlined />} label="Sắp đến hạn (7 ngày)" color="#F59E0B" />}
            size="small"
            style={{ borderRadius: 12, borderTop: `3px solid #F59E0B` }}
          >
            <Table
              dataSource={data.upcomingTasks}
              columns={upcomingColumns}
              rowKey="id"
              size="small"
              pagination={false}
              locale={{ emptyText: 'Không có task sắp hạn' }}
            />
          </Card>
        </Col>

        {/* Recent time logs */}
        <Col xs={24} lg={8}>
          <Card
            title={<CardTitle icon={<ClockCircleOutlined />} label="Giờ làm gần đây" color={primary} />}
            size="small"
            style={{ borderRadius: 12, borderTop: `3px solid ${primary}` }}
          >
            <Table
              dataSource={data.recentTimeLogs}
              columns={logColumns}
              rowKey="id"
              size="small"
              pagination={false}
              locale={{ emptyText: 'Chưa có giờ làm' }}
            />
          </Card>
        </Col>
      </Row>

      {/* ── Thống kê lỗi ── */}
      <Divider style={{ borderColor: borderColor, margin: '24px 0 20px' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: textMuted, display: 'flex', alignItems: 'center', gap: 6 }}>
          <BugOutlined /> Thống kê lỗi
        </span>
      </Divider>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} lg={6}>
          <SparklineCard label="Đang mở" value={bugStats?.byStatus.open ?? 0} color="#1677FF" icon={<BugOutlined />} filled loading={bugLoading} />
        </Col>
        <Col xs={12} lg={6}>
          <SparklineCard label="Đang xử lý" value={bugStats?.byStatus.inProgress ?? 0} color="#FA8C16" icon={<SyncOutlined />} filled loading={bugLoading} />
        </Col>
        <Col xs={12} lg={6}>
          <SparklineCard label="Đã giải quyết" value={bugStats?.byStatus.resolved ?? 0} color="#10B981" icon={<CheckCircleOutlined />} filled loading={bugLoading} />
        </Col>
        <Col xs={12} lg={6}>
          <SparklineCard label="Nghiêm trọng" value={bugStats?.bySeverity.critical ?? 0} color="#EF4444" icon={<WarningOutlined />} filled loading={bugLoading} />
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        {/* Severity bar */}
        <Col xs={24} lg={10}>
          <Card
            title={<CardTitle icon={<BugOutlined />} label="Phân bố mức độ" color="#EF4444" />}
            size="small"
            style={{ borderRadius: 12, borderTop: '3px solid #EF4444' }}
          >
            <ResponsiveContainer width="100%" height={160}>
              <BarChart
                layout="vertical"
                data={[
                  { name: 'Nghiêm trọng', value: bugStats?.bySeverity.critical ?? 0, fill: '#EF4444' },
                  { name: 'Cao',           value: bugStats?.bySeverity.high ?? 0,     fill: '#F97316' },
                  { name: 'Trung bình',    value: bugStats?.bySeverity.medium ?? 0,   fill: '#F59E0B' },
                  { name: 'Thấp',          value: bugStats?.bySeverity.low ?? 0,      fill: '#10B981' },
                ]}
                margin={{ left: 8, right: 24, top: 4, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#E2E8F0'} />
                <XAxis type="number" tick={{ fill: textMuted as string, fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fill: textMuted as string, fontSize: 12 }} width={80} />
                <RTooltip contentStyle={{ background: bgContainer, border: `1px solid ${borderColor}`, borderRadius: 8 }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {[{ fill: '#EF4444' }, { fill: '#F97316' }, { fill: '#F59E0B' }, { fill: '#10B981' }].map((c, i) => (
                    <Cell key={i} fill={c.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* Top projects */}
        <Col xs={24} lg={14}>
          <Card
            title={<CardTitle icon={<ProjectOutlined />} label="Dự án nhiều lỗi nhất" color="#F97316" />}
            size="small"
            style={{ borderRadius: 12, borderTop: '3px solid #F97316' }}
          >
            <Table
              size="small"
              pagination={false}
              dataSource={(bugStats?.openByProject ?? []).slice(0, 5)}
              rowKey="projectId"
              locale={{ emptyText: 'Chưa có dữ liệu' }}
              columns={[
                { title: <Text style={{ color: textMuted }}>Dự án</Text>, dataIndex: 'projectName', ellipsis: true,
                  render: (v: string) => <Text style={{ color: textPrimary }}>{v}</Text> },
                { title: <Text style={{ color: textMuted }}>Đang mở</Text>, dataIndex: 'open', width: 80, align: 'right' as const,
                  render: (v: number) => <Text style={{ color: v > 0 ? '#EF4444' : textMuted, fontWeight: 600 }}>{v}</Text> },
                { title: <Text style={{ color: textMuted }}>Nghiêm trọng</Text>, dataIndex: 'critical', width: 100, align: 'right' as const,
                  render: (v: number) => v > 0
                    ? <Text style={{ color: '#EF4444', fontWeight: 700 }}>{v}</Text>
                    : <Text style={{ color: textMuted }}>—</Text> },
                { title: <Text style={{ color: textMuted }}>Tổng</Text>, dataIndex: 'total', width: 70, align: 'right' as const,
                  render: (v: number) => <Text style={{ color: textMuted }}>{v}</Text> },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
