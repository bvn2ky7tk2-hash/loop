import { useState } from 'react';
import { Table, Select, Button, Space, Popconfirm, App, Tag } from 'antd';
import { EyeOutlined, StopOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  useInstances,
  useCancelInstance,
  useDefinitions,
  type ProcessInstance,
  type InstanceStatus,
} from '../../api/processes.api';
import { InstanceStatusBadge } from './components/ProcessStatusBadge';

const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'RUNNING', label: 'Đang chạy' },
  { value: 'COMPLETED', label: 'Hoàn thành' },
  { value: 'CANCELLED', label: 'Đã huỷ' },
  { value: 'ERROR', label: 'Lỗi' },
];

export default function ProcessInstancesPage() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [definitionFilter, setDefinitionFilter] = useState<string>('');

  const { data, isLoading } = useInstances({
    page: 1,
    pageSize: 50,
    definitionId: definitionFilter || undefined,
    status: statusFilter as InstanceStatus || undefined,
  });

  const { data: defsData } = useDefinitions({ pageSize: 100 });
  const cancelMutation = useCancelInstance();

  const handleCancel = (id: string) => {
    cancelMutation.mutate(id, {
      onSuccess: () => message.success('Đã huỷ process instance'),
      onError: () => message.error('Không thể huỷ'),
    });
  };

  const columns = [
    {
      title: 'Quy trình',
      dataIndex: ['definition', 'name'],
      render: (_: string, record: ProcessInstance) =>
        record.definition ? (
          <Space>
            <strong>{record.definition.name}</strong>
            <Tag>v{record.definition.version}</Tag>
          </Space>
        ) : '—',
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      render: (s: InstanceStatus) => <InstanceStatusBadge status={s} />,
      width: 140,
    },
    {
      title: 'Người khởi động',
      dataIndex: ['startedByUser', 'name'],
      render: (_: string, record: ProcessInstance) => record.startedByUser?.name ?? '—',
    },
    {
      title: 'Bắt đầu',
      dataIndex: 'startedAt',
      render: (d: string) => dayjs(d).format('DD/MM/YYYY HH:mm'),
      width: 140,
    },
    {
      title: 'Kết thúc',
      dataIndex: 'completedAt',
      render: (d: string | undefined) => d ? dayjs(d).format('DD/MM/YYYY HH:mm') : '—',
      width: 140,
    },
    {
      title: '',
      key: 'actions',
      width: 120,
      render: (_: unknown, record: ProcessInstance) => (
        <Space>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/processes/instances/${record.id}`)}
          >
            Chi tiết
          </Button>
          {record.status === 'RUNNING' && (
            <Popconfirm title="Huỷ process instance?" onConfirm={() => handleCancel(record.id)}>
              <Button size="small" danger icon={<StopOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <h1 className="page-title">Process Monitor</h1>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <Select
          style={{ width: 200 }}
          value={statusFilter}
          onChange={setStatusFilter}
          options={STATUS_OPTIONS}
        />
        <Select
          style={{ width: 280 }}
          placeholder="Lọc theo quy trình"
          allowClear
          value={definitionFilter || undefined}
          onChange={(v) => setDefinitionFilter(v ?? '')}
          options={defsData?.data.map((d) => ({ value: d.id, label: `${d.name} v${d.version}` })) ?? []}
        />
      </div>

      <Table
        dataSource={data?.data ?? []}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        size="middle"
        pagination={{
          total: data?.meta.total,
          pageSize: data?.meta.pageSize,
          showSizeChanger: false,
        }}
      />
    </div>
  );
}
