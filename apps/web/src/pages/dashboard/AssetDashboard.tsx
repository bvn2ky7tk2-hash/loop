import { Row, Col } from 'antd';
import {
  LaptopOutlined,
  CheckCircleOutlined,
  ToolOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import {
  PieChart, Pie, Cell, Tooltip as RTooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { useThemePalette } from '../../hooks/useThemePalette';
import { StatCard } from '../../components/ui/StatCard';
import { PageHeader } from '../../components/ui/PageHeader';
import { dashboardV3Api } from '../../api/dashboard-v3';

const CATEGORY_MOCK = [
  { name: 'Laptop', value: 45, color: '#6366F1' },
  { name: 'Điện thoại', value: 22, color: '#3B82F6' },
  { name: 'Màn hình', value: 18, color: '#10B981' },
  { name: 'Thiết bị VP', value: 15, color: '#F59E0B' },
  { name: 'Máy chủ', value: 8, color: '#F97316' },
];

export default function AssetDashboard() {
  const { bgContainer, borderColor, textPrimary, isDark } = useThemePalette();

  const { data } = useQuery({
    queryKey: ['dashboard-asset'],
    queryFn: dashboardV3Api.getAsset,
    refetchInterval: 60_000,
  });

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Dashboard Tài sản"
        icon={<LaptopOutlined />}
        iconColor="#F97316"
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={12} lg={6}>
          <StatCard
            label="Tổng tài sản"
            value={data?.totalAssets ?? 0}
            color="#6366F1"
            icon={<LaptopOutlined />}
          />
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <StatCard
            label="Đã cấp phát"
            value={data?.assignedAssets ?? 0}
            color="#10B981"
            icon={<CheckCircleOutlined />}
          />
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <StatCard
            label="Đang bảo trì"
            value={data?.inMaintenance ?? 0}
            color="#F59E0B"
            icon={<ToolOutlined />}
          />
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <StatCard
            label="Bảo trì sắp tới"
            value={data?.dueSoon ?? 0}
            color="#F97316"
            icon={<ClockCircleOutlined />}
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
          <LaptopOutlined style={{ color: '#F97316' }} />
          Phân bổ tài sản theo danh mục
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={CATEGORY_MOCK}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={85}
              dataKey="value"
              paddingAngle={3}
            >
              {CATEGORY_MOCK.map((entry) => (
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
