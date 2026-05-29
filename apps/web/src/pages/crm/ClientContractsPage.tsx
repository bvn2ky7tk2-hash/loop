import { useState } from 'react';
import {
  Table, Button, Form, Input, Select, DatePicker, InputNumber,
  Space, Tag, Drawer, Descriptions, Progress, App, Popconfirm, theme,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, FileTextOutlined,
  CheckCircleOutlined, ClockCircleOutlined, DollarOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { clientContractsApi, type ClientContract, type ClientContractType, type ClientContractStatus, type MilestoneStatus, type ContractMilestone } from '../../api/client-contracts';
import { useThemePalette } from '../../hooks/useThemePalette';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { FilterBar } from '../../components/FilterBar';
import { confirmDelete } from '../../components/ui/confirmDelete';
import { formatNumber } from '../../utils/format';
import { apiClient } from '../../api/client';

// ── Constants ─────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<ClientContractType, string> = {
  SERVICE: 'Dịch vụ', PRODUCT: 'Sản phẩm', SUPPORT: 'Hỗ trợ', SLA: 'SLA', OTHER: 'Khác',
};
const TYPE_HUE: Record<ClientContractType, string> = {
  SERVICE: '#6366F1', PRODUCT: '#0EA5E9', SUPPORT: '#10B981', SLA: '#F59E0B', OTHER: '#94A3B8',
};

const STATUS_LABELS: Record<ClientContractStatus, string> = {
  DRAFT: 'Nháp', ACTIVE: 'Đang hiệu lực', COMPLETED: 'Hoàn thành', CANCELLED: 'Đã hủy',
};
const STATUS_HUE: Record<ClientContractStatus, string> = {
  DRAFT: '#94A3B8', ACTIVE: '#10B981', COMPLETED: '#6366F1', CANCELLED: '#EF4444',
};

const MILESTONE_STATUS_LABELS: Record<MilestoneStatus, string> = {
  PENDING: 'Chưa xuất', INVOICED: 'Đã xuất hóa đơn', PAID: 'Đã thanh toán',
};
const MILESTONE_STATUS_COLOR: Record<MilestoneStatus, string> = {
  PENDING: 'default', INVOICED: 'processing', PAID: 'success',
};

// ── Milestone Table ───────────────────────────────────────────────────────────

