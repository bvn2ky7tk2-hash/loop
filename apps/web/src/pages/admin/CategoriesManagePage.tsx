import { useState, useMemo } from 'react';
import { Table, Button, Select, Input, Form, Space, Switch, App, Tag, Typography } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, AppstoreOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useThemePalette } from '../../hooks/useThemePalette';
import { PageHeader } from '../../components/ui/PageHeader';
import { FilterBar } from '../../components/FilterBar';
import { CenteredModal } from '../../components/ui/CenteredModal';
import { confirmDelete } from '../../components/ui/confirmDelete';
import { categoriesApi, type Category } from '../../api/categories';

const { Text } = Typography;

// Loại danh mục thông dụng (có thể gõ thêm loại mới)
const KNOWN_TYPES: { value: string; label: string; hierarchical?: boolean }[] = [
  { value: 'province', label: 'Tỉnh / Thành phố' },
  { value: 'ward', label: 'Phường / Xã', hierarchical: true },
  { value: 'ethnicity', label: 'Dân tộc' },
  { value: 'religion', label: 'Tôn giáo' },
  { value: 'education_level', label: 'Trình độ học vấn' },
  { value: 'contract_type', label: 'Loại hợp đồng' },
];

export default function CategoriesManagePage() {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const { textPrimary, textMuted, borderColor, bgContainer, linkColor } = useThemePalette();

  const [type, setType] = useState<string>('province');
  const [parentId, setParentId] = useState<string | undefined>();
  const [editing, setEditing] = useState<Category | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const isWard = type === 'ward';

  const { data: provinces = [] } = useQuery({
    queryKey: ['categories', 'province'],
    queryFn: () => categoriesApi.list({ type: 'province' }),
  });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['categories', type, parentId],
    queryFn: () => categoriesApi.list({ type, parentId: isWard ? parentId : undefined }),
  });

  const provinceName = useMemo(
    () => (id?: string) => provinces.find((p) => p.id === id)?.name ?? '—',
    [provinces],
  );

  const saveMutation = useMutation({
    mutationFn: (v: { code: string; name: string; parentId?: string; sortOrder?: number; isActive?: boolean }) =>
      editing
        ? categoriesApi.update(editing.id, v)
        : categoriesApi.create({ type, ...v }),
    onSuccess: () => {
      message.success(editing ? 'Đã cập nhật' : 'Đã thêm mục danh mục');
      setModalOpen(false); setEditing(null); form.resetFields();
      qc.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (e: { response?: { data?: { message?: string } } }) => message.error(e.response?.data?.message ?? 'Lưu thất bại'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => categoriesApi.remove(id),
    onSuccess: () => { message.success('Đã xóa'); qc.invalidateQueries({ queryKey: ['categories'] }); },
    onError: () => message.error('Xóa thất bại'),
  });

  function openCreate() {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ isActive: true, sortOrder: items.length, parentId: isWard ? parentId : undefined });
    setModalOpen(true);
  }
  function openEdit(c: Category) {
    setEditing(c);
    form.setFieldsValue({ code: c.code, name: c.name, parentId: c.parentId ?? undefined, sortOrder: c.sortOrder, isActive: c.isActive });
    setModalOpen(true);
  }

  const columns: ColumnsType<Category> = [
    { title: 'Mã', dataIndex: 'code', width: 130, render: (v: string) => <Text style={{ fontFamily: 'monospace', color: linkColor }}>{v}</Text> },
    { title: 'Tên', dataIndex: 'name', render: (v: string) => <Text style={{ color: textPrimary }}>{v}</Text> },
    ...(isWard ? [{ title: 'Thuộc tỉnh', dataIndex: 'parentId', render: (v: string) => <Text style={{ color: textMuted }}>{provinceName(v)}</Text> }] : []),
    { title: 'Thứ tự', dataIndex: 'sortOrder', width: 80, align: 'center' as const, render: (v: number) => <Text style={{ color: textMuted }}>{v}</Text> },
    {
      title: 'Trạng thái', dataIndex: 'isActive', width: 110, align: 'center' as const,
      render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? 'Hoạt động' : 'Tắt'}</Tag>,
    },
    {
      title: '', width: 90, align: 'center' as const,
      render: (_: unknown, c: Category) => (
        <Space size={2}>
          <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEdit(c)} />
          <Button type="text" size="small" danger icon={<DeleteOutlined />}
            onClick={() => confirmDelete({ itemName: c.name, onConfirm: () => deleteMutation.mutate(c.id) })} />
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Quản lý danh mục"
        icon={<AppstoreOutlined />}
        iconColor="#6366F1"
        actions={<Button type="primary" icon={<PlusOutlined />} onClick={openCreate} disabled={isWard && !parentId}>Thêm mục</Button>}
      />

      <FilterBar>
        <Select
          style={{ width: 220 }}
          value={type}
          onChange={(v) => { setType(v); setParentId(undefined); }}
          options={KNOWN_TYPES.map((t) => ({ value: t.value, label: t.label }))}
          showSearch optionFilterProp="label"
        />
        {isWard && (
          <Select
            style={{ width: 260 }}
            placeholder="Chọn Tỉnh/Thành để xem Phường/Xã"
            value={parentId}
            onChange={setParentId}
            options={provinces.map((p) => ({ value: p.id, label: p.name }))}
            showSearch optionFilterProp="label" allowClear
          />
        )}
      </FilterBar>

      <Table
        rowKey="id"
        loading={isLoading}
        columns={columns}
        dataSource={isWard && !parentId ? [] : items}
        size="small"
        style={{ border: `1px solid ${borderColor}`, borderRadius: 8, background: bgContainer }}
        pagination={{ pageSize: 20, showTotal: (t) => `${t} mục` }}
        locale={{ emptyText: isWard && !parentId ? 'Chọn Tỉnh/Thành phố để xem Phường/Xã' : 'Chưa có mục danh mục' }}
      />

      <CenteredModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null); form.resetFields(); }}
        title={editing ? 'Sửa mục danh mục' : 'Thêm mục danh mục'}
        width={460}
        extra={<Button type="primary" loading={saveMutation.isPending} onClick={() => form.submit()}>Lưu</Button>}
      >
        <Form form={form} layout="vertical" onFinish={(v) => saveMutation.mutate(v)} style={{ marginTop: 12 }}>
          {isWard && (
            <Form.Item name="parentId" label="Thuộc Tỉnh/Thành phố" rules={[{ required: true, message: 'Chọn tỉnh' }]}>
              <Select options={provinces.map((p) => ({ value: p.id, label: p.name }))} showSearch optionFilterProp="label" />
            </Form.Item>
          )}
          <Form.Item name="code" label="Mã" rules={[{ required: true, message: 'Nhập mã' }]}>
            <Input placeholder="VD: 01, HN-001" />
          </Form.Item>
          <Form.Item name="name" label="Tên" rules={[{ required: true, message: 'Nhập tên' }]}>
            <Input placeholder="VD: Thành phố Hà Nội" />
          </Form.Item>
          <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item name="sortOrder" label="Thứ tự" style={{ flex: 1 }}>
              <Input type="number" />
            </Form.Item>
            <Form.Item name="isActive" label="Hoạt động" valuePropName="checked" style={{ flex: 1 }}>
              <Switch />
            </Form.Item>
          </Space>
        </Form>
      </CenteredModal>
    </div>
  );
}
