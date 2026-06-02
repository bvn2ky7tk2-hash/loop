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

// Bảng màu xoay vòng cho các danh mục tài sản
const CATEGORY_COLORS = [
  '#6366F1', '#3B82F6', '#10B981', '#F59E0B', '#F97316',
  '#8B5CF6', '#EF4444', '#06B6D4', '#84CC16', '#EC4899',
];

export default function AssetDashboard() {
  const { bgContainer, borderColor, textPrimary, isDark } = useThemePalette();

  const { data } = useQuery({
    queryKey: ['dashboard-asset'],
    queryFn: dashboardV3Api.getAsset,
    refetchInterval: 60_000,
  });

  // Chuyển byCategory từ API sang format chart
  const categoryChartData = (data?.byCategory ?? []).map((item, i) => ({
    name: item.category,
    value: item.count,
    color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
  }));

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Dashboard Tài sản"
        icon={<LaptopOutlined />}
        iconColor="#F97316"
        greeting
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
        {categoryChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={categoryChartData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={85}
                dataKey="value"
                paddingAngle={3}
              >
                {categoryChartData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <RTooltip
                contentStyle={{
                  background: bgContainer,
                  border: `1px solid ${borderColor}`,
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Legend iconType="circle" iconSize={8} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 0', color: textPrimary, opacity: 0.5 }}>
            Chưa có dữ liệu tài sản
          </div>
        )}
      </div>
    </div>
  );
}
