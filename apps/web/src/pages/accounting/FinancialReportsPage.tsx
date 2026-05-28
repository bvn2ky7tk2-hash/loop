import { useState } from 'react';
import { Row, Col, Typography, DatePicker, Table, Spin, Divider, Tabs } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { BarChartOutlined, FundOutlined, BankOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useThemePalette } from '../../hooks/useThemePalette';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { formatCurrency } from '../../utils/format';
import {
  useGetProfitLoss, useGetBalanceSheet,
  type FinancialReportRow,
} from '../../api/accounting';

const { Text } = Typography;
const { RangePicker } = DatePicker;

function amtStyle(val: number, linkColor: string, textMuted: string) {
  if (val > 0) return { color: linkColor, fontWeight: 600 as const };
  if (val < 0) return { color: '#EF4444', fontWeight: 600 as const };
  return { color: textMuted };
}

// ── Profit & Loss Tab ─────────────────────────────────────────────────────────
function ProfitLossTab() {
  const { textPrimary, textMuted, linkColor, bgContainer, borderColor } = useThemePalette();
  const [range, setRange] = useState<[string, string]>(['2026-01-01', '2026-05-31']);

  const { data, isFetching } = useGetProfitLoss(range[0], range[1]);

  const cols: ColumnsType<FinancialReportRow> = [
    { title: 'Mã TK', dataIndex: 'code', width: 80, render: (v: string) => <Text style={{ color: textMuted, fontFamily: 'monospace' }}>{v}</Text> },
    { title: 'Tên tài khoản', dataIndex: 'name', render: (v: string) => <Text style={{ color: textPrimary }}>{v}</Text> },
    {
      title: 'Số tiền (VNĐ)', dataIndex: 'balance', align: 'right' as const, width: 180,
      render: (v: number) => <Text style={amtStyle(v, linkColor, textMuted)}>{formatCurrency(v)}</Text>,
    },
  ];

  return (
    <Spin spinning={isFetching}>
      <div style={{ marginBottom: 16 }}>
        <RangePicker
          value={[dayjs(range[0]), dayjs(range[1])]}
          onChange={v => v && setRange([v[0]!.format('YYYY-MM-DD'), v[1]!.format('YYYY-MM-DD')])}
          format="DD/MM/YYYY"
          allowClear={false}
        />
      </div>

      {data && (
        <>
          <Row gutter={16} style={{ marginBottom: 20 }}>
            <Col xs={12} sm={8}><StatCard label="Doanh thu" value={formatCurrency(data.totalRevenue)} color="#10B981" icon={<FundOutlined />} /></Col>
            <Col xs={12} sm={8}><StatCard label="Chi phí" value={formatCurrency(data.totalExpenses)} color="#EF4444" icon={<BarChartOutlined />} /></Col>
            <Col xs={12} sm={8}><StatCard label="Lợi nhuận" value={formatCurrency(data.netIncome)} color={data.netIncome >= 0 ? '#6366F1' : '#F59E0B'} icon={<BankOutlined />} /></Col>
          </Row>

          <Text strong style={{ color: textPrimary, fontSize: 14 }}>I. Doanh thu</Text>
          <Table
            rowKey="code" columns={cols} dataSource={data.revenue} pagination={false} size="small"
            style={{ marginTop: 8, marginBottom: 16, background: bgContainer, border: `1px solid ${borderColor}`, borderRadius: 8 }}
            summary={() => (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={2}><Text strong style={{ color: textPrimary }}>Tổng doanh thu</Text></Table.Summary.Cell>
                <Table.Summary.Cell index={2} align="right"><Text strong style={{ color: '#10B981', fontSize: 14 }}>{formatCurrency(data.totalRevenue)}</Text></Table.Summary.Cell>
              </Table.Summary.Row>
            )}
          />

          <Divider />

          <Text strong style={{ color: textPrimary, fontSize: 14 }}>II. Chi phí</Text>
          <Table
            rowKey="code" columns={cols} dataSource={data.expenses} pagination={false} size="small"
            style={{ marginTop: 8, marginBottom: 16, background: bgContainer, border: `1px solid ${borderColor}`, borderRadius: 8 }}
            summary={() => (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={2}><Text strong style={{ color: textPrimary }}>Tổng chi phí</Text></Table.Summary.Cell>
                <Table.Summary.Cell index={2} align="right"><Text strong style={{ color: '#EF4444', fontSize: 14 }}>{formatCurrency(data.totalExpenses)}</Text></Table.Summary.Cell>
              </Table.Summary.Row>
            )}
          />

          <Divider />

          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '8px 16px', background: bgContainer, border: `1px solid ${borderColor}`, borderRadius: 8 }}>
            <Text strong style={{ color: textPrimary, fontSize: 15 }}>
              Lợi nhuận thuần: &nbsp;
              <span style={{ color: data.netIncome >= 0 ? '#10B981' : '#EF4444', fontSize: 18 }}>
                {formatCurrency(data.netIncome)}
              </span>
            </Text>
          </div>
        </>
      )}
    </Spin>
  );
}

