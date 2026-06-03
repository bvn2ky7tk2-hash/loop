import { useState } from 'react';
import { Row, Col, Card, Table, Typography, DatePicker } from 'antd';
import { SwapOutlined } from '@ant-design/icons';
import { StatCard } from '../../../components/ui/StatCard';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../api/client';
import { useThemePalette } from '../../../hooks/useThemePalette';
import dayjs from 'dayjs';

const { Text } = Typography;

interface SummaryData {
  revenue: number;
  expenses: number;
  netIncome: number;
  projectCount: number;
  activeEmployees: number;
  totalHours: number;
}

interface PeriodSummaryResponse {
  current: SummaryData;
  compare: SummaryData;
}

function DeltaBadge({ pct }: { pct: number }) {
  return (
    <span style={{ color: pct >= 0 ? '#10B981' : '#EF4444', fontSize: 12, fontWeight: 600 }}>
      {pct >= 0 ? '↑' : '↓'} {Math.abs(pct)}%
    </span>
  );
}

function calcDelta(curr: number, prev: number): number {
  if (prev === 0) return 0;
  return Math.round(((curr - prev) / prev) * 100);
}

export function PeriodComparisonTab({ chartCardStyle }: { chartCardStyle: React.CSSProperties }) {
  const { textPrimary, textMuted } = useThemePalette();
  const [currentPeriod,  setCurrentPeriod]  = useState(dayjs().format('YYYY-MM'));
  const [comparePeriod, setComparePeriod] = useState(dayjs().subtract(1, 'month').format('YYYY-MM'));

  const { data, isFetching } = useQuery<PeriodSummaryResponse>({
    queryKey: ['reports-period-comparison', currentPeriod, comparePeriod],
    queryFn: () =>
      apiClient.get<PeriodSummaryResponse>('/reports/summary', {
        params: { period: currentPeriod, comparePeriod },
      }).then(r => r.data),
  });

  const curr = data?.current;
  const comp = data?.compare;

  const rows: { key: string; label: string; format: (v: number) => string }[] = [
    { key: 'revenue',         label: 'Doanh thu',        format: v => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(v) },
    { key: 'expenses',        label: 'Chi phí',          format: v => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(v) },
    { key: 'netIncome',       label: 'Lợi nhuận',        format: v => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(v) },
    { key: 'projectCount',    label: 'Số dự án',         format: v => String(v) },
    { key: 'activeEmployees', label: 'Nhân viên active', format: v => String(v) },
    { key: 'totalHours',      label: 'Tổng giờ làm',     format: v => `${v}h` },
  ];

  const comparisonColumns = [
    { title: 'Chỉ số', dataIndex: 'label', render: (v: string) => <Text style={{ color: textPrimary }}>{v}</Text> },
    {
      title: `Kỳ hiện tại (${currentPeriod})`,
      dataIndex: 'current',
      align: 'right' as const,
      render: (v: string) => <Text style={{ color: textPrimary, fontWeight: 600 }}>{v}</Text>,
    },
    {
      title: `Kỳ so sánh (${comparePeriod})`,
      dataIndex: 'compare',
      align: 'right' as const,
      render: (v: string) => <Text style={{ color: textMuted }}>{v}</Text>,
    },
    {
      title: 'Delta',
      dataIndex: 'delta',
      align: 'right' as const,
      render: (v: number) => <DeltaBadge pct={v} />,
    },
  ];

  const tableData = rows.map(r => {
    const currVal = curr ? (curr as unknown as Record<string, number>)[r.key] ?? 0 : 0;
    const compVal = comp ? (comp as unknown as Record<string, number>)[r.key] ?? 0 : 0;
    return {
      key: r.key,
      label: r.label,
      current: r.format(currVal),
      compare: r.format(compVal),
      delta: calcDelta(currVal, compVal),
    };
  });

  const statItems = [
    { label: 'Doanh thu', curr: curr?.revenue ?? 0, prev: comp?.revenue ?? 0, color: '#10B981' },
    { label: 'Chi phí',   curr: curr?.expenses ?? 0, prev: comp?.expenses ?? 0, color: '#EF4444' },
    { label: 'Lợi nhuận', curr: curr?.netIncome ?? 0, prev: comp?.netIncome ?? 0, color: '#6366F1' },
    { label: 'Giờ làm',   curr: curr?.totalHours ?? 0, prev: comp?.totalHours ?? 0, color: '#3B82F6' },
  ];

  return (
    <div>
      {/* Filter: 2 month pickers */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Text style={{ color: textMuted, fontSize: 13 }}>Kỳ hiện tại:</Text>
          <DatePicker
            picker="month"
            value={dayjs(currentPeriod)}
            onChange={v => v && setCurrentPeriod(v.format('YYYY-MM'))}
            format="MM/YYYY"
            allowClear={false}
          />
        </div>
        <SwapOutlined style={{ color: textMuted as string }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Text style={{ color: textMuted, fontSize: 13 }}>Kỳ so sánh:</Text>
          <DatePicker
            picker="month"
            value={dayjs(comparePeriod)}
            onChange={v => v && setComparePeriod(v.format('YYYY-MM'))}
            format="MM/YYYY"
            allowClear={false}
          />
        </div>
      </div>

      {/* StatCards with delta */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {statItems.map(item => {
          const delta = calcDelta(item.curr, item.prev);
          const fmt = (v: number) =>
            item.label === 'Giờ làm' ? `${v}h` :
            new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(v);
          return (
            <Col xs={12} sm={12} lg={6} key={item.label}>
              <StatCard
                label={item.label}
                value={fmt(item.curr)}
                color={item.color}
                subValue={<DeltaBadge pct={delta} />}
              />
            </Col>
          );
        })}
      </Row>

      {/* Comparison table */}
      <Card title="Bảng so sánh chi tiết" style={chartCardStyle}>
        <Table
          dataSource={tableData}
          columns={comparisonColumns}
          rowKey="key"
          size="small"
          pagination={false}
          loading={isFetching}
        />
      </Card>
    </div>
  );
}
