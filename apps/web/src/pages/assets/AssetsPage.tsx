import { useState } from 'react';
import {
  Table, Button, Space, Typography, Select, Tag, Form,
  Input, InputNumber, DatePicker, Modal, message, Row, Col,
} from 'antd';
import { CenteredModal } from '../../components/ui/CenteredModal';
import { StatCard } from '../../components/ui/StatCard';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, LaptopOutlined,
  SwapOutlined, RollbackOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import { useThemeStore } from '../../store/theme.store';
import { orgUnitsApi } from '../../api/org-units';
import { usersApi } from '../../api/users';
import {
  useGetAssets, useGetAssetSummary, useCreateAsset, useUpdateAsset,
  useDeleteAsset, useAssignAsset, useReturnAsset,
  type Asset, type AssetCategory, type AssetStatus, type AssetFilterParams,
} from '../../api/assets';

const { Title, Text } = Typography;
const { TextArea } = Input;

const CATEGORY_META: Record<AssetCategory, { label: string; color: string }> = {
  LAPTOP:     { label: 'Laptop',      color: 'blue' },
  DESKTOP:    { label: 'Desktop',     color: 'cyan' },
  PHONE:      { label: 'Điện thoại',  color: 'green' },
  SERVER:     { label: 'Server',      color: 'purple' },
  PERIPHERAL: { label: 'Ngoại vi',   color: 'orange' },
  SOFTWARE:   { label: 'Phần mềm',   color: 'magenta' },
  FURNITURE:  { label: 'Nội thất',   color: 'gold' },
  VEHICLE:    { label: 'Xe',          color: 'volcano' },
  OTHER:      { label: 'Khác',        color: 'default' },
};

const STATUS_META: Record<AssetStatus, { label: string; color: string }> = {
  AVAILABLE:         { label: 'Còn trống',      color: 'green' },
  ASSIGNED:          { label: 'Đang cấp phát', color: 'blue' },
  UNDER_MAINTENANCE: { label: 'Đang bảo trì',  color: 'orange' },
  RETIRED:           { label: 'Đã thanh lý',   color: 'default' },
};

const CATEGORY_OPTIONS = Object.entries(CATEGORY_META).map(([k, v]) => ({ value: k as AssetCategory, label: v.label }));
const STATUS_OPTIONS   = Object.entries(STATUS_META).map(([k, v]) => ({ value: k as AssetStatus, label: v.label }));

