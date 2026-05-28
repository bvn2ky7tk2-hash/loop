import { useState } from 'react';
import {
  Table, Button, Space, Typography, Select, Form,
  Input, InputNumber, Tag, Modal, message,
} from 'antd';
import { CenteredModal } from '../../components/ui/CenteredModal';
import { PlusOutlined, EditOutlined, DeleteOutlined, FunnelPlotOutlined, SwapOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useThemeStore } from '../../store/theme.store';
import { usersApi } from '../../api/users';
import { useQuery } from '@tanstack/react-query';
import {
  useGetLeads, useCreateLead, useUpdateLead, useConvertLead, useDeleteLead,
  useGetCustomers,
  type Lead, type LeadFilterDto, type LeadSource, type LeadStatus,
} from '../../api/crm';
import { useAuthStore } from '../../store/auth.store';

const { Title, Text } = Typography;
const { TextArea } = Input;

const SOURCE_META: Record<LeadSource, { label: string; color: string }> = {
  WEBSITE:      { label: 'Website',       color: 'blue' },
  REFERRAL:     { label: 'Giới thiệu',    color: 'green' },
  SOCIAL:       { label: 'Mạng xã hội',  color: 'purple' },
  EVENT:        { label: 'Sự kiện',       color: 'orange' },
  COLD_OUTREACH:{ label: 'Cold Outreach', color: 'cyan' },
  OTHER:        { label: 'Khác',          color: 'default' },
};

const STATUS_META: Record<LeadStatus, { label: string; color: string }> = {
  NEW:       { label: 'Mới',         color: 'default' },
  CONTACTED: { label: 'Đã liên hệ', color: 'blue' },
  QUALIFIED: { label: 'Qualified',   color: 'green' },
  CONVERTED: { label: 'Converted',   color: 'purple' },
  LOST:      { label: 'Lost',        color: 'red' },
};

const STATUS_OPTIONS = Object.entries(STATUS_META).map(([k, v]) => ({ value: k as LeadStatus, label: v.label }));
const SOURCE_OPTIONS = Object.entries(SOURCE_META).map(([k, v]) => ({ value: k as LeadSource, label: v.label }));

