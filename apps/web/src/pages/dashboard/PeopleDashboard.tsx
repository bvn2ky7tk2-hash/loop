import { Row, Col } from 'antd';
import {
  TeamOutlined,
  UserAddOutlined,
  CalendarOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { useThemePalette } from '../../hooks/useThemePalette';
import { StatCard } from '../../components/ui/StatCard';
import { PageHeader } from '../../components/ui/PageHeader';
import { dashboardV3Api } from '../../api/dashboard-v3';

const DEPT_MOCK = [
  { dept: 'Kỹ thuật', count: 12 },
  { dept: 'Kinh doanh', count: 8 },
  { dept: 'Nhân sự', count: 4 },
  { dept: 'Kế toán', count: 5 },
  { dept: 'Marketing', count: 6 },
];

export default function PeopleDashboard() {
  const { bgContainer, borderColor, textPrimary, textMuted, isDark } = useThemePalette();

  const { data } = useQuery({
    queryKey: ['dashboard-people'],
    queryFn: dashboardV3Api.getPeople,
    refetchInterval: 60_000,
  });

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Dashboard Nhân sự"
        icon={<TeamOutlined />}
        iconColor="#8B5CF6"
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={12} lg={6}>
          <StatCard
            label="Tổng nhân sự"
            value={data?.headcount ?? 0}
            color="#8B5CF6"
            icon={<TeamOutlined />}
          />
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <StatCard
            label="Vị trí đang tuyển"
            value={data?.openPositions ?? 0}
            color="#3B82F6"
            icon={<UserAddOutlined />}
          />
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <StatCard
            label="Nghỉ phép chờ duyệt"
            value={data?.pendingLeaves ?? 0}
            color="#F59E0B"
            icon={<CalendarOutlined />}
          />
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <StatCard
            label="HĐ sắp hết hạn"
            value={data?.expiringContracts ?? 0}
            color="#EF4444"
            icon={<FileTextOutlined />}
            subValue={`${data?.pendingTimesheetApprovals ?? 0} bảng chấm công chờ`}
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
          <ClockCircleOutlined style={{ color: '#8B5CF6' }} />
          Nhân sự theo phòng ban
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={DEPT_MOCK} layout="vertical" margin={{ top: 4, right: 16, left: 60, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#E2E8F0'} />
            <XAxis type="number" tick={{ fontSize: 12, fill: textMuted as string }} />
            <YAxis dataKey="dept" type="category" tick={{ fontSize: 12, fill: textMuted as string }} />
            <RTooltip
              contentStyle={{
                background: isDark ? '#1E293B' : '#fff',
                border: `1px solid ${borderColor}`,
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Bar dataKey="count" name="Nhân sự" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
