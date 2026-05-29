import { Row, Col, Spin } from 'antd';
import {
  DollarOutlined,
  FileTextOutlined,
  BankOutlined,
  PieChartOutlined,
  RiseOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart, Line, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer,
  CartesianGrid, Legend,
} from 'recharts';
import { useThemePalette } from '../../hooks/useThemePalette';
import { StatCard } from '../../components/ui/StatCard';
import { PageHeader } from '../../components/ui/PageHeader';
import { dashboardV3Api } from '../../api/dashboard-v3';

function formatMillion(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return String(v);
}

/** Rút gọn label tháng 'YYYY-MM' → 'T1', 'T2'… */
function toMonthLabel(ym: string) {
  const parts = ym.split('-');
  return `T${parseInt(parts[1] ?? '0', 10)}`;
}

export default function FinanceDashboard() {
  const { bgContainer, borderColor, textPrimary, textMuted, isDark } = useThemePalette();
  const navigate = useNavigate();

  const { data: finance } = useQuery({
    queryKey: ['dashboard-finance'],
    queryFn: dashboardV3Api.getFinance,
    refetchInterval: 60_000,
  });

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['dashboard-finance-summary'],
    queryFn: dashboardV3Api.getFinanceSummary,
    refetchInterval: 60_000,
  });

  // Tính tháng hiện tại từ summary (phần tử cuối)
  const currentMonth = summary ? summary[summary.length - 1] : undefined;
  const prevMonth    = summary ? summary[summary.length - 2] : undefined;
  const revenueNow   = currentMonth?.revenue ?? 0;
  const expenseNow   = currentMonth?.expense ?? 0;
  const profitNow    = revenueNow - expenseNow;
  const prevProfit   = (prevMonth?.revenue ?? 0) - (prevMonth?.expense ?? 0);
  const profitTrend  = prevProfit > 0
    ? `${profitNow >= prevProfit ? '+' : ''}${Math.round(((profitNow - prevProfit) / prevProfit) * 100)}% vs tháng trước`
    : undefined;

  const chartData = (summary ?? []).map((item) => ({
    month:   toMonthLabel(item.month),
    revenue: Math.round(item.revenue / 1_000_000),   // đổi sang triệu VNĐ
    expense: Math.round(item.expense / 1_000_000),
  }));

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Dashboard Tài chính"
        icon={<DollarOutlined />}
        iconColor="#10B981"
      />

      {/* Hàng 1: StatCard từ /dashboard/finance */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={12} lg={6}>
          <StatCard
            label="Chi phí chờ duyệt"
            value={finance?.pendingExpenses ?? 0}
            color="#F59E0B"
            icon={<DollarOutlined />}
            onClick={() => navigate('/expenses')}
          />
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <StatCard
            label="Hóa đơn outstanding"
            value={finance?.outstandingInvoices ?? 0}
            color="#EF4444"
            icon={<FileTextOutlined />}
            subValue={finance ? `${formatMillion(finance.outstandingInvoicesValue)} VNĐ` : undefined}
            onClick={() => navigate('/invoices')}
          />
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <StatCard
            label="Lương tháng này"
            value={finance ? formatMillion(finance.monthlyPayroll) : '0'}
            color="#10B981"
            icon={<BankOutlined />}
          />
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <StatCard
            label="Ngân sách sử dụng"
            value={`${finance?.budgetUtilization ?? 0}%`}
            color="#6366F1"
            icon={<PieChartOutlined />}
          />
        </Col>
      </Row>

      {/* Hàng 2: StatCard tháng hiện tại từ finance-summary */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={12} lg={8}>
          <StatCard
            label="Doanh thu tháng này"
            value={formatMillion(revenueNow)}
            color="#10B981"
            icon={<RiseOutlined />}
          />
        </Col>
        <Col xs={12} sm={12} lg={8}>
          <StatCard
            label="Chi phí tháng này"
            value={formatMillion(expenseNow)}
            color="#EF4444"
            icon={<DollarOutlined />}
          />
        </Col>
        <Col xs={12} sm={12} lg={8}>
          <StatCard
            label="Lợi nhuận tháng này"
            value={formatMillion(profitNow)}
            color="#6366F1"
            icon={<BankOutlined />}
            subValue={profitTrend}
          />
        </Col>
      </Row>

      {/* Line chart doanh thu vs chi phí */}
      <div style={{
        background:   bgContainer,
        border:       `1px solid ${borderColor}`,
        borderRadius: 12,
        padding:      '16px 20px',
      }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: textPrimary, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <BankOutlined style={{ color: '#10B981' }} />
          Doanh thu vs Chi phí 6 tháng gần nhất (triệu VNĐ)
        </div>

        {summaryLoading ? (
          <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Spin size="small" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 4, right: 16, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#E2E8F0'} />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: textMuted as string }} />
              <YAxis tick={{ fontSize: 12, fill: textMuted as string }} />
              <RTooltip
                contentStyle={{
                  background:   bgContainer,
                  border:       `1px solid ${borderColor}`,
                  borderRadius: 8,
                  fontSize:     12,
                }}
                formatter={(value: number) => [`${value}M VNĐ`]}
              />
              <Legend iconType="circle" iconSize={8} />
              <Line type="monotone" dataKey="revenue" name="Doanh thu" stroke="#10B981" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="expense" name="Chi phí"   stroke="#EF4444" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
