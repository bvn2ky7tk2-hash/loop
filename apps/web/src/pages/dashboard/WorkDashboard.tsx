import { Row, Col } from 'antd';
import {
  CheckSquareOutlined,
  WarningOutlined,
  BugOutlined,
  ClockCircleOutlined,
  FireOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { useThemePalette } from '../../hooks/useThemePalette';
import { StatCard } from '../../components/ui/StatCard';
import { PageHeader } from '../../components/ui/PageHeader';
import { dashboardV3Api } from '../../api/dashboard-v3';

const MOCK_TREND = [
  { day: 'T2', done: 3, open: 8 },
  { day: 'T3', done: 5, open: 7 },
  { day: 'T4', done: 2, open: 9 },
  { day: 'T5', done: 6, open: 6 },
  { day: 'T6', done: 4, open: 7 },
  { day: 'T7', done: 1, open: 5 },
  { day: 'CN', done: 0, open: 4 },
];

export default function WorkDashboard() {
  const { bgContainer, borderColor, textPrimary, textMuted, isDark } = useThemePalette();

  const { data } = useQuery({
    queryKey: ['dashboard-work'],
    queryFn: dashboardV3Api.getWork,
    refetchInterval: 60_000,
  });

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Dashboard Công việc"
        icon={<CheckSquareOutlined />}
        iconColor="#6366F1"
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={12} lg={6}>
          <StatCard
            label="Task đang mở"
            value={data?.myOpenTasks ?? 0}
            color="#6366F1"
            icon={<CheckSquareOutlined />}
          />
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <StatCard
            label="Task quá hạn"
            value={data?.myOverdueTasks ?? 0}
            color="#EF4444"
            icon={<WarningOutlined />}
          />
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <StatCard
            label="Bug đang mở"
            value={data?.openBugs ?? 0}
            color="#F59E0B"
            icon={<BugOutlined />}
          />
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <StatCard
            label="BPM chờ xử lý"
            value={data?.pendingBpmTasks ?? 0}
            color="#3B82F6"
            icon={<FireOutlined />}
            subValue={`${data?.timesheetHoursThisWeek ?? 0}h tuần này`}
          />
        </Col>
      </Row>

      <div style={{
        background: bgContainer,
        border: `1px solid ${borderColor}`,
        borderRadius: 12,
        padding: '16px 20px',
      }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: textPrimary, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <ClockCircleOutlined style={{ color: '#6366F1' }} />
          Xu hướng task 7 ngày qua
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={MOCK_TREND} margin={{ top: 4, right: 16, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#E2E8F0'} />
            <XAxis dataKey="day" tick={{ fontSize: 12, fill: textMuted as string }} />
            <YAxis tick={{ fontSize: 12, fill: textMuted as string }} />
            <RTooltip
              contentStyle={{
                background: isDark ? '#1E293B' : '#fff',
                border: `1px solid ${borderColor}`,
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Bar dataKey="done" name="Hoàn thành" fill="#10B981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="open" name="Đang mở" fill="#6366F1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