export default function AssetsPage() {
  const { mode, preset } = useThemeStore();
  const isDark = mode === 'dark';
  const bgContainer = isDark ? '#1E293B' : '#ffffff';
  const bgCard      = isDark ? '#2D3F56' : '#FAFAFA';
  const borderColor = isDark ? '#334155' : '#E2E8F0';
  const textPrimary = isDark ? '#F1F5F9' : '#0F172A';
  const textMuted   = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';
  const linkColor   = isDark ? '#93C5FD' : preset.primary;

  const [filters, setFilters]       = useState<AssetFilterParams>({ page: 1, limit: 20 });
  const [drawerOpen, setDrawer]     = useState(false);
  const [editing, setEditing]       = useState<Asset | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<Asset | null>(null);
  const [form] = Form.useForm();
  const [assignForm] = Form.useForm();

  const { data, isLoading }         = useGetAssets(filters);
  const { data: summary }           = useGetAssetSummary();
  const { data: orgUnitsRaw = [] }  = useQuery({ queryKey: ['org-units'], queryFn: orgUnitsApi.list });
  const { data: usersData = [] }    = useQuery({ queryKey: ['users'], queryFn: usersApi.list });

  const orgUnits = Array.isArray(orgUnitsRaw) ? orgUnitsRaw : (orgUnitsRaw as { data?: unknown[] }).data ?? [];

  const createMutation = useCreateAsset();
  const updateMutation = useUpdateAsset();
  const deleteMutation = useDeleteAsset();
  const assignMutation = useAssignAsset();
  const returnMutation = useReturnAsset();

  const openCreate = () => { setEditing(null); form.resetFields(); setDrawer(true); };

  const openEdit = (a: Asset) => {
    setEditing(a);
    form.setFieldsValue({
      code: a.code, name: a.name, category: a.category, brand: a.brand,
      model: a.model, serialNumber: a.serialNumber, orgUnitId: a.orgUnitId,
      purchaseDate: a.purchaseDate ? dayjs(a.purchaseDate) : undefined,
      purchasePrice: a.purchasePrice ? Number(a.purchasePrice) : undefined,
      depreciationYears: a.depreciationYears, notes: a.notes,
    });
    setDrawer(true);
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    const payload = {
      ...values,
      purchaseDate: values.purchaseDate ? values.purchaseDate.format('YYYY-MM-DD') : undefined,
    };
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, data: payload });
      message.success('Đã cập nhật');
    } else {
      await createMutation.mutateAsync(payload);
      message.success('Đã thêm tài sản');
    }
    setDrawer(false);
  };

  const handleDelete = (a: Asset) => {
    Modal.confirm({
      title: `Xóa tài sản "${a.name}"?`,
      okType: 'danger',
      onOk: async () => { await deleteMutation.mutateAsync(a.id); message.success('Đã xóa'); },
    });
  };

  const openAssign = (a: Asset) => {
    setAssignTarget(a);
    assignForm.resetFields();
    setAssignOpen(true);
  };

  const handleAssign = async () => {
    if (!assignTarget) return;
    const values = await assignForm.validateFields();
    await assignMutation.mutateAsync({ id: assignTarget.id, ...values });
    message.success('Đã cấp phát tài sản');
    setAssignOpen(false);
  };

  const handleReturn = (a: Asset) => {
    Modal.confirm({
      title: `Thu hồi tài sản "${a.name}"?`,
      onOk: async () => {
        await returnMutation.mutateAsync({ id: a.id });
        message.success('Đã thu hồi');
      },
    });
  };

  const columns: ColumnsType<Asset> = [
    {
      title: 'Mã / Tên', key: 'info',
      render: (_: unknown, row: Asset) => (
        <Space direction="vertical" size={0}>
          <Text code style={{ color: linkColor, fontSize: 12 }}>{row.code}</Text>
          <Text style={{ fontWeight: 500, color: textPrimary }}>{row.name}</Text>
          {(row.brand || row.model) && (
            <Text style={{ fontSize: 12, color: textMuted }}>{[row.brand, row.model].filter(Boolean).join(' · ')}</Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Loại', dataIndex: 'category', width: 110,
      render: (v: AssetCategory) => <Tag color={CATEGORY_META[v].color}>{CATEGORY_META[v].label}</Tag>,
    },
    {
      title: 'Serial', dataIndex: 'serialNumber', width: 140,
      render: (v?: string) => v ? <Text style={{ fontSize: 12, color: textMuted }}>{v}</Text> : <Text style={{ color: textMuted }}>—</Text>,
    },
    {
      title: 'Trạng thái', dataIndex: 'status', width: 150,
      render: (s: AssetStatus, row: Asset) => (
        <Space direction="vertical" size={0}>
          <Tag color={STATUS_META[s].color}>{STATUS_META[s].label}</Tag>
          {s === 'ASSIGNED' && row.assignments?.[0] && (
            <Text style={{ fontSize: 11, color: textMuted }}>{row.assignments[0].employee?.fullName}</Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Nguyên giá', dataIndex: 'purchasePrice', width: 130, align: 'right',
      render: (v?: string) => v
        ? <Text style={{ color: textPrimary }}>{(Number(v) / 1_000_000).toFixed(0)}M ₫</Text>
        : <Text style={{ color: textMuted }}>—</Text>,
    },
    {
      title: 'Ngày mua', dataIndex: 'purchaseDate', width: 110,
      render: (v?: string) => v ? <Text style={{ color: textMuted }}>{dayjs(v).format('DD/MM/YYYY')}</Text> : <Text style={{ color: textMuted }}>—</Text>,
    },
    {
      title: '', key: 'actions', width: 130, align: 'right',
      render: (_: unknown, row: Asset) => (
        <Space>
          {row.status === 'AVAILABLE' && (
            <Button size="small" type="primary" icon={<SwapOutlined />}
              style={{ background: '#0EA5E9', borderColor: '#0EA5E9' }}
              onClick={() => openAssign(row)}>Cấp phát</Button>
          )}
          {row.status === 'ASSIGNED' && (
            <Button size="small" icon={<RollbackOutlined />} onClick={() => handleReturn(row)}>Thu hồi</Button>
          )}
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(row)} />
          {row.status !== 'ASSIGNED' && (
            <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(row)} />
          )}
        </Space>
      ),
    },
  ];

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <LaptopOutlined style={{ color: '#B45309', fontSize: 20 }} />
          <Title level={4} style={{ margin: 0, color: textPrimary }}>Tài sản</Title>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}
          style={{ background: preset.primary, borderColor: preset.primary }}>
          Thêm tài sản
        </Button>
      </div>

      {/* Summary Cards */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        {[
          { label: 'Tổng tài sản',    value: summary?.total ?? 0,            color: '#F97316',    icon: <LaptopOutlined /> },
          { label: 'Đang cấp phát',   value: summary?.assigned ?? 0,         color: '#6366F1',    icon: <SwapOutlined /> },
          { label: 'Đang bảo trì',    value: summary?.underMaintenance ?? 0, color: '#F59E0B',    icon: <RollbackOutlined /> },
          { label: 'Tổng nguyên giá', value: summary ? `${(summary.totalPurchaseValue / 1_000_000).toFixed(0)}M ₫` : '—', color: '#10B981', icon: null },
        ].map(c => (
          <Col key={c.label} xs={12} sm={6}>
            <StatCard label={c.label} value={c.value} color={c.color} icon={c.icon} />
          </Col>
        ))}
      </Row>

      {/* Filters */}
      <div style={{ marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Select placeholder="Loại tài sản" style={{ width: 150 }} allowClear options={CATEGORY_OPTIONS}
          onChange={v => setFilters(f => ({ ...f, category: v, page: 1 }))} />
        <Select placeholder="Trạng thái" style={{ width: 160 }} allowClear options={STATUS_OPTIONS}
          onChange={v => setFilters(f => ({ ...f, status: v, page: 1 }))} />
        <Select placeholder="Bộ phận" style={{ width: 200 }} allowClear showSearch optionFilterProp="label"
          options={(orgUnits as { id: string; name: string }[]).map(o => ({ value: o.id, label: o.name }))}
          onChange={v => setFilters(f => ({ ...f, orgUnitId: v, page: 1 }))} />
      </div>

      <div style={{ background: bgContainer, borderRadius: 8, border: `1px solid ${borderColor}` }}>
        <Table<Asset>
          rowKey="id" columns={columns} dataSource={data?.data ?? []} loading={isLoading}
          pagination={{ current: filters.page, pageSize: filters.limit, total: data?.total ?? 0, showSizeChanger: true,
            onChange: (page, limit) => setFilters(f => ({ ...f, page, limit })) }}
        />
      </div>

      {/* Create / Edit Drawer */}
      <CenteredModal title={editing ? 'Sửa tài sản' : 'Thêm tài sản'} open={drawerOpen} width={480}
        onClose={() => setDrawer(false)}
        extra={<Button type="primary" loading={isPending} onClick={handleSave}
          style={{ background: preset.primary, borderColor: preset.primary }}>{editing ? 'Cập nhật' : 'Lưu'}</Button>}>
        <Form form={form} layout="vertical">
          <Space.Compact style={{ width: '100%' }}>
            <Form.Item name="code" label="Mã tài sản" rules={[{ required: true }]} style={{ flex: 1, marginBottom: 0 }}>
              <Input disabled={!!editing} placeholder="LAPTOP-001" />
            </Form.Item>
            <Form.Item name="category" label="Loại" rules={[{ required: true }]} style={{ width: 140, marginBottom: 0 }}>
              <Select options={CATEGORY_OPTIONS} />
            </Form.Item>
          </Space.Compact>
          <Form.Item name="name" label="Tên tài sản" rules={[{ required: true }]} style={{ marginTop: 12 }}>
            <Input />
          </Form.Item>
          <Space.Compact style={{ width: '100%' }}>
            <Form.Item name="brand" label="Hãng" style={{ flex: 1, marginBottom: 0 }}><Input placeholder="Dell, Apple..." /></Form.Item>
            <Form.Item name="model" label="Model" style={{ flex: 1, marginBottom: 0 }}><Input placeholder="XPS 15, MacBook Pro..." /></Form.Item>
          </Space.Compact>
          <Form.Item name="serialNumber" label="Serial Number" style={{ marginTop: 12 }}>
            <Input placeholder="SN1234567890" />
          </Form.Item>
          <Form.Item name="orgUnitId" label="Bộ phận">
            <Select allowClear showSearch optionFilterProp="label"
              options={(orgUnits as { id: string; name: string }[]).map(o => ({ value: o.id, label: o.name }))} />
          </Form.Item>
          <Space.Compact style={{ width: '100%' }}>
            <Form.Item name="purchaseDate" label="Ngày mua" style={{ flex: 1, marginBottom: 0 }}>
              <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="purchasePrice" label="Nguyên giá (VND)" style={{ flex: 1, marginBottom: 0 }}>
              <InputNumber style={{ width: '100%' }} min={0} formatter={v => v ? `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''} />
            </Form.Item>
          </Space.Compact>
          <Form.Item name="depreciationYears" label="Khấu hao (năm)" style={{ marginTop: 12 }}>
            <InputNumber min={1} max={30} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="notes" label="Ghi chú"><TextArea rows={2} /></Form.Item>
        </Form>
      </CenteredModal>

      {/* Assign Modal */}
      <Modal title={`Cấp phát: ${assignTarget?.name ?? ''}`}
        open={assignOpen} onCancel={() => setAssignOpen(false)}
        onOk={handleAssign} okText="Cấp phát"
        okButtonProps={{ loading: assignMutation.isPending, style: { background: preset.primary, borderColor: preset.primary } }}>
        <Form form={assignForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="employeeId" label="Nhân viên nhận" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="label"
              options={(usersData as { id: string; name: string }[]).map(u => ({ value: u.id, label: u.name }))} />
          </Form.Item>
          <Form.Item name="notes" label="Ghi chú"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
