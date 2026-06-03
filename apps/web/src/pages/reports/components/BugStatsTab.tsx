import { Row, Col, Card } from 'antd';
import { SparklineCard } from '../../../components/ui/SparklineCard';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip as RTooltip,
  ResponsiveContainer, CartesianGrid, Legend, PieChart, Pie, Cell,
} from 'recharts';
import type { BugStats } from '../../../api/reports';
import dayjs from 'dayjs';
import type { ChartProps } from './shared';
import { SEVERITY_COLORS, SEVERITY_LABEL, BUG_STATUS_LABEL, BUG_STATUS_COLOR } from './shared';

interface BugStatsTabProps extends ChartProps {
  bugStats: BugStats | undefined;
}

export function BugStatsTab({
  axisColor, gridColor, tooltipBg, primary, chartCardStyle, bugStats,
}: BugStatsTabProps) {
  return (
    <Row gutter={[16, 16]}>
      {/* Row 1: Status summary cards */}
      {(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const).map((status) => {
        const count = bugStats?.byStatus.find((s) => s.status === status)?.count ?? 0;
        return (
          <Col xs={24} sm={12} lg={6} key={status}>
            <SparklineCard
              label={BUG_STATUS_LABEL[status]}
              value={count}
              color={BUG_STATUS_COLOR[status]}
              filled
            />
          </Col>
        );
      })}

      {/* Row 2 col 6: Pie chart by severity */}
      <Col xs={24} lg={6}>
        <Card title="By Severity" style={chartCardStyle}>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={(bugStats?.bySeverity ?? []).map((s) => ({
                  name: SEVERITY_LABEL[s.severity] ?? s.severity,
                  value: s.count,
                  fill: SEVERITY_COLORS[s.severity] ?? '#94A3B8',
                }))}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={90}
                label={({ name, percent }) => `${name} ${Math.round((percent ?? 0) * 100)}%`}
                labelLine={false}
              >
                {(bugStats?.bySeverity ?? []).map((s) => (
                  <Cell
                    key={s.severity}
                    fill={SEVERITY_COLORS[s.severity] ?? '#94A3B8'}
                  />
                ))}
              </Pie>
              <RTooltip
                formatter={(v: any, name: any) => [v, name]}
                contentStyle={{ background: tooltipBg, border: '1px solid #333' }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </Col>

      {/* Row 2 col 18: Horizontal bar by project */}
      <Col xs={24} lg={18}>
        <Card title="Top Projects by Bug Count" style={chartCardStyle}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={(bugStats?.byProject ?? []).slice(0, 8).map((p) => ({
                name: p.projectCode,
                fullName: p.projectName,
                count: p.count,
              }))}
              layout="vertical"
              margin={{ left: 20, right: 20 }}
            >
              <XAxis type="number" tick={{ fill: axisColor, fontSize: 12 }} />
              <YAxis type="category" dataKey="name" tick={{ fill: axisColor, fontSize: 12 }} width={70} />
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
              <RTooltip
                formatter={(v: any, _name: any, props: any) => [v, props.payload?.fullName ?? '']}
                contentStyle={{ background: tooltipBg, border: '1px solid #333' }}
              />
              <Bar dataKey="count" fill={primary} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </Col>

      {/* Row 3: Monthly trend */}
      <Col xs={24}>
        <Card title="Monthly Bug Trend (6 months)" style={chartCardStyle}>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart
              data={(bugStats?.monthlyTrend ?? []).map((m) => ({
                month: dayjs(m.month + '-01').format('MM/YYYY'),
                count: m.count,
              }))}
              margin={{ top: 8, right: 20, left: -16, bottom: 0 }}
            >
              <XAxis dataKey="month" tick={{ fill: axisColor, fontSize: 12 }} />
              <YAxis tick={{ fill: axisColor, fontSize: 12 }} />
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <RTooltip
                formatter={(v: any) => [v, 'Bugs']}
                contentStyle={{ background: tooltipBg, border: '1px solid #333' }}
              />
              <Line type="monotone" dataKey="count" stroke="#EF4444" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </Col>
    </Row>
  );
}
