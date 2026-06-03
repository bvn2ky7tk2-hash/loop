import { Row, Col, Card, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip as RTooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';
import type { TopEmployee } from '../../../api/reports';
import type { ChartProps } from './shared';

interface HoursTabProps extends ChartProps {
  topBarData: { name: string; hours: number; level: string }[];
  monthlyChartData: { month: string; hours: number }[];
  topEmployees: TopEmployee[];
  topEmployeeColumns: ColumnsType<TopEmployee>;
}

export function HoursTab({
  axisColor, gridColor, tooltipBg, primary, chartCardStyle,
  topBarData, monthlyChartData, topEmployees, topEmployeeColumns,
}: HoursTabProps) {
  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} lg={14}>
        <Card title="Top 10 nhân sự theo tổng giờ" style={chartCardStyle}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topBarData} layout="vertical" margin={{ left: 60, right: 20 }}>
              <XAxis type="number" tick={{ fill: axisColor, fontSize: 12 }} />
              <YAxis type="category" dataKey="name" tick={{ fill: axisColor, fontSize: 12 }} width={90} />
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
              <RTooltip
                formatter={(v: any) => [`${v}h`, 'Tổng giờ']}
                contentStyle={{ background: tooltipBg, border: '1px solid #333' }}
              />
              <Bar dataKey="hours" fill={primary} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </Col>
      <Col xs={24} lg={10}>
        <Card title="Giờ làm theo tháng (6 tháng gần nhất)" style={chartCardStyle}>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyChartData} margin={{ top: 8, right: 20, left: -16, bottom: 0 }}>
              <XAxis dataKey="month" tick={{ fill: axisColor, fontSize: 12 }} />
              <YAxis tick={{ fill: axisColor, fontSize: 12 }} />
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <RTooltip
                formatter={(v: any) => [`${v}h`, 'Giờ làm']}
                contentStyle={{ background: tooltipBg, border: '1px solid #333' }}
              />
              <Line type="monotone" dataKey="hours" stroke="#10B981" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </Col>
      <Col xs={24}>
        <Card title="Danh sách top nhân sự" style={chartCardStyle}>
          <Table
            dataSource={topEmployees}
            columns={topEmployeeColumns}
            rowKey="userId"
            size="small"
            pagination={false}
          />
        </Card>
      </Col>
    </Row>
  );
}
