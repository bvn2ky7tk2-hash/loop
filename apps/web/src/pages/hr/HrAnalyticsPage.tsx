import { useState } from 'react';
import { Row, Col, Card, Typography, Select } from 'antd';
import { TeamOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip as RTooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import { useThemePalette } from '../../hooks/useThemePalette';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { FilterBar } from '../../components/FilterBar';
import { apiClient } from '../../api/client';
import dayjs from 'dayjs';

const { Text } = Typography;

interface TurnoverData {
  year: number;
  turnoverRate: number;
  resigned: number;
  total: number;
  byQuarter: { quarter: string; rate: number }[];
}

interface HeadcountTrendItem {
  month: string;
  headcount: number;
  newHires: number;
  resigned: number;
}

export default function HrAnalyticsPage() {
  const { isDark, textPrimary, textMuted, bgContainer, borderColor } = useThemePalette();
  const currentYear = dayjs().year();
  const [year, setYear] = useState(currentYear);

  const { data: turnover } = useQuery<TurnoverData>({
    queryKey: ['hr-turnover', year],
    queryFn: () => apiClient.get<TurnoverData>('/reports/hr/turnover', { params: { year } }).then(r => r.data),
  });

  const { data: headcountTrend = [] } = useQuery<HeadcountTrendItem[]>({
    queryKey: ['hr-headcount-trend'],
    queryFn: () => apiClient.get<HeadcountTrendItem[]>('/reports/hr/headcount-trend', { params: { months: 12 } }).then(r => r.data),
  });

  const axisColor  = isDark ? '#888' : '#555';
  const gridColor  = isDark ? '#333' : '#f0f0f0';
  const tooltipBg  = isDark ? '#1f1f1f' : '#fff';

  const currentHeadcount = headcountTrend.length > 0
    ? headcountTrend[headcountTrend.length - 1]?.headcount ?? 0
    : 0;

  const totalNewHires = headcountTrend.reduce((s, m) => s + (m.newHires ?? 0), 0);

  const headcountChartData = headcountTrend.map(m => ({
    month: dayjs(m.month + '-01').format('MM/YYYY'),
    headcount: m.headcount,
    newHires: m.newHires,
    resigned: m.resigned,
  }));

  const turnoverChartData = (turnover?.byQuarter ?? []).map(q => ({
    quarter: q.quarter,
    rate: q.rate,
  }));

  const chartCardStyle = {
    borderRadius: 12,
    background: bgContainer,
    border: `1px solid ${borderColor}`,
  };

  const yearOptions = Array.from({ length: 5 }, (_, i) => ({
    value: currentYear - i,
    label: String(currentYear - i),
  }));

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="HR Analytics"
        icon={<TeamOutlined />}
        iconColor="#8B5CF6"
      />

      <FilterBar>
        <Select
          value={year}
          onChange={setYear}
          options={yearOptions}
          style={{ width: 120 }}
        />
      </FilterBar>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <StatCard
            label="Turnover Rate"
            value={`${turnover?.turnoverRate ?? 0}%`}
            color="#EF4444"
            icon={<TeamOutlined />}
            subValue={`${turnover?.resigned ?? 0} người nghỉ năm ${year}`}
          />
        </Col>
        <Col xs={24} sm={8}>
          <StatCard
            label="Nhân sự hiện tại"
            value={currentHeadcount}
            color="#8B5CF6"
            icon={<TeamOutlined />}
          />
        </Col>
        <Col xs={24} sm={8}>
          <StatCard
            label="Tuyển mới 12 tháng"
            value={totalNewHires}
            color="#10B981"
            icon={<TeamOutlined />}
          />
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        {/* Headcount trend - AreaChart */}
        <Col xs={24} lg={14}>
          <Card title="Biến động nhân sự 12 tháng" style={chartCardStyle}>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={headcountChartData} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="hcGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="month" tick={{ fill: axisColor, fontSize: 11 }} />
                <YAxis tick={{ fill: axisColor, fontSize: 12 }} />
                <RTooltip contentStyle={{ background: tooltipBg, border: '1px solid #333', borderRadius: 8 }} />
                <Legend iconType="circle" iconSize={8} />
                <Area
                  type="monotone"
                  dataKey="headcount"
                  name="Tổng nhân sự"
                  stroke="#8B5CF6"
                  fill="url(#hcGrad)"
                  strokeWidth={2}
                  dot={false}
                />
                <Area
                  type="monotone"
                  dataKey="newHires"
                  name="Tuyển mới"
                  stroke="#10B981"
                  fill="none"
                  strokeWidth={2}
                  strokeDasharray="4 2"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* Turnover by quarter - LineChart */}
        <Col xs={24} lg={10}>
          <Card title={`Turnover theo quý — ${year}`} style={chartCardStyle}>
            {turnoverChartData.length === 0 ? (
              <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: textMuted }}>Không có dữ liệu</Text>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={turnoverChartData} margin={{ top: 8, right: 16, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis dataKey="quarter" tick={{ fill: axisColor, fontSize: 12 }} />
                  <YAxis tick={{ fill: axisColor, fontSize: 12 }} tickFormatter={v => `${v}%`} />
                  <RTooltip
                    formatter={(v: number) => [`${v}%`, 'Turnover rate']}
                    contentStyle={{ background: tooltipBg, border: '1px solid #333', borderRadius: 8 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="rate"
                    name="Turnover %"
                    stroke="#EF4444"
                    strokeWidth={2}
                    dot={{ r: 5, fill: '#EF4444' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Col>

        {/* Headcount summary table */}
        <Col xs={24}>
          <div style={{ background: bgContainer, border: `1px solid ${borderColor}`, borderRadius: 12, padding: '16px 20px' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: textPrimary, marginBottom: 12 }}>
              Chi tiết biến động theo tháng
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    {['Tháng', 'Tổng nhân sự', 'Tuyển mới', 'Nghỉ việc', 'Tăng/giảm'].map(h => (
                      <th key={h} style={{ padding: '6px 12px', textAlign: 'left', color: textMuted, fontWeight: 600, borderBottom: `1px solid ${borderColor}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {headcountChartData.map((row, i) => {
                    const net = (row.newHires ?? 0) - (row.resigned ?? 0);
                    return (
                      <tr key={i}>
                        <td style={{ padding: '6px 12px', color: textPrimary }}>{row.month}</td>
                        <td style={{ padding: '6px 12px', color: textPrimary, fontWeight: 600 }}>{row.headcount}</td>
                        <td style={{ padding: '6px 12px', color: '#10B981' }}>+{row.newHires}</td>
                        <td style={{ padding: '6px 12px', color: '#EF4444' }}>-{row.resigned}</td>
                        <td style={{ padding: '6px 12px', color: net >= 0 ? '#10B981' : '#EF4444', fontWeight: 600 }}>
                          {net >= 0 ? `+${net}` : net}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </Col>
      </Row>
    </div>
  );
}