function MilestoneSection({ contract }: { contract: ClientContract }) {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const { token } = theme.useToken();
  const { textPrimary, textMuted, borderColor } = useThemePalette();
  const [form] = Form.useForm();
  const [addOpen, setAddOpen] = useState(false);

  const paidAmount = contract.milestones.filter(m => m.status === 'PAID').reduce((s, m) => s + Number(m.amount), 0);
  const totalAmount = contract.milestones.reduce((s, m) => s + Number(m.amount), 0);
  const pct = totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0;

  const addMutation = useMutation({
    mutationFn: (data: Parameters<typeof clientContractsApi.addMilestone>[1]) =>
      clientContractsApi.addMilestone(contract.id, data),
    onSuccess: () => { message.success('Đã thêm milestone'); setAddOpen(false); form.resetFields(); void qc.invalidateQueries({ queryKey: ['client-contracts'] }); },
    onError: () => message.error('Thêm thất bại'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ milestoneId, data }: { milestoneId: string; data: { status: MilestoneStatus; paidAt?: string } }) =>
      clientContractsApi.updateMilestone(contract.id, milestoneId, data),
    onSuccess: () => { message.success('Đã cập nhật'); void qc.invalidateQueries({ queryKey: ['client-contracts'] }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (milestoneId: string) => clientContractsApi.deleteMilestone(contract.id, milestoneId),
    onSuccess: () => { message.success('Đã xóa'); void qc.invalidateQueries({ queryKey: ['client-contracts'] }); },
  });

  const cols: ColumnsType<ContractMilestone> = [
    {
      title: 'Tên milestone', dataIndex: 'name', key: 'name',
      render: (v: string) => <span style={{ color: textPrimary, fontWeight: 500 }}>{v}</span>,
    },
    {
      title: 'Hạn', dataIndex: 'dueDate', key: 'dueDate',
      render: (v: string) => {
        const overdue = dayjs(v).isBefore(dayjs(), 'day');
        return <span style={{ color: overdue ? '#EF4444' : textMuted }}>{dayjs(v).format('DD/MM/YYYY')}</span>;
      },
    },
    {
      title: 'Giá trị', dataIndex: 'amount', key: 'amount',
      render: (v: number) => <span style={{ color: textPrimary, fontWeight: 600 }}>{formatNumber(v)} đ</span>,
    },
    {
      title: 'Trạng thái', dataIndex: 'status', key: 'status',
      render: (v: MilestoneStatus) => (
        <Tag color={MILESTONE_STATUS_COLOR[v]}>{MILESTONE_STATUS_LABELS[v]}</Tag>
      ),
    },
    {
      title: '', key: 'actions', width: 120,
      render: (_: unknown, ms: ContractMilestone) => (
        <Space size={4}>
          {ms.status === 'PENDING' && (
            <Button size="small" type="link" icon={<CheckCircleOutlined />}
              onClick={() => updateMutation.mutate({ milestoneId: ms.id, data: { status: 'INVOICED' } })}
            >Xuất HĐ</Button>
          )}
          {ms.status === 'INVOICED' && (
            <Button size="small" type="link" icon={<DollarOutlined />} style={{ color: '#10B981' }}
              onClick={() => updateMutation.mutate({ milestoneId: ms.id, data: { status: 'PAID', paidAt: dayjs().format('YYYY-MM-DD') } })}
            >Thanh toán</Button>
          )}
          <Popconfirm title="Xóa milestone?" onConfirm={() => deleteMutation.mutate(ms.id)} okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}>
            <Button size="small" type="link" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Space>
          <span style={{ fontWeight: 600, color: textPrimary }}>Lịch thanh toán</span>
          {totalAmount > 0 && (
            <span style={{ color: textMuted, fontSize: 12 }}>
              Đã thu: {formatNumber(paidAmount)} / {formatNumber(totalAmount)} đ
            </span>
          )}
        </Space>
        <Button icon={<PlusOutlined />} size="small" onClick={() => setAddOpen(true)}>Thêm milestone</Button>
      </div>

      {totalAmount > 0 && (
        <Progress percent={pct} strokeColor="#10B981" style={{ marginBottom: 12 }}
          format={(p) => `${p}% đã thu`}
        />
      )}

      <Table
        dataSource={contract.milestones} columns={cols} rowKey="id"
        size="small" pagination={false}
        locale={{ emptyText: 'Chưa có milestone' }}
      />

      {/* Add milestone form */}
      {addOpen && (
        <div style={{ marginTop: 16, padding: 16, background: token.colorFillAlter, borderRadius: 8, border: `1px solid ${borderColor}` }}>
          <Form form={form} layout="inline" style={{ flexWrap: 'wrap', gap: 8 }}
            onFinish={(v) => addMutation.mutate({ ...v, dueDate: v.dueDate.format('YYYY-MM-DD') })}
          >
            <Form.Item name="name" rules={[{ required: true, message: 'Nhập tên' }]}>
              <Input placeholder="Tên milestone" style={{ width: 180 }} />
            </Form.Item>
            <Form.Item name="dueDate" rules={[{ required: true, message: 'Chọn hạn' }]}>
              <DatePicker format="DD/MM/YYYY" placeholder="Hạn" style={{ width: 140 }} />
            </Form.Item>
            <Form.Item name="amount" rules={[{ required: true, message: 'Nhập giá trị' }]}>
              <InputNumber placeholder="Giá trị (VNĐ)" style={{ width: 160 }} min={0} formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
            </Form.Item>
            <Form.Item name="notes">
              <Input placeholder="Ghi chú" style={{ width: 160 }} />
            </Form.Item>
            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit" loading={addMutation.isPending} disabled={addMutation.isPending} size="small">Lưu</Button>
                <Button size="small" onClick={() => { setAddOpen(false); form.resetFields(); }}>Hủy</Button>
              </Space>
            </Form.Item>
          </Form>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ClientContractsPage() {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const { textPrimary, textMuted, bgCard, borderColor } = useThemePalette();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ClientContractStatus | ''>('');
  const [selectedContract, setSelectedContract] = useState<ClientContract | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ClientContract | null>(null);
  const [form] = Form.useForm();

  // Customers for select
  const { data: customersRes } = useQuery({
    queryKey: ['customers-all'],
    queryFn: () => apiClient.get<{ data: { id: string; code: string; name: string }[] }>('/api/v1/crm/customers?limit=500').then(r => r.data.data),
  });

  const { data: stats } = useQuery({
    queryKey: ['client-contract-stats'],
    queryFn: clientContractsApi.stats,
  });

  const { data: contractsRes, isLoading } = useQuery({
    queryKey: ['client-contracts', statusFilter],
    queryFn: () => clientContractsApi.list({ status: statusFilter || undefined, limit: 200 }),
  });

  const createMutation = useMutation({
    mutationFn: clientContractsApi.create,
    onSuccess: () => {
      message.success('Đã tạo hợp đồng');
      setFormOpen(false); form.resetFields();
      void qc.invalidateQueries({ queryKey: ['client-contracts'] });
      void qc.invalidateQueries({ queryKey: ['client-contract-stats'] });
    },
    onError: () => message.error('Tạo thất bại'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => clientContractsApi.update(id, data),
    onSuccess: (updated) => {
      message.success('Đã cập nhật');
      setFormOpen(false); form.resetFields(); setEditing(null);
      void qc.invalidateQueries({ queryKey: ['client-contracts'] });
      if (selectedContract?.id === updated.id) setSelectedContract(updated);
    },
    onError: () => message.error('Cập nhật thất bại'),
  });

  const deleteMutation = useMutation({
    mutationFn: clientContractsApi.remove,
    onSuccess: () => {
      message.success('Đã xóa hợp đồng');
      void qc.invalidateQueries({ queryKey: ['client-contracts'] });
      void qc.invalidateQueries({ queryKey: ['client-contract-stats'] });
    },
    onError: () => message.error('Xóa thất bại'),
  });

  const contracts = (contractsRes?.data ?? []).filter(c =>
    !search || c.title.toLowerCase().includes(search.toLowerCase()) || c.customer.name.toLowerCase().includes(search.toLowerCase()) || (c.contractNo ?? '').toLowerCase().includes(search.toLowerCase())
  );

  function openCreate() { setEditing(null); form.resetFields(); setFormOpen(true); }
  function openEdit(c: ClientContract) {
    setEditing(c);
    form.setFieldsValue({
      ...c,
      startDate: dayjs(c.startDate),
      endDate:   c.endDate   ? dayjs(c.endDate)   : null,
      signedAt:  c.signedAt  ? dayjs(c.signedAt)  : null,
    });
    setFormOpen(true);
  }

  function handleFormFinish(v: any) {
    const data = {
      ...v,
      startDate: v.startDate?.format('YYYY-MM-DD'),
      endDate:   v.endDate?.format('YYYY-MM-DD'),
      signedAt:  v.signedAt?.format('YYYY-MM-DD'),
    };
    if (editing) updateMutation.mutate({ id: editing.id, data });
    else createMutation.mutate(data);
  }

  const cols: ColumnsType<ClientContract> = [
    {
      title: 'Số HĐ / Tiêu đề', key: 'title',
      render: (_, c) => (
        <div>
          <div style={{ fontWeight: 600, color: textPrimary }}>{c.title}</div>
          {c.contractNo && <div style={{ fontSize: 11, color: textMuted }}>{c.contractNo}</div>}
        </div>
      ),
    },
    {
      title: 'Khách hàng', key: 'customer',
      render: (_, c) => <span style={{ color: textPrimary }}>{c.customer.name}</span>,
    },
    {
      title: 'Loại', dataIndex: 'type', key: 'type',
      render: (v: ClientContractType) => (
        <Tag style={{ color: TYPE_HUE[v], background: `${TYPE_HUE[v]}18`, border: `1px solid ${TYPE_HUE[v]}40` }}>
          {TYPE_LABELS[v]}
        </Tag>
      ),
    },
    {
      title: 'Giá trị', dataIndex: 'value', key: 'value',
      render: (v?: number) => v ? <span style={{ color: textPrimary, fontWeight: 600 }}>{formatNumber(v)} đ</span> : <span style={{ color: textMuted }}>—</span>,
    },
    {
      title: 'Thời hạn', key: 'period',
      render: (_, c) => (
        <span style={{ color: textMuted, fontSize: 12 }}>
          {dayjs(c.startDate).format('DD/MM/YY')}
          {c.endDate ? ` – ${dayjs(c.endDate).format('DD/MM/YY')}` : ''}
        </span>
      ),
    },
    {
      title: 'Milestone', key: 'milestone',
      render: (_, c) => {
        const paid = c.milestones.filter(m => m.status === 'PAID').length;
        const total = c.milestones.length;
        if (total === 0) return <span style={{ color: textMuted }}>—</span>;
        return <Tag icon={<ClockCircleOutlined />}>{paid}/{total} đã thu</Tag>;
      },
    },
    {
      title: 'Trạng thái', dataIndex: 'status', key: 'status',
      render: (v: ClientContractStatus) => (
        <Tag style={{ color: STATUS_HUE[v], background: `${STATUS_HUE[v]}18`, border: `1px solid ${STATUS_HUE[v]}40` }}>
          {STATUS_LABELS[v]}
        </Tag>
      ),
    },
    {
      title: '', key: 'actions', width: 100,
      render: (_, c) => (
        <Space size={4}>
          <Button size="small" type="link" icon={<FileTextOutlined />}
            onClick={() => { setSelectedContract(c); setDrawerOpen(true); }}
          />
          <Button size="small" type="link" icon={<EditOutlined />} onClick={() => openEdit(c)} />
          <Popconfirm
            title={`Xóa "${c.title}"?`}
            onConfirm={() => deleteMutation.mutate(c.id)}
            okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}
          >
            <Button size="small" type="link" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Hợp đồng khách hàng"
        icon={<FileTextOutlined />}
        iconColor="#6366F1"
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Tạo hợp đồng
          </Button>
        }
      />

      {/* Stats */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <StatCard label="Tổng hợp đồng" value={stats?.total ?? 0} color="#6366F1" icon={<FileTextOutlined />} style={{ flex: '1 1 160px' }} />
        <StatCard label="Đang hiệu lực" value={stats?.byStatus?.ACTIVE ?? 0} color="#10B981" icon={<CheckCircleOutlined />} style={{ flex: '1 1 160px' }} />
        <StatCard label="Hoàn thành" value={stats?.byStatus?.COMPLETED ?? 0} color="#3B82F6" icon={<CheckCircleOutlined />} style={{ flex: '1 1 160px' }} />
        <StatCard
          label="Tổng giá trị HĐ"
          value={`${formatNumber(Math.round((stats?.activeValue ?? 0) / 1_000_000))}M đ`}
          color="#F97316" icon={<DollarOutlined />} style={{ flex: '1 1 160px' }}
        />
      </div>

      {/* Filters */}
      <FilterBar>
        <Input prefix={<DeleteOutlined style={{ color: '#94A3B8' }} />} placeholder="Tìm tiêu đề, số HĐ, khách hàng..."
          value={search} onChange={e => setSearch(e.target.value)} style={{ width: 280 }}
          allowClear
        />
        <Select
          placeholder="Trạng thái" allowClear style={{ width: 160 }}
          value={statusFilter || undefined} onChange={v => setStatusFilter(v ?? '')}
          options={Object.entries(STATUS_LABELS).map(([k, v]) => ({ value: k, label: v }))}
        />
      </FilterBar>

      <Table
        dataSource={contracts} columns={cols} rowKey="id"
        loading={isLoading} size="small"
        pagination={{ pageSize: 20, showTotal: t => `${t} hợp đồng` }}
        onRow={(c) => ({ style: { cursor: 'pointer' }, onClick: () => { setSelectedContract(c); setDrawerOpen(true); } })}
      />

      {/* Detail Drawer */}
      <Drawer
        title={selectedContract?.title}
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setSelectedContract(null); }}
        width={680}
        extra={
          selectedContract && (
            <Button icon={<EditOutlined />} onClick={() => { openEdit(selectedContract); setDrawerOpen(false); }}>
              Chỉnh sửa
            </Button>
          )
        }
      >
        {selectedContract && (
          <div>
            <Descriptions column={2} size="small" bordered style={{ marginBottom: 24 }}>
              <Descriptions.Item label="Số HĐ">{selectedContract.contractNo ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Loại">
                <Tag style={{ color: TYPE_HUE[selectedContract.type], background: `${TYPE_HUE[selectedContract.type]}18` }}>
                  {TYPE_LABELS[selectedContract.type]}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Khách hàng">{selectedContract.customer.name}</Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                <Tag style={{ color: STATUS_HUE[selectedContract.status], background: `${STATUS_HUE[selectedContract.status]}18` }}>
                  {STATUS_LABELS[selectedContract.status]}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Giá trị HĐ">
                {selectedContract.value ? `${formatNumber(selectedContract.value)} ${selectedContract.currency}` : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Ngày ký">
                {selectedContract.signedAt ? dayjs(selectedContract.signedAt).format('DD/MM/YYYY') : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Bắt đầu">{dayjs(selectedContract.startDate).format('DD/MM/YYYY')}</Descriptions.Item>
              <Descriptions.Item label="Kết thúc">
                {selectedContract.endDate ? dayjs(selectedContract.endDate).format('DD/MM/YYYY') : '—'}
              </Descriptions.Item>
              {selectedContract.notes && (
                <Descriptions.Item label="Ghi chú" span={2}>{selectedContract.notes}</Descriptions.Item>
              )}
            </Descriptions>

            <MilestoneSection contract={selectedContract} />
          </div>
        )}
      </Drawer>

      {/* Create / Edit Modal */}
      <Drawer
        title={editing ? 'Chỉnh sửa hợp đồng' : 'Tạo hợp đồng mới'}
        open={formOpen}
        onClose={() => { setFormOpen(false); form.resetFields(); setEditing(null); }}
        width={560}
        extra={
          <Button type="primary" loading={createMutation.isPending || updateMutation.isPending} disabled={createMutation.isPending || updateMutation.isPending} onClick={() => form.submit()}>
            {editing ? 'Lưu thay đổi' : 'Tạo hợp đồng'}
          </Button>
        }
      >
        <Form form={form} layout="vertical" onFinish={handleFormFinish}>
          <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item name="contractNo" label="Số hợp đồng">
              <Input placeholder="HĐ-2026-001" />
            </Form.Item>
            <Form.Item name="type" label="Loại" rules={[{ required: true }]}>
              <Select options={Object.entries(TYPE_LABELS).map(([k, v]) => ({ value: k, label: v }))} />
            </Form.Item>
          </Space>

          <Form.Item name="title" label="Tiêu đề" rules={[{ required: true, message: 'Nhập tiêu đề' }]}>
            <Input />
          </Form.Item>

          <Form.Item name="customerId" label="Khách hàng" rules={[{ required: true, message: 'Chọn khách hàng' }]}>
            <Select
              showSearch placeholder="Chọn khách hàng..."
              filterOption={(input, opt) => (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())}
              options={customersRes?.map(c => ({ value: c.id, label: `${c.code} — ${c.name}` })) ?? []}
            />
          </Form.Item>

          <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item name="value" label="Giá trị (VNĐ)">
              <InputNumber style={{ width: '100%' }} min={0} formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
            </Form.Item>
            <Form.Item name="status" label="Trạng thái" rules={[{ required: true }]} initialValue="DRAFT">
              <Select options={Object.entries(STATUS_LABELS).map(([k, v]) => ({ value: k, label: v }))} />
            </Form.Item>
          </Space>

          <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item name="startDate" label="Ngày bắt đầu" rules={[{ required: true }]}>
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
            <Form.Item name="endDate" label="Ngày kết thúc">
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
          </Space>

          <Form.Item name="signedAt" label="Ngày ký">
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>

          <Form.Item name="notes" label="Ghi chú">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
}
