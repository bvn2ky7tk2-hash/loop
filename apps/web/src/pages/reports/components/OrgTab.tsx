import { Row, Col, Card, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import type { OrgSummary } from '../../../api/reports';
import type { ChartProps } from './shared';

interface OrgTabProps extends ChartProps {
  orgSummary: OrgSummary[];
  orgColumns: ColumnsType<OrgSummary>;
}

export function OrgTab({
  axisColor, gridColor, tooltipBg, primary, chartCardStyle,
  orgSummary, orgColumns,
}: OrgTabProps) {
  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} lg={14}>
        <Card title="Biểu đồ nhân sự theo đơn vị" style={chartCardStyle}>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart
              data={orgSummary.filter((o) => o.employeeCount > 0)}
              margin={{ top: 8, right: 16, left: -16, bottom: 60 }}
            >
              <XAxis
                dataKey="code"
                tick={{ fill: axisColor, fontSize: 12 }}
                angle={-30}
                textAnchor="end"
                interval={0}
              />
              <YAxis tick={{ fill: axisColor, fontSize: 12 }} />
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <RTooltip
                formatter={(v: any, name: any) => [v, name === 'employeeCount' ? 'Nhân sự' : 'Dự án']}
                contentStyle={{ background: tooltipBg, border: '1px solid #333' }}
              />
              <Legend formatter={(v) => v === 'employeeCount' ? 'Nhân sự' : 'Dự án'} />
              <Bar dataKey="employeeCount" fill={primary} radius={[4, 4, 0, 0]} />
              <Bar dataKey="projectCount" fill="#722ed1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </Col>
      <Col xs={24} lg={10}>
        <Card title="Chi tiết theo đơn vị" style={chartCardStyle}>
          <Table
            dataSource={orgSummary}
            columns={orgColumns}
            rowKey="id"
            size="small"
            pagination={false}
          />
        </Card>
      </Col>
    </Row>
  );
}
