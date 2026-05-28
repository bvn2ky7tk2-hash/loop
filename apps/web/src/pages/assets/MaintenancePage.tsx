import { useState } from 'react';
import {
  Table, Button, Typography, Select, Space, Form,
  Input, InputNumber, DatePicker, message,
} from 'antd';
import { CenteredModal } from '../../components/ui/CenteredModal';
import { PlusOutlined, ToolOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useThemeStore } from '../../store/theme.store';
import {
  useGetAllMaintenance, useGetAssets, useAddMaintenance,
  type AssetMaintenance, type MaintenanceFilterParams,
} from '../../api/assets';

const { Title, Text } = Typography;
const { TextArea } = Input;

const TYPE_OPTIONS = [
  { value: 'repair',     label: 'Sửa chữa' },
  { value: 'inspection', label: 'Kiểm tra định kỳ' },
  { value: 'upgrade',    label: 'Nâng cấp' },
  { value: 'cleaning',   label: 'Vệ sinh' },
  { value: 'other',      label: 'Khác' },
];

export default function AssetMaintenancePage() {
  const { mode, preset } = useThemeStore();
  const isDark = mode === 'dark';
  const bgContainer = isDark ? '#1E293B' : '#ffffff';
  const bgCard      = isDark ? '#2D3F56' : '#FAFAFA';
  const borderColor = isDark ? '#334155' : '#E2E8F0';
  const textPrimary = isDark ? '#F1F5F9' : '#0F172A';
  const textMuted   = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';

  const [filters, setFilters] = useState<MaintenanceFilterParams & { page: number; limit: number }>({ page: 1, limit: 20 });
  const [drawerOpen, setDrawer] = useState(false);
  const [form] = Form.useForm();

  const { data, isLoading }   = useGetAllMaintenance(filters);
  const { data: assetsData }  = useGetAssets({ limit: 200 });
  const assets = assetsData?.data ?? [];

  const addMutation = useAddMaintenance();

  const handleAdd = async () => {
    const values = await form.validateFields();
    await addMutation.mutateAsync({
      assetId: values.assetId,
      data: {
        ...values,
        performedAt: values.performedAt.format('YYYY-MM-DD'),
        assetId: undefined,
      },
    });
    message.success('Đã ghi nhận bảo trì');
    setDrawer(false);
  };

  const columns: ColumnsType<AssetMaintenance> = [
    {
      title: 'Tài sản', key: 'asset',
      render: (_: unknown, row: AssetMaintenance) => (
        <Space direction="vertical" size={0}>
          <Text code style={{ fontSize: 12 }}>{row.asset?.code ?? '—'}</Text>
          <Text style={{ color: textPrimary, fontWeight: 500 }}>{row.asset?.name ?? '—'}</Text>
        </Space>
      ),
    },
    {
      title: 'Loại', dataIndex: 'type', width: 160,
      render: (v: string) => {
        const opt = TYPE_OPTIONS.find(t => t.value === v);
        return <Text style={{ color: textPrimary }}>{opt?.label ?? v}</Text>;
      },
    },
    {
      title: 'Ngày thực hiện', dataIndex: 'performedAt', width: 140,
      render: (v: string) => <Text style={{ color: textMuted }}>{dayjs(v).format('DD/MM/YYYY')}</Text>,
    },
    {
      title: 'Chi phí', dataIndex: 'cost', width: 120, align: 'right',
      render: (v?: string) => v
        ? <Text style={{ color: textPrimary }}>{(Number(v) / 1_000_000).toFixed(1)}M ₫</Text>
        : <Text style={{ color: textMuted }}>—</Text>,
    },
    {
      title: 'Người thực hiện', dataIndex: 'performedBy', width: 180,
      render: (v?: string) => v ? <Text style={{ color: textPrimary }}>{v}</Text> : <Text style={{ color: textMuted }}>—</Text>,
    },
    {
      title: 'Ghi chú', dataIndex: 'notes', width: 200,
      render: (v?: string) => v
        ? <Text style={{ color: textMuted, fontSize: 12 }}>{v}</Text>
        : <Text style={{ color: textMuted }}>—</Text>,
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ToolOutlined style={{ color: '#B45309', fontSize: 20 }} />
          <Title level={4} style={{ margin: 0, color: textPrimary }}>Bảo trì tài sản</Title>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setDrawer(true); }}
          style={{ background: preset.primary, borderColor: preset.primary }}>
          Log bảo trì
        </Button>
      </div>

      <div style={{ marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Select placeholder="Tài sản" style={{ width: 250 }} allowClear showSearch optionFilterProp="label"
          options={assets.map(a => ({ value: a.id, label: `${a.code} — ${a.name}` }))}
          onChange={v => setFilters(f => ({ ...f, assetId: v, page: 1 }))} />
        <Select placeholder="Loại bảo trì" style={{ width: 180 }} allowClear options={TYPE_OPTIONS}
          onChange={v => setFilters(f => ({ ...f, type: v, page: 1 }))} />
        <DatePicker.RangePicker
          format="DD/MM/YYYY"
          onChange={dates => setFilters(f => ({
            ...f,
            dateFrom: dates?.[0]?.format('YYYY-MM-DD'),
            dateTo:   dates?.[1]?.format('YYYY-MM-DD'),
            page: 1,
          }))}
        />
      </div>

      <div style={{ background: bgContainer, borderRadius: 8, border: `1px solid ${borderColor}` }}>
        <Table<AssetMaintenance>
          rowKey="id" columns={columns} dataSource={data?.data ?? []} loading={isLoading}
          pagination={{ current: filters.page, pageSize: filters.limit, total: data?.total ?? 0, showSizeChanger: true,
            onChange: (page, limit) => setFilters(f => ({ ...f, page, limit })) }}
        />
      </div>

      {/* Log Bảo trì Drawer */}
      <CenteredModal title="Log bảo trì" open={drawerOpen} width={440}
        onClose={() => setDrawer(false)}
        extra={<Button type="primary" loading={addMutation.isPending} onClick={handleAdd}
          style={{ background: preset.primary, borderColor: preset.primary }}>Lưu</Button>}>
        <Form form={form} layout="vertical">
          <Form.Item name="assetId" label="Tài sản" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="label"
              options={assets.map(a => ({ value: a.id, label: `${a.code} — ${a.name}` }))} />
          </Form.Item>
          <Form.Item name="type" label="Loại bảo trì" rules={[{ required: true }]}>
            <Select options={TYPE_OPTIONS} />
          </Form.Item>
          <Form.Item name="performedAt" label="Ngày thực hiện" rules={[{ required: true }]}>
            <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="cost" label="Chi phí (VND)">
            <InputNumber style={{ width: '100%' }} min={0} formatter={v => v ? `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''} />
          </Form.Item>
          <Form.Item name="performedBy" label="Người / Đơn vị thực hiện">
            <Input placeholder="Tên kỹ thuật viên hoặc công ty dịch vụ" />
          </Form.Item>
          <Form.Item name="notes" label="Ghi chú"><TextArea rows={3} /></Form.Item>
        </Form>
      </CenteredModal>
    </div>
  );
}
