import { useState } from 'react';
import {
  Tabs,
  Button,
  Table,
  Switch,
  Tag,
  Drawer,
  Form,
  Input,
  Checkbox,
  Space,
  Row,
  Col,
  Tooltip,
  Badge,
  Typography,
  message,
} from 'antd';
import {
  ApiOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  SendOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import TelegramSettingsSection from '../../components/settings/TelegramSettingsSection';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { FilterBar } from '../../components/FilterBar';
import { CenteredModal } from '../../components/ui/CenteredModal';
import { confirmDelete } from '../../components/ui/confirmDelete';
import { useThemePalette } from '../../hooks/useThemePalette';
import {
  webhooksApi,
  type WebhookEndpoint,
  type WebhookLog,
  type CreateWebhookDto,
} from '../../api/webhooks';

const { Text } = Typography;

const AVAILABLE_EVENTS = [
  { label: 'task.created', value: 'task.created' },
  { label: 'task.updated', value: 'task.updated' },
  { label: 'leave.approved', value: 'leave.approved' },
  { label: 'bug.assigned', value: 'bug.assigned' },
  { label: 'expense.approved', value: 'expense.approved' },
  { label: 'bpm.task.completed', value: 'bpm.task.completed' },
];

// ─── Webhook Tab ──────────────────────────────────────────────────────────────

function WebhooksTab() {
  const { textPrimary, textMuted, isDark, borderColor, bgContainer, linkColor } = useThemePalette();
  const qc = useQueryClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingEndpoint, setEditingEndpoint] = useState<WebhookEndpoint | null>(null);
  const [logsDrawerOpen, setLogsDrawerOpen] = useState(false);
  const [selectedEndpoint, setSelectedEndpoint] = useState<WebhookEndpoint | null>(null);
  const [form] = Form.useForm<CreateWebhookDto>();

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data: endpointsData, isLoading } = useQuery({
    queryKey: ['webhooks'],
    queryFn: () => webhooksApi.listEndpoints(1, 100),
  });

  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ['webhook-logs', selectedEndpoint?.id],
    queryFn: () => webhooksApi.listLogs(selectedEndpoint!.id, 1, 100),
    enabled: !!selectedEndpoint,
  });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const createMut = useMutation({
    mutationFn: webhooksApi.createEndpoint,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['webhooks'] }); setModalOpen(false); form.resetFields(); message.success('Tạo webhook thành công'); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Partial<CreateWebhookDto> }) =>
      webhooksApi.updateEndpoint(id, dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['webhooks'] }); setModalOpen(false); setEditingEndpoint(null); form.resetFields(); message.success('Cập nhật thành công'); },
  });

  const deleteMut = useMutation({
    mutationFn: webhooksApi.deleteEndpoint,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['webhooks'] }); message.success('Đã xóa webhook'); },
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      webhooksApi.toggleEndpoint(id, isActive),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['webhooks'] }),
  });

  const testMut = useMutation({
    mutationFn: webhooksApi.sendTest,
    onSuccess: (res) => {
      if (res.success) message.success(`Test thành công — HTTP ${res.statusCode}`);
      else message.error(`Test thất bại — HTTP ${res.statusCode ?? 'N/A'}`);
    },
    onError: () => message.error('Không gửi được test payload'),
  });

  // ── Stats ─────────────────────────────────────────────────────────────────
  const endpoints = endpointsData?.data ?? [];
  const totalEndpoints = endpointsData?.total ?? 0;
  const activeCount = endpoints.filter((e) => e.isActive).length;

  const logsAll = logsData?.data ?? [];

  // Tổng log 7 ngày (tất cả endpoints) — chỉ hiển thị khi không có endpoint nào được chọn
  // Thống kê tổng thể dùng dữ liệu endpoints hiện tại; log 7 ngày chỉ ước lượng
  const totalSent7d = 0; // server không trả về stat tổng, giữ là 0 khi chưa implement
  const errors7d = 0;

  // ── Handlers ─────────────────────────────────────────────────────────────
  const openCreate = () => { setEditingEndpoint(null); form.resetFields(); setModalOpen(true); };
  const openEdit = (ep: WebhookEndpoint) => {
    setEditingEndpoint(ep);
    form.setFieldsValue({ name: ep.name, url: ep.url, secret: ep.secret, events: ep.events });
    setModalOpen(true);
  };
  const openLogs = (ep: WebhookEndpoint) => { setSelectedEndpoint(ep); setLogsDrawerOpen(true); };

  const handleSave = async () => {
    const values = await form.validateFields();
    if (editingEndpoint) updateMut.mutate({ id: editingEndpoint.id, dto: values });
    else createMut.mutate(values);
  };

  // ── Columns ───────────────────────────────────────────────────────────────
  const columns = [
    {
      title: 'Tên',
      dataIndex: 'name',
      render: (v: string) => <Text style={{ color: textPrimary, fontWeight: 600 }}>{v}</Text>,
    },
    {
      title: 'URL',
      dataIndex: 'url',
      render: (v: string) => (
        <Tooltip title={v}>
          <Text style={{ color: linkColor, fontFamily: 'monospace', fontSize: 12 }}>
            <LinkOutlined style={{ marginRight: 4 }} />
            {v.length > 40 ? `${v.slice(0, 40)}…` : v}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: 'Events',
      dataIndex: 'events',
      render: (evts: string[]) => (
        <Space wrap size={4}>
          {evts.map((e) => (
            <Tag
              key={e}
              style={isDark ? { background: 'rgba(96,165,250,0.15)', color: '#93C5FD', borderColor: 'rgba(96,165,250,0.3)' } : {}}
              color={isDark ? undefined : 'blue'}
            >
              {e}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      width: 110,
      render: (v: boolean, row: WebhookEndpoint) => (
        <Switch
          checked={v}
          size="small"
          onChange={(checked) => toggleMut.mutate({ id: row.id, isActive: checked })}
        />
      ),
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      width: 120,
      render: (v: string) => (
        <Text style={{ color: textMuted, fontSize: 12 }}>{dayjs(v).format('DD/MM/YYYY')}</Text>
      ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 160,
      render: (_: unknown, row: WebhookEndpoint) => (
        <Space size={4}>
          <Tooltip title="Gửi test">
            <Button
              size="small"
              icon={<SendOutlined />}
              loading={testMut.isPending}
              onClick={() => testMut.mutate(row.id)}
            />
          </Tooltip>
          <Tooltip title="Xem logs">
            <Button size="small" icon={<EyeOutlined />} onClick={() => openLogs(row)} />
          </Tooltip>
          <Tooltip title="Sửa">
            <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(row)} />
          </Tooltip>
          <Tooltip title="Xóa">
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() =>
                confirmDelete({
                  itemName: row.name,
                  onConfirm: () => deleteMut.mutateAsync(row.id),
                })
              }
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  // ── Log columns ───────────────────────────────────────────────────────────
  const logColumns = [
    {
      title: 'Event',
      dataIndex: 'event',
      render: (v: string) => (
        <Tag
          style={isDark ? { background: 'rgba(96,165,250,0.15)', color: '#93C5FD', borderColor: 'rgba(96,165,250,0.3)' } : {}}
          color={isDark ? undefined : 'blue'}
        >
          {v}
        </Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'success',
      width: 90,
      render: (ok: boolean, row: WebhookLog) => (
        ok
          ? <Badge status="success" text={<Text style={{ color: '#10B981', fontSize: 12 }}>{row.statusCode ?? 200}</Text>} />
          : <Badge status="error" text={<Text style={{ color: '#EF4444', fontSize: 12 }}>{row.statusCode ?? 'ERR'}</Text>} />
      ),
    },
    {
      title: 'Lần thử',
      dataIndex: 'attemptCount',
      width: 70,
      render: (v: number) => <Text style={{ color: textMuted }}>{v}</Text>,
    },
    {
      title: 'Thời gian',
      dataIndex: 'sentAt',
      width: 130,
      render: (v: string) => (
        <Text style={{ color: textMuted, fontSize: 12 }}>{dayjs(v).format('DD/MM HH:mm:ss')}</Text>
      ),
    },
    {
      title: 'Response preview',
      dataIndex: 'response',
      render: (v: string | null) => (
        <Text style={{ color: textMuted, fontSize: 11, fontFamily: 'monospace' }} ellipsis>
          {v ? v.slice(0, 120) : '—'}
        </Text>
      ),
    },
  ];

  return (
    <div>
      {/* Stats */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={6}>
          <StatCard label="Tổng Endpoints" value={totalEndpoints} color="#6366F1" icon={<ApiOutlined />} />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard label="Đang hoạt động" value={activeCount} color="#10B981" icon={<CheckCircleOutlined />} />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard label="Gửi 7 ngày" value={totalSent7d} color="#3B82F6" icon={<SendOutlined />} />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard label="Lỗi 7 ngày" value={errors7d} color="#EF4444" icon={<CloseCircleOutlined />} />
        </Col>
      </Row>

      {/* Filter bar + add button */}
      <FilterBar
        right={
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Thêm Webhook
          </Button>
        }
      >
        <Text style={{ color: textMuted, fontSize: 13 }}>
          {totalEndpoints} endpoint đã cấu hình
        </Text>
      </FilterBar>

      {/* Table */}
      <div style={{ background: bgContainer, borderRadius: 12, border: `1px solid ${borderColor}`, overflow: 'hidden' }}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={endpoints}
          loading={isLoading}
          pagination={false}
          size="middle"
        />
      </div>

      {/* Modal tạo/sửa */}
      <CenteredModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingEndpoint(null); form.resetFields(); }}
        title={editingEndpoint ? 'Sửa Webhook Endpoint' : 'Thêm Webhook Endpoint'}
        width={580}
        footer={
          <Space>
            <Button onClick={() => { setModalOpen(false); setEditingEndpoint(null); form.resetFields(); }}>Hủy</Button>
            <Button
              type="primary"
              loading={createMut.isPending || updateMut.isPending}
              onClick={handleSave}
            >
              {editingEndpoint ? 'Cập nhật' : 'Tạo'}
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
          <Form.Item name="name" label="Tên" rules={[{ required: true, message: 'Nhập tên webhook' }]}>
            <Input placeholder="Vd: Slack #dev, CRM Sync..." maxLength={200} />
          </Form.Item>
          <Form.Item
            name="url"
            label="URL"
            rules={[
              { required: true, message: 'Nhập URL endpoint' },
              { type: 'url', message: 'URL không hợp lệ' },
            ]}
          >
            <Input placeholder="https://hooks.slack.com/..." maxLength={500} />
          </Form.Item>
          <Form.Item name="secret" label="Secret (tùy chọn)">
            <Input.Password placeholder="Dùng để tạo HMAC-SHA256 signature" maxLength={200} />
          </Form.Item>
          <Form.Item
            name="events"
            label="Events subscribe"
            rules={[{ required: true, message: 'Chọn ít nhất 1 event' }]}
          >
            <Checkbox.Group options={AVAILABLE_EVENTS} style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }} />
          </Form.Item>
        </Form>
      </CenteredModal>

      {/* Drawer logs */}
      <Drawer
        title={
          <Space>
            <ApiOutlined />
            <span>Delivery Logs — {selectedEndpoint?.name}</span>
          </Space>
        }
        open={logsDrawerOpen}
        onClose={() => { setLogsDrawerOpen(false); setSelectedEndpoint(null); }}
        width={820}
      >
        <Table
          rowKey="id"
          columns={logColumns}
          dataSource={logsAll}
          loading={logsLoading}
          pagination={{ pageSize: 20 }}
          size="small"
        />
      </Drawer>
    </div>
  );
}

// ─── IntegrationsPage ─────────────────────────────────────────────────────────

export default function IntegrationsPage() {
  return (
    <div style={{ padding: '24px' }}>
      <PageHeader
        title="Tích hợp"
        icon={<ApiOutlined />}
        iconColor="#6366F1"
      />
      <Tabs
        defaultActiveKey="telegram"
        items={[
          {
            key: 'telegram',
            label: 'Telegram',
            children: <TelegramSettingsSection />,
          },
          {
            key: 'webhooks',
            label: 'Webhooks',
            children: <WebhooksTab />,
          },
        ]}
      />
    </div>
  );
}
