import React, { useState } from 'react';
import {
  Table, Button, Badge, Typography, Space, Row, Col, Collapse, App, Tag, Descriptions,
} from 'antd';
import {
  ThunderboltOutlined, ReloadOutlined, RightOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { queuesApi, type QueueStats, type QueueJob } from '../../api/queues';
import { useThemePalette } from '../../hooks/useThemePalette';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';

const { Text } = Typography;
const { Panel } = Collapse;

const QUEUE_LABELS: Record<string, string> = {
  automation:      'Automation',
  notifications:   'Notifications',
  payslip:         'Payslip',
  'process-events':'Process Events',
  'finance-events':'Finance Events',
};

function QueueCard({ queue }: { queue: QueueStats }) {
  const { textPrimary, textMuted, bgContainer, borderColor, isDark } = useThemePalette();
  const { message } = App.useApp();
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [jobStatus, setJobStatus] = useState('failed');

  const { data: jobsData, isLoading: loadingJobs } = useQuery({
    queryKey: ['queue-jobs', queue.name, jobStatus],
    queryFn: () => queuesApi.getJobs(queue.name, jobStatus),
    enabled: expanded,
  });

  const retryMut = useMutation({
    mutationFn: ({ jobId }: { jobId: string }) => queuesApi.retryJob(queue.name, jobId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['queue-jobs', queue.name] });
      qc.invalidateQueries({ queryKey: ['admin-queues'] });
      message.success('Đã retry job');
    },
    onError: () => message.error('Retry thất bại'),
  });

  const hasFailed = queue.failed > 0;

  const jobColumns = [
    {
      title: <Text style={{ color: textPrimary }}>Job ID</Text>,
      dataIndex: 'id',
      key: 'id',
      width: 200,
      render: (v: string | undefined) => <Text style={{ color: textMuted, fontFamily: 'monospace', fontSize: 12 }}>{v ?? '—'}</Text>,
    },
    {
      title: <Text style={{ color: textPrimary }}>Tên</Text>,
      dataIndex: 'name',
      key: 'name',
      render: (v: string) => <Text style={{ color: textPrimary }}>{v}</Text>,
    },
    {
      title: <Text style={{ color: textPrimary }}>Thất bại</Text>,
      dataIndex: 'failReason',
      key: 'failReason',
      ellipsis: true,
      render: (v?: string) => v
        ? <Text style={{ color: '#EF4444', fontSize: 12 }}>{v}</Text>
        : <Text style={{ color: textMuted }}>—</Text>,
    },
    {
      title: <Text style={{ color: textPrimary }}>Attempts</Text>,
      dataIndex: 'attemptsMade',
      key: 'attemptsMade',
      width: 90,
      render: (v: number) => <Text style={{ color: textPrimary }}>{v}</Text>,
    },
    {
      title: <Text style={{ color: textPrimary }}>Thời gian</Text>,
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 140,
      render: (v: number) => <Text style={{ color: textMuted }}>{dayjs(v).format('DD/MM HH:mm:ss')}</Text>,
    },
    {
      title: <Text style={{ color: textPrimary }}>Action</Text>,
      key: 'action',
      width: 90,
      render: (_: unknown, record: QueueJob) =>
        jobStatus === 'failed' ? (
          <Button
            size="small"
            icon={<ReloadOutlined />}
            loading={retryMut.isPending}
            onClick={() => record.id && retryMut.mutate({ jobId: record.id })}
          >
            Retry
          </Button>
        ) : <Text style={{ color: textMuted }}>—</Text>,
    },
  ];

  return (
    <div
      style={{
        background: bgContainer,
        border: `1px solid ${hasFailed ? '#EF4444' : borderColor}`,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
      }}
    >
      {/* Queue header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Text style={{ color: textPrimary, fontWeight: 700, fontSize: 15 }}>
            {QUEUE_LABELS[queue.name] ?? queue.name}
          </Text>
          {hasFailed && (
            <Badge count={queue.failed} style={{ backgroundColor: '#EF4444' }} />
          )}
        </div>
        <Button
          size="small"
          type="text"
          icon={<RightOutlined rotate={expanded ? 90 : 0} />}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? 'Thu gọn' : 'Xem jobs'}
        </Button>
      </div>

      {/* Counts row */}
      <Row gutter={12}>
        {[
          { label: 'Waiting', value: queue.waiting, color: '#F59E0B' },
          { label: 'Active', value: queue.active, color: '#10B981' },
          { label: 'Failed', value: queue.failed, color: '#EF4444' },
          { label: 'Completed', value: queue.completed, color: '#6366F1' },
          { label: 'Delayed', value: queue.delayed, color: '#94A3B8' },
        ].map(({ label, value, color }) => (
          <Col key={label}>
            <div style={{ textAlign: 'center' }}>
              <Badge count={value} showZero style={{ backgroundColor: value > 0 ? color : '#94A3B8' }} />
              <Text style={{ display: 'block', color: textMuted, fontSize: 11, marginTop: 2 }}>{label}</Text>
            </div>
          </Col>
        ))}
      </Row>

      {/* Expanded jobs table */}
      {expanded && (
        <div style={{ marginTop: 16 }}>
          <Space style={{ marginBottom: 8 }}>
            {['failed', 'waiting', 'active', 'completed'].map((s) => (
              <Button
                key={s}
                size="small"
                type={jobStatus === s ? 'primary' : 'default'}
                onClick={() => setJobStatus(s)}
              >
                {s}
              </Button>
            ))}
          </Space>
          <Table<QueueJob>
            rowKey={(r) => r.id ?? Math.random().toString()}
            columns={jobColumns}
            dataSource={jobsData?.data ?? []}
            loading={loadingJobs}
            size="small"
            pagination={{ pageSize: 10, showTotal: (t) => `${t} jobs` }}
            scroll={{ x: 700 }}
          />
        </div>
      )}
    </div>
  );
}

export default function QueueBrowserPage() {
  const qc = useQueryClient();
  const { textPrimary } = useThemePalette();

  const { data: queues = [], isLoading } = useQuery({
    queryKey: ['admin-queues'],
    queryFn: queuesApi.listQueues,
    refetchInterval: 30_000,
  });

  const totalFailed = queues.reduce((s, q) => s + q.failed, 0);
  const totalWaiting = queues.reduce((s, q) => s + q.waiting, 0);

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="BullMQ Queue Browser"
        icon={<ThunderboltOutlined />}
        iconColor="#F59E0B"
        subtitle={
          <Text style={{ color: '#94A3B8', fontSize: 12 }}>
            Tự refresh mỗi 30s
          </Text>
        }
        actions={
          <Button
            icon={<ReloadOutlined />}
            onClick={() => qc.invalidateQueries({ queryKey: ['admin-queues'] })}
          >
            Refresh
          </Button>
        }
      />

      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={6}>
          <StatCard label="Tổng queues" value={queues.length} color="#6366F1" icon={<ThunderboltOutlined />} />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard label="Failed jobs" value={totalFailed} color={totalFailed > 0 ? '#EF4444' : '#10B981'} icon={<ThunderboltOutlined />} />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard label="Đang chờ" value={totalWaiting} color="#F59E0B" icon={<ThunderboltOutlined />} />
        </Col>
      </Row>

      {isLoading ? (
        <Text style={{ color: textPrimary }}>Đang tải...</Text>
      ) : (
        queues.map((q) => <QueueCard key={q.name} queue={q} />)
      )}
    </div>
  );
}
