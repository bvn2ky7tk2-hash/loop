import { useState, useEffect } from 'react';
import {
  Table, Button, Typography, Select, Space, Form,
  Input, InputNumber, DatePicker, message,
} from 'antd';
import { CenteredModal } from '../../components/ui/CenteredModal';
import { PageHeader } from '../../components/ui/PageHeader';
import { PlusOutlined, ToolOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useThemePalette } from '../../hooks/useThemePalette';
import { usePagination } from '../../hooks/usePagination';
import {
  useGetAllMaintenance, useGetAssets, useAddMaintenance,
  type AssetMaintenance, type MaintenanceFilterParams,
} from '../../api/assets';

const { Text } = Typography;
const { TextArea } = Input;

const TYPE_OPTIONS = [
  { value: 'repair',     label: 'Sửa chữa' },
  { value: 'inspection', label: 'Kiểm tra định kỳ' },
  { value: 'upgrade',    label: 'Nâng cấp' },
  { value: 'cleaning',   label: 'Vệ sinh' },
  { value: 'other',      label: 'Khác' },
];

export default function AssetMaintenancePage() {
  const { bgContainer, borderColor, textPrimary, textMuted, preset } = useThemePalette();

  const { page, pageSize, resetPage, paginationProps } = usePagination(20);
  const [assetIdFilter, setAssetIdFilter] = useState<string | undefined>();
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const [dateFrom, setDateFrom] = useState<string | undefined>();
  const [dateTo, setDateTo] = useState<string | undefined>();
  const filters: MaintenanceFilterParams & { page: number; limit: number } = { page, limit: pageSize, assetId: assetIdFilter, type: typeFilter, dateFrom, dateTo };

  useEffect(() => { resetPage(); }, [assetIdFilter, typeFilter, dateFrom, dateTo, resetPage]);

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
      <PageHeader
        title="Bảo trì tài sản"
        icon={<ToolOutlined />}
        iconColor="#B45309"
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setDrawer(true); }}
            style={{ background: preset.primary, borderColor: preset.primary }}>
            Log bảo trì
          </Button>
        }
      />

      <div style={{ marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Select placeholder="Tài sản" style={{ width: 250 }} allowClear showSearch optionFilterProp="label"
          options={assets.map(a => ({ value: a.id, label: `${a.code} — ${a.name}` }))}
          onChange={v => setAssetIdFilter(v)} />
        <Select placeholder="Loại bảo trì" style={{ width: 180 }} allowClear options={TYPE_OPTIONS}
          onChange={v => setTypeFilter(v)} />
        <DatePicker.RangePicker
          format="DD/MM/YYYY"
          onChange={dates => {
            setDateFrom(dates?.[0]?.format('YYYY-MM-DD'));
            setDateTo(dates?.[1]?.format('YYYY-MM-DD'));
          }}
        />
      </div>

      <div style={{ background: bgContainer, borderRadius: 8, border: `1px solid ${borderColor}` }}>
        <Table<AssetMaintenance>
          rowKey="id"
          columns={columns}
          dataSource={data?.data ?? []}
          loading={isLoading}
          locale={{
            emptyText: (
              <div style={{ padding: '40px 0', textAlign: 'center' }}>
                {/* Icon và text hiển thị khi chưa có dữ liệu bảo trì */}
                <ToolOutlined style={{ fontSize: 48, color: '#94A3B8', marginBottom: 12, display: 'block' }} />
                <div style={{ color: textMuted, fontSize: 14 }}>Chưa có lịch bảo trì nào</div>
                <div style={{ color: textMuted, fontSize: 12, marginTop: 4 }}>Nhấn nút Log bảo trì để ghi nhận</div>
              </div>
            ),
          }}
          pagination={paginationProps(data?.total ?? 0, 'bảo dưỡng')}
        />
      </div>

      {/* Log Bảo trì Drawer */}
      <CenteredModal title="Log bảo trì" open={drawerOpen} width={440}
        onClose={() => setDrawer(false)}
        extra={<Button type="primary" loading={addMutation.isPending} disabled={addMutation.isPending} onClick={handleAdd}
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
