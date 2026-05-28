import { Row, Col } from 'antd';
import {
  FunnelPlotOutlined,
  TrophyOutlined,
  DollarOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts';
import { useThemePalette } from '../../hooks/useThemePalette';
import { StatCard } from '../../components/ui/StatCard';
import { PageHeader } from '../../components/ui/PageHeader';
import { dashboardV3Api } from '../../api/dashboard-v3';

const STAGE_DATA = [
  { stage: 'Qualification', value: 8, color: '#6366F1' },
  { stage: 'Proposal', value: 5, color: '#3B82F6' },
  { stage: 'Negotiation', value: 3, color: '#F59E0B' },
  { stage: 'Won', value: 12, color: '#10B981' },
  { stage: 'Lost', value: 4, color: '#EF4444' },
];

function formatMillion(v: number) {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(0)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return String(v);
}

export default function CrmDashboard() {
  const { bgContainer, borderColor, textPrimary, textMuted, isDark } = useThemePalette();

  const { data } = useQuery({
    queryKey: ['dashboard-crm'],
    queryFn: dashboardV3Api.getCrm,
    refetchInterval: 60_000,
  });

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Dashboard CRM"
        icon={<FunnelPlotOutlined />}
        iconColor="#3B82F6"
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={12} lg={6}>
          <StatCard
            label="Leads đang mở"
            value={data?.openLeads ?? 0}
            color="#6366F1"
            icon={<FunnelPlotOutlined />}
          />
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <StatCard
            label="Deals đang chạy"
            value={data?.activeDeals ?? 0}
            color="#3B82F6"
            icon={<TrophyOutlined />}
          />
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <StatCard
            label="Pipeline value"
            value={data ? formatMillion(data.totalPipelineValue) : '0'}
            color="#10B981"
            icon={<DollarOutlined />}
            subValue="VNĐ"
          />
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <StatCard
            label="Hoạt động tuần này"
            value={data?.activitiesThisWeek ?? 0}
            color="#F97316"
            icon={<CalendarOutlined />}
          />
        </Col>
      </Row>

      <div style={{
        background: bgContainer,
        border: `1px solid ${borderColor}`,
        borderRadius: 12,
        padding: '16px 20px',
      }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: textPrimary, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <FunnelPlotOutlined style={{ color: '#3B82F6' }} />
          Phân bổ Deal theo giai đoạn
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={STAGE_DATA} margin={{ top: 4, right: 16, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#E2E8F0'} />
            <XAxis dataKey="stage" tick={{ fontSize: 12, fill: textMuted as string }} />
            <YAxis tick={{ fontSize: 12, fill: textMuted as string }} />
            <RTooltip
              contentStyle={{
                background: isDark ? '#1E293B' : '#fff',
                border: `1px solid ${borderColor}`,
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Bar dataKey="value" name="Deals" radius={[4, 4, 0, 0]}>
              {STAGE_DATA.map((entry) => (
                <Cell key={entry.stage} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
