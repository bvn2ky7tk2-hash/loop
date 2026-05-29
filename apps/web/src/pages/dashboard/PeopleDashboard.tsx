import { Row, Col, Spin } from 'antd';
import {
  TeamOutlined,
  UserAddOutlined,
  CalendarOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  UsergroupAddOutlined,
  PauseCircleOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { useThemePalette } from '../../hooks/useThemePalette';
import { StatCard } from '../../components/ui/StatCard';
import { PageHeader } from '../../components/ui/PageHeader';
import { dashboardV3Api } from '../../api/dashboard-v3';

export default function PeopleDashboard() {
  const { bgContainer, borderColor, textPrimary, textMuted, isDark } = useThemePalette();

  const { data: peopleData } = useQuery({
    queryKey:        ['dashboard-people'],
    queryFn:         dashboardV3Api.getPeople,
    refetchInterval: 60_000,
  });

  const { data: deptData, isLoading: deptLoading } = useQuery({
    queryKey:        ['dashboard-people-dept'],
    queryFn:         dashboardV3Api.getPeopleByDept,
    refetchInterval: 60_000,
  });

  // Ước tính: nhân sự đang nghỉ phép = pendingLeaves (không có API riêng)
  // Nhân sự mới tháng này chưa có API → hiển thị 0 hoặc placeholder
  const headcount      = peopleData?.headcount ?? 0;
  const onLeaveToday   = peopleData?.pendingLeaves ?? 0;  // xấp xỉ
  const newThisMonth   = 0; // TODO: thêm API sau

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Dashboard Nhân sự"
        icon={<TeamOutlined />}
        iconColor="#8B5CF6"
      />

      {/* Hàng 1: StatCards chính */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={12} lg={6}>
          <StatCard
            label="Tổng nhân sự"
            value={headcount}
            color="#8B5CF6"
            icon={<TeamOutlined />}
            onClick={() => navigate('/hr/employees')}
          />
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <StatCard
            label="Vị trí đang tuyển"
            value={peopleData?.openPositions ?? 0}
            color="#3B82F6"
            icon={<UserAddOutlined />}
            onClick={() => navigate('/recruit/jobs')}
          />
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <StatCard
            label="Nghỉ phép chờ duyệt"
            value={peopleData?.pendingLeaves ?? 0}
            color="#F59E0B"
            icon={<CalendarOutlined />}
          />
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <StatCard
            label="HĐ sắp hết hạn"
            value={peopleData?.expiringContracts ?? 0}
            color="#EF4444"
            icon={<FileTextOutlined />}
            subValue={`${peopleData?.pendingTimesheetApprovals ?? 0} bảng chấm công chờ`}
          />
        </Col>
      </Row>

      {/* Hàng 2: StatCards bổ sung từ people-by-dept */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={12} lg={8}>
          <StatCard
            label="Tổng phòng ban"
            value={deptData?.length ?? 0}
            color="#6366F1"
            icon={<UsergroupAddOutlined />}
          />
        </Col>
        <Col xs={12} sm={12} lg={8}>
          <StatCard
            label="Nhân sự mới tháng này"
            value={newThisMonth}
            color="#10B981"
            icon={<UserAddOutlined />}
          />
        </Col>
        <Col xs={12} sm={12} lg={8}>
          <StatCard
            label="Đang nghỉ phép (xấp xỉ)"
            value={onLeaveToday}
            color="#F97316"
            icon={<PauseCircleOutlined />}
          />
        </Col>
      </Row>

      {/* BarChart nhân sự theo phòng ban */}
      <div style={{
        background:   bgContainer,
        border:       `1px solid ${borderColor}`,
        borderRadius: 12,
        padding:      '16px 20px',
      }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: textPrimary, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <ClockCircleOutlined style={{ color: '#8B5CF6' }} />
          Nhân sự theo phòng ban
        </div>

        {deptLoading ? (
          <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Spin size="small" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={deptData ?? []}
              layout="vertical"
              margin={{ top: 4, right: 16, left: 60, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#E2E8F0'} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: textMuted as string }} />
              <YAxis dataKey="dept" type="category" tick={{ fontSize: 12, fill: textMuted as string }} />
              <RTooltip
                contentStyle={{
                  background:   isDark ? '#1E293B' : '#fff',
                  border:       `1px solid ${borderColor}`,
                  borderRadius: 8,
                  fontSize:     12,
                }}
              />
              <Bar dataKey="count" name="Nhân sự" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
