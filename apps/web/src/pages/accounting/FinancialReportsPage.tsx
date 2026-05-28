import { useState } from 'react';
import {
  Row, Col, Typography, DatePicker, Table, Spin, Divider, Tabs, Button, message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  BarChartOutlined, FundOutlined, BankOutlined, FileExcelOutlined,
  DollarOutlined, SwapOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useThemePalette } from '../../hooks/useThemePalette';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { formatCurrency } from '../../utils/format';
import {
  useGetProfitLoss,
  useGetBalanceSheet,
  useGetIncomeStatement,
  useGetCashFlow,
  type FinancialReportRow,
  type IncomeStatementLineItem,
  type CashFlowItem,
  type CashFlowSection,
} from '../../api/accounting';

const { Text } = Typography;
const { RangePicker } = DatePicker;

// ── Helper: định dạng số dương = xanh, âm = đỏ ──────────────────────────────
function amtStyle(val: number, linkColor: string, textMuted: string) {
  if (val > 0) return { color: linkColor, fontWeight: 600 as const };
  if (val < 0) return { color: '#EF4444', fontWeight: 600 as const };
  return { color: textMuted };
}

// ── Helper: định dạng số dư báo cáo (hiển thị âm như dương nếu là khoản chi) ─
function renderAmount(
  val: number,
  opts: { linkColor: string; textMuted: string; alwaysPositive?: boolean },
) {
  const display = opts.alwaysPositive ? Math.abs(val) : val;
  return (
    <Text style={amtStyle(opts.alwaysPositive ? val : val, opts.linkColor, opts.textMuted)}>
      {formatCurrency(display)}
    </Text>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 1: Bảng Cân Đối Kế Toán (TT200)
// ─────────────────────────────────────────────────────────────────────────────
function BalanceSheetTab() {
  const { textPrimary, textMuted, linkColor, bgContainer, borderColor } = useThemePalette();
  const [asOfDate, setAsOfDate] = useState('2026-05-31');

  const { data, isFetching } = useGetBalanceSheet(asOfDate);

  const cols: ColumnsType<FinancialReportRow> = [
    {
      title: 'Mã TK',
      dataIndex: 'code',
      width: 90,
      render: (v: string) => (
        <Text style={{ color: textMuted, fontFamily: 'monospace', fontSize: 12 }}>{v}</Text>
      ),
    },
    {
      title: 'Tên khoản mục',
      dataIndex: 'name',
      render: (v: string) => <Text style={{ color: textPrimary }}>{v}</Text>,
    },
    {
      title: 'Đầu kỳ (VNĐ)',
      dataIndex: 'balance',
      align: 'right' as const,
      width: 180,
      render: () => <Text style={{ color: textMuted }}>—</Text>,
    },
    {
      title: 'Cuối kỳ (VNĐ)',
      dataIndex: 'balance',
      align: 'right' as const,
      width: 180,
      render: (v: number) => renderAmount(v, { linkColor, textMuted }),
    },
  ];

  const SectionTable = ({
    title,
    rows,
    total,
    color,
  }: {
    title: string;
    rows: FinancialReportRow[];
    total: number;
    color: string;
  }) => (
    <>
      <Text strong style={{ color: textPrimary, fontSize: 14 }}>
        {title}
      </Text>
      <Table
        rowKey="code"
        columns={cols}
        dataSource={rows}
        pagination={false}
        size="small"
        style={{
          marginTop: 8,
          marginBottom: 16,
          background: bgContainer,
          border: `1px solid ${borderColor}`,
          borderRadius: 8,
        }}
        summary={() => (
          <Table.Summary.Row>
            <Table.Summary.Cell index={0} colSpan={2}>
              <Text strong style={{ color: textPrimary }}>
                Cộng
              </Text>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={2} align="right">
              <Text style={{ color: textMuted }}>—</Text>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={3} align="right">
              <Text strong style={{ color, fontSize: 14 }}>
                {formatCurrency(total)}
              </Text>
            </Table.Summary.Cell>
          </Table.Summary.Row>
        )}
      />
    </>
  );

  return (
    <Spin spinning={isFetching}>
      {/* Thanh điều khiển */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
        <DatePicker
          value={dayjs(asOfDate)}
          onChange={v => v && setAsOfDate(v.format('YYYY-MM-DD'))}
          format="DD/MM/YYYY"
          allowClear={false}
          placeholder="Tại ngày"
        />
        <Button
          icon={<FileExcelOutlined />}
          onClick={() => message.info('Tính năng xuất Excel đang phát triển')}
        >
          Xuất Excel
        </Button>
      </div>

      {data && (
        <>
          {/* KPI summary */}
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col xs={12} sm={8}>
              <StatCard
                label="Tổng tài sản"
                value={formatCurrency(data.totalAssets)}
                color="#3B82F6"
                icon={<BankOutlined />}
              />
            </Col>
            <Col xs={12} sm={8}>
              <StatCard
                label="Nợ phải trả"
                value={formatCurrency(data.totalLiabilities)}
                color="#EF4444"
                icon={<BarChartOutlined />}
              />
            </Col>
            <Col xs={12} sm={8}>
              <StatCard
                label="Vốn chủ sở hữu"
                value={formatCurrency(data.totalEquity)}
                color="#6366F1"
                icon={<FundOutlined />}
              />
            </Col>
          </Row>

          {/* A. TÀI SẢN */}
          <SectionTable
            title="A. TÀI SẢN"
            rows={data.assets}
            total={data.totalAssets}
            color="#3B82F6"
          />
          <Divider />

          {/* B. NỢ PHẢI TRẢ */}
          <SectionTable
            title="B. NỢ PHẢI TRẢ"
            rows={data.liabilities}
            total={data.totalLiabilities}
            color="#EF4444"
          />
          <Divider />

          {/* C. VỐN CHỦ SỞ HỮU */}
          <SectionTable
            title="C. VỐN CHỦ SỞ HỮU"
            rows={data.equity}
            total={data.totalEquity}
            color="#6366F1"
          />
          <Divider />

          {/* Tổng cân đối */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              padding: '12px 20px',
              background: bgContainer,
              border: `1px solid ${borderColor}`,
              borderRadius: 8,
            }}
          >
            <Text strong style={{ color: textPrimary, fontSize: 15 }}>
              TỔNG NGUỒN VỐN (B + C): &nbsp;
              <span style={{ color: linkColor, fontSize: 18 }}>
                {formatCurrency(data.totalLiabilitiesAndEquity)}
              </span>
            </Text>
          </div>
        </>
      )}
    </Spin>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 2: Báo Cáo Kết Quả Kinh Doanh TT200 (Income Statement)
// ─────────────────────────────────────────────────────────────────────────────
function IncomeStatementTab() {
  const { textPrimary, textMuted, linkColor, bgContainer, borderColor } = useThemePalette();
  const [range, setRange] = useState<[string, string]>(['2026-01-01', '2026-05-31']);

  const { data, isFetching } = useGetIncomeStatement(range[0], range[1]);

  const cols: ColumnsType<IncomeStatementLineItem> = [
    {
      title: 'Chỉ tiêu',
      dataIndex: 'code',
      width: 60,
      render: (v: string) => (
        <Text style={{ color: textMuted, fontFamily: 'monospace', fontSize: 12 }}>{v}</Text>
      ),
    },
    {
      title: 'Nội dung',
      dataIndex: 'name',
      render: (v: string, record: IncomeStatementLineItem) =>
        record.isSubtotal ? (
          <Text strong style={{ color: textPrimary }}>
            {v}
          </Text>
        ) : (
          <Text style={{ color: textPrimary }}>{v}</Text>
        ),
    },
    {
      title: 'Kỳ này (VNĐ)',
      dataIndex: 'amount',
      align: 'right' as const,
      width: 200,
      render: (v: number, record: IncomeStatementLineItem) =>
        record.isSubtotal ? (
          <Text strong style={amtStyle(v, linkColor, textMuted)}>
            {formatCurrency(v)}
          </Text>
        ) : (
          <Text style={amtStyle(v, linkColor, textMuted)}>{formatCurrency(Math.abs(v))}</Text>
        ),
    },
    {
      title: 'Kỳ trước (VNĐ)',
      dataIndex: 'amount',
      align: 'right' as const,
      width: 200,
      render: () => <Text style={{ color: textMuted }}>—</Text>,
    },
  ];

  return (
    <Spin spinning={isFetching}>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
        <RangePicker
          value={[dayjs(range[0]), dayjs(range[1])]}
          onChange={v =>
            v && setRange([v[0]!.format('YYYY-MM-DD'), v[1]!.format('YYYY-MM-DD')])
          }
          format="DD/MM/YYYY"
          allowClear={false}
          picker="month"
        />
        <Button
          icon={<FileExcelOutlined />}
          onClick={() => message.info('Tính năng xuất Excel đang phát triển')}
        >
          Xuất Excel
        </Button>
      </div>

      {data && (
        <>
          {/* KPI summary */}
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col xs={12} sm={6}>
              <StatCard
                label="Doanh thu thuần"
                value={formatCurrency(data.totalRevenue)}
                color="#10B981"
                icon={<FundOutlined />}
              />
            </Col>
            <Col xs={12} sm={6}>
              <StatCard
                label="Lợi nhuận gộp"
                value={formatCurrency(data.grossProfit)}
                color="#3B82F6"
                icon={<BarChartOutlined />}
              />
            </Col>
            <Col xs={12} sm={6}>
              <StatCard
                label="LN từ HĐKD"
                value={formatCurrency(data.operatingProfit)}
                color="#F59E0B"
                icon={<DollarOutlined />}
              />
            </Col>
            <Col xs={12} sm={6}>
              <StatCard
                label="Lợi nhuận sau thuế"
                value={formatCurrency(data.netIncome)}
                color={data.netIncome >= 0 ? '#6366F1' : '#EF4444'}
                icon={<BankOutlined />}
              />
            </Col>
          </Row>

          {/* Bảng KQKD theo TT200 */}
          <Table
            rowKey="code"
            columns={cols}
            dataSource={data.lineItems}
            pagination={false}
            size="small"
            style={{
              background: bgContainer,
              border: `1px solid ${borderColor}`,
              borderRadius: 8,
            }}
            rowClassName={(record: IncomeStatementLineItem) =>
              record.isSubtotal ? 'ant-table-row-selected' : ''
            }
          />
        </>
      )}
    </Spin>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 3: Lưu Chuyển Tiền Tệ TT200 (Cash Flow Statement)
// ─────────────────────────────────────────────────────────────────────────────
function CashFlowTab() {
  const { textPrimary, textMuted, linkColor, bgContainer, borderColor } = useThemePalette();
  const [range, setRange] = useState<[string, string]>(['2026-01-01', '2026-05-31']);

  const { data, isFetching } = useGetCashFlow(range[0], range[1]);

  const itemCols: ColumnsType<CashFlowItem> = [
    {
      title: 'Chỉ tiêu',
      dataIndex: 'code',
      width: 60,
      render: (v: string) => (
        <Text style={{ color: textMuted, fontFamily: 'monospace', fontSize: 12 }}>{v}</Text>
      ),
    },
    {
      title: 'Nội dung',
      dataIndex: 'name',
      render: (v: string) => <Text style={{ color: textPrimary }}>{v}</Text>,
    },
    {
      title: 'Kỳ này (VNĐ)',
      dataIndex: 'amount',
      align: 'right' as const,
      width: 200,
      render: (v: number) => <Text style={amtStyle(v, linkColor, textMuted)}>{formatCurrency(v)}</Text>,
    },
    {
      title: 'Kỳ trước (VNĐ)',
      dataIndex: 'amount',
      align: 'right' as const,
      width: 200,
      render: () => <Text style={{ color: textMuted }}>—</Text>,
    },
  ];

  return (
    <Spin spinning={isFetching}>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
        <RangePicker
          value={[dayjs(range[0]), dayjs(range[1])]}
          onChange={v =>
            v && setRange([v[0]!.format('YYYY-MM-DD'), v[1]!.format('YYYY-MM-DD')])
          }
          format="DD/MM/YYYY"
          allowClear={false}
          picker="month"
        />
        <Button
          icon={<FileExcelOutlined />}
          onClick={() => message.info('Tính năng xuất Excel đang phát triển')}
        >
          Xuất Excel
        </Button>
      </div>

      {data && (
        <>
          {/* KPI summary */}
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col xs={12} sm={6}>
              <StatCard
                label="CF Kinh doanh"
                value={formatCurrency(data.operatingCF)}
                color="#10B981"
                icon={<SwapOutlined />}
              />
            </Col>
            <Col xs={12} sm={6}>
              <StatCard
                label="CF Đầu tư"
                value={formatCurrency(Math.abs(data.investingCF))}
                color="#F97316"
                icon={<BarChartOutlined />}
              />
            </Col>
            <Col xs={12} sm={6}>
              <StatCard
                label="CF Tài chính"
                value={formatCurrency(data.financingCF)}
                color="#8B5CF6"
                icon={<FundOutlined />}
              />
            </Col>
            <Col xs={12} sm={6}>
              <StatCard
                label="Tăng/giảm tiền thuần"
                value={formatCurrency(data.netCashChange)}
                color={data.netCashChange >= 0 ? '#6366F1' : '#EF4444'}
                icon={<BankOutlined />}
              />
            </Col>
          </Row>

          {/* Các section lưu chuyển tiền */}
          {data.sections.map((section: CashFlowSection) => (
            <div key={section.key} style={{ marginBottom: 24 }}>
              <Text strong style={{ color: textPrimary, fontSize: 14 }}>
                {section.title}
              </Text>
              <Table
                rowKey="code"
                columns={itemCols}
                dataSource={section.items}
                pagination={false}
                size="small"
                style={{
                  marginTop: 8,
                  background: bgContainer,
                  border: `1px solid ${borderColor}`,
                  borderRadius: 8,
                }}
                summary={() => (
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={2}>
                      <Text strong style={{ color: textPrimary }}>
                        Lưu chuyển tiền thuần
                      </Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={2} align="right">
                      <Text
                        strong
                        style={{
                          color: section.subtotal >= 0 ? '#10B981' : '#EF4444',
                          fontSize: 14,
                        }}
                      >
                        {formatCurrency(section.subtotal)}
                      </Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={3} align="right">
                      <Text style={{ color: textMuted }}>—</Text>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                )}
              />
            </div>
          ))}

          <Divider />

          {/* Tổng tăng/giảm tiền */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              padding: '12px 20px',
              background: bgContainer,
              border: `1px solid ${borderColor}`,
              borderRadius: 8,
            }}
          >
            <Text strong style={{ color: textPrimary, fontSize: 15 }}>
              TĂNG/GIẢM TIỀN THUẦN TRONG KỲ: &nbsp;
              <span
                style={{
                  color: data.netCashChange >= 0 ? linkColor : '#EF4444',
                  fontSize: 18,
                }}
              >
                {formatCurrency(data.netCashChange)}
              </span>
            </Text>
          </div>
        </>
      )}
    </Spin>
  );
}

// ── Tab P&L cũ (giữ lại để tương thích) ─────────────────────────────────────
function ProfitLossTab() {
  const { textPrimary, textMuted, linkColor, bgContainer, borderColor } = useThemePalette();
  const [range, setRange] = useState<[string, string]>(['2026-01-01', '2026-05-31']);

  const { data, isFetching } = useGetProfitLoss(range[0], range[1]);

  const cols: ColumnsType<FinancialReportRow> = [
    {
      title: 'Mã TK',
      dataIndex: 'code',
      width: 80,
      render: (v: string) => (
        <Text style={{ color: textMuted, fontFamily: 'monospace' }}>{v}</Text>
      ),
    },
    {
      title: 'Tên tài khoản',
      dataIndex: 'name',
      render: (v: string) => <Text style={{ color: textPrimary }}>{v}</Text>,
    },
    {
      title: 'Số tiền (VNĐ)',
      dataIndex: 'balance',
      align: 'right' as const,
      width: 180,
      render: (v: number) => (
        <Text style={amtStyle(v, linkColor, textMuted)}>{formatCurrency(v)}</Text>
      ),
    },
  ];

  return (
    <Spin spinning={isFetching}>
      <div style={{ marginBottom: 16 }}>
        <RangePicker
          value={[dayjs(range[0]), dayjs(range[1])]}
          onChange={v =>
            v && setRange([v[0]!.format('YYYY-MM-DD'), v[1]!.format('YYYY-MM-DD')])
          }
          format="DD/MM/YYYY"
          allowClear={false}
        />
      </div>

      {data && (
        <>
          <Row gutter={16} style={{ marginBottom: 20 }}>
            <Col xs={12} sm={8}>
              <StatCard
                label="Doanh thu"
                value={formatCurrency(data.totalRevenue)}
                color="#10B981"
                icon={<FundOutlined />}
              />
            </Col>
            <Col xs={12} sm={8}>
              <StatCard
                label="Chi phí"
                value={formatCurrency(data.totalExpenses)}
                color="#EF4444"
                icon={<BarChartOutlined />}
              />
            </Col>
            <Col xs={12} sm={8}>
              <StatCard
                label="Lợi nhuận"
                value={formatCurrency(data.netIncome)}
                color={data.netIncome >= 0 ? '#6366F1' : '#F59E0B'}
                icon={<BankOutlined />}
              />
            </Col>
          </Row>

          <Text strong style={{ color: textPrimary, fontSize: 14 }}>
            I. Doanh thu
          </Text>
          <Table
            rowKey="code"
            columns={cols}
            dataSource={data.revenue}
            pagination={false}
            size="small"
            style={{
              marginTop: 8,
              marginBottom: 16,
              background: bgContainer,
              border: `1px solid ${borderColor}`,
              borderRadius: 8,
            }}
            summary={() => (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={2}>
                  <Text strong style={{ color: textPrimary }}>
                    Tổng doanh thu
                  </Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2} align="right">
                  <Text strong style={{ color: '#10B981', fontSize: 14 }}>
                    {formatCurrency(data.totalRevenue)}
                  </Text>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            )}
          />

          <Divider />

          <Text strong style={{ color: textPrimary, fontSize: 14 }}>
            II. Chi phí
          </Text>
          <Table
            rowKey="code"
            columns={cols}
            dataSource={data.expenses}
            pagination={false}
            size="small"
            style={{
              marginTop: 8,
              marginBottom: 16,
              background: bgContainer,
              border: `1px solid ${borderColor}`,
              borderRadius: 8,
            }}
            summary={() => (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={2}>
                  <Text strong style={{ color: textPrimary }}>
                    Tổng chi phí
                  </Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2} align="right">
                  <Text strong style={{ color: '#EF4444', fontSize: 14 }}>
                    {formatCurrency(data.totalExpenses)}
                  </Text>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            )}
          />

          <Divider />

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              padding: '8px 16px',
              background: bgContainer,
              border: `1px solid ${borderColor}`,
              borderRadius: 8,
            }}
          >
            <Text strong style={{ color: textPrimary, fontSize: 15 }}>
              Lợi nhuận thuần: &nbsp;
              <span
                style={{
                  color: data.netIncome >= 0 ? '#10B981' : '#EF4444',
                  fontSize: 18,
                }}
              >
                {formatCurrency(data.netIncome)}
              </span>
            </Text>
          </div>
        </>
      )}
    </Spin>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
export default function FinancialReportsPage() {
  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Báo cáo Tài chính (TT200)"
        icon={<BarChartOutlined />}
        iconColor="#0D9488"
      />

      <Tabs
        items={[
          {
            key: 'bs',
            label: 'Bảng CĐKT',
            icon: <BankOutlined />,
            children: <BalanceSheetTab />,
          },
          {
            key: 'is',
            label: 'Báo cáo KQKD',
            icon: <FundOutlined />,
            children: <IncomeStatementTab />,
          },
          {
            key: 'cf',
            label: 'Lưu chuyển tiền tệ',
            icon: <SwapOutlined />,
            children: <CashFlowTab />,
          },
          {
            key: 'pl',
            label: 'P&L chi tiết TK',
            icon: <BarChartOutlined />,
            children: <ProfitLossTab />,
          },
        ]}
      />
    </div>
  );
}
