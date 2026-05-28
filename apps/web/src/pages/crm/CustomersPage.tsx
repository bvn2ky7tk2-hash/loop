import { useState } from 'react';
import {
  Table, Button, Space, Typography, Input, Form,
  Descriptions, Tag, Modal, message,
} from 'antd';
import { CenteredModal } from '../../components/ui/CenteredModal';
import {
  PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, ShopOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useThemeStore } from '../../store/theme.store';
import {
  useGetCustomers, useCreateCustomer, useUpdateCustomer, useDeleteCustomer,
  type Customer, type CustomerFilterDto,
} from '../../api/crm';

const { Title, Text } = Typography;

export default function CustomersPage() {
  const { mode, preset } = useThemeStore();
  const isDark = mode === 'dark';

  const bgContainer = isDark ? '#1E293B' : '#ffffff';
  const bgCard      = isDark ? '#2D3F56' : '#FAFAFA';
  const borderColor = isDark ? '#334155' : '#E2E8F0';
  const textPrimary = isDark ? '#F1F5F9' : '#0F172A';
  const textMuted   = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';
  const linkColor   = isDark ? '#93C5FD' : preset.primary;

  const [filters, setFilters] = useState<CustomerFilterDto>({ page: 1, limit: 20 });
  const [createOpen, setCreateOpen]   = useState(false);
  const [editOpen, setEditOpen]       = useState(false);
  const [detailOpen, setDetailOpen]   = useState(false);
  const [selected, setSelected]       = useState<Customer | null>(null);
  const [form] = Form.useForm();

  const { data, isLoading } = useGetCustomers(filters);
  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer();
  const deleteMutation = useDeleteCustomer();

  const handleCreate = async () => {
    const values = await form.validateFields();
    await createMutation.mutateAsync(values);
    message.success('Đã thêm khách hàng');
    form.resetFields();
    setCreateOpen(false);
  };

  const handleEdit = async () => {
    const values = await form.validateFields();
    if (!selected) return;
    await updateMutation.mutateAsync({ id: selected.id, data: values });
    message.success('Đã cập nhật');
    setEditOpen(false);
  };

  const handleDelete = (id: string, name: string) => {
    Modal.confirm({
      title: `Xoá khách hàng "${name}"?`,
      okType: 'danger',
      onOk: async () => {
        await deleteMutation.mutateAsync(id);
        message.success('Đã xoá');
      },
    });
  };

  const openEdit = (c: Customer) => {
    setSelected(c);
    form.setFieldsValue({ name: c.name, industry: c.industry, website: c.website, taxCode: c.taxCode });
    setEditOpen(true);
  };

  const columns: ColumnsType<Customer> = [
    {
      title: 'Mã KH', dataIndex: 'code', width: 100,
      render: (code: string) => <Text code style={{ color: preset.primary }}>{code}</Text>,
    },
    {
      title: 'Tên khách hàng', dataIndex: 'name',
      render: (name: string, row: Customer) => (
        <Button type="link" style={{ padding: 0, color: linkColor }} onClick={() => { setSelected(row); setDetailOpen(true); }}>
          {name}
        </Button>
      ),
    },
    { title: 'Ngành', dataIndex: 'industry', width: 160, render: (v?: string) => v ? <Text style={{ color: textPrimary }}>{v}</Text> : <Text style={{ color: textMuted }}>—</Text> },
    { title: 'Website', dataIndex: 'website', width: 200, render: (v?: string) => v ? <a href={v} target="_blank" rel="noreferrer" style={{ color: linkColor }}>{v}</a> : <Text style={{ color: textMuted }}>—</Text> },
    { title: 'MST', dataIndex: 'taxCode', width: 140, render: (v?: string) => v ? <Text style={{ color: textPrimary }}>{v}</Text> : <Text style={{ color: textMuted }}>—</Text> },
    {
      title: 'Liên hệ', key: 'contacts', width: 90, align: 'center',
      render: (_: unknown, row: Customer) => <Tag color="blue">{row._count?.contacts ?? 0}</Tag>,
    },
    {
      title: 'Deals', key: 'deals', width: 80, align: 'center',
      render: (_: unknown, row: Customer) => <Tag color="green">{row._count?.deals ?? 0}</Tag>,
    },
    {
      title: '', key: 'actions', width: 80, align: 'right',
      render: (_: unknown, row: Customer) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(row)} />
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(row.id, row.name)} />
        </Space>
      ),
    },
  ];

  const CustomerForm = () => (
    <Form form={form} layout="vertical">
      <Form.Item name="code" label="Mã KH" rules={[{ required: true }]}>
        <Input placeholder="VD: VNG" />
      </Form.Item>
      <Form.Item name="name" label="Tên khách hàng" rules={[{ required: true }]}>
        <Input />
      </Form.Item>
      <Form.Item name="industry" label="Ngành">
        <Input placeholder="VD: Technology" />
      </Form.Item>
      <Form.Item name="website" label="Website">
        <Input placeholder="https://..." />
      </Form.Item>
      <Form.Item name="taxCode" label="Mã số thuế">
        <Input />
      </Form.Item>
    </Form>
  );

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ShopOutlined style={{ color: '#DC2626', fontSize: 20 }} />
          <Title level={4} style={{ margin: 0, color: textPrimary }}>Khách hàng</Title>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setCreateOpen(true); }}
          style={{ background: preset.primary, borderColor: preset.primary }}>
          Thêm KH
        </Button>
      </div>

      <div style={{ marginBottom: 12 }}>
        <Input.Search
          placeholder="Tìm theo tên, mã, ngành..."
          prefix={<SearchOutlined />}
          style={{ width: 320 }}
          allowClear
          onSearch={(v) => setFilters(f => ({ ...f, search: v || undefined, page: 1 }))}
        />
      </div>

      <div style={{ background: bgContainer, borderRadius: 8, border: `1px solid ${borderColor}` }}>
        <Table<Customer>
          rowKey="id"
          columns={columns}
          dataSource={data?.data ?? []}
          loading={isLoading}
          pagination={{
            current: filters.page,
            pageSize: filters.limit,
            total: data?.total ?? 0,
            onChange: (page, limit) => setFilters(f => ({ ...f, page, limit })),
            showSizeChanger: true,
          }}
        />
      </div>

      {/* Create CenteredModal */}
      <CenteredModal title="Thêm khách hàng" open={createOpen} onClose={() => setCreateOpen(false)} width={480}
        extra={<Button type="primary" loading={createMutation.isPending} onClick={handleCreate}
          style={{ background: preset.primary, borderColor: preset.primary }}>Lưu</Button>}>
        <CustomerForm />
      </CenteredModal>

      {/* Edit CenteredModal */}
      <CenteredModal title="Sửa khách hàng" open={editOpen} onClose={() => setEditOpen(false)} width={480}
        extra={<Button type="primary" loading={updateMutation.isPending} onClick={handleEdit}
          style={{ background: preset.primary, borderColor: preset.primary }}>Cập nhật</Button>}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Tên khách hàng" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="industry" label="Ngành"><Input /></Form.Item>
          <Form.Item name="website" label="Website"><Input /></Form.Item>
          <Form.Item name="taxCode" label="Mã số thuế"><Input /></Form.Item>
        </Form>
      </CenteredModal>

      {/* Detail CenteredModal */}
      <CenteredModal title={selected?.name} open={detailOpen} onClose={() => setDetailOpen(false)} width={480}>
        {selected && (
          <Descriptions column={1} bordered size="small"
            labelStyle={{ background: bgCard, color: textMuted }}
            contentStyle={{ background: bgContainer, color: textPrimary }}>
            <Descriptions.Item label="Mã KH">{selected.code}</Descriptions.Item>
            <Descriptions.Item label="Ngành">{selected.industry ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="Website">{selected.website ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="MST">{selected.taxCode ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="Contacts">{selected._count?.contacts ?? 0}</Descriptions.Item>
            <Descriptions.Item label="Deals">{selected._count?.deals ?? 0}</Descriptions.Item>
          </Descriptions>
        )}
      </CenteredModal>
    </div>
  );
}
