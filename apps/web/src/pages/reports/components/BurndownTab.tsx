import { Row, Col, Card, Typography, Select, Space } from 'antd';
import { ClockCircleOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { SparklineCard } from '../../../components/ui/SparklineCard';
import { ProgressRing } from '../../../components/ui/ProgressRing';
import {
  Bar, LineChart, Line, XAxis, YAxis, Tooltip as RTooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import type { BurndownData } from '../../../api/reports';
import type { Project } from '../../../api/projects';
import dayjs from 'dayjs';
import type { ChartProps } from './shared';

const { Text } = Typography;

interface BurndownTabProps extends ChartProps {
  projects: Project[];
  selectedProject: string | null;
  setSelectedProject: (id: string) => void;
  burndown: BurndownData | undefined;
}

export function BurndownTab({
  axisColor, gridColor, tooltipBg, primary, chartCardStyle,
  projects, setSelectedProject, burndown,
}: BurndownTabProps) {
  return (
    <Row gutter={[16, 16]}>
      <Col xs={24}>
        <Card>
          <Space>
            <Text>Chọn dự án:</Text>
            <Select
              style={{ width: 320 }}
              placeholder="Chọn dự án để xem burndown..."
              onChange={setSelectedProject}
              showSearch={{ optionFilterProp: 'label' }}
              options={projects.map((p) => ({ value: p.id, label: `${p.code} — ${p.name}` }))}
            />
          </Space>
        </Card>
      </Col>

      {burndown && (
        <>
          <Col xs={24} lg={6}>
            <SparklineCard
              label="Giờ ước tính"
              value={burndown.summary.totalEstimate}
              unit="h"
              color={primary}
              icon={<ClockCircleOutlined />}
              filled
            />
          </Col>
          <Col xs={24} lg={6}>
            <SparklineCard
              label="Giờ thực tế"
              value={burndown.summary.totalActual}
              unit="h"
              color={burndown.summary.totalActual > burndown.summary.totalEstimate ? '#EF4444' : '#10B981'}
              icon={<ClockCircleOutlined />}
              filled
            />
          </Col>
          <Col xs={24} lg={6}>
            <SparklineCard
              label="Giờ đã hoàn thành"
              value={burndown.summary.doneEstimate}
              unit="h"
              color="#6366F1"
              icon={<CheckCircleOutlined />}
              filled
            />
          </Col>
          <Col xs={24} lg={6}>
            <Card style={chartCardStyle}>
              <div style={{ marginBottom: 8 }}>
                <Text type="secondary">Tiến độ tổng thể</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 4 }}>
                <ProgressRing percent={burndown.summary.progress} size="md" />
              </div>
            </Card>
          </Col>
          <Col xs={24}>
            {/* TODO: kết nối API thật ở Wave 2 để trả remainingHours trực tiếp từ backend */}
            <Card title={`Burndown — ${burndown.project.name}`} style={chartCardStyle}>
              <ResponsiveContainer width="100%" height={320}>
                <LineChart
                  data={burndown.burndown.map((d, idx, arr) => {
                    // remainingHours = tổng estimate - tổng giờ thực tế tích lũy đến ngày đó
                    const cumulativeActual = arr
                      .slice(0, idx + 1)
                      .reduce((sum, point) => sum + point.dailyHours, 0);
                    return {
                      ...d,
                      remainingHours: Math.max(
                        0,
                        burndown.summary.totalEstimate - cumulativeActual,
                      ),
                    };
                  })}
                  margin={{ top: 8, right: 20, left: -8, bottom: 0 }}
                >
                  <XAxis
                    dataKey="date"
                    tick={{ fill: axisColor, fontSize: 11 }}
                    tickFormatter={(v) => dayjs(v).format('DD/MM')}
                  />
                  <YAxis
                    tick={{ fill: axisColor, fontSize: 12 }}
                    label={{ value: 'Giờ còn lại', angle: -90, position: 'insideLeft', fill: axisColor, fontSize: 11, offset: 12 }}
                  />
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <RTooltip
                    labelFormatter={(v) => dayjs(v).format('DD/MM/YYYY')}
                    formatter={(v, name) => [
                      `${v}h`,
                      name === 'remainingHours' ? 'Giờ còn lại' : 'Giờ trong ngày',
                    ]}
                    contentStyle={{ background: tooltipBg, border: '1px solid #333' }}
                  />
                  <Legend formatter={(v) => v === 'remainingHours' ? 'Giờ còn lại' : 'Giờ trong ngày'} />
                  <Bar dataKey="dailyHours" fill="#6366F1" opacity={0.35} />
                  <Line type="monotone" dataKey="remainingHours" stroke="#10B981" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </Col>
        </>
      )}
    </Row>
  );
}
