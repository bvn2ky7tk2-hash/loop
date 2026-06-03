import { Row, Col, Card } from 'antd';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip,
  ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell,
} from 'recharts';
import { useGetAssets } from '../../../api/assets';
import type { ChartProps } from './shared';

export function AssetReportTab({ axisColor, gridColor, tooltipBg, primary, chartCardStyle }: ChartProps) {
  const { data: assetsData } = useGetAssets({ limit: 500 });
  const assets = assetsData?.data ?? [];

  const byCategory = Object.entries(
    assets.reduce((acc, a) => { acc[a.category] = (acc[a.category] ?? 0) + 1; return acc; }, {} as Record<string, number>)
  ).map(([category, count]) => ({ category, count }));

  const byStatus = Object.entries(
    assets.reduce((acc, a) => { acc[a.status] = (acc[a.status] ?? 0) + 1; return acc; }, {} as Record<string, number>)
  ).map(([status, count]) => ({ status, count }));

  const totalValue = assets.reduce((s, a) => s + Number(a.purchasePrice ?? 0), 0);
  const deprecEst  = assets.reduce((a, asset) => {
    const years = asset.depreciationYears ?? 5;
    return a + Number(asset.purchasePrice ?? 0) / years;
  }, 0);

  const STATUS_COLORS: Record<string, string> = {
    AVAILABLE: '#10B981', ASSIGNED: '#3B82F6', UNDER_MAINTENANCE: '#F59E0B', RETIRED: '#94A3B8',
  };

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} md={8}>
        <Card title="Tổng quan tài sản" style={chartCardStyle}>
          <div style={{ padding: '12px 0' }}>
            {[
              { label: 'Tổng tài sản', value: assets.length, color: primary },
              { label: 'Tổng giá trị mua', value: totalValue.toLocaleString('vi-VN') + ' ₫', color: '#10B981' },
              { label: 'Khấu hao ước tính/năm', value: deprecEst.toLocaleString('vi-VN', { maximumFractionDigits: 0 }) + ' ₫', color: '#F59E0B' },
            ].map(item => (
              <div key={item.label} style={{ marginBottom: 12 }}>
                <div style={{ color: axisColor, fontSize: 12 }}>{item.label}</div>
                <div style={{ fontWeight: 700, color: item.color }}>{item.value}</div>
              </div>
            ))}
          </div>
        </Card>
      </Col>
      <Col xs={24} md={8}>
        <Card title="Số lượng theo danh mục" style={chartCardStyle}>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={byCategory} dataKey="count" nameKey="category" cx="50%" cy="50%" outerRadius={70} label={(props) => `${(props as { category?: string; count?: number }).category ?? ''}:${(props as { category?: string; count?: number }).count ?? ''}`}>
                {byCategory.map((_, i) => <Cell key={i} fill={[primary, '#6366F1', '#F59E0B', '#10B981', '#EF4444', '#3B82F6', '#8B5CF6', '#EC4899', '#0EA5E9'][i % 9]} />)}
              </Pie>
              <RTooltip contentStyle={{ background: tooltipBg, border: '1px solid #333' }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </Col>
      <Col xs={24} md={8}>
        <Card title="Theo trạng thái" style={chartCardStyle}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={byStatus} layout="vertical" margin={{ left: 120, right: 16 }}>
              <XAxis type="number" tick={{ fill: axisColor, fontSize: 11 }} />
              <YAxis type="category" dataKey="status" tick={{ fill: axisColor, fontSize: 11 }} width={110} />
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
              <RTooltip contentStyle={{ background: tooltipBg, border: '1px solid #333' }} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {byStatus.map(s => <Cell key={s.status} fill={STATUS_COLORS[s.status] ?? primary} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </Col>
    </Row>
  );
}
