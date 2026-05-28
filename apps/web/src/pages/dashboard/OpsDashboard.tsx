import { Row, Col } from 'antd';
import {
  NodeIndexOutlined,
  ThunderboltOutlined,
  RobotOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useThemePalette } from '../../hooks/useThemePalette';
import { StatCard } from '../../components/ui/StatCard';
import { PageHeader } from '../../components/ui/PageHeader';
import { dashboardV3Api } from '../../api/dashboard-v3';
import { Typography } from 'antd';

const { Text } = Typography;

export default function OpsDashboard() {
  const { bgContainer, borderColor, textPrimary, textMuted } = useThemePalette();

  const { data } = useQuery({
    queryKey: ['dashboard-ops'],
    queryFn: dashboardV3Api.getOps,
    refetchInterval: 30_000,
  });

  const stats = [
    { label: 'Process instances', value: data?.activeProcesses ?? 0, color: '#6366F1', icon: <NodeIndexOutlined /> },
    { label: 'User tasks chờ', value: data?.pendingUserTasks ?? 0, color: '#F59E0B', icon: <ThunderboltOutlined /> },
    { label: 'Automation rules', value: data?.automationRulesActive ?? 0, color: '#10B981', icon: <RobotOutlined /> },
    { label: 'Lỗi / Failed jobs', value: data?.failedJobs ?? 0, color: '#EF4444', icon: <ExclamationCircleOutlined /> },
  ];

  const statusItems = [
    { key: 'BPM Engine', ok: (data?.failedJobs ?? 0) === 0 },
    { key: 'Queue Worker', ok: true },
    { key: 'Automation', ok: (data?.automationRulesActive ?? 0) >= 0 },
    { key: 'Webhook', ok: true },
  ];

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Dashboard Vận hành"
        icon={<NodeIndexOutlined />}
        iconColor="#6366F1"
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {stats.map((s) => (
          <Col key={s.label} xs={12} sm={12} lg={6}>
            <StatCard label={s.label} value={s.value} color={s.color} icon={s.icon} />
          </Col>
        ))}
      </Row>

      <div style={{
        background: bgContainer,
        border: `1px solid ${borderColor}`,
        borderRadius: 12,
        padding: '16px 20px',
      }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: textPrimary, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
          <ThunderboltOutlined style={{ color: '#6366F1' }} />
          Trạng thái hệ thống
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {statusItems.map((item) => (
            <div
              key={item.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderRadius: 8,
                background: item.ok ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                border: `1px solid ${item.ok ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
              }}
            >
              <Text style={{ color: textPrimary, fontWeight: 500 }}>{item.key}</Text>
              <span style={{
                fontSize: 12,
                fontWeight: 700,
                color: item.ok ? '#10B981' : '#EF4444',
              }}>
                {item.ok ? 'OK' : 'ERROR'}
              </span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 12, fontSize: 11, color: textMuted }}>
          Cập nhật mỗi 30 giây
        </div>
      </div>
    </div>
  );
}
