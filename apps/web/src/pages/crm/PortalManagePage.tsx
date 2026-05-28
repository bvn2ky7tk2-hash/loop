import { useState } from 'react';
import {
  Row, Col, Table, Tag, Typography, Button, Drawer, Space, Tooltip,
  Popconfirm, Form, Input, Select, Switch, Tabs, Badge, Descriptions,
} from 'antd';
import {
  GlobalOutlined, PlusOutlined, CopyOutlined, EditOutlined, DeleteOutlined,
  CheckCircleOutlined, ClockCircleOutlined, EyeOutlined, MessageOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useThemePalette } from '../../hooks/useThemePalette';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { CenteredModal } from '../../components/ui/CenteredModal';
import { FilterBar } from '../../components/FilterBar';
import { confirmDelete } from '../../components/ui/confirmDelete';
import { portalAdminApi, type CustomerPortal, type CustomerTicket, type TicketStatus } from '../../api/portal';

const { Text } = Typography;

const TICKET_STATUS_COLOR: Record<TicketStatus, string> = {
  OPEN:        'processing',
  IN_PROGRESS: 'warning',
  RESOLVED:    'success',
  CLOSED:      'default',
};
const TICKET_STATUS_LABEL: Record<TicketStatus, string> = {
  OPEN:        'Mới',
  IN_PROGRESS: 'Đang xử lý',
  RESOLVED:    'Đã giải quyết',
  CLOSED:      'Đóng',
};
const PRIORITY_COLOR: Record<string, string> = {
  LOW: 'default', MEDIUM: 'blue', HIGH: 'orange', URGENT: 'red',
};

function copyLink(token: string) {
  const url = `${window.location.origin}/portal/${token}`;
  navigator.clipboard.writeText(url);
}

// ─── Ticket Respond Modal ─────────────────────────────────────────────────────
function RespondModal({
  ticket, open, onCancel, onOk, loading,
}: { ticket: CustomerTicket | null; open: boolean; onCancel: () => void; onOk: (v: any) => void; loading: boolean }) {
  const [form] = Form.useForm();
  if (!ticket) return null;
  return (
    <CenteredModal
      title={`Phản hồi ticket — ${ticket.title}`}
      open={open}
      onCancel={onCancel}
      onOk={form.submit}
      confirmLoading={loading}
      okText="Lưu"
      width={600}
      afterOpenChange={v => { if (v) form.setFieldsValue({ status: ticket.status, response: ticket.response ?? '' }); }}
    >
      <Form form={form} layout="vertical" onFinish={onOk}>
        <Form.Item name="status" label="Trạng thái" rules={[{ required: true }]}>
          <Select options={Object.entries(TICKET_STATUS_LABEL).map(([k, v]) => ({ value: k, label: v }))} />
        </Form.Item>
        <Form.Item name="response" label="Phản hồi gửi khách hàng">
          <Input.TextArea rows={5} placeholder="Nội dung phản hồi..." />
        </Form.Item>
      </Form>
    </CenteredModal>
  );
}

