import { useState, useEffect } from 'react';
import { Table, Typography, Select, Tag, Space } from 'antd';
import { SwapOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useThemePalette } from '../../hooks/useThemePalette';
import { usePagination } from '../../hooks/usePagination';
import {
  useGetAllAssignments, useGetAssets,
  type AssetAssignment, type AssignmentFilterParams,
} from '../../api/assets';

const { Title, Text } = Typography;

export default function AssetAssignmentsPage() {
  const { bgContainer, borderColor, textPrimary, textMuted } = useThemePalette();

  const { page, pageSize, resetPage, paginationProps } = usePagination(20);
  const [assetIdFilter, setAssetIdFilter] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<'active' | 'returned' | undefined>();
  const filters: AssignmentFilterParams & { page: number; limit: number } = { page, limit: pageSize, assetId: assetIdFilter, status: statusFilter };

  useEffect(() => { resetPage(); }, [assetIdFilter, statusFilter, resetPage]);

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
      render: (v: string) => <Text style={{ color: textMuted }}>{dayjs(v).format('DD/MM/YYYY')}</Text>,
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
          onChange={v => setAssetIdFilter(v)} />
        <Select placeholder="Trạng thái" style={{ width: 160 }} allowClear options={STATUS_OPTIONS}
          onChange={v => setStatusFilter(v as 'active' | 'returned' | undefined)} />
      </div>

      <div style={{ background: bgContainer, borderRadius: 8, border: `1px solid ${borderColor}` }}>
        <Table<AssetAssignment>
          rowKey="id" columns={columns} dataSource={data?.data ?? []} loading={isLoading}
          pagination={paginationProps(data?.total ?? 0, 'bàn giao')}
        />
      </div>
    </div>
  );
}
