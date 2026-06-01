import { useMemo, useState } from 'react';
import { Table, Row, Col, Progress, Select, Typography } from 'antd';
import { FallOutlined, DollarOutlined, BankOutlined, LineChartOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useThemePalette } from '../../hooks/useThemePalette';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { FilterBar } from '../../components/FilterBar';
import { formatCurrency } from '../../utils/format';
import { useGetAssets, type Asset, type AssetCategory } from '../../api/assets';

const CATEGORY_LABEL: Record<AssetCategory, string> = {
  LAPTOP: 'Laptop', DESKTOP: 'Máy bàn', PHONE: 'Điện thoại', SERVER: 'Máy chủ',
  PERIPHERAL: 'Phụ kiện', SOFTWARE: 'Phần mềm', FURNITURE: 'Nội thất', VEHICLE: 'Phương tiện', OTHER: 'Khác',
};

interface DepRow extends Asset {
  annualDep: number;
  accumulatedDep: number;
  bookValue: number;
  yearsElapsed: number;
  pctDepreciated: number;
}

// Khấu hao đường thẳng — khớp công thức backend getDepreciation
function computeDepreciation(a: Asset): DepRow | null {
  const price = a.purchasePrice ? Number(a.purchasePrice) : 0;
  const years = a.depreciationYears ?? 0;
  if (!price || !years) return null;
  const purchase = a.purchaseDate ? dayjs(a.purchaseDate) : null;
  const yearsElapsed = purchase ? dayjs().diff(purchase, 'day') / 365.25 : 0;
  const annualDep = price / years;
  const accumulatedDep = Math.min(price, annualDep * yearsElapsed);
  const bookValue = Math.max(0, price - accumulatedDep);
  return {
    ...a, annualDep, accumulatedDep, bookValue,
    yearsElapsed: Math.round(yearsElapsed * 10) / 10,
    pctDepreciated: price > 0 ? Math.round((accumulatedDep / price) * 100) : 0,
  };
}

export default function AssetDepreciationPage() {
  const { textPrimary, textMuted, borderColor, bgContainer, linkColor } = useThemePalette();
  const [category, setCategory] = useState<AssetCategory | undefined>();
  const { data, isLoading } = useGetAssets({ limit: 500, category });

  const rows = useMemo(
    () => (data?.data ?? []).map(computeDepreciation).filter((r): r is DepRow => r !== null),
    [data],
  );

  const totalCost = rows.reduce((s, r) => s + Number(r.purchasePrice), 0);
  const totalAccum = rows.reduce((s, r) => s + r.accumulatedDep, 0);
  const totalBook = rows.reduce((s, r) => s + r.bookValue, 0);

  const columns: ColumnsType<DepRow> = [
    {
      title: 'Mã', dataIndex: 'code', width: 110,
      render: (v: string) => <span style={{ fontSize: 11, fontWeight: 600, fontFamily: 'monospace', color: linkColor }}>{v}</span>,
    },
    {
      title: 'Tài sản',
      render: (_: unknown, r: DepRow) => (
        <div>
          <div style={{ fontWeight: 600, color: textPrimary, fontSize: 13 }}>{r.name}</div>
          <div style={{ fontSize: 11, color: textMuted }}>{CATEGORY_LABEL[r.category] ?? r.category}</div>
        </div>
      ),
    },
    {
      title: 'Ngày mua', dataIndex: 'purchaseDate', width: 110,
      render: (v?: string) => <span style={{ color: textMuted, fontSize: 12 }}>{v ? dayjs(v).format('DD/MM/YYYY') : '—'}</span>,
    },
    {
      title: 'Nguyên giá', dataIndex: 'purchasePrice', width: 130, align: 'right',
      render: (v?: string) => <span style={{ color: textPrimary }}>{formatCurrency(Number(v ?? 0))}</span>,
    },
    {
      title: 'Số năm KH', dataIndex: 'depreciationYears', width: 90, align: 'center',
      render: (v?: number) => <span style={{ color: textMuted }}>{v ?? '—'} năm</span>,
    },
    {
      title: 'KH/năm', width: 120, align: 'right',
      render: (_: unknown, r: DepRow) => <span style={{ color: textMuted, fontSize: 12 }}>{formatCurrency(Math.round(r.annualDep))}</span>,
    },
    {
      title: 'Đã KH lũy kế', width: 130, align: 'right',
      render: (_: unknown, r: DepRow) => <span style={{ color: '#EF4444' }}>{formatCurrency(Math.round(r.accumulatedDep))}</span>,
    },
    {
      title: 'Giá trị còn lại', width: 130, align: 'right',
      render: (_: unknown, r: DepRow) => <span style={{ color: '#10B981', fontWeight: 600 }}>{formatCurrency(Math.round(r.bookValue))}</span>,
    },
    {
      title: '% đã KH', width: 140,
      render: (_: unknown, r: DepRow) => (
        <Progress
          percent={r.pctDepreciated}
          size="small"
          status={r.pctDepreciated >= 100 ? 'exception' : 'active'}
          strokeColor={r.pctDepreciated >= 100 ? '#EF4444' : linkColor}
        />
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <PageHeader title="Khấu hao tài sản" icon={<FallOutlined />} iconColor="#0E7490" />

      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={8}><StatCard label="Tổng nguyên giá" value={formatCurrency(totalCost)} color="#6366F1" icon={<DollarOutlined />} /></Col>
        <Col xs={12} sm={8}><StatCard label="Đã khấu hao lũy kế" value={formatCurrency(Math.round(totalAccum))} color="#EF4444" icon={<FallOutlined />} /></Col>
        <Col xs={12} sm={8}><StatCard label="Giá trị còn lại" value={formatCurrency(Math.round(totalBook))} color="#10B981" icon={<BankOutlined />} /></Col>
      </Row>

      <FilterBar>
        <Select
          allowClear placeholder="Loại tài sản" style={{ width: 180 }}
          value={category} onChange={setCategory}
          options={Object.entries(CATEGORY_LABEL).map(([v, l]) => ({ value: v, label: l }))}
        />
      </FilterBar>

      <Typography.Text style={{ color: textMuted, fontSize: 12, display: 'block', marginBottom: 8 }}>
        <LineChartOutlined style={{ marginRight: 6 }} />
        Phương pháp khấu hao đường thẳng — KH/năm = Nguyên giá ÷ Số năm khấu hao
      </Typography.Text>

      <Table
        rowKey="id"
        loading={isLoading}
        columns={columns}
        dataSource={rows}
        size="small"
        style={{ border: `1px solid ${borderColor}`, borderRadius: 8, background: bgContainer }}
        pagination={{ pageSize: 20, showTotal: (t) => `${t} tài sản có khấu hao` }}
        scroll={{ x: 1000 }}
        locale={{ emptyText: 'Chưa có tài sản nào có dữ liệu nguyên giá + số năm khấu hao' }}
      />
    </div>
  );
}
