import { useState } from 'react';
import {
  Button, Table, Tag, Modal, Form, Input, Select, Switch,
  Space, Typography, Row, Col, InputNumber, Progress, Divider, Tooltip, App,
} from 'antd';
import {
  PlusOutlined, EditOutlined, StopOutlined, GlobalOutlined, AppstoreOutlined, LockOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useThemePalette } from '../../hooks/useThemePalette';
import { usePagination } from '../../hooks/usePagination';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { confirmDelete } from '../../components/ui/confirmDelete';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { tenantsApi, type Tenant, type CreateTenantPayload } from '../../api/tenants';

const { Text } = Typography;

function fmtBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  const mb = b / (1024 * 1024);
  if (mb < 1024) return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

const TIMEZONE_OPTIONS = [
  { label: 'Asia/Ho_Chi_Minh (UTC+7)', value: 'Asia/Ho_Chi_Minh' },
  { label: 'UTC', value: 'UTC' },
  { label: 'Asia/Singapore (UTC+8)', value: 'Asia/Singapore' },
  { label: 'Asia/Bangkok (UTC+7)', value: 'Asia/Bangkok' },
  { label: 'Asia/Tokyo (UTC+9)', value: 'Asia/Tokyo' },
];

export default function TenantsPage() {
  const { textPrimary, textMuted, bgContainer, bgCard, borderColor, isDark } = useThemePalette();
  const { paginationProps } = usePagination(20);
  const qc = useQueryClient();
  const { message } = App.useApp();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Tenant | null>(null);
  const [moduleTenant, setModuleTenant] = useState<Tenant | null>(null);
  const [form] = Form.useForm();

  const { data: tenants = [], isLoading } = useQuery({
    queryKey: ['tenants'],
    queryFn: tenantsApi.list,
  });

  const { data: usage } = useQuery({
    queryKey: ['tenant-usage', editing?.id],
    queryFn: () => tenantsApi.usage(editing!.id),
    enabled: modalOpen && !!editing,
  });

  const { data: modules = [], isLoading: modulesLoading } = useQuery({
    queryKey: ['tenant-modules', moduleTenant?.id],
    queryFn: () => tenantsApi.modules(moduleTenant!.id),
    enabled: !!moduleTenant,
  });

  const setModuleMutation = useMutation({
    mutationFn: ({ moduleId, isEnabled }: { moduleId: string; isEnabled: boolean }) =>
      tenantsApi.setModule(moduleTenant!.id, moduleId, isEnabled),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tenant-modules', moduleTenant?.id] }),
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      message.error(msg ?? 'Không thể cập nhật module');
    },
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
    // Ô quota để trống → gửi null tường minh để xóa giới hạn (không giới hạn)
    const payload: CreateTenantPayload = {
      ...values,
      maxUsers: values.maxUsers ?? null,
      maxProjects: values.maxProjects ?? null,
      maxEmployees: values.maxEmployees ?? null,
      maxStorageMb: values.maxStorageMb ?? null,
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  const usageRows = usage ? [
    { key: 'users', label: 'Người dùng', used: usage.users.used, max: usage.users.max, fmt: (n: number) => String(n) },
    { key: 'projects', label: 'Dự án', used: usage.projects.used, max: usage.projects.max, fmt: (n: number) => String(n) },
    { key: 'employees', label: 'Nhân viên', used: usage.employees.used, max: usage.employees.max, fmt: (n: number) => String(n) },
    { key: 'storage', label: 'Lưu trữ', used: usage.storage.usedBytes, max: usage.storage.maxMb != null ? usage.storage.maxMb * 1024 * 1024 : null, fmt: fmtBytes },
  ] : [];

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
      render: (v: boolean) => v
        ? <StatusBadge label="Hoạt động" tone="success" />
        : <StatusBadge label="Vô hiệu" tone="neutral" />,
    },
    {
      title: 'Mặc định',
      dataIndex: 'isDefault',
      render: (v: boolean) => v
        ? <StatusBadge label="Mặc định" tone="info" />
        : null,
    },
    {
      title: 'Giới hạn gói',
      key: 'quota',
      render: (_: unknown, r: Tenant) => {
        const parts: string[] = [];
        if (r.maxUsers != null) parts.push(`${r.maxUsers} user`);
        if (r.maxProjects != null) parts.push(`${r.maxProjects} dự án`);
        if (r.maxEmployees != null) parts.push(`${r.maxEmployees} NV`);
        if (r.maxStorageMb != null) parts.push(`${r.maxStorageMb} MB`);
        return (
          <Text style={{ color: textMuted, fontSize: 12 }}>
            {parts.length ? parts.join(' · ') : 'Không giới hạn'}
          </Text>
        );
      },
    },
    {
      title: '',
      key: 'actions',
      width: 140,
      render: (_: unknown, record: Tenant) => (
        <Space>
          <Tooltip title="Cấu hình phân hệ">
            <Button
              size="small"
              icon={<AppstoreOutlined />}
              onClick={() => setModuleTenant(record)}
            />
          </Tooltip>
          <Tooltip title="Chỉnh sửa">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEdit(record)}
            />
          </Tooltip>
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

          <Divider style={{ margin: '8px 0 16px' }}>Giới hạn gói (Quota)</Divider>

          {editing && usageRows.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <Text style={{ color: textMuted, fontSize: 12 }}>Mức sử dụng hiện tại</Text>
              <div style={{ marginTop: 8 }}>
                {usageRows.map((r) => {
                  const unlimited = r.max == null;
                  const pct = unlimited ? 0 : Math.min(100, Math.round((r.used / (r.max || 1)) * 100));
                  const over = !unlimited && r.used >= (r.max || 0);
                  return (
                    <div key={r.key} style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                        <Text style={{ color: textMuted }}>{r.label}</Text>
                        <Text style={{ color: over ? '#EF4444' : textPrimary }}>
                          {r.fmt(r.used)} / {unlimited ? '∞' : r.fmt(r.max as number)}
                        </Text>
                      </div>
                      <Progress
                        percent={pct}
                        showInfo={false}
                        size="small"
                        status={over ? 'exception' : 'normal'}
                        strokeColor={unlimited ? '#94A3B8' : undefined}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <Text style={{ color: textMuted, fontSize: 12, display: 'block', marginBottom: 8 }}>
            Để trống = không giới hạn
          </Text>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="maxUsers" label="Tối đa người dùng">
                <InputNumber min={0} style={{ width: '100%' }} placeholder="Không giới hạn" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="maxEmployees" label="Tối đa nhân viên">
                <InputNumber min={0} style={{ width: '100%' }} placeholder="Không giới hạn" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="maxProjects" label="Tối đa dự án">
                <InputNumber min={0} style={{ width: '100%' }} placeholder="Không giới hạn" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="maxStorageMb" label="Tối đa lưu trữ (MB)">
                <InputNumber min={0} style={{ width: '100%' }} placeholder="Không giới hạn" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <Modal
        title={moduleTenant ? `Cấu hình phân hệ — ${moduleTenant.name}` : 'Cấu hình phân hệ'}
        open={!!moduleTenant}
        onCancel={() => setModuleTenant(null)}
        footer={<Button onClick={() => setModuleTenant(null)}>Đóng</Button>}
        width={560}
      >
        <Text style={{ color: textMuted, fontSize: 13, display: 'block', marginBottom: 12 }}>
          Bật/tắt phân hệ cho tenant này. Phân hệ lõi (core) luôn bật, không thể tắt.
        </Text>
        <div style={{ opacity: modulesLoading || setModuleMutation.isPending ? 0.6 : 1 }}>
          {modules.map((m) => (
            <div
              key={m.moduleId}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: 12, padding: '12px 14px', marginBottom: 8,
                background: bgCard, border: `1px solid ${borderColor}`, borderRadius: 10,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <Space size={6}>
                  <Text strong style={{ color: textPrimary }}>{m.displayName}</Text>
                  {m.isCore && (
                    <Tag
                      color={isDark ? undefined : 'blue'}
                      style={isDark ? { background: 'rgba(96,165,250,0.15)', color: '#93C5FD', borderColor: 'rgba(96,165,250,0.3)' } : {}}
                    >
                      Lõi
                    </Tag>
                  )}
                </Space>
                {m.description && (
                  <div><Text style={{ color: textMuted, fontSize: 12 }}>{m.description}</Text></div>
                )}
              </div>
              {m.isCore ? (
                <Tooltip title="Phân hệ lõi — luôn bật">
                  <LockOutlined style={{ color: textMuted }} />
                </Tooltip>
              ) : (
                <Switch
                  checked={m.isEnabled}
                  loading={setModuleMutation.isPending}
                  onChange={(checked) => setModuleMutation.mutate({ moduleId: m.moduleId, isEnabled: checked })}
                />
              )}
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
