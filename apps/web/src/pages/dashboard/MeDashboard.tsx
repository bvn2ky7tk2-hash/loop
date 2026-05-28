import { Row, Col } from 'antd';
import {
  UserOutlined,
  CheckSquareOutlined,
  BugOutlined,
  CalendarOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import {
  PieChart, Pie, Cell, Tooltip as RTooltip, ResponsiveContainer, Legend,
} from 'recharts';
import dayjs from 'dayjs';
import { useThemePalette } from '../../hooks/useThemePalette';
import { StatCard } from '../../components/ui/StatCard';
import { PageHeader } from '../../components/ui/PageHeader';
import { dashboardV3Api } from '../../api/dashboard-v3';
import { useAuthStore } from '../../store/auth.store';

const TASK_STATUS_MOCK = [
  { name: 'Chưa bắt đầu', value: 4, color: '#94A3B8' },
  { name: 'Đang thực hiện', value: 3, color: '#6366F1' },
  { name: 'Chờ duyệt', value: 2, color: '#F59E0B' },
  { name: 'Hoàn thành', value: 8, color: '#10B981' },
];

export default function MeDashboard() {
  const { bgContainer, borderColor, textPrimary, isDark } = useThemePalette();
  const { user } = useAuthStore();

  const { data } = useQuery({
    queryKey: ['dashboard-me'],
    queryFn: dashboardV3Api.getMe,
    refetchInterval: 60_000,
  });

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title={`Xin chào, ${user?.name ?? 'bạn'}`}
        icon={<UserOutlined />}
        iconColor="#3B82F6"
        subtitle={
          <span style={{ fontSize: 12, color: '#94A3B8' }}>
            {dayjs().format('dddd, DD/MM/YYYY')}
          </span>
        }
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={12} lg={6}>
          <StatCard
            label="Task của tôi"
            value={data?.myPendingTasks ?? 0}
            color="#6366F1"
            icon={<CheckSquareOutlined />}
          />
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <StatCard
            label="Bug tôi báo cáo"
            value={data?.myOpenBugs ?? 0}
            color="#F59E0B"
            icon={<BugOutlined />}
          />
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <StatCard
            label="Số dư phép (ngày)"
            value={data?.leaveBalance ?? 0}
            color="#10B981"
            icon={<CalendarOutlined />}
          />
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <StatCard
            label="Phiếu lương gần nhất"
            value={data?.nextPayslipDate ? dayjs(data.nextPayslipDate).format('MM/YYYY') : '—'}
            color="#8B5CF6"
            icon={<FileTextOutlined />}
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
          <CheckSquareOutlined style={{ color: '#6366F1' }} />
          Task của tôi theo trạng thái
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={TASK_STATUS_MOCK}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={85}
              dataKey="value"
              paddingAngle={3}
              label={({ name, percent }) => `${name} ${Math.round((percent ?? 0) * 100)}%`}
              labelLine={false}
            >
              {TASK_STATUS_MOCK.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <RTooltip
              contentStyle={{
                background: isDark ? '#1E293B' : '#fff',
                border: `1px solid ${borderColor}`,
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Legend iconType="circle" iconSize={8} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
