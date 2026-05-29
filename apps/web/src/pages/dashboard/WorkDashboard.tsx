import { Row, Col, Spin } from 'antd';
import {
  CheckSquareOutlined,
  WarningOutlined,
  BugOutlined,
  ClockCircleOutlined,
  FireOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import dayjs from 'dayjs';
import { useThemePalette } from '../../hooks/useThemePalette';
import { StatCard } from '../../components/ui/StatCard';
import { PageHeader } from '../../components/ui/PageHeader';
import { dashboardV3Api } from '../../api/dashboard-v3';

/** Đổi 'YYYY-MM-DD' → label ngắn 'T2', 'T3'… */
function toDayLabel(dateStr: string) {
  const DAY_MAP: Record<number, string> = { 0: 'CN', 1: 'T2', 2: 'T3', 3: 'T4', 4: 'T5', 5: 'T6', 6: 'T7' };
  return DAY_MAP[dayjs(dateStr).day()] ?? dateStr;
}

export default function WorkDashboard() {
  const { bgContainer, borderColor, textPrimary, textMuted, isDark } = useThemePalette();

  const { data: workData } = useQuery({
    queryKey:        ['dashboard-work'],
    queryFn:         dashboardV3Api.getWork,
    refetchInterval: 60_000,
  });

  const { data: trend, isLoading: trendLoading } = useQuery({
    queryKey:        ['dashboard-work-trend'],
    queryFn:         dashboardV3Api.getWorkTrend,
    refetchInterval: 60_000,
  });

  const chartData = (trend ?? []).map((item) => ({
    day:       toDayLabel(item.date),
    completed: item.completed,
  }));

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Dashboard Công việc"
        icon={<CheckSquareOutlined />}
        iconColor="#6366F1"
      />

      {/* Hàng 1: StatCards từ /dashboard/work */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={12} lg={6}>
          <StatCard
            label="Task đang mở"
            value={workData?.myOpenTasks ?? 0}
            color="#6366F1"
            icon={<CheckSquareOutlined />}
            onClick={() => navigate('/work/tasks')}
          />
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <StatCard
            label="Task quá hạn"
            value={workData?.myOverdueTasks ?? 0}
            color="#EF4444"
            icon={<WarningOutlined />}
            onClick={() => navigate('/work/tasks?overdue=true')}
          />
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <StatCard
            label="Bug đang mở"
            value={workData?.openBugs ?? 0}
            color="#F59E0B"
            icon={<BugOutlined />}
            onClick={() => navigate('/bugs')}
          />
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <StatCard
            label="BPM chờ xử lý"
            value={workData?.pendingBpmTasks ?? 0}
            color="#3B82F6"
            icon={<FireOutlined />}
            subValue={`${workData?.timesheetHoursThisWeek ?? 0}h tuần này`}
          />
        </Col>
      </Row>

      {/* Hàng 2: StatCards bổ sung */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={12} lg={8}>
          <StatCard
            label="Đang thực hiện"
            value={Math.max(0, (workData?.myOpenTasks ?? 0) - (workData?.myOverdueTasks ?? 0))}
            color="#3B82F6"
            icon={<SyncOutlined />}
          />
        </Col>
        <Col xs={12} sm={12} lg={8}>
          <StatCard
            label="Task hoàn thành tuần này"
            value={chartData.reduce((sum, d) => sum + d.completed, 0)}
            color="#10B981"
            icon={<CheckSquareOutlined />}
          />
        </Col>
        <Col xs={12} sm={12} lg={8}>
          <StatCard
            label="Timesheet tuần này"
            value={`${workData?.timesheetHoursThisWeek ?? 0}h`}
            color="#8B5CF6"
            icon={<ClockCircleOutlined />}
          />
        </Col>
      </Row>

      {/* BarChart xu hướng hoàn thành 7 ngày */}
      <div style={{
        background:   bgContainer,
        border:       `1px solid ${borderColor}`,
        borderRadius: 12,
        padding:      '16px 20px',
      }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: textPrimary, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <ClockCircleOutlined style={{ color: '#6366F1' }} />
          Tasks hoàn thành 7 ngày qua
        </div>

        {trendLoading ? (
          <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Spin size="small" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 4, right: 16, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#E2E8F0'} />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: textMuted as string }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: textMuted as string }} />
              <RTooltip
                contentStyle={{
                  background:   bgContainer,
                  border:       `1px solid ${borderColor}`,
                  borderRadius: 8,
                  fontSize:     12,
                }}
              />
              <Bar dataKey="completed" name="Hoàn thành" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
