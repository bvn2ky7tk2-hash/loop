import { useState, useMemo } from 'react';
import {
  Table, Button, Input, Space, Tag, Typography,
  App, Popconfirm, Row, Col, Tooltip,
} from 'antd';
import { CenteredModal } from '../../../components/ui/CenteredModal';
import { EmptyState } from '../../../components/ui/EmptyState';
import { FilterBar } from '../../../components/FilterBar';
import { SectionCard } from '../../../components/ui/SectionCard';
import type { ColumnsType } from 'antd/es/table';
import {
  ThunderboltOutlined, CheckOutlined, DollarOutlined,
  EditOutlined, TeamOutlined, EyeOutlined,
  ReloadOutlined, FileDoneOutlined, FilePdfOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { payrollApi, type PayrollPeriod, type PayrollRecord } from '../../../api/payroll';
import { useThemePalette } from '../../../hooks/useThemePalette';
import { formatCurrency } from '../../../utils/format';
import { EmployeeInfoCell } from '../../../components/ui/EmployeeInfoCell';
import { STATUS_LABEL, STATUS_COLOR } from './payrollConstants';
import { RecordDetailModal } from './RecordDetailModal';
import { EditRecordModal } from './EditRecordModal';

const { Text } = Typography;

export function PeriodDetailModal({
  period,
  onClose,
}: {
  period: PayrollPeriod | null;
  onClose: () => void;
}) {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const [editRecord, setEditRecord] = useState<PayrollRecord | null>(null);
  const [detailRecord, setDetailRecord] = useState<PayrollRecord | null>(null);
  const [page, setPage] = useState(1);
  const { textPrimary, textMuted, linkColor, isDark } = useThemePalette();
  const [searchName, setSearchName] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['payroll-records', period?.id, page],
    queryFn: () => payrollApi.getPeriodRecords(period!.id, page, 500),
    enabled: !!period,
  });

  const generateMut = useMutation({
    mutationFn: () => payrollApi.generatePayroll(period!.id),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['payroll-records', period?.id] });
      qc.invalidateQueries({ queryKey: ['payroll-periods'] });
      message.success(`Đã tính lương cho ${res.generated} nhân viên`);
    },
    onError: (e: Error) => message.error(e.message ?? 'Lỗi tính lương'),
  });

  const reviewMut = useMutation({
    mutationFn: () => payrollApi.reviewPeriod(period!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payroll-periods'] });
      message.success('Đã gửi kỳ lương để kiểm duyệt');
    },
    onError: (e: Error) => message.error(e.message ?? 'Lỗi'),
  });

  const rerunMut = useMutation({
    mutationFn: () => payrollApi.rerunPeriod(period!.id),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['payroll-records', period?.id] });
      qc.invalidateQueries({ queryKey: ['payroll-periods'] });
      message.success(`Đã tính lại lương cho ${res.generated} nhân viên`);
    },
    onError: (e: Error) => message.error(e.message ?? 'Lỗi'),
  });

  const approveMut = useMutation({
    mutationFn: () => payrollApi.approvePeriod(period!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payroll-periods'] });
      message.success('Đã phê duyệt kỳ lương — YTD đã được cập nhật');
      onClose();
    },
    onError: (e: Error) => message.error(e.message ?? 'Lỗi phê duyệt'),
  });

  const markPaidMut = useMutation({
    mutationFn: () => payrollApi.markPaid(period!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payroll-periods'] });
      message.success('Đã đánh dấu đã trả lương');
      onClose();
    },
    onError: (e: Error) => message.error(e.message ?? 'Lỗi'),
  });

  const allRecords = data?.data ?? [];
  const records = useMemo(() => {
    if (!searchName.trim()) return allRecords;
    const q = searchName.trim().toLowerCase();
    return allRecords.filter(r =>
      (r.employee?.user?.name ?? '').toLowerCase().includes(q) ||
      (r.employee?.user?.email ?? '').toLowerCase().includes(q)
    );
  }, [allRecords, searchName]);

  const totalGross = allRecords.reduce((s, r) => s + Number(r.grossSalary), 0);
  const totalNet = records.reduce((s, r) => s + Number(r.netSalary), 0);
  const totalPIT = records.reduce((s, r) => s + Number(r.pitAmount), 0);
  const totalBHXH = records.reduce((s, r) => s + Number(r.bhxhEmployee) + Number(r.bhytEmployee) + Number(r.bhtnEmployee), 0);

  const canGenerate = period?.status === 'DRAFT';
  const canReview   = period?.status === 'PROCESSING';
  const canRerun    = period?.status === 'REVIEWED';
  const canApprove  = period?.status === 'REVIEWED';
  const canPay      = period?.status === 'APPROVED';
  const canEdit     = period?.status !== 'APPROVED' && period?.status !== 'PAID';

  const numCell = (v: number, color = textPrimary, prefix = '') =>
    Number(v) !== 0
      ? <Text style={{ color, fontSize: 12 }}>{prefix}{formatCurrency(Number(v))}</Text>
      : <Text style={{ color: textMuted, fontSize: 12 }}>—</Text>;

  const cols: ColumnsType<PayrollRecord> = [
    // ── Nhân viên (fixed left) ──────────────────────────────────────────────
    {
      title: 'Nhân viên',
      fixed: 'left' as const,
      width: 200,
      render: (_, r) => (
        <EmployeeInfoCell
          employee={{
            fullName: r.employee?.user?.name ?? '—',
            code: r.employee?.code,
            orgUnit: r.employee?.orgUnit,
            position: r.employee?.position,
          }}
        />
      ),
    },

    // ── Chấm công ───────────────────────────────────────────────────────────
    {
      title: 'Chấm công',
      children: [
        {
          title: 'C.chuẩn',
          width: 70,
          align: 'center' as const,
          render: (_, r) => (
            <Text style={{ color: textMuted, fontSize: 12 }}>
              {(r.configSnapshot as any)?.standardDays ?? 26}
            </Text>
          ),
        },
        {
          title: 'T.công',
          width: 68,
          align: 'center' as const,
          render: (_, r) => (
            <Tag style={isDark ? { background: 'rgba(96,165,250,0.15)', color: '#93C5FD', borderColor: 'rgba(96,165,250,0.3)', fontSize: 11 } : { fontSize: 11 }}
              color={isDark ? undefined : 'blue'}>
              {r.workDays}
            </Tag>
          ),
        },
        {
          title: 'OT (h)',
          width: 65,
          align: 'center' as const,
          render: (_, r) => Number(r.overtimeHours) > 0
            ? <Tag style={isDark ? { background: 'rgba(245,158,11,0.15)', color: '#FCD34D', borderColor: 'rgba(245,158,11,0.3)', fontSize: 11 } : { fontSize: 11 }}
                color={isDark ? undefined : 'orange'}>{r.overtimeHours}h</Tag>
            : <Text style={{ color: textMuted, fontSize: 12 }}>—</Text>,
        },
        {
          title: 'NP phép',
          width: 72,
          align: 'center' as const,
          render: (_, r) => Number(r.paidLeaveDays) > 0
            ? <Text style={{ color: '#10B981', fontSize: 12 }}>{r.paidLeaveDays}c</Text>
            : <Text style={{ color: textMuted, fontSize: 12 }}>—</Text>,
        },
        {
          title: 'NP ko phép',
          width: 80,
          align: 'center' as const,
          render: (_, r) => Number(r.unpaidLeaveDays) > 0
            ? <Text style={{ color: '#EF4444', fontSize: 12 }}>{r.unpaidLeaveDays}c</Text>
            : <Text style={{ color: textMuted, fontSize: 12 }}>—</Text>,
        },
      ],
    },

    // ── Thu nhập ────────────────────────────────────────────────────────────
    {
      title: 'Thu nhập',
      children: [
        {
          title: 'Lương HĐ',
          width: 120,
          align: 'right' as const,
          render: (_, r) => {
            const v = (r.configSnapshot as any)?.contractSalary;
            return v ? numCell(v) : <Text style={{ color: textMuted, fontSize: 12 }}>—</Text>;
          },
        },
        {
          title: 'Lương theo công',
          width: 130,
          align: 'right' as const,
          render: (_, r) => numCell(Number(r.baseSalary)),
        },
        {
          title: 'Lương OT',
          width: 110,
          align: 'right' as const,
          render: (_, r) => numCell(Number(r.overtimePay)),
        },
        {
          title: 'Phụ cấp',
          width: 110,
          align: 'right' as const,
          render: (_, r) => numCell(Number(r.allowances)),
        },
        {
          title: 'Thưởng',
          width: 100,
          align: 'right' as const,
          render: (_, r) => numCell(Number(r.bonus), '#10B981'),
        },
        {
          title: 'Tổng TN',
          width: 130,
          align: 'right' as const,
          render: (_, r) => <Text style={{ color: textPrimary, fontSize: 12, fontWeight: 600 }}>{formatCurrency(Number(r.grossSalary))}</Text>,
        },
      ],
    },

    // ── Lương đóng BH & BH NLĐ ─────────────────────────────────────────────
    {
      title: 'Bảo hiểm NLĐ',
      children: [
        {
          title: 'Lương đóng BH',
          width: 120,
          align: 'right' as const,
          render: (_, r) => {
            const v = (r.configSnapshot as any)?.bhxhBase;
            return v ? numCell(v, textMuted) : <Text style={{ color: textMuted, fontSize: 12 }}>Miễn</Text>;
          },
        },
        {
          title: 'BHXH 8%',
          width: 105,
          align: 'right' as const,
          render: (_, r) => numCell(Number(r.bhxhEmployee), '#EF4444', '-'),
        },
        {
          title: 'BHYT 1.5%',
          width: 105,
          align: 'right' as const,
          render: (_, r) => numCell(Number(r.bhytEmployee), '#EF4444', '-'),
        },
        {
          title: 'BHTN 1%',
          width: 100,
          align: 'right' as const,
          render: (_, r) => numCell(Number(r.bhtnEmployee), '#EF4444', '-'),
        },
      ],
    },

    // ── Thuế TNCN ───────────────────────────────────────────────────────────
    {
      title: 'Thuế TNCN',
      children: [
        {
          title: 'TN chịu thuế',
          width: 120,
          align: 'right' as const,
          render: (_, r) => numCell(Number(r.taxableIncome), textMuted),
        },
        {
          title: 'Thuế TNCN',
          width: 105,
          align: 'right' as const,
          render: (_, r) => numCell(Number(r.pitAmount), '#EF4444', '-'),
        },
        {
          title: 'KT thêm',
          width: 95,
          align: 'right' as const,
          render: (_, r) => numCell(Number(r.deductions), '#EF4444', '-'),
        },
      ],
    },

    // ── Thực nhận (fixed right) ─────────────────────────────────────────────
    {
      title: 'Thực nhận',
      fixed: 'right' as const,
      width: 130,
      align: 'right' as const,
      render: (_, r) => (
        <Text strong style={{ color: linkColor, fontSize: 13 }}>{formatCurrency(Number(r.netSalary))}</Text>
      ),
    },

    // ── Actions (fixed right) ───────────────────────────────────────────────
    {
      title: '',
      fixed: 'right' as const,
      width: 90,
      align: 'center' as const,
      render: (_, r) => (
        <Space size={4}>
          <Tooltip title="Chi tiết">
            <Button size="small" icon={<EyeOutlined />} onClick={() => setDetailRecord(r)} />
          </Tooltip>
          <Tooltip title="Xem phiếu lương">
            <Button size="small" icon={<FilePdfOutlined />} onClick={async () => {
              const res = await payrollApi.getPayslipUrl(r.id);
              if (res.url) window.open(res.url, '_blank', 'noopener');
              else message.info('Phiếu lương đang được tạo, vui lòng thử lại sau');
            }} />
          </Tooltip>
          {canEdit && (
            <Tooltip title="Điều chỉnh">
              <Button size="small" icon={<EditOutlined />} onClick={() => setEditRecord(r)} />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <>
      <CenteredModal
        open={!!period}
        onClose={onClose}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>{period?.name}</span>
            {period && <Tag color={STATUS_COLOR[period.status]}>{STATUS_LABEL[period.status]}</Tag>}
          </div>
        }
        width="92vw"
        extra={
          <Space>
            {canGenerate && (
              <Popconfirm
                title="Tính lương cho toàn bộ nhân viên?"
                description="Sẽ đọc HĐLĐ, chấm công và áp dụng cấu hình BH/thuế hiệu lực."
                onConfirm={() => generateMut.mutate()}
                okText="Tính lương" cancelText="Huỷ"
              >
                <Button type="primary" icon={<ThunderboltOutlined />} loading={generateMut.isPending} disabled={generateMut.isPending}>
                  Tính lương
                </Button>
              </Popconfirm>
            )}
            {canReview && (
              <Popconfirm
                title="Gửi để kiểm duyệt?"
                description="Trạng thái sẽ chuyển sang REVIEWED để cấp trên phê duyệt."
                onConfirm={() => reviewMut.mutate()}
                okText="Gửi duyệt" cancelText="Huỷ"
              >
                <Button icon={<FileDoneOutlined />} loading={reviewMut.isPending} disabled={reviewMut.isPending}>
                  Gửi duyệt
                </Button>
              </Popconfirm>
            )}
            {canRerun && (
              <Popconfirm
                title="Tính lại kỳ lương?"
                description="Sẽ tính lại toàn bộ từ đầu với config mới nhất."
                onConfirm={() => rerunMut.mutate()}
                okText="Tính lại" cancelText="Huỷ"
              >
                <Button icon={<ReloadOutlined />} loading={rerunMut.isPending} disabled={rerunMut.isPending}>
                  Tính lại
                </Button>
              </Popconfirm>
            )}
            {canApprove && (
              <Popconfirm
                title="Phê duyệt kỳ lương?"
                description="Sau khi duyệt sẽ cập nhật YTD thuế. Không thể hoàn tác."
                onConfirm={() => approveMut.mutate()}
                okText="Phê duyệt" cancelText="Huỷ"
              >
                <Button type="primary" icon={<CheckOutlined />} loading={approveMut.isPending} disabled={approveMut.isPending}>
                  Phê duyệt
                </Button>
              </Popconfirm>
            )}
            {canPay && (
              <Popconfirm
                title="Đánh dấu đã trả lương?"
                onConfirm={() => markPaidMut.mutate()}
                okText="Xác nhận" cancelText="Huỷ"
              >
                <Button type="primary" icon={<DollarOutlined />} loading={markPaidMut.isPending} disabled={markPaidMut.isPending}
                  style={{ background: '#10B981', borderColor: '#10B981' }}>
                  Đã trả lương
                </Button>
              </Popconfirm>
            )}
          </Space>
        }
      >
        {/* Tóm tắt tài chính */}
        {records.length > 0 && (
          <Row gutter={12} style={{ marginBottom: 16 }}>
            <Col span={6}>
              <SectionCard nested style={{ borderRadius: 8 }} bodyStyle={{ padding: '10px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: textPrimary }}>{records.length}</div>
                <div style={{ fontSize: 11, color: textMuted }}><TeamOutlined /> Nhân viên</div>
              </SectionCard>
            </Col>
            <Col span={6}>
              <SectionCard nested style={{ borderRadius: 8 }} bodyStyle={{ padding: '10px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: textPrimary }}>{formatCurrency(totalGross)}</div>
                <div style={{ fontSize: 11, color: textMuted }}>Tổng thu nhập</div>
              </SectionCard>
            </Col>
            <Col span={6}>
              <SectionCard nested style={{ borderRadius: 8 }} bodyStyle={{ padding: '10px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#EF4444' }}>-{formatCurrency(totalBHXH + totalPIT)}</div>
                <div style={{ fontSize: 11, color: textMuted }}>BH + Thuế TNCN</div>
              </SectionCard>
            </Col>
            <Col span={6}>
              <div style={{ background: isDark ? `${linkColor}18` : `${linkColor}0C`, border: `1px solid ${linkColor}30`, borderRadius: 8, padding: '10px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: linkColor }}>{formatCurrency(totalNet)}</div>
                <div style={{ fontSize: 11, color: textMuted }}>Tổng chi trả</div>
              </div>
            </Col>
          </Row>
        )}

        <FilterBar>
          <Input
            prefix={<SearchOutlined />}
            placeholder="Tìm theo tên hoặc email nhân viên..."
            style={{ width: 300 }}
            allowClear
            value={searchName}
            onChange={e => setSearchName(e.target.value)}
          />
          <Text style={{ color: textMuted, fontSize: 13, alignSelf: 'center' }}>
            Hiển thị {records.length}/{allRecords.length} nhân viên
          </Text>
        </FilterBar>

        <Table
          loading={isLoading}
          dataSource={records}
          rowKey="id"
          columns={cols}
          size="small"
          bordered
          scroll={{ x: 1800 }}
          pagination={{
            current: page,
            total: data?.total ?? 0,
            pageSize: 50,
            onChange: setPage,
            showTotal: t => `${t} nhân viên`,
          }}
          locale={{ emptyText: <EmptyState compact title="Chưa có dữ liệu. Nhấn 'Tính lương' để bắt đầu." /> }}
        />
      </CenteredModal>

      <RecordDetailModal record={detailRecord} onClose={() => setDetailRecord(null)} />
      <EditRecordModal record={editRecord} onClose={() => setEditRecord(null)} />
    </>
  );
}
