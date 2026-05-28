import { Row, Col } from 'antd';
import {
  UserOutlined,
  CheckCircleOutlined,
  AppstoreOutlined,
  SafetyOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useThemePalette } from '../../hooks/useThemePalette';
import { StatCard } from '../../components/ui/StatCard';
import { PageHeader } from '../../components/ui/PageHeader';
import { dashboardV3Api } from '../../api/dashboard-v3';
import { Typography, Badge } from 'antd';

const { Text } = Typography;

const MODULE_LIST = [
  { name: 'Work', color: '#6366F1' },
  { name: 'People', color: '#8B5CF6' },
  { name: 'Finance', color: '#10B981' },
  { name: 'CRM', color: '#3B82F6' },
  { name: 'Asset', color: '#F97316' },
  { name: 'Ops', color: '#F59E0B' },
  { name: 'Me', color: '#6366F1' },
  { name: 'Admin', color: '#EF4444' },
];

export default function AdminDashboard() {
  const { bgContainer, borderColor, textPrimary, textMuted } = useThemePalette();

  const { data } = useQuery({
    queryKey: ['dashboard-admin'],
    queryFn: dashboardV3Api.getAdmin,
    refetchInterval: 60_000,
  });

  const systemOk = data?.systemStatus === 'OK';

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Dashboard Quản trị"
        icon={<SafetyOutlined />}
        iconColor="#EF4444"
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={12} lg={6}>
          <StatCard
            label="Tổng tài khoản"
            value={data?.totalUsers ?? 0}
            color="#6366F1"
            icon={<UserOutlined />}
          />
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <StatCard
            label="Users đang hoạt động"
            value={data?.activeUsers ?? 0}
            color="#10B981"
            icon={<CheckCircleOutlined />}
            subValue={`${data?.recentlyActiveUsers ?? 0} hoạt động 30 ngày qua`}
          />
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <StatCard
            label="Modules bật"
            value={data?.totalModules ?? 8}
            color="#3B82F6"
            icon={<AppstoreOutlined />}
          />
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <StatCard
            label="Trạng thái hệ thống"
            value={systemOk ? 'OK' : 'ERROR'}
            color={systemOk ? '#10B981' : '#EF4444'}
            icon={<SafetyOutlined />}
          />
        </Col>
      </Row>

      <div style={{
        background: bgContainer,
        border: `1px solid ${borderColor}`,
        borderRadius: 12,
        padding: '16px 20px',
      }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: textPrimary, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
          <AppstoreOutlined style={{ color: '#3B82F6' }} />
          Trạng thái modules
        </div>
        <Row gutter={[12, 12]}>
          {MODULE_LIST.map((mod) => (
            <Col key={mod.name} xs={12} sm={8} md={6}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 12px',
                borderRadius: 8,
                border: `1px solid ${borderColor}`,
                background: `${mod.color}10`,
              }}>
                <Badge color={mod.color} />
                <Text style={{ color: textPrimary, fontWeight: 500, fontSize: 13 }}>{mod.name}</Text>
                <span style={{ marginLeft: 'auto', fontSize: 11, color: '#10B981', fontWeight: 600 }}>ON</span>
              </div>
            </Col>
          ))}
        </Row>
        <div style={{ marginTop: 12, fontSize: 11, color: textMuted }}>
          Loop 360 — v3.0 Persona Dashboards
        </div>
      </div>
    </div>
  );
}
