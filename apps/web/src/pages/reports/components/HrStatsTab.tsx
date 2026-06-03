import { Row, Col, Card, Typography, Divider } from 'antd';
import { SparklineCard } from '../../../components/ui/SparklineCard';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip,
  ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts';
import type { HrStats } from '../../../api/reports';
import type { ChartProps } from './shared';
import { LEAVE_STATUS_COLOR, EXPENSE_STATUS_COLOR } from './shared';

const { Text } = Typography;

interface HrStatsTabProps extends ChartProps {
  hrStats: HrStats | undefined;
  isDark: boolean;
  textPrimary: string;
}

export function HrStatsTab({
  axisColor, gridColor, tooltipBg, primary, chartCardStyle,
  hrStats, isDark, textPrimary,
}: HrStatsTabProps) {
  return (
    <Row gutter={[16, 16]}>
      {/* Leave section */}
      <Col xs={24}>
        <Text strong style={{ fontSize: 15, color: textPrimary }}>Leave Requests</Text>
      </Col>

      {/* Leave status cards */}
      {(['PENDING', 'APPROVED', 'REJECTED'] as const).map((status) => {
        const count = hrStats?.leave.byStatus.find((s) => s.status === status)?.count ?? 0;
        return (
          <Col xs={24} sm={8} key={`leave-${status}`}>
            <SparklineCard
              label={`Leave — ${status.charAt(0) + status.slice(1).toLowerCase()}`}
              value={count}
              color={LEAVE_STATUS_COLOR[status]}
              filled
            />
          </Col>
        );
      })}

      {/* Leave by type bar chart */}
      <Col xs={24}>
        <Card title="Leave by Type" style={chartCardStyle}>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={(hrStats?.leave.byType ?? []).map((t) => ({
                name: t.typeName,
                count: t.count,
                fill: t.color || primary,
              }))}
              margin={{ top: 8, right: 20, left: -8, bottom: 0 }}
            >
              <XAxis dataKey="name" tick={{ fill: axisColor, fontSize: 12 }} />
              <YAxis tick={{ fill: axisColor, fontSize: 12 }} />
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <RTooltip
                formatter={(v: any) => [v, 'Requests']}
                contentStyle={{ background: tooltipBg, border: '1px solid #333' }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {(hrStats?.leave.byType ?? []).map((t) => (
                  <Cell key={t.typeId} fill={t.color || primary} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </Col>

      {/* Expense section divider */}
      <Col xs={24}>
        <Divider style={{ borderColor: isDark ? '#334155' : '#E2E8F0', margin: '4px 0 8px' }} />
        <Text strong style={{ fontSize: 15, color: textPrimary }}>Expense Claims</Text>
      </Col>

      {/* Expense status cards */}
      {(['PENDING', 'APPROVED', 'REJECTED', 'PAID'] as const).map((status) => {
        const count = hrStats?.expense.byStatus.find((s) => s.status === status)?.count ?? 0;
        return (
          <Col xs={24} sm={12} lg={6} key={`expense-${status}`}>
            <SparklineCard
              label={`Expense — ${status.charAt(0) + status.slice(1).toLowerCase()}`}
              value={count}
              color={EXPENSE_STATUS_COLOR[status]}
              filled
            />
          </Col>
        );
      })}

      {/* Expense by category bar chart (totalAmount) */}
      <Col xs={24}>
        <Card title="Expense by Category (Total Amount)" style={chartCardStyle}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={(hrStats?.expense.byCategory ?? []).map((c) => ({
                name: c.category,
                amount: c.totalAmount,
              }))}
              margin={{ top: 8, right: 20, left: 16, bottom: 0 }}
            >
              <XAxis dataKey="name" tick={{ fill: axisColor, fontSize: 12 }} />
              <YAxis
                tick={{ fill: axisColor, fontSize: 12 }}
                tickFormatter={(v: number) =>
                  v >= 1_000_000
                    ? `${Math.round(v / 100_000) / 10}M`
                    : v >= 1_000
                    ? `${Math.round(v / 1_000)}K`
                    : String(v)
                }
              />
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <RTooltip
                formatter={(v: any) => [
                  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v),
                  'Total',
                ]}
                contentStyle={{ background: tooltipBg, border: '1px solid #333' }}
              />
              <Bar dataKey="amount" fill={primary} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </Col>
    </Row>
  );
}
