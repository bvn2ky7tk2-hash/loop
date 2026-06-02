import { Row, Col, Spin } from 'antd';
import {
  UserOutlined,
  CheckSquareOutlined,
  BugOutlined,
  CalendarOutlined,
  FileTextOutlined,
  WarningOutlined,
  ClockCircleOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import {
  PieChart, Pie, Cell, Tooltip as RTooltip, ResponsiveContainer, Legend,
} from 'recharts';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { useThemePalette } from '../../hooks/useThemePalette';
import { StatCard } from '../../components/ui/StatCard';
import { PageHeader } from '../../components/ui/PageHeader';
import { dashboardV3Api } from '../../api/dashboard-v3';
import { useAuthStore } from '../../store/auth.store';

const PIE_COLORS = {
  todo:       '#94A3B8',
  inProgress: '#6366F1',
  review:     '#F59E0B',
  done:       '#10B981',
};

export default function MeDashboard() {
  const { bgContainer, borderColor, textPrimary, isDark } = useThemePalette();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const { data: meData } = useQuery({
    queryKey: ['dashboard-me'],
    queryFn:  dashboardV3Api.getMe,
    refetchInterval: 60_000,
  });

  const { data: taskSummary, isLoading: taskLoading } = useQuery({
    queryKey: ['dashboard-my-tasks'],
    queryFn:  dashboardV3Api.getMyTasksSummary,
    refetchInterval: 60_000,
  });

  const pieData = taskSummary
    ? [
        { name: 'Chưa bắt đầu',   value: taskSummary.todo,       color: PIE_COLORS.todo },
        { name: 'Đang thực hiện',  value: taskSummary.inProgress, color: PIE_COLORS.inProgress },
        { name: 'Chờ review',      value: taskSummary.review,     color: PIE_COLORS.review },
        { name: 'Hoàn thành',      value: taskSummary.done,       color: PIE_COLORS.done },
      ].filter((d) => d.value > 0)
    : [];

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

      {/* Hàng 1: StatCards tổng quan cá nhân */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={12} lg={6}>
          <StatCard
            label="Task của tôi"
            value={meData?.myPendingTasks ?? 0}
            color="#6366F1"
            icon={<CheckSquareOutlined />}
            onClick={() => navigate('/my-tasks')}
          />
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <StatCard
            label="Bug tôi báo cáo"
            value={meData?.myOpenBugs ?? 0}
            color="#F59E0B"
            icon={<BugOutlined />}
          />
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <StatCard
            label="Số dư phép (ngày)"
            value={meData?.leaveBalance ?? 0}
            color="#10B981"
            icon={<CalendarOutlined />}
          />
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <StatCard
            label="Phiếu lương gần nhất"
            value={meData?.nextPayslipDate ? dayjs(meData.nextPayslipDate).format('MM/YYYY') : '—'}
            color="#8B5CF6"
            icon={<FileTextOutlined />}
          />
        </Col>
      </Row>

      {/* Hàng 2: Thống kê nhanh từ my-tasks-summary */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={12} lg={8}>
          <StatCard
            label="Cần review"
            value={taskSummary?.review ?? 0}
            color="#F59E0B"
            icon={<EyeOutlined />}
          />
        </Col>
        <Col xs={12} sm={12} lg={8}>
          <StatCard
            label="Đang thực hiện"
            value={taskSummary?.inProgress ?? 0}
            color="#3B82F6"
            icon={<ClockCircleOutlined />}
          />
        </Col>
        <Col xs={12} sm={12} lg={8}>
          <StatCard
            label="Quá hạn"
            value={0}
            color="#EF4444"
            icon={<WarningOutlined />}
            subValue="Xem tại Work Dashboard"
          />
        </Col>
      </Row>

      {/* PieChart task theo trạng thái */}
      <div style={{
        background:   bgContainer,
        border:       `1px solid ${borderColor}`,
        borderRadius: 12,
        padding:      '16px 20px',
      }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: textPrimary, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <CheckSquareOutlined style={{ color: '#6366F1' }} />
          Task của tôi theo trạng thái
        </div>

        {taskLoading ? (
          <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Spin size="small" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={pieData.length > 0 ? pieData : [{ name: 'Không có task', value: 1, color: '#334155' }]}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={85}
                dataKey="value"
                paddingAngle={3}
                label={pieData.length > 0
                  ? ({ name, percent }) => `${name} ${Math.round((percent ?? 0) * 100)}%`
                  : undefined
                }
                labelLine={false}
              >
                {(pieData.length > 0 ? pieData : [{ color: '#334155' }]).map((entry, idx) => (
                  <Cell key={idx} fill={entry.color} />
                ))}
              </Pie>
              <RTooltip
                contentStyle={{
                  background:   bgContainer,
                  border:       `1px solid ${borderColor}`,
                  borderRadius: 8,
                  fontSize:     12,
                }}
              />
              <Legend iconType="circle" iconSize={8} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