// ─── Portal Detail Drawer ─────────────────────────────────────────────────────
function PortalDrawer({
  portal, open, onClose,
}: { portal: CustomerPortal | null; open: boolean; onClose: () => void }) {
  const [respondModal, setRespondModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<CustomerTicket | null>(null);
  const { isDark, textPrimary, textMuted, bgCard, borderColor, linkColor } = useThemePalette();
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ['portal-detail', portal?.id],
    queryFn: () => portalAdminApi.get(portal!.id),
    enabled: !!portal?.id && open,
  });

  const mutateRespond = useMutation({
    mutationFn: (vals: any) => portalAdminApi.respondTicket(selectedTicket!.id, vals),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portal-detail', portal?.id] });
      qc.invalidateQueries({ queryKey: ['portal-tickets'] });
      setRespondModal(false);
    },
  });

  const portalUrl = portal ? `${window.location.origin}/portal/${portal.token}` : '';

  const ticketCols = [
    {
      title: 'Tiêu đề',
      dataIndex: 'title',
      render: (v: string) => <Text style={{ color: textPrimary }}>{v}</Text>,
    },
    {
      title: 'Ưu tiên', dataIndex: 'priority', width: 90,
      render: (v: string) => <Tag color={PRIORITY_COLOR[v]}>{v}</Tag>,
    },
    {
      title: 'Trạng thái', dataIndex: 'status', width: 130,
      render: (v: TicketStatus) => (
        <Tag color={TICKET_STATUS_COLOR[v]}>{TICKET_STATUS_LABEL[v]}</Tag>
      ),
    },
    {
      title: 'Gửi bởi', dataIndex: 'submittedBy', width: 120,
      render: (v: string) => <Text style={{ color: textMuted }}>{v || '—'}</Text>,
    },
    {
      title: 'Ngày', dataIndex: 'createdAt', width: 110,
      render: (v: string) => <Text style={{ color: textMuted }}>{new Date(v).toLocaleDateString('vi-VN')}</Text>,
    },
    {
      title: '', width: 60,
      render: (_: any, r: CustomerTicket) => (
        <Button
          type="text" size="small" icon={<MessageOutlined />}
          onClick={() => { setSelectedTicket(r); setRespondModal(true); }}
        />
      ),
    },
  ];

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={760}
      title={
        <Space>
          <GlobalOutlined style={{ color: linkColor }} />
          <Text style={{ color: textPrimary, fontWeight: 600 }}>{portal?.name}</Text>
          <Tag color={portal?.isActive ? 'success' : 'default'}>{portal?.isActive ? 'Active' : 'Inactive'}</Tag>
        </Space>
      }
      styles={{ body: { background: isDark ? '#0F172A' : '#F8FAFC' } }}
    >
      {portal && (
        <>
          <div style={{ background: bgCard, border: `1px solid ${borderColor}`, borderRadius: 8, padding: 16, marginBottom: 20 }}>
            <Text style={{ color: textMuted, fontSize: 12, display: 'block', marginBottom: 6 }}>Link portal cho khách hàng</Text>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Text style={{ color: linkColor, fontSize: 13, flex: 1, wordBreak: 'break-all' }}>{portalUrl}</Text>
              <Tooltip title="Copy link">
                <Button size="small" icon={<CopyOutlined />} onClick={() => copyLink(portal.token)}>Copy</Button>
              </Tooltip>
              <Button size="small" icon={<EyeOutlined />} onClick={() => window.open(`/portal/${portal.token}`, '_blank')}>Preview</Button>
            </div>
          </div>

          <Descriptions size="small" column={2} style={{ marginBottom: 20 }}>
            <Descriptions.Item label="Khách hàng">
              <Text style={{ color: textPrimary }}>{portal.customer?.name}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Hết hạn">
              <Text style={{ color: textMuted }}>{portal.expiresAt ? new Date(portal.expiresAt).toLocaleDateString('vi-VN') : 'Không giới hạn'}</Text>
            </Descriptions.Item>
          </Descriptions>

          <Text style={{ color: textPrimary, fontWeight: 600, display: 'block', marginBottom: 12 }}>
            Tickets ({data?.tickets?.length ?? 0})
          </Text>
          <Table
            rowKey="id"
            columns={ticketCols}
            dataSource={data?.tickets ?? []}
            size="small"
            pagination={{ pageSize: 10 }}
          />

          <RespondModal
            ticket={selectedTicket}
            open={respondModal}
            onCancel={() => setRespondModal(false)}
            onOk={mutateRespond.mutate}
            loading={mutateRespond.isPending}
          />
        </>
      )}
    </Drawer>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function PortalManagePage() {
  const [drawerPortal, setDrawerPortal] = useState<CustomerPortal | null>(null);
  const [drawerOpen, setDrawerOpen]     = useState(false);
  const [modalOpen, setModalOpen]       = useState(false);
  const [editing, setEditing]           = useState<CustomerPortal | null>(null);
  const [ticketStatus, setTicketStatus] = useState<string | undefined>();
  const [form] = Form.useForm();
  const { isDark, textPrimary, textMuted, bgCard, borderColor, linkColor } = useThemePalette();
  const qc = useQueryClient();

  const { data: portals = [], isLoading } = useQuery({
    queryKey: ['portals'],
    queryFn: () => portalAdminApi.list(),
  });
  const { data: allTickets = [] } = useQuery({
    queryKey: ['portal-tickets', ticketStatus],
    queryFn: () => portalAdminApi.allTickets(undefined, ticketStatus),
  });

  const openTickets  = allTickets.filter(t => t.status === 'OPEN').length;
  const activePortals = portals.filter(p => p.isActive).length;

  const mutateSave = useMutation({
    mutationFn: (vals: any) => editing
      ? portalAdminApi.update(editing.id, vals)
      : portalAdminApi.create(vals),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portals'] });
      setModalOpen(false); form.resetFields(); setEditing(null);
    },
  });

  const mutateDelete = useMutation({
    mutationFn: portalAdminApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portals'] }),
  });

  const openEdit = (p: CustomerPortal) => {
    setEditing(p);
    form.setFieldsValue({ name: p.name, isActive: p.isActive, welcomeMessage: p.welcomeMessage ?? '' });
    setModalOpen(true);
  };

  const openCreate = () => { setEditing(null); form.resetFields(); setModalOpen(true); };

  const portalCols = [
    {
      title: 'Tên portal',
      render: (_: any, r: CustomerPortal) => (
        <div>
          <Text
            style={{ color: linkColor, fontWeight: 600, cursor: 'pointer' }}
            onClick={() => { setDrawerPortal(r); setDrawerOpen(true); }}
          >
            {r.name}
          </Text>
          <br />
          <Text style={{ color: textMuted, fontSize: 12 }}>{r.customer?.name}</Text>
        </div>
      ),
    },
    {
      title: 'Token link', dataIndex: 'token', width: 200,
      render: (t: string) => (
        <Space>
          <Text style={{ color: textMuted, fontSize: 12 }}>{t.slice(0, 14)}…</Text>
          <Tooltip title="Copy link">
            <Button type="text" size="small" icon={<CopyOutlined />} onClick={() => copyLink(t)} />
          </Tooltip>
        </Space>
      ),
    },
    {
      title: 'Trạng thái', dataIndex: 'isActive', width: 100,
      render: (v: boolean) => <Tag color={v ? 'success' : 'default'}>{v ? 'Active' : 'Inactive'}</Tag>,
    },
    {
      title: 'Tickets', width: 80,
      render: (_: any, r: CustomerPortal) => (
        <Badge count={r._count?.tickets ?? 0} style={{ backgroundColor: '#6366F1' }} />
      ),
    },
    {
      title: 'Hết hạn', dataIndex: 'expiresAt', width: 120,
      render: (v: string) => <Text style={{ color: textMuted }}>{v ? new Date(v).toLocaleDateString('vi-VN') : '∞'}</Text>,
    },
    {
      title: '', width: 80,
      render: (_: any, r: CustomerPortal) => (
        <Space>
          <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          <Popconfirm
            title="Xóa portal này?"
            onConfirm={() => confirmDelete({ itemName: r.name, onConfirm: () => mutateDelete.mutate(r.id) })}
            okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}
          >
            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const ticketCols = [
    {
      title: 'Tiêu đề',
      render: (_: any, r: CustomerTicket) => (
        <div>
          <Text style={{ color: textPrimary }}>{r.title}</Text>
          <br />
          <Text style={{ color: textMuted, fontSize: 12 }}>{r.portal?.customer?.name} · {r.portal?.name}</Text>
        </div>
      ),
    },
    { title: 'Ưu tiên', dataIndex: 'priority', width: 90, render: (v: string) => <Tag color={PRIORITY_COLOR[v]}>{v}</Tag> },
    {
      title: 'Trạng thái', dataIndex: 'status', width: 130,
      render: (v: TicketStatus) => <Tag color={TICKET_STATUS_COLOR[v]}>{TICKET_STATUS_LABEL[v]}</Tag>,
    },
    { title: 'Gửi bởi', dataIndex: 'submittedBy', width: 120, render: (v: string) => <Text style={{ color: textMuted }}>{v || '—'}</Text> },
    { title: 'Ngày', dataIndex: 'createdAt', width: 110, render: (v: string) => <Text style={{ color: textMuted }}>{new Date(v).toLocaleDateString('vi-VN')}</Text> },
  ];

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Customer Portal"
        icon={<GlobalOutlined />}
        iconColor="#6366F1"
        actions={<Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Tạo portal mới</Button>}
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <StatCard label="Tổng portals" value={portals.length} color="#6366F1" icon={<GlobalOutlined />} />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard label="Đang active" value={activePortals} color="#10B981" icon={<CheckCircleOutlined />} />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard label="Tickets mới" value={openTickets} color="#EF4444" icon={<MessageOutlined />} />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard label="Tổng tickets" value={allTickets.length} color="#F59E0B" icon={<ClockCircleOutlined />} />
        </Col>
      </Row>

      <Tabs defaultActiveKey="portals" items={[
        {
          key: 'portals',
          label: `Portals (${portals.length})`,
          children: (
            <Table
              rowKey="id"
              columns={portalCols}
              dataSource={portals}
              loading={isLoading}
              pagination={{ pageSize: 10 }}
              size="middle"
            />
          ),
        },
        {
          key: 'tickets',
          label: <span>Tickets {openTickets > 0 && <Badge count={openTickets} style={{ marginLeft: 6, backgroundColor: '#EF4444' }} />}</span>,
          children: (
            <>
              <FilterBar>
                <Select
                  placeholder="Tất cả trạng thái"
                  allowClear
                  value={ticketStatus}
                  onChange={setTicketStatus}
                  options={Object.entries(TICKET_STATUS_LABEL).map(([k, v]) => ({ value: k, label: v }))}
                  style={{ width: 180 }}
                />
              </FilterBar>
              <Table
                rowKey="id"
                columns={ticketCols}
                dataSource={allTickets}
                pagination={{ pageSize: 15 }}
                size="middle"
              />
            </>
          ),
        },
      ]} />

      {/* Portal Detail Drawer */}
      <PortalDrawer portal={drawerPortal} open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* Create/Edit Modal */}
      <CenteredModal
        title={editing ? 'Cập nhật portal' : 'Tạo portal mới'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); setEditing(null); }}
        onOk={form.submit}
        confirmLoading={mutateSave.isPending}
        okText={editing ? 'Cập nhật' : 'Tạo'}
      >
        <Form form={form} layout="vertical" onFinish={mutateSave.mutate}>
          <Form.Item name="name" label="Tên portal" rules={[{ required: true }]}>
            <Input placeholder="VNG Portal, FPT Implementation Portal..." />
          </Form.Item>
          {!editing && (
            <Form.Item name="customerId" label="Khách hàng" rules={[{ required: true }]}>
              <Input placeholder="ID khách hàng (từ CRM Customers)" />
            </Form.Item>
          )}
          <Form.Item name="welcomeMessage" label="Lời chào">
            <Input.TextArea rows={3} placeholder="Chào mừng đến portal của [Tên công ty]..." />
          </Form.Item>
          <Form.Item name="expiresAt" label="Hết hạn (để trống = không giới hạn)">
            <Input type="date" />
          </Form.Item>
          {editing && (
            <Form.Item name="isActive" label="Trạng thái" valuePropName="checked">
              <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
            </Form.Item>
          )}
        </Form>
      </CenteredModal>
    </div>
  );
}
