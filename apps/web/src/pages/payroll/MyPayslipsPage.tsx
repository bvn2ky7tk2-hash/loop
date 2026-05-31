import { useState, useMemo } from 'react';
import {
  Table, Tag, Typography, Row, Col, Empty, Spin, Button, message, Select,
} from 'antd';
import { FileTextOutlined, CalendarOutlined, FilePdfOutlined, LoadingOutlined, FilterOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { payrollApi, type PayrollRecord } from '../../api/payroll';
import { FilterBar } from '../../components/FilterBar';
import { useThemePalette } from '../../hooks/useThemePalette';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { CenteredModal } from '../../components/ui/CenteredModal';
import { formatCurrency } from '../../utils/format';
import { useAuthStore } from '../../store/auth.store';
import type { ColumnsType } from 'antd/es/table';

const { Text } = Typography;

// ─── Payslip Detail Modal ──────────────────────────────────────────────────────

function PayslipDetailModal({
  record,
  onClose,
}: {
  record: PayrollRecord | null;
  onClose: () => void;
}) {
  const { textPrimary, textMuted, bgCard, borderColor, linkColor, isDark } = useThemePalette();
  if (!record) return null;

  const totalBhxhEmployee = Number(record.bhxhEmployee) + Number(record.bhytEmployee) + Number(record.bhtnEmployee);

  const row = (label: string, value: React.ReactNode, bold = false) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${borderColor}30` }}>
      <Text style={{ color: textMuted, fontSize: 13 }}>{label}</Text>
      <Text style={{ color: textPrimary, fontWeight: bold ? 700 : 400, fontSize: 13 }}>{value}</Text>
    </div>
  );

  return (
    <CenteredModal
      open={!!record}
      onClose={onClose}
      title="Phiếu lương của tôi"
      width={520}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', padding: '12px 0 20px', borderBottom: `1px solid ${borderColor}` }}>
        <Text style={{ display: 'block', fontSize: 18, fontWeight: 700, color: textPrimary }}>
          {record.employee?.user?.name ?? '—'}
        </Text>
        <Text style={{ color: textMuted, fontSize: 13 }}>
          <CalendarOutlined style={{ marginRight: 4 }} />
          Kỳ lương: chế độ tự phục vụ
        </Text>
      </div>

      {/* Thu nhập */}
      <div style={{ background: bgCard, borderRadius: 8, padding: '14px 16px', border: `1px solid ${borderColor}`, margin: '16px 0' }}>
        <Text style={{ color: textMuted, fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', display: 'block', marginBottom: 10 }}>
          THU NHẬP
        </Text>
        {row('Lương theo công', formatCurrency(Number(record.baseSalary)))}
        {Number(record.overtimePay) > 0 && row('Lương tăng ca', formatCurrency(Number(record.overtimePay)))}
        {Number(record.allowances) > 0 && row('Phụ cấp', formatCurrency(Number(record.allowances)))}
        {Number(record.bonus) > 0 && row('Thưởng', formatCurrency(Number(record.bonus)))}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0 0', marginTop: 4 }}>
          <Text style={{ color: textPrimary, fontWeight: 700 }}>Tổng thu nhập</Text>
          <Text style={{ color: linkColor, fontWeight: 700, fontSize: 15 }}>{formatCurrency(Number(record.grossSalary))}</Text>
        </div>
      </div>

      {/* Khấu trừ */}
      <div style={{ background: bgCard, borderRadius: 8, padding: '14px 16px', border: `1px solid ${borderColor}`, marginBottom: 16 }}>
        <Text style={{ color: textMuted, fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', display: 'block', marginBottom: 10 }}>
          KHẤU TRỪ
        </Text>
        {row('BHXH (8%)', formatCurrency(Number(record.bhxhEmployee)))}
        {row('BHYT (1.5%)', formatCurrency(Number(record.bhytEmployee)))}
        {row('BHTN (1%)', formatCurrency(Number(record.bhtnEmployee)))}
        {Number(record.pitAmount) > 0 && row('Thuế TNCN', formatCurrency(Number(record.pitAmount)))}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0 0', marginTop: 4 }}>
          <Text style={{ color: textPrimary, fontWeight: 700 }}>Tổng khấu trừ</Text>
          <Text style={{ color: '#EF4444', fontWeight: 700, fontSize: 15 }}>
            -{formatCurrency(totalBhxhEmployee + Number(record.pitAmount))}
          </Text>
        </div>
      </div>

      {/* Giảm trừ */}
      {record.dependentCount > 0 && (
        <div style={{ background: bgCard, borderRadius: 8, padding: '10px 16px', border: `1px solid ${borderColor}`, marginBottom: 16 }}>
          <Text style={{ color: textMuted, fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>
            GIẢM TRỪ GIA CẢNH
          </Text>
          {row('Giảm trừ bản thân', formatCurrency(Number(record.selfDeduction)))}
          {row(`NPT (${record.dependentCount} người)`, formatCurrency(Number(record.dependentDeduction)))}
          {row('Thu nhập chịu thuế', formatCurrency(Number(record.taxableIncome)))}
        </div>
      )}

      {/* Net */}
      <div style={{
        background: isDark ? `${linkColor}18` : `${linkColor}0C`,
        border: `2px solid ${linkColor}40`,
        borderRadius: 10, padding: '16px 20px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <Text style={{ fontSize: 16, fontWeight: 700, color: textPrimary }}>THỰC NHẬN</Text>
        <Text style={{ fontSize: 24, fontWeight: 800, color: linkColor }}>{formatCurrency(Number(record.netSalary))}</Text>
      </div>
    </CenteredModal>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────

export default function MyPayslipsPage() {
  const { textPrimary, textMuted, borderColor, bgContainer, linkColor } = useThemePalette();
  const user = useAuthStore(s => s.user);
  const [selectedRecord, setSelectedRecord] = useState<PayrollRecord | null>(null);
  const [page, setPage] = useState(1);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownloadPdf = async (recordId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDownloadingId(recordId);
    try {
      const { url, pending } = await payrollApi.getPayslipUrl(recordId);
      if (pending || !url) {
        message.info('Phiếu lương PDF đang được tạo, vui lòng thử lại sau ít phút.');
        return;
      }
      window.open(url, '_blank', 'noopener');
    } catch {
      message.error('Không thể tải phiếu lương PDF.');
    } finally {
      setDownloadingId(null);
    }
  };

  // Fetch all periods and then filter records for current user's employee
  // We use the my-tax-profile endpoint to get employeeId, then list records
  const thisYear = new Date().getFullYear();
  const [filterYear, setFilterYear] = useState<number>(thisYear);

  // Dùng endpoint /payroll/my-records — trả về trực tiếp phiếu lương của user hiện tại
  const { data: allRecords = [], isLoading } = useQuery({
    queryKey: ['my-payslips-v2'],
    queryFn: () => payrollApi.getMyRecords(),
  });

  const records = useMemo(() => {
    if (!filterYear) return allRecords;
    return allRecords.filter(r => {
      const start = r.periodStart ?? (r as any).period?.startDate ?? '';
      return dayjs(start).year() === filterYear;
    });
  }, [allRecords, filterYear]);

  const loadingRecords = false;

  // YTD tính từ năm hiện tại
  // YTD theo năm đang filter
  const ytdRecords = records;
  const ytdGross = ytdRecords.reduce((s, r) => s + Number(r.grossSalary), 0);
  const ytdNet   = ytdRecords.reduce((s, r) => s + Number(r.netSalary), 0);
  const ytdPIT   = ytdRecords.reduce((s, r) => s + Number(r.pitAmount), 0);
  const ytdBHXH  = ytdRecords.reduce((s, r) => s + Number(r.bhxhEmployee) + Number(r.bhytEmployee) + Number(r.bhtnEmployee), 0);

  const cols: ColumnsType<any> = [
    {
      title: 'Kỳ lương',
      render: (_: any, r: any) => (
        <div>
          <div style={{ fontWeight: 600, color: textPrimary }}>{r.periodName}</div>
          <div style={{ fontSize: 11, color: textMuted }}>
            <CalendarOutlined style={{ marginRight: 4 }} />
            {dayjs(r.periodStart).format('DD/MM')} – {dayjs(r.periodEnd).format('DD/MM/YYYY')}
          </div>
        </div>
      ),
    },
    {
      title: 'Công / OT',
      width: 90,
      align: 'center',
      render: (_: any, r: any) => (
        <div style={{ fontSize: 12, lineHeight: 1.8, textAlign: 'center' }}>
          <div><Tag color="blue">{r.workDays} công</Tag></div>
          {Number(r.overtimeHours) > 0 && <div><Tag color="orange">{r.overtimeHours}h OT</Tag></div>}
        </div>
      ),
    },
    {
      title: 'Tổng TN',
      dataIndex: 'grossSalary',
      width: 130,
      align: 'right',
      render: (v: number) => <Text style={{ color: textPrimary }}>{formatCurrency(Number(v))}</Text>,
    },
    {
      title: 'BH + Thuế',
      width: 120,
      align: 'right',
      render: (_: any, r: any) => {
        const deduct = Number(r.bhxhEmployee) + Number(r.bhytEmployee) + Number(r.bhtnEmployee) + Number(r.pitAmount);
        return <Text style={{ color: '#EF4444', fontSize: 13 }}>-{formatCurrency(deduct)}</Text>;
      },
    },
    {
      title: 'Thực nhận',
      dataIndex: 'netSalary',
      width: 130,
      align: 'right',
      render: (v: number) => <Text strong style={{ color: linkColor, fontSize: 14 }}>{formatCurrency(Number(v))}</Text>,
    },
    {
      title: '',
      width: 140,
      render: (_: any, r: any) => (
        <Space size={8}>
          <a style={{ color: linkColor, fontSize: 13 }} onClick={() => setSelectedRecord(r)}>Chi tiết</a>
          <Button
            size="small"
            type="link"
            icon={downloadingId === r.id ? <LoadingOutlined /> : <FilePdfOutlined />}
            style={{ color: '#EF4444', padding: 0, fontSize: 13 }}
            onClick={(e) => handleDownloadPdf(r.id, e)}
            disabled={downloadingId === r.id}
          >
            PDF
          </Button>
        </Space>
      ),
    },
  ];

  if (isLoading || loadingRecords) {
    return (
      <div style={{ padding: 24, display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Phiếu lương của tôi"
        icon={<FileTextOutlined />}
        iconColor="#0D9488"
      />

      {/* Filter năm */}
      <FilterBar style={{ marginBottom: 16 }}>
        <Select
          value={filterYear}
          onChange={setFilterYear}
          style={{ width: 140 }}
          prefix={<FilterOutlined />}
          options={[2025, 2026, 2027].map(y => ({ value: y, label: `Năm ${y}` }))}
        />
      </FilterBar>

      {/* YTD Stats */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={6}><StatCard label={`Tổng TN ${filterYear}`} value={`${(ytdGross / 1e6).toFixed(1)}M`} color="#6366F1" icon={<FileTextOutlined />} /></Col>
        <Col xs={12} sm={6}><StatCard label={`Thực nhận ${filterYear}`} value={`${(ytdNet / 1e6).toFixed(1)}M`} color="#10B981" icon={<FileTextOutlined />} /></Col>
        <Col xs={12} sm={6}><StatCard label={`Thuế TNCN ${filterYear}`} value={`${(ytdPIT / 1e6).toFixed(1)}M`} color="#EF4444" icon={<FileTextOutlined />} /></Col>
        <Col xs={12} sm={6}><StatCard label={`BHXH/BHYT/BHTN ${filterYear}`} value={`${(ytdBHXH / 1e6).toFixed(1)}M`} color="#F59E0B" icon={<FileTextOutlined />} /></Col>
      </Row>

      <Table
        dataSource={records}
        rowKey="id"
        columns={cols}
        size="small"
        style={{ border: `1px solid ${borderColor}`, borderRadius: 8, background: bgContainer }}
        pagination={false}
        locale={{ emptyText: <Empty description="Chưa có phiếu lương nào được phê duyệt." /> }}
        onRow={r => ({ onClick: () => setSelectedRecord(r), style: { cursor: 'pointer' } })}
      />

      <PayslipDetailModal record={selectedRecord} onClose={() => setSelectedRecord(null)} />
    </div>
  );
}