// ── Balance Sheet Tab ─────────────────────────────────────────────────────────
function BalanceSheetTab() {
  const { textPrimary, textMuted, linkColor, bgContainer, borderColor } = useThemePalette();
  const [asOfDate, setAsOfDate] = useState('2026-05-31');

  const { data, isFetching } = useGetBalanceSheet(asOfDate);

  const cols: ColumnsType<FinancialReportRow> = [
    { title: 'Mã TK', dataIndex: 'code', width: 80, render: (v: string) => <Text style={{ color: textMuted, fontFamily: 'monospace' }}>{v}</Text> },
    { title: 'Tên tài khoản', dataIndex: 'name', render: (v: string) => <Text style={{ color: textPrimary }}>{v}</Text> },
    {
      title: 'Số dư (VNĐ)', dataIndex: 'balance', align: 'right' as const, width: 180,
      render: (v: number) => <Text style={amtStyle(v, linkColor, textMuted)}>{formatCurrency(v)}</Text>,
    },
  ];

  const SectionTable = ({ title, rows, total, color }: { title: string; rows: FinancialReportRow[]; total: number; color: string }) => (
    <>
      <Text strong style={{ color: textPrimary, fontSize: 14 }}>{title}</Text>
      <Table
        rowKey="code" columns={cols} dataSource={rows.filter(r => r.balance !== 0)} pagination={false} size="small"
        style={{ marginTop: 8, marginBottom: 16, background: bgContainer, border: `1px solid ${borderColor}`, borderRadius: 8 }}
        summary={() => (
          <Table.Summary.Row>
            <Table.Summary.Cell index={0} colSpan={2}><Text strong style={{ color: textPrimary }}>Tổng</Text></Table.Summary.Cell>
            <Table.Summary.Cell index={2} align="right"><Text strong style={{ color, fontSize: 14 }}>{formatCurrency(total)}</Text></Table.Summary.Cell>
          </Table.Summary.Row>
        )}
      />
    </>
  );

  return (
    <Spin spinning={isFetching}>
      <div style={{ marginBottom: 16 }}>
        <DatePicker
          value={dayjs(asOfDate)}
          onChange={v => v && setAsOfDate(v.format('YYYY-MM-DD'))}
          format="DD/MM/YYYY"
          allowClear={false}
          placeholder="Tại ngày"
        />
      </div>

      {data && (
        <>
          <Row gutter={16} style={{ marginBottom: 20 }}>
            <Col xs={12} sm={8}><StatCard label="Tổng tài sản" value={formatCurrency(data.totalAssets)} color="#3B82F6" icon={<BankOutlined />} /></Col>
            <Col xs={12} sm={8}><StatCard label="Nợ phải trả" value={formatCurrency(data.totalLiabilities)} color="#EF4444" icon={<BarChartOutlined />} /></Col>
            <Col xs={12} sm={8}><StatCard label="Vốn chủ sở hữu" value={formatCurrency(data.totalEquity)} color="#6366F1" icon={<FundOutlined />} /></Col>
          </Row>

          <SectionTable title="A. TÀI SẢN" rows={data.assets} total={data.totalAssets} color="#3B82F6" />
          <Divider />
          <SectionTable title="B. NỢ PHẢI TRẢ" rows={data.liabilities} total={data.totalLiabilities} color="#EF4444" />
          <Divider />
          <SectionTable title="C. VỐN CHỦ SỞ HỮU" rows={data.equity} total={data.totalEquity} color="#6366F1" />
          <Divider />
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '8px 16px', background: bgContainer, border: `1px solid ${borderColor}`, borderRadius: 8 }}>
            <Text strong style={{ color: textPrimary, fontSize: 15 }}>
              Tổng Nợ + Vốn chủ sở hữu: &nbsp;
              <span style={{ color: linkColor, fontSize: 18 }}>{formatCurrency(data.totalLiabilitiesAndEquity)}</span>
            </Text>
          </div>
        </>
      )}
    </Spin>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function FinancialReportsPage() {
  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Financial Reports"
        icon={<BarChartOutlined />}
        iconColor="#0D9488"
      />

      <Tabs
        items={[
          { key: 'pl',  label: 'P&L — Kết quả kinh doanh', children: <ProfitLossTab /> },
          { key: 'bs',  label: 'Balance Sheet — Cân đối kế toán', children: <BalanceSheetTab /> },
        ]}
      />
    </div>
  );
}
