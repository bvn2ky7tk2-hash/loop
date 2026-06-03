import { Row, Col, Card } from 'antd';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip,
  ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts';
import { useGetCandidates, useGetJobs } from '../../../api/recruit';
import type { ChartProps } from './shared';
import { CANDIDATE_STAGE_COLORS } from './shared';

export function RecruitmentReportTab({ axisColor, gridColor, tooltipBg, primary, chartCardStyle }: ChartProps) {
  const { data: candidatesData } = useGetCandidates({ limit: 500 });
  const { data: jobsData }       = useGetJobs({ limit: 200 });
  const candidates = candidatesData?.data ?? [];
  const jobs       = jobsData?.data ?? [];

  const stageCounts = Object.entries(
    candidates.reduce((acc, c) => { acc[c.stage] = (acc[c.stage] ?? 0) + 1; return acc; }, {} as Record<string, number>)
  ).map(([stage, count]) => ({ stage, count }));

  const openJobs    = jobs.filter(j => j.status === 'OPEN').length;
  const totalHC     = jobs.reduce((s, j) => s + (j.headcount ?? 0), 0);
  const hired       = candidates.filter(c => c.stage === 'HIRED').length;

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} md={8}>
        <Card title="Tổng quan tuyển dụng" style={chartCardStyle}>
          <div style={{ padding: '12px 0' }}>
            {[
              { label: 'Vị trí đang mở', value: openJobs, color: primary },
              { label: 'Tổng chỉ tiêu', value: totalHC, color: '#6366F1' },
              { label: 'Đã tuyển', value: hired, color: '#10B981' },
              { label: 'Tổng ứng viên', value: candidates.length, color: '#F59E0B' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ color: axisColor }}>{item.label}</span>
                <span style={{ fontWeight: 700, fontSize: 18, color: item.color }}>{item.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </Col>
      <Col xs={24} md={16}>
        <Card title="Ứng viên theo stage" style={chartCardStyle}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stageCounts} layout="vertical" margin={{ left: 80, right: 20 }}>
              <XAxis type="number" tick={{ fill: axisColor, fontSize: 12 }} />
              <YAxis type="category" dataKey="stage" tick={{ fill: axisColor, fontSize: 12 }} />
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
              <RTooltip contentStyle={{ background: tooltipBg, border: '1px solid #333' }} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {stageCounts.map(s => <Cell key={s.stage} fill={CANDIDATE_STAGE_COLORS[s.stage] ?? primary} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </Col>
    </Row>
  );
}
