import { Row, Col, Table, Tag } from 'antd';
import {
  UserOutlined,
  CheckCircleOutlined,
  AppstoreOutlined,
  SafetyOutlined,
  AuditOutlined,
  GlobalOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Typography, Badge } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useThemePalette } from '../../hooks/useThemePalette';
import { StatCard } from '../../components/ui/StatCard';
import { PageHeader } from '../../components/ui/PageHeader';
import { dashboardV3Api } from '../../api/dashboard-v3';
import { auditLogsApi, type AuditLogRecord } from '../../api/audit-logs';
import { useAuthStore } from '../../store/auth.store';

const { Text } = Typography;

const MODULE_LIST = [
  { name: 'Work',    color: '#6366F1' },
  { name: 'People',  color: '#8B5CF6' },
  { name: 'Finance', color: '#10B981' },
  { name: 'CRM',     color: '#3B82F6' },
  { name: 'Asset',   color: '#F97316' },
  { name: 'Ops',     color: '#F59E0B' },
  { name: 'Me',      color: '#6366F1' },
  { name: 'Admin',   color: '#EF4444' },
];

/** Màu badge cho action */
function actionColor(action: string) {
  if (/delete|remove/i.test(action)) return 'error';
  if (/create|add/i.test(action))    return 'success';
  if (/update|edit|patch/i.test(action)) return 'processing';
  return 'default';
}

export default function AdminDashboard() {
  const { bgContainer, borderColor, textPrimary, textMuted, isDark } = useThemePalette();
  const { user } = useAuthStore();

  const { data: adminData } = useQuery({
    queryKey:        ['dashboard-admin'],
    queryFn:         dashboardV3Api.getAdmin,
    refetchInterval: 60_000,
  });

  const { data: auditData } = useQuery({
    queryKey: ['audit-logs', 'recent'],
    queryFn:  () => auditLogsApi.list({ page: 1, limit: 10 }),
    refetchInterval: 60_000,
  });

  const systemOk    = adminData?.systemStatus === 'OK';
  const auditLogs: AuditLogRecord[] = auditData?.data ?? [];

  const auditColumns: ColumnsType<AuditLogRecord> = [
    {
      title:  'Người dùng',
      key:    'user',
      width:  140,
      render: (_: unknown, r: AuditLogRecord) => (
        <Text style={{ color: textPrimary }}>{r.user?.name ?? r.userId ?? '—'}</Text>
      ),
    },
    {
      title:  'Hành động',
      key:    'action',
      width:  130,
      render: (_: unknown, r: AuditLogRecord) => (
        <Tag color={actionColor(r.action)}>{r.action}</Tag>
      ),
    },
    {
      title:     'Module',
      dataIndex: 'module',
      key:       'module',
      width:     100,
      render:    (v?: string) => (
        <Text style={{ color: textMuted }}>{v ?? '—'}</Text>
      ),
    },
    {
      title:     'Entity',
      dataIndex: 'entity',
      key:       'entity',
      width:     120,
      ellipsis:  true,
      render:    (v?: string) => (
        <Text style={{ color: textMuted }}>{v ?? '—'}</Text>
      ),
    },
    {
      title:  'Thời gian',
      key:    'createdAt',
      width:  150,
      render: (_: unknown, r: AuditLogRecord) => (
        <Text style={{ color: textMuted }}>{dayjs(r.createdAt).format('DD/MM HH:mm:ss')}</Text>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Dashboard Quản trị"
        icon={<SafetyOutlined />}
        iconColor="#EF4444"
      />

      {/* Hàng 1: StatCards tổng quan */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={12} lg={6}>
          <StatCard
            label="Tổng tài khoản"
            value={adminData?.totalUsers ?? 0}
            color="#6366F1"
            icon={<UserOutlined />}
          />
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <StatCard
            label="Users đang hoạt động"
            value={adminData?.activeUsers ?? 0}
            color="#10B981"
            icon={<CheckCircleOutlined />}
            subValue={`${adminData?.recentlyActiveUsers ?? 0} hoạt động 30 ngày qua`}
          />
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <StatCard
            label="Modules bật"
            value={adminData?.totalModules ?? 8}
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

      {/* Tenant info */}
      <div style={{
        background:   bgContainer,
        border:       `1px solid ${borderColor}`,
        borderRadius: 12,
        padding:      '12px 20px',
        marginBottom: 16,
        display:      'flex',
        alignItems:   'center',
        gap:          16,
      }}>
        <GlobalOutlined style={{ color: '#3B82F6', fontSize: 18 }} />
        <div>
          <Text style={{ color: textMuted, fontSize: 12 }}>Tenant hiện tại</Text>
          <div style={{ color: textPrimary, fontWeight: 600, fontSize: 14 }}>
            {(user as { tenantId?: string })?.tenantId ? `Tenant: ${(user as { tenantId?: string }).tenantId}` : 'Loop 360 — Hệ thống đơn tenant'}
          </div>
        </div>
      </div>

      {/* Audit log gần nhất */}
      <div style={{
        background:   bgContainer,
        border:       `1px solid ${borderColor}`,
        borderRadius: 12,
        padding:      '16px 20px',
        marginBottom: 16,
      }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: textPrimary, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <AuditOutlined style={{ color: '#F59E0B' }} />
          Audit log gần nhất
        </div>
        <Table<AuditLogRecord>
          rowKey="id"
          columns={auditColumns}
          dataSource={auditLogs}
          pagination={false}
          size="small"
          scroll={{ x: 600 }}
          locale={{ emptyText: <Text style={{ color: textMuted }}>Chưa có audit log</Text> }}
        />
      </div>

      {/* Trạng thái modules */}
      <div style={{
        background:   bgContainer,
        border:       `1px solid ${borderColor}`,
        borderRadius: 12,
        padding:      '16px 20px',
      }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: textPrimary, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
          <AppstoreOutlined style={{ color: '#3B82F6' }} />
          Trạng thái modules
        </div>
        <Row gutter={[12, 12]}>
          {MODULE_LIST.map((mod) => (
            <Col key={mod.name} xs={12} sm={8} md={6}>
              <div style={{
                display:     'flex',
                alignItems:  'center',
                gap:         8,
                padding:     '10px 12px',
                borderRadius: 8,
                border:      `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : borderColor}`,
                background:  `${mod.color}10`,
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
