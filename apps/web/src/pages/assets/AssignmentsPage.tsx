import { useState } from 'react';
import { Table, Typography, Select, Tag, Space } from 'antd';
import { SwapOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useThemeStore } from '../../store/theme.store';
import {
  useGetAllAssignments, useGetAssets,
  type AssetAssignment, type AssignmentFilterParams,
} from '../../api/assets';

const { Title, Text } = Typography;

export default function AssetAssignmentsPage() {
  const { mode } = useThemeStore();
  const isDark = mode === 'dark';
  const bgContainer = isDark ? '#1E293B' : '#ffffff';
  const bgCard      = isDark ? '#2D3F56' : '#FAFAFA';
  const borderColor = isDark ? '#334155' : '#E2E8F0';
  const textPrimary = isDark ? '#F1F5F9' : '#0F172A';
  const textMuted   = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';

  const [filters, setFilters] = useState<AssignmentFilterParams & { page: number; limit: number }>({ page: 1, limit: 20 });
  const { data, isLoading }   = useGetAllAssignments(filters);
  const { data: assetsData }  = useGetAssets({ limit: 200 });
  const assets = assetsData?.data ?? [];

  const STATUS_OPTIONS = [
    { value: 'active',    label: 'Đang cấp phát' },
    { value: 'returned',  label: 'Đã trả' },
  ];

  const columns: ColumnsType<AssetAssignment> = [
    {
      title: 'Tài sản', key: 'asset',
      render: (_: unknown, row: AssetAssignment) => (
        <Space direction="vertical" size={0}>
          <Text code style={{ fontSize: 12 }}>{row.asset?.code ?? '—'}</Text>
          <Text style={{ color: textPrimary, fontWeight: 500 }}>{row.asset?.name ?? '—'}</Text>
          {row.asset?.category && (
            <Tag style={{ fontSize: 10, margin: 0 }}>{row.asset.category}</Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Nhân viên', key: 'employee', width: 200,
      render: (_: unknown, row: AssetAssignment) => (
        <Text style={{ color: textPrimary }}>{row.employee?.fullName ?? '—'}</Text>
      ),
    },
    {
      title: 'Ngày cấp phát', dataIndex: 'assignedAt', width: 140,
      render: (v: string) => dayjs(v).format('DD/MM/YYYY'),
    },
    {
      title: 'Ngày trả', dataIndex: 'returnedAt', width: 140,
      render: (v?: string) => v
        ? <Text style={{ color: textPrimary }}>{dayjs(v).format('DD/MM/YYYY')}</Text>
        : <Text style={{ color: textMuted }}>—</Text>,
    },
    {
      title: 'Trạng thái', key: 'status', width: 140,
      render: (_: unknown, row: AssetAssignment) =>
        row.returnedAt
          ? <Tag color="default">Đã trả</Tag>
          : <Tag color="blue">Đang cấp phát</Tag>,
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <SwapOutlined style={{ color: '#B45309', fontSize: 20 }} />
        <Title level={4} style={{ margin: 0, color: textPrimary }}>Lịch sử cấp phát</Title>
      </div>

      <div style={{ marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Select placeholder="Tài sản" style={{ width: 250 }} allowClear showSearch optionFilterProp="label"
          options={assets.map(a => ({ value: a.id, label: `${a.code} — ${a.name}` }))}
          onChange={v => setFilters(f => ({ ...f, assetId: v, page: 1 }))} />
        <Select placeholder="Trạng thái" style={{ width: 160 }} allowClear options={STATUS_OPTIONS}
          onChange={v => setFilters(f => ({ ...f, status: v as 'active' | 'returned' | undefined, page: 1 }))} />
      </div>

      <div style={{ background: bgContainer, borderRadius: 8, border: `1px solid ${borderColor}` }}>
        <Table<AssetAssignment>
          rowKey="id" columns={columns} dataSource={data?.data ?? []} loading={isLoading}
          pagination={{ current: filters.page, pageSize: filters.limit, total: data?.total ?? 0, showSizeChanger: true,
            onChange: (page, limit) => setFilters(f => ({ ...f, page, limit })) }}
          components={{ header: { cell: (props: React.HTMLAttributes<HTMLTableCellElement>) => (
            <th {...props} style={{ ...props.style, background: bgCard, color: textPrimary, borderBottom: `1px solid ${borderColor}` }} />
          )}}}
        />
      </div>
    </div>
  );
}
