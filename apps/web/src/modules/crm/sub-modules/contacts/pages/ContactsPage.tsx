import { useState, useEffect } from 'react';
import {
  Table, Button, Space, Typography, Input, Form,
  Select, message, Tag,
} from 'antd';
import { CenteredModal } from '../../components/ui/CenteredModal';
import { confirmDelete } from '../../components/ui/confirmDelete';
import { PlusOutlined, EditOutlined, DeleteOutlined, ContactsOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useThemePalette } from '../../hooks/useThemePalette';
import { usePagination } from '../../hooks/usePagination';
import {
  useGetContacts, useCreateContact, useUpdateContact, useDeleteContact,
  useGetCustomers, type Contact, type ContactFilterDto,
} from '../../api/crm';

const { Title, Text } = Typography;

export default function ContactsPage() {
  const { isDark, bgContainer, borderColor, textPrimary, textMuted, linkColor, preset } = useThemePalette();

  const { page, pageSize, resetPage, paginationProps } = usePagination(20);
  const [search, setSearch] = useState<string | undefined>();
  const [customerIdFilter, setCustomerIdFilter] = useState<string | undefined>();
  const filters: ContactFilterDto = { page, limit: pageSize, search, customerId: customerIdFilter };

  useEffect(() => { resetPage(); }, [search, customerIdFilter, resetPage]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing]       = useState<Contact | null>(null);
  const [form] = Form.useForm();

  const { data, isLoading }           = useGetContacts(filters);
  const { data: customersData }       = useGetCustomers({ limit: 200 });
  const customers = customersData?.data ?? [];

  const createMutation = useCreateContact();
  const updateMutation = useUpdateContact();
  const deleteMutation = useDeleteContact();

  const openCreate = () => { setEditing(null); form.resetFields(); setDrawerOpen(true); };
  const openEdit   = (c: Contact) => {
    setEditing(c);
    form.setFieldsValue({ name: c.name, email: c.email, phone: c.phone, title: c.title, customerId: c.customerId });
    setDrawerOpen(true);
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, data: values });
      message.success('Đã cập nhật');
    } else {
      await createMutation.mutateAsync(values);
      message.success('Đã thêm liên hệ');
    }
    setDrawerOpen(false);
  };

  const handleDelete = (id: string, name: string) => {
    confirmDelete({
      itemName: name,
      onConfirm: async () => { await deleteMutation.mutateAsync(id); message.success('Đã xoá'); },
    });
  };

  const columns: ColumnsType<Contact> = [
    {
      title: 'Tên', dataIndex: 'name',
      render: (name: string) => <Text style={{ color: textPrimary, fontWeight: 500 }}>{name}</Text>,
    },
    { title: 'Chức danh', dataIndex: 'title', width: 160, render: (v?: string) => v ? <Text style={{ color: textPrimary }}>{v}</Text> : <Text style={{ color: textMuted }}>—</Text> },
    {
      title: 'Email', dataIndex: 'email', width: 220,
      render: (v?: string) => v ? <a href={`mailto:${v}`} style={{ color: linkColor }}>{v}</a> : <Text style={{ color: textMuted }}>—</Text>,
    },
    { title: 'Điện thoại', dataIndex: 'phone', width: 140, render: (v?: string) => v ? <Text style={{ color: textPrimary }}>{v}</Text> : <Text style={{ color: textMuted }}>—</Text> },
    {
      title: 'Khách hàng', dataIndex: ['customer', 'name'], width: 200,
      render: (_: unknown, row: Contact) => row.customer
        ? <Tag style={isDark ? { background: 'rgba(96,165,250,0.15)', color: '#93C5FD', borderColor: 'rgba(96,165,250,0.3)' } : {}} color={isDark ? undefined : 'blue'}>{row.customer.name}</Tag>
        : <Text style={{ color: textMuted }}>—</Text>,
    },
    {
      title: '', key: 'actions', width: 80, align: 'right',
      render: (_: unknown, row: Contact) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(row)} />
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(row.id, row.name)} />
        </Space>
      ),
    },
  ];

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ContactsOutlined style={{ color: '#DC2626', fontSize: 20 }} />
          <Title level={4} style={{ margin: 0, color: textPrimary }}>Liên hệ</Title>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}
          style={{ background: preset.primary, borderColor: preset.primary }}>
          Thêm liên hệ
        </Button>
      </div>

      <div style={{ marginBottom: 12, display: 'flex', gap: 8 }}>
        <Input.Search
          placeholder="Tìm theo tên, email..."
          style={{ width: 280 }}
          allowClear
          onSearch={(v) => setSearch(v || undefined)}
        />
        <Select
          placeholder="Khách hàng"
          style={{ width: 200 }}
          allowClear
          showSearch
          optionFilterProp="label"
          options={customers.map(c => ({ value: c.id, label: c.name }))}
          onChange={(v) => setCustomerIdFilter(v)}
        />
      </div>

      <div style={{ background: bgContainer, borderRadius: 8, border: `1px solid ${borderColor}` }}>
        <Table<Contact>
          rowKey="id"
          columns={columns}
          dataSource={data?.data ?? []}
          loading={isLoading}
          pagination={paginationProps(data?.total ?? 0, 'liên hệ')}
        />
      </div>

      <CenteredModal
        title={editing ? 'Sửa liên hệ' : 'Thêm liên hệ'}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={440}
        extra={
          <Button type="primary" loading={isPending} disabled={isPending} onClick={handleSave}
            style={{ background: preset.primary, borderColor: preset.primary }}>
            {editing ? 'Cập nhật' : 'Lưu'}
          </Button>
        }
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Tên" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="title" label="Chức danh"><Input placeholder="CEO, Sales Manager..." /></Form.Item>
          <Form.Item name="email" label="Email" rules={[{ type: 'email' }]}><Input /></Form.Item>
          <Form.Item name="phone" label="Điện thoại"><Input /></Form.Item>
          <Form.Item name="customerId" label="Khách hàng">
            <Select
              allowClear showSearch optionFilterProp="label"
              placeholder="Chọn khách hàng"
              options={customers.map(c => ({ value: c.id, label: c.name }))}
            />
          </Form.Item>
        </Form>
      </CenteredModal>
    </div>
  );
}