export default function LeadsPage() {
  const { mode, preset } = useThemeStore();
  const isDark = mode === 'dark';
  const { user }  = useAuthStore();

  const bgContainer = isDark ? '#1E293B' : '#ffffff';
  const bgCard      = isDark ? '#2D3F56' : '#FAFAFA';
  const borderColor = isDark ? '#334155' : '#E2E8F0';
  const textPrimary = isDark ? '#F1F5F9' : '#0F172A';
  const textMuted   = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';

  const [filters, setFilters] = useState<LeadFilterDto>({ page: 1, limit: 20 });
  const [drawerOpen, setDrawerOpen]     = useState(false);
  const [convertOpen, setConvertOpen]   = useState(false);
  const [editing, setEditing]           = useState<Lead | null>(null);
  const [converting, setConverting]     = useState<Lead | null>(null);
  const [form] = Form.useForm();
  const [convertForm] = Form.useForm();

  const { data, isLoading }     = useGetLeads(filters);
  const { data: usersData = [] } = useQuery({ queryKey: ['users'], queryFn: usersApi.list });
  const { data: customersData } = useGetCustomers({ limit: 200 });
  const customers = customersData?.data ?? [];

  const createMutation  = useCreateLead();
  const updateMutation  = useUpdateLead();
  const convertMutation = useConvertLead();
  const deleteMutation  = useDeleteLead();

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldValue('assigneeId', user?.id);
    form.setFieldValue('currency', 'VND');
    setDrawerOpen(true);
  };

  const openEdit = (lead: Lead) => {
    setEditing(lead);
    form.setFieldsValue({
      title: lead.title,
      source: lead.source,
      status: lead.status,
      estimatedValue: lead.estimatedValue ? Number(lead.estimatedValue) : undefined,
      currency: lead.currency,
      assigneeId: lead.assigneeId,
      notes: lead.notes,
    });
    setDrawerOpen(true);
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, data: values });
      message.success('Đã cập nhật lead');
    } else {
      await createMutation.mutateAsync(values);
      message.success('Đã thêm lead mới');
    }
    setDrawerOpen(false);
  };

  const openConvert = (lead: Lead) => {
    setConverting(lead);
    convertForm.resetFields();
    convertForm.setFieldValue('dealTitle', lead.title);
    setConvertOpen(true);
  };

  const handleConvert = async () => {
    const values = await convertForm.validateFields();
    if (!converting) return;
    await convertMutation.mutateAsync({ id: converting.id, data: values });
    message.success('Đã convert thành Deal!');
    setConvertOpen(false);
  };

  const handleDelete = (id: string, title: string) => {
    Modal.confirm({
      title: `Xoá lead "${title}"?`,
      okType: 'danger',
      onOk: async () => { await deleteMutation.mutateAsync(id); message.success('Đã xoá'); },
    });
  };

  const columns: ColumnsType<Lead> = [
    {
      title: 'Tiêu đề', dataIndex: 'title',
      render: (t: string, row: Lead) => (
        <Space direction="vertical" size={0}>
          <Text style={{ color: textPrimary, fontWeight: 500 }}>{t}</Text>
          {row.contact && <Text style={{ fontSize: 12, color: textMuted }}>{row.contact.name}</Text>}
        </Space>
      ),
    },
    {
      title: 'Nguồn', dataIndex: 'source', width: 140,
      render: (s: LeadSource) => <Tag color={SOURCE_META[s]?.color}>{SOURCE_META[s]?.label ?? s}</Tag>,
    },
    {
      title: 'Trạng thái', dataIndex: 'status', width: 130,
      render: (s: LeadStatus) => <Tag color={STATUS_META[s]?.color}>{STATUS_META[s]?.label ?? s}</Tag>,
    },
    {
      title: 'Giá trị', dataIndex: 'estimatedValue', width: 140, align: 'right',
      render: (v?: string) => v
        ? <Text style={{ color: textPrimary }}>{Number(v).toLocaleString('vi-VN')} ₫</Text>
        : <Text style={{ color: textMuted }}>—</Text>,
    },
    {
      title: 'Phụ trách', dataIndex: ['assignee', 'name'], width: 150,
      render: (_: unknown, row: Lead) => row.assignee?.name ?? <Text style={{ color: textMuted }}>—</Text>,
    },
    {
      title: '', key: 'actions', width: 120, align: 'right',
      render: (_: unknown, row: Lead) => (
        <Space>
          {row.status === 'QUALIFIED' && (
            <Button size="small" type="primary" icon={<SwapOutlined />}
              style={{ background: '#059669', borderColor: '#059669' }}
              onClick={() => openConvert(row)}>
              Convert
            </Button>
          )}
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(row)} />
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(row.id, row.title)} />
        </Space>
      ),
    },
  ];

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FunnelPlotOutlined style={{ color: '#DC2626', fontSize: 20 }} />
          <Title level={4} style={{ margin: 0, color: textPrimary }}>Leads</Title>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}
          style={{ background: preset.primary, borderColor: preset.primary }}>
          Thêm lead
        </Button>
      </div>

      <div style={{ marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Select
          placeholder="Trạng thái"
          style={{ width: 160 }}
          allowClear
          options={STATUS_OPTIONS}
          onChange={(v) => setFilters(f => ({ ...f, status: v, page: 1 }))}
        />
        <Select
          placeholder="Nguồn"
          style={{ width: 160 }}
          allowClear
          options={SOURCE_OPTIONS}
          onChange={(v) => setFilters(f => ({ ...f, source: v, page: 1 }))}
        />
        <Select
          placeholder="Phụ trách"
          style={{ width: 200 }}
          allowClear
          showSearch
          optionFilterProp="label"
          options={usersData.map((u: { id: string; name: string }) => ({ value: u.id, label: u.name }))}
          onChange={(v) => setFilters(f => ({ ...f, assigneeId: v, page: 1 }))}
        />
      </div>

      <div style={{ background: bgContainer, borderRadius: 8, border: `1px solid ${borderColor}` }}>
        <Table<Lead>
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
          components={{
            header: {
              cell: (props: React.HTMLAttributes<HTMLTableCellElement>) => (
                <th {...props} style={{
                  ...props.style,
                  background: bgCard,
                  color: textPrimary,
                  borderBottom: `1px solid ${borderColor}`,
                }} />
              ),
            },
          }}
        />
      </div>

      {/* Create/Edit CenteredModal */}
      <CenteredModal
        title={editing ? 'Sửa lead' : 'Thêm lead mới'}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={480}
        extra={
          <Button type="primary" loading={isPending} onClick={handleSave}
            style={{ background: preset.primary, borderColor: preset.primary }}>
            {editing ? 'Cập nhật' : 'Lưu'}
          </Button>
        }
      >
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="Tiêu đề" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="source" label="Nguồn" rules={[{ required: true }]}>
            <Select options={SOURCE_OPTIONS} />
          </Form.Item>
          {editing && (
            <Form.Item name="status" label="Trạng thái">
              <Select options={STATUS_OPTIONS} />
            </Form.Item>
          )}
          <Form.Item name="assigneeId" label="Phụ trách" rules={[{ required: true }]}>
            <Select
              showSearch optionFilterProp="label"
              options={usersData.map((u: { id: string; name: string }) => ({ value: u.id, label: u.name }))}
            />
          </Form.Item>
          <Space.Compact style={{ width: '100%' }}>
            <Form.Item name="estimatedValue" label="Giá trị ước tính" style={{ flex: 1, marginBottom: 0 }}>
              <InputNumber style={{ width: '100%' }} formatter={(v) => v ? `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''} />
            </Form.Item>
            <Form.Item name="currency" label="&nbsp;" style={{ width: 80, marginBottom: 0 }}>
              <Select options={[{ value: 'VND' }, { value: 'USD' }]} />
            </Form.Item>
          </Space.Compact>
          <Form.Item name="notes" label="Ghi chú" style={{ marginTop: 16 }}>
            <TextArea rows={3} />
          </Form.Item>
        </Form>
      </CenteredModal>

      {/* Convert to Deal modal */}
      <Modal
        title={`Convert Lead → Deal: "${converting?.title}"`}
        open={convertOpen}
        onCancel={() => setConvertOpen(false)}
        onOk={handleConvert}
        confirmLoading={convertMutation.isPending}
        okText="Convert"
        okButtonProps={{ style: { background: '#059669', borderColor: '#059669' } }}
      >
        <Form form={convertForm} layout="vertical">
          <Form.Item name="dealTitle" label="Tên Deal" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="customerId" label="Khách hàng">
            <Select
              allowClear showSearch optionFilterProp="label" placeholder="Chọn hoặc tạo mới sau"
              options={customers.map(c => ({ value: c.id, label: c.name }))}
            />
          </Form.Item>
          <Form.Item name="dealValue" label="Giá trị deal (VND)">
            <InputNumber style={{ width: '100%' }} formatter={(v) => v ? `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
