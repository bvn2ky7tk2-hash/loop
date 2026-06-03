import { Row, Col, Card } from 'antd';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip,
  ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts';
import { useGetDeals } from '../../../api/crm';
import dayjs from 'dayjs';
import type { ChartProps } from './shared';
import { DEAL_STAGE_COLORS } from './shared';

export function CrmReportTab({ axisColor, gridColor, tooltipBg, primary, chartCardStyle }: ChartProps) {
  const { data: dealsData } = useGetDeals({ limit: 500 });
  const deals = dealsData?.data ?? [];

  const stageCounts = Object.entries(
    deals.reduce((acc, d) => { acc[d.stage] = (acc[d.stage] ?? 0) + 1; return acc; }, {} as Record<string, number>)
  ).map(([stage, count]) => ({ stage, count }));

  const monthlyWon = deals
    .filter(d => d.stage === 'WON' && d.wonAt)
    .reduce((acc, d) => {
      const m = dayjs(d.wonAt!).format('MM/YYYY');
      acc[m] = (acc[m] ?? 0) + Number(d.value ?? 0);
      return acc;
    }, {} as Record<string, number>);
  const monthlyWonData = Object.entries(monthlyWon).slice(-6).map(([month, value]) => ({ month, value }));

  const total = deals.length || 1;
  const won   = deals.filter(d => d.stage === 'WON').length;
  const lost  = deals.filter(d => d.stage === 'LOST').length;

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} md={8}>
        <Card title="Win / Lose Ratio" style={chartCardStyle}>
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: 36, fontWeight: 700, color: '#10B981' }}>{Math.round(won / total * 100)}%</div>
            <div style={{ color: axisColor }}>Win rate</div>
            <div style={{ marginTop: 8 }}>
              <span style={{ color: '#10B981', marginRight: 16 }}>✓ Won: {won}</span>
              <span style={{ color: '#EF4444' }}>✗ Lost: {lost}</span>
            </div>
          </div>
        </Card>
      </Col>
      <Col xs={24} md={16}>
        <Card title="Deal funnel theo stage" style={chartCardStyle}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stageCounts} layout="vertical" margin={{ left: 80, right: 20 }}>
              <XAxis type="number" tick={{ fill: axisColor, fontSize: 12 }} />
              <YAxis type="category" dataKey="stage" tick={{ fill: axisColor, fontSize: 12 }} />
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
              <RTooltip contentStyle={{ background: tooltipBg, border: '1px solid #333' }} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {stageCounts.map(s => <Cell key={s.stage} fill={DEAL_STAGE_COLORS[s.stage] ?? primary} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </Col>
      <Col xs={24}>
        <Card title="Deal value WON theo tháng (6 tháng gần nhất)" style={chartCardStyle}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyWonData} margin={{ top: 8, right: 20, left: 16, bottom: 0 }}>
              <XAxis dataKey="month" tick={{ fill: axisColor, fontSize: 12 }} />
              <YAxis tick={{ fill: axisColor, fontSize: 12 }} tickFormatter={(v: number) => v >= 1e9 ? `${(v/1e9).toFixed(1)}B` : v >= 1e6 ? `${(v/1e6).toFixed(0)}M` : String(v)} />
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <RTooltip formatter={(v) => [new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(v ?? 0)), 'Value']} contentStyle={{ background: tooltipBg, border: '1px solid #333' }} />
              <Bar dataKey="value" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </Col>
    </Row>
  );
}
