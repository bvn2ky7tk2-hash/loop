import React, { useState } from 'react';
import {
  Table, Button, Tag, Typography, Select, Space, App, DatePicker, Row, Col,
} from 'antd';
import {
  MailOutlined, ReloadOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { emailLogsApi, type EmailLog } from '../../api/email-logs';
import { useThemePalette } from '../../hooks/useThemePalette';
import { PageHeader } from '../../components/ui/PageHeader';
import { FilterBar } from '../../components/FilterBar';
import { StatCard } from '../../components/ui/StatCard';

const { Text } = Typography;
const { RangePicker } = DatePicker;

const STATUS_COLORS: Record<string, string> = {
  SENT: 'success',
  FAILED: 'error',
  PENDING: 'warning',
};

const MODULE_OPTIONS = [
  { value: '', label: 'Tất cả module' },
  { value: 'notifications', label: 'Notifications' },
  { value: 'payroll', label: 'Payroll' },
  { value: 'system', label: 'System' },
  { value: 'hr', label: 'HR' },
];

export default function EmailLogPage() {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const { textPrimary, textMuted, bgContainer, borderColor, isDark } = useThemePalette();

  const [status, setStatus] = useState('');
  const [module, setModule] = useState('');
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const filter = {
    ...(status ? { status } : {}),
    ...(module ? { module } : {}),
    ...(dateRange?.[0] ? { fromDate: dateRange[0].toISOString() } : {}),
    ...(dateRange?.[1] ? { toDate: dateRange[1].endOf('day').toISOString() } : {}),
    page,
    limit: pageSize,
  };

  const { data, isLoading } = useQuery({
    queryKey: ['email-logs', filter],
    queryFn: () => emailLogsApi.list(filter),
  });

  const rows = data?.data ?? [];
  const total = data?.total ?? 0;

  const retryMut = useMutation({
    mutationFn: emailLogsApi.retry,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['email-logs'] });
      message.success('Đã retry gửi email');
    },
    onError: () => message.error('Retry thất bại'),
  });

  const sentCount = rows.filter((r) => r.status === 'SENT').length;
  const failedCount = rows.filter((r) => r.status === 'FAILED').length;

  const columns = [
    {
      title: <Text style={{ color: textPrimary }}>Gửi đến</Text>,
      dataIndex: 'toEmail',
      key: 'toEmail',
      width: 220,
      render: (v: string) => <Text style={{ color: textPrimary }}>{v}</Text>,
    },
    {
      title: <Text style={{ color: textPrimary }}>Subject</Text>,
      dataIndex: 'subject',
      key: 'subject',
      ellipsis: true,
      render: (v: string) => <Text style={{ color: textPrimary }}>{v}</Text>,
    },
    {
      title: <Text style={{ color: textPrimary }}>Module</Text>,
      dataIndex: 'module',
      key: 'module',
      width: 130,
      render: (v?: string) => (
        <Tag
          style={isDark ? { background: 'rgba(96,165,250,0.15)', color: '#93C5FD', borderColor: 'rgba(96,165,250,0.3)' } : {}}
          color={isDark ? undefined : 'blue'}
        >
          {v ?? 'system'}
        </Tag>
      ),
    },
    {
      title: <Text style={{ color: textPrimary }}>Trạng thái</Text>,
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (v: string) => <Tag color={STATUS_COLORS[v] ?? 'default'}>{v}</Tag>,
    },
    {
      title: <Text style={{ color: textPrimary }}>Thời gian</Text>,
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 155,
      render: (v: string) => <Text style={{ color: textMuted }}>{dayjs(v).format('DD/MM HH:mm:ss')}</Text>,
    },
    {
      title: <Text style={{ color: textPrimary }}>Lỗi</Text>,
      dataIndex: 'error',
      key: 'error',
      ellipsis: true,
      render: (v?: string) => v
        ? <Text style={{ color: '#EF4444', fontSize: 12 }}>{v}</Text>
        : <Text style={{ color: textMuted }}>—</Text>,
    },
    {
      title: <Text style={{ color: textPrimary }}>Hành động</Text>,
      key: 'actions',
      width: 90,
      render: (_: unknown, record: EmailLog) =>
        record.status === 'FAILED' ? (
          <Button
            size="small"
            icon={<ReloadOutlined />}
            loading={retryMut.isPending}
            onClick={() => retryMut.mutate(record.id)}
          >
            Retry
          </Button>
        ) : <Text style={{ color: textMuted }}>—</Text>,
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Email Delivery Log"
        icon={<MailOutlined />}
        iconColor="#3B82F6"
      />

      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={6}>
          <StatCard label="Trong trang" value={rows.length} color="#6366F1" icon={<MailOutlined />} />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard label="Đã gửi" value={sentCount} color="#10B981" icon={<MailOutlined />} />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard label="Thất bại" value={failedCount} color="#EF4444" icon={<MailOutlined />} />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard label="Tổng (filter)" value={total} color="#3B82F6" icon={<MailOutlined />} />
        </Col>
      </Row>

      <FilterBar>
        <Select
          value={status}
          onChange={setStatus}
          style={{ width: 160 }}
          options={[
            { value: '', label: 'Tất cả trạng thái' },
            { value: 'SENT', label: 'SENT' },
            { value: 'FAILED', label: 'FAILED' },
            { value: 'PENDING', label: 'PENDING' },
          ]}
        />
        <Select
          value={module}
          onChange={setModule}
          style={{ width: 180 }}
          options={MODULE_OPTIONS}
        />
        <RangePicker
          onChange={(v) => setDateRange(v as [Dayjs | null, Dayjs | null] | null)}
          format="DD/MM/YYYY"
        />
      </FilterBar>

      <div
        style={{
          background: bgContainer,
          border: `1px solid ${borderColor}`,
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        <Table<EmailLog>
          rowKey="id"
          columns={columns}
          dataSource={rows}
          loading={isLoading}
          pagination={{
            current: page,
            total,
            pageSize,
            onChange: (p, ps) => { setPage(p); setPageSize(ps); },
            showSizeChanger: true,
            pageSizeOptions: [50, 100, 200, 500],
            showTotal: (t) => `${t} bản ghi`,
          }}
          scroll={{ x: 900 }}
        />
      </div>
    </div>
  );
}
