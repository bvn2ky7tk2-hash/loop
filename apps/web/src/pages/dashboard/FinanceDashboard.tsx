import { Row, Col } from 'antd';
import {
  DollarOutlined,
  FileTextOutlined,
  BankOutlined,
  PieChartOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart, Line, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer,
  CartesianGrid, Legend,
} from 'recharts';
import { useThemePalette } from '../../hooks/useThemePalette';
import { StatCard } from '../../components/ui/StatCard';
import { PageHeader } from '../../components/ui/PageHeader';
import { dashboardV3Api } from '../../api/dashboard-v3';

const REVENUE_MOCK = [
  { month: 'T1', revenue: 450, expense: 310 },
  { month: 'T2', revenue: 520, expense: 340 },
  { month: 'T3', revenue: 490, expense: 360 },
  { month: 'T4', revenue: 610, expense: 390 },
  { month: 'T5', revenue: 580, expense: 420 },
  { month: 'T6', revenue: 670, expense: 450 },
];

function formatMillion(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return String(v);
}

export default function FinanceDashboard() {
  const { bgContainer, borderColor, textPrimary, textMuted, isDark } = useThemePalette();

  const { data } = useQuery({
    queryKey: ['dashboard-finance'],
    queryFn: dashboardV3Api.getFinance,
    refetchInterval: 60_000,
  });

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Dashboard Tài chính"
        icon={<DollarOutlined />}
        iconColor="#10B981"
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={12} lg={6}>
          <StatCard
            label="Chi phí chờ duyệt"
            value={data?.pendingExpenses ?? 0}
            color="#F59E0B"
            icon={<DollarOutlined />}
          />
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <StatCard
            label="Hóa đơn outstanding"
            value={data?.outstandingInvoices ?? 0}
            color="#EF4444"
            icon={<FileTextOutlined />}
            subValue={data ? `${formatMillion(data.outstandingInvoicesValue)} VNĐ` : undefined}
          />
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <StatCard
            label="Lương tháng này"
            value={data ? formatMillion(data.monthlyPayroll) : '0'}
            color="#10B981"
            icon={<BankOutlined />}
          />
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <StatCard
            label="Ngân sách sử dụng"
            value={`${data?.budgetUtilization ?? 0}%`}
            color="#6366F1"
            icon={<PieChartOutlined />}
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
          <BankOutlined style={{ color: '#10B981' }} />
          Doanh thu vs Chi phí 6 tháng gần nhất (triệu VNĐ)
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={REVENUE_MOCK} margin={{ top: 4, right: 16, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#E2E8F0'} />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: textMuted as string }} />
            <YAxis tick={{ fontSize: 12, fill: textMuted as string }} />
            <RTooltip
              contentStyle={{
                background: isDark ? '#1E293B' : '#fff',
                border: `1px solid ${borderColor}`,
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Legend iconType="circle" iconSize={8} />
            <Line type="monotone" dataKey="revenue" name="Doanh thu" stroke="#10B981" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="expense" name="Chi phí" stroke="#EF4444" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
