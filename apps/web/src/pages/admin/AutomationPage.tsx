import React from 'react';
import { Row, Col, Switch, Button, Table, Tag, Typography, Space, Tooltip, message } from 'antd';
import {
  ThunderboltOutlined, ClockCircleOutlined, PlayCircleOutlined,
  CheckCircleOutlined, PauseCircleOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { automationApi, AutomationRule } from '../../api/automation';
import { useThemePalette } from '../../hooks/useThemePalette';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';

const { Text } = Typography;

const CRON_LABELS: Record<string, string> = {
  '0 17 * * 5': 'Thứ 6 lúc 17:00',
  '0 9 * * *':  'Mỗi ngày lúc 09:00',
  '0 10 * * *': 'Mỗi ngày lúc 10:00',
  '0 9 * * 1':  'Thứ 2 lúc 09:00',
};

export default function AutomationPage() {
  const { textPrimary, textMuted, bgContainer, borderColor } = useThemePalette();
  const qc = useQueryClient();

  const { data: stats } = useQuery({
    queryKey: ['automation-stats'],
    queryFn: automationApi.getStats,
  });

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['automation-rules'],
    queryFn: automationApi.listRules,
  });

  const toggleMut = useMutation({
    mutationFn: ({ key, isActive }: { key: string; isActive: boolean }) =>
      automationApi.toggleRule(key, isActive),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['automation-rules'] });
      qc.invalidateQueries({ queryKey: ['automation-stats'] });
    },
    onError: () => message.error('Không thể cập nhật trạng thái'),
  });

  const triggerMut = useMutation({
    mutationFn: (key: string) => automationApi.triggerRule(key),
    onSuccess: (_, key) => {
      message.success(`Đã kích hoạt rule: ${key}`);
      qc.invalidateQueries({ queryKey: ['automation-rules'] });
      qc.invalidateQueries({ queryKey: ['automation-stats'] });
    },
    onError: () => message.error('Chạy rule thất bại'),
  });

  const columns = [
    {
      title: 'Tên Rule',
      dataIndex: 'name',
      render: (v: string, row: AutomationRule) => (
        <Space direction="vertical" size={2}>
          <Text style={{ color: textPrimary, fontWeight: 600 }}>{v}</Text>
          {row.description && <Text style={{ color: textMuted, fontSize: 12 }}>{row.description}</Text>}
        </Space>
      ),
    },
    {
      title: 'Lịch chạy',
      dataIndex: 'cronExpr',
      width: 200,
      render: (v: string) => (
        <Space>
          <ClockCircleOutlined style={{ color: textMuted }} />
          <Text style={{ color: textMuted, fontSize: 13 }}>{CRON_LABELS[v] ?? v}</Text>
        </Space>
      ),
    },
    {
      title: 'Lần cuối',
      dataIndex: 'lastRunAt',
      width: 180,
      render: (v?: string) => v
        ? <Text style={{ color: textMuted, fontSize: 13 }}>{dayjs(v).format('DD/MM/YYYY HH:mm')}</Text>
        : <Text style={{ color: textMuted }}>Chưa chạy</Text>,
    },
    {
      title: 'Số lần',
      dataIndex: 'runCount',
      width: 90,
      render: (v: number) => <Text style={{ color: textPrimary }}>{v}</Text>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      width: 120,
      render: (v: boolean) => v
        ? <Tag icon={<CheckCircleOutlined />} color="success">Đang bật</Tag>
        : <Tag icon={<PauseCircleOutlined />} color="default">Đã tắt</Tag>,
    },
    {
      title: 'Bật/Tắt',
      dataIndex: 'isActive',
      width: 90,
      render: (v: boolean, row: AutomationRule) => (
        <Switch
          checked={v}
          loading={toggleMut.isPending}
          onChange={(val) => toggleMut.mutate({ key: row.key, isActive: val })}
        />
      ),
    },
    {
      title: '',
      width: 120,
      render: (_: unknown, row: AutomationRule) => (
        <Tooltip title="Chạy ngay">
          <Button
            size="small"
            icon={<PlayCircleOutlined />}
            loading={triggerMut.isPending && triggerMut.variables === row.key}
            onClick={() => triggerMut.mutate(row.key)}
          >
            Chạy ngay
          </Button>
        </Tooltip>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Automation Rules"
        icon={<ThunderboltOutlined />}
        iconColor="#F59E0B"
      />

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <StatCard
            label="Tổng rules"
            value={stats?.totalRules ?? 0}
            color="#6366F1"
            icon={<ThunderboltOutlined />}
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            label="Đang hoạt động"
            value={stats?.activeRules ?? 0}
            color="#10B981"
            icon={<CheckCircleOutlined />}
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            label="Đã tắt"
            value={(stats?.totalRules ?? 0) - (stats?.activeRules ?? 0)}
            color="#94A3B8"
            icon={<PauseCircleOutlined />}
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            label="Lần chạy gần nhất"
            value={stats?.lastRunAt ? dayjs(stats.lastRunAt).format('DD/MM HH:mm') : '—'}
            color="#3B82F6"
            icon={<ClockCircleOutlined />}
          />
        </Col>
      </Row>

      <div style={{ background: bgContainer, border: `1px solid ${borderColor}`, borderRadius: 12, overflow: 'hidden' }}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={rules}
          loading={isLoading}
          pagination={false}
        />
      </div>
    </div>
  );
}
