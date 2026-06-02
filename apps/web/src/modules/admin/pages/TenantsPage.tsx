import { useState } from 'react';
import {
  Button, Table, Tag, Modal, Form, Input, Select, Switch,
  Space, Typography, Row, Col,
} from 'antd';
import {
  PlusOutlined, EditOutlined, StopOutlined, GlobalOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useThemePalette } from '../../hooks/useThemePalette';
import { usePagination } from '../../hooks/usePagination';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { confirmDelete } from '../../components/ui/confirmDelete';
import { tenantsApi, type Tenant, type CreateTenantPayload } from '../../api/tenants';

const { Text } = Typography;

const TIMEZONE_OPTIONS = [
  { label: 'Asia/Ho_Chi_Minh (UTC+7)', value: 'Asia/Ho_Chi_Minh' },
  { label: 'UTC', value: 'UTC' },
  { label: 'Asia/Singapore (UTC+8)', value: 'Asia/Singapore' },
  { label: 'Asia/Bangkok (UTC+7)', value: 'Asia/Bangkok' },
  { label: 'Asia/Tokyo (UTC+9)', value: 'Asia/Tokyo' },
];

export default function TenantsPage() {
  const { textPrimary, textMuted, bgContainer, borderColor, isDark } = useThemePalette();
  const { resetPage, paginationProps } = usePagination(20);
  const qc = useQueryClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Tenant | null>(null);
  const [form] = Form.useForm();

  const { data: tenants = [], isLoading } = useQuery({
    queryKey: ['tenants'],
    queryFn: tenantsApi.list,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateTenantPayload) => tenantsApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tenants'] }); closeModal(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateTenantPayload> }) =>
      tenantsApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tenants'] }); closeModal(); },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => tenantsApi.deactivate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tenants'] }),
  });

  function openCreate() {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  }

  function openEdit(tenant: Tenant) {
    setEditing(tenant);
    form.setFieldsValue(tenant);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
    form.resetFields();
  }

  function handleSubmit(values: CreateTenantPayload) {
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: values });
    } else {
      createMutation.mutate(values);
    }
  }

  const totalActive = tenants.filter((t) => t.isActive).length;
  const totalInactive = tenants.filter((t) => !t.isActive).length;

  const columns = [
    {
      title: 'Tên tenant',
      dataIndex: 'name',
      render: (v: string, r: Tenant) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ color: textPrimary }}>{v}</Text>
          <Text style={{ color: textMuted, fontSize: 12 }}>{r.slug}</Text>
        </Space>
      ),
    },
    {
      title: 'Domain tùy chỉnh',
      dataIndex: 'customDomain',
      render: (v?: string) => v
        ? <Text style={{ color: textMuted }}>{v}</Text>
        : <Text style={{ color: textMuted }}>—</Text>,
    },
    {
      title: 'Màu chính',
      dataIndex: 'primaryColor',
      render: (v?: string) => v ? (
        <Space>
          <span style={{
            display: 'inline-block', width: 16, height: 16,
            borderRadius: 4, background: v,
            border: `1px solid ${borderColor}`,
          }} />
          <Text style={{ color: textMuted }}>{v}</Text>
        </Space>
      ) : <Text style={{ color: textMuted }}>—</Text>,
    },
    {
      title: 'Múi giờ',
      dataIndex: 'timezone',
      render: (v?: string) => <Text style={{ color: textMuted }}>{v ?? '—'}</Text>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      render: (v: boolean) => v ? (
        <Tag
          color={isDark ? undefined : 'green'}
          style={isDark ? { background: 'rgba(52,211,153,0.15)', color: '#6EE7B7', borderColor: 'rgba(52,211,153,0.3)' } : {}}
        >
          Hoạt động
        </Tag>
      ) : (
        <Tag
          color={isDark ? undefined : 'default'}
          style={isDark ? { background: 'rgba(148,163,184,0.15)', color: '#94A3B8', borderColor: 'rgba(148,163,184,0.3)' } : {}}
        >
          Vô hiệu
        </Tag>
      ),
    },
    {
      title: 'Mặc định',
      dataIndex: 'isDefault',
      render: (v: boolean) => v ? (
        <Tag
          color={isDark ? undefined : 'blue'}
          style={isDark ? { background: 'rgba(96,165,250,0.15)', color: '#93C5FD', borderColor: 'rgba(96,165,250,0.3)' } : {}}
        >
          Mặc định
        </Tag>
      ) : null,
    },
    {
      title: '',
      key: 'actions',
      width: 100,
      render: (_: unknown, record: Tenant) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEdit(record)}
          />
          {record.isActive && !record.isDefault && (
            <Button
              size="small"
              danger
              icon={<StopOutlined />}
              onClick={() =>
                confirmDelete({
                  itemName: record.name,
                  onConfirm: () => deactivateMutation.mutate(record.id),
                })
              }
            />
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Quản lý Tenant"
        icon={<GlobalOutlined />}
        iconColor="#6366F1"
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Thêm Tenant
          </Button>
        }
      />

      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={6}>
          <StatCard label="Tổng tenant" value={tenants.length} color="#6366F1" icon={<GlobalOutlined />} />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard label="Đang hoạt động" value={totalActive} color="#10B981" icon={<GlobalOutlined />} />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard label="Vô hiệu" value={totalInactive} color="#94A3B8" icon={<StopOutlined />} />
        </Col>
      </Row>

      <div style={{ background: bgContainer, borderRadius: 12, padding: 0 }}>
        <Table
          rowKey="id"
          loading={isLoading}
          dataSource={tenants}
          columns={columns}
          pagination={paginationProps(tenants.length, 'bản ghi')}
        />
      </div>

      <Modal
        title={editing ? 'Chỉnh sửa Tenant' : 'Thêm Tenant mới'}
        open={modalOpen}
        onCancel={closeModal}
        onOk={() => form.submit()}
        okText={editing ? 'Lưu' : 'Tạo'}
        cancelText="Hủy"
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        width={560}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          style={{ marginTop: 16 }}
        >
          <Form.Item name="name" label="Tên tenant" rules={[{ required: true, message: 'Nhập tên tenant' }]}>
            <Input placeholder="Công ty ABC" maxLength={200} />
          </Form.Item>

          <Form.Item
            name="slug"
            label="Slug (dùng trong URL)"
            rules={[
              { required: true, message: 'Nhập slug' },
              {
                pattern: /^[a-z0-9-]+$/,
                message: 'Chỉ dùng chữ thường, số và dấu gạch ngang',
              },
            ]}
          >
            <Input placeholder="cong-ty-abc" maxLength={100} />
          </Form.Item>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="primaryColor" label="Màu chính (hex)">
                <Input placeholder="#4F46E5" maxLength={7} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="timezone" label="Múi giờ">
                <Select placeholder="Chọn múi giờ" options={TIMEZONE_OPTIONS} allowClear />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="customDomain" label="Domain tùy chỉnh">
            <Input placeholder="app.congtyabc.vn" />
          </Form.Item>

          <Form.Item name="address" label="Địa chỉ">
            <Input.TextArea rows={2} placeholder="Địa chỉ doanh nghiệp" />
          </Form.Item>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="isActive" label="Trạng thái" valuePropName="checked" initialValue>
                <Switch checkedChildren="Hoạt động" unCheckedChildren="Vô hiệu" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="isDefault" label="Tenant mặc định" valuePropName="checked">
                <Switch checkedChildren="Có" unCheckedChildren="Không" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}
