import { useState } from 'react';
import { Row, Col, Table, Badge, Tag, Typography } from 'antd';
import {
  HeartOutlined,
  DatabaseOutlined,
  ThunderboltOutlined,
  ClockCircleOutlined,
  HddOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
  SettingOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { healthApi } from '../../api/health';
import type { QueueHealth, EnvIssue } from '../../api/health';
import { useThemePalette } from '../../hooks/useThemePalette';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';

const { Text } = Typography;

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}g ${m}p`;
}

function RespBadge({ ms }: { ms: number }) {
  const color = ms < 50 ? '#10B981' : ms < 200 ? '#F59E0B' : '#EF4444';
  return <span style={{ color, fontWeight: 600 }}>{ms} ms</span>;
}

function StatusIcon({ status }: { status: 'ok' | 'error' }) {
  return status === 'ok' ? (
    <CheckCircleFilled style={{ color: '#10B981', fontSize: 18 }} />
  ) : (
    <CloseCircleFilled style={{ color: '#EF4444', fontSize: 18 }} />
  );
}

const QUEUE_LABELS: Record<string, string> = {
  automation: 'Automation',
  notifications: 'Notifications',
  payslip: 'Payslip',
};

const ENV_LEVEL_COLOR: Record<EnvIssue['level'], string> = {
  CRITICAL: '#EF4444',
  WARNING: '#F59E0B',
  INFO: '#3B82F6',
};

const ENV_LEVEL_LABEL: Record<EnvIssue['level'], string> = {
  CRITICAL: 'CRITICAL',
  WARNING: 'WARNING',
  INFO: 'INFO',
};

export default function HealthPage() {
  const { textPrimary, textMuted, bgContainer, borderColor } = useThemePalette();
  const [expandedRows, setExpandedRows] = useState<string[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-health'],
    queryFn: healthApi.getHealth,
    refetchInterval: 30000,
  });

  const dbOk = data?.database?.status === 'ok';
  const redisOk = data?.redis?.status === 'ok';
  const memUsed = data ? Math.round(data.memory.heapUsed / 1024 / 1024) : 0;
  const memTotal = data ? Math.round(data.memory.heapTotal / 1024 / 1024) : 0;
  const uptimeStr = data ? formatUptime(data.uptime) : '—';

  const queueColumns = [
    {
      title: <Text style={{ color: textPrimary }}>Queue</Text>,
      dataIndex: 'name',
      key: 'name',
      render: (v: string) => (
        <Text style={{ color: textPrimary, fontWeight: 600 }}>
          {QUEUE_LABELS[v] ?? v}
        </Text>
      ),
    },
    {
      title: <Text style={{ color: textPrimary }}>Waiting</Text>,
      dataIndex: 'waiting',
      key: 'waiting',
      render: (v: number) => (
        <Badge count={v} showZero style={{ backgroundColor: v > 0 ? '#F59E0B' : '#94A3B8' }} />
      ),
    },
    {
      title: <Text style={{ color: textPrimary }}>Active</Text>,
      dataIndex: 'active',
      key: 'active',
      render: (v: number) => (
        <Badge count={v} showZero style={{ backgroundColor: v > 0 ? '#10B981' : '#94A3B8' }} />
      ),
    },
    {
      title: <Text style={{ color: textPrimary }}>Failed</Text>,
      dataIndex: 'failed',
      key: 'failed',
      render: (v: number) => (
        <Badge count={v} showZero style={{ backgroundColor: v > 0 ? '#EF4444' : '#94A3B8' }} />
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="System Health"
        icon={<HeartOutlined />}
        iconColor="#EF4444"
        subtitle={
          data ? (
            <Text style={{ color: textMuted, fontSize: 12 }}>
              Cập nhật lúc {new Date(data.timestamp).toLocaleTimeString('vi-VN')} — tự refresh mỗi 30s
            </Text>
          ) : null
        }
      />

      {/* Stat Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <StatCard
            label="Database"
            value={dbOk ? 'OK' : 'Error'}
            subValue={data ? `${data.database.responseMs} ms` : undefined}
            color={dbOk ? '#10B981' : '#EF4444'}
            icon={<DatabaseOutlined />}
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            label="Redis"
            value={redisOk ? 'OK' : 'Error'}
            subValue={data ? `${data.redis.responseMs} ms` : undefined}
            color={redisOk ? '#10B981' : '#EF4444'}
            icon={<ThunderboltOutlined />}
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            label="Uptime"
            value={uptimeStr}
            color="#3B82F6"
            icon={<ClockCircleOutlined />}
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            label="Memory"
            value={`${memUsed} MB`}
            subValue={`/ ${memTotal} MB heap`}
            color="#8B5CF6"
            icon={<HddOutlined />}
          />
        </Col>
      </Row>

      {/* Service Status Detail */}
      <div
        style={{
          background: bgContainer,
          border: `1px solid ${borderColor}`,
          borderRadius: 12,
          padding: 20,
          marginBottom: 24,
        }}
      >
        <Text style={{ color: textPrimary, fontWeight: 700, fontSize: 15, display: 'block', marginBottom: 16 }}>
          Trạng thái dịch vụ
        </Text>
        <Row gutter={[24, 12]}>
          {[
            {
              label: 'Database',
              status: data?.database?.status ?? 'error',
              extra: data ? <RespBadge ms={data.database.responseMs} /> : null,
            },
            {
              label: 'Redis',
              status: data?.redis?.status ?? 'error',
              extra: data ? <RespBadge ms={data.redis.responseMs} /> : null,
            },
            {
              label: 'Storage (MinIO)',
              status: data?.storage?.status ?? 'error',
              extra: null,
            },
          ].map(({ label, status, extra }) => (
            <Col key={label} xs={24} sm={8}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <StatusIcon status={status as 'ok' | 'error'} />
                <div>
                  <Text style={{ color: textPrimary, fontWeight: 600, display: 'block' }}>{label}</Text>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Tag color={status === 'ok' ? 'success' : 'error'} style={{ margin: 0, fontSize: 11 }}>
                      {status === 'ok' ? 'OK' : 'Error'}
                    </Tag>
                    {extra}
                  </div>
                </div>
              </div>
            </Col>
          ))}
        </Row>
      </div>

      {/* Queue Health */}
      <div
        style={{
          background: bgContainer,
          border: `1px solid ${borderColor}`,
          borderRadius: 12,
          padding: 20,
          marginBottom: 24,
        }}
      >
        <Text style={{ color: textPrimary, fontWeight: 700, fontSize: 15, display: 'block', marginBottom: 16 }}>
          Queue Health
        </Text>
        <Table<QueueHealth>
          rowKey="name"
          columns={queueColumns}
          dataSource={data?.queues ?? []}
          loading={isLoading}
          pagination={false}
          expandable={{
            expandedRowKeys: expandedRows,
            onExpand: (expanded, record) => {
              setExpandedRows(expanded ? [record.name] : []);
            },
            expandedRowRender: (record) => (
              <div style={{ padding: '8px 16px' }}>
                <Text style={{ color: textMuted }}>
                  Completed:{' '}
                  <Text style={{ color: textPrimary, fontWeight: 600 }}>{record.completed}</Text>
                </Text>
              </div>
            ),
          }}
        />
      </div>

      {/* Env Configuration */}
      <div
        style={{
          background: bgContainer,
          border: `1px solid ${borderColor}`,
          borderRadius: 12,
          padding: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <SettingOutlined style={{ color: '#8B5CF6', fontSize: 16 }} />
          <Text style={{ color: textPrimary, fontWeight: 700, fontSize: 15 }}>
            Cấu hình môi trường
          </Text>
        </div>
        <Row gutter={[12, 12]}>
          {/* Show all 6 known env keys with their status */}
          {[
            { key: 'DATABASE_URL', level: 'CRITICAL' as const, description: 'PostgreSQL connection' },
            { key: 'JWT_SECRET', level: 'CRITICAL' as const, description: 'JWT signing key' },
            { key: 'REDIS_URL', level: 'WARNING' as const, description: 'Redis for caching/queues' },
            { key: 'MINIO_ENDPOINT', level: 'WARNING' as const, description: 'MinIO object storage' },
            { key: 'SMTP_HOST', level: 'INFO' as const, description: 'Email delivery' },
            { key: 'TELEGRAM_BOT_TOKEN', level: 'INFO' as const, description: 'Telegram integration' },
          ].map(({ key, level, description }) => {
            const isMissing = (data?.envIssues ?? []).some((i) => i.key === key);
            return (
              <Col key={key} xs={24} sm={12} md={8}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: `1px solid ${isMissing ? ENV_LEVEL_COLOR[level] + '55' : borderColor}`,
                    background: isMissing ? ENV_LEVEL_COLOR[level] + '10' : 'transparent',
                  }}
                >
                  {isMissing ? (
                    <CloseCircleFilled style={{ color: ENV_LEVEL_COLOR[level], fontSize: 16, marginTop: 2 }} />
                  ) : (
                    <CheckCircleFilled style={{ color: '#10B981', fontSize: 16, marginTop: 2 }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <Text
                        style={{ color: textPrimary, fontWeight: 600, fontFamily: 'monospace', fontSize: 13 }}
                      >
                        {key}
                      </Text>
                      {isMissing ? (
                        <Tag
                          style={{
                            margin: 0,
                            fontSize: 10,
                            lineHeight: '16px',
                            background: ENV_LEVEL_COLOR[level] + '22',
                            color: ENV_LEVEL_COLOR[level],
                            borderColor: ENV_LEVEL_COLOR[level] + '55',
                          }}
                        >
                          {ENV_LEVEL_LABEL[level]}
                        </Tag>
                      ) : (
                        <Tag
                          style={{
                            margin: 0,
                            fontSize: 10,
                            lineHeight: '16px',
                            background: '#10B98122',
                            color: '#10B981',
                            borderColor: '#10B98155',
                          }}
                        >
                          OK
                        </Tag>
                      )}
                    </div>
                    <Text style={{ color: textMuted, fontSize: 12 }}>{description}</Text>
                  </div>
                </div>
              </Col>
            );
          })}
        </Row>
      </div>
    </div>
  );
}
