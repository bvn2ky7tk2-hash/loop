import { useState } from 'react';
import {
  Table, Button, Modal, Form, Input, DatePicker, Space, Tag, Typography,
  App, Popconfirm, Row, Col, Divider, Empty, Tooltip, Descriptions,
  InputNumber,
} from 'antd';
import { CenteredModal } from '../../components/ui/CenteredModal';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined, ThunderboltOutlined, CheckOutlined, DollarOutlined,
  EditOutlined, TeamOutlined, CalendarOutlined, EyeOutlined,
  ReloadOutlined, FileDoneOutlined, SettingOutlined, FilePdfOutlined,
  FileExcelOutlined, FieldTimeOutlined, MinusCircleOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { payrollApi, type PayrollPeriod, type PayrollRecord } from '../../api/payroll';
import { useThemePalette } from '../../hooks/useThemePalette';
import { formatCurrency } from '../../utils/format';

const { Text } = Typography;

const STATUS_LABEL: Record<string, string> = {
  DRAFT:      'Bản nháp',
  PROCESSING: 'Đang xử lý',
  REVIEWED:   'Chờ duyệt',
  APPROVED:   'Đã duyệt',
  PAID:       'Đã trả lương',
};
const STATUS_COLOR: Record<string, string> = {
  DRAFT:      'default',
  PROCESSING: 'orange',
  REVIEWED:   'blue',
  APPROVED:   'green',
  PAID:       'success',
};

// ─── RecordDetailModal ─────────────────────────────────────────────────────────

function RecordDetailModal({
  record,
  onClose,
}: {
  record: PayrollRecord | null;
  onClose: () => void;
}) {
  const { textPrimary, textMuted, bgCard, borderColor, linkColor, isDark } = useThemePalette();
  if (!record) return null;

  const totalBhxhEmployee = Number(record.bhxhEmployee) + Number(record.bhytEmployee) + Number(record.bhtnEmployee);
  const totalBhxhEmployer = Number(record.bhxhEmployer) + Number(record.bhytEmployer) + Number(record.bhtnEmployer) + Number(record.tnldEmployer);

  const block = (label: string, value: number, color = textPrimary) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}>
      <Text style={{ color: textMuted, fontSize: 13 }}>{label}</Text>
      <Text style={{ color, fontWeight: 600, fontSize: 13 }}>{formatCurrency(value)}</Text>
    </div>
  );

  const separator = <div style={{ borderTop: `1px solid ${borderColor}`, margin: '6px 0' }} />;

  return (
    <CenteredModal
      open={!!record}
      onClose={onClose}
      title={`Chi tiết phiếu lương — ${record.employee?.user?.name ?? '—'}`}
      width={560}
    >
      {/* Thông tin chấm công */}
      <div style={{ background: bgCard, borderRadius: 8, padding: '12px 16px', border: `1px solid ${borderColor}`, marginBottom: 16 }}>
        <Text style={{ color: textMuted, fontSize: 12, display: 'block', marginBottom: 8, fontWeight: 600, letterSpacing: '0.05em' }}>CHẤM CÔNG</Text>
        <Row gutter={16}>
          <Col span={8}><div style={{ textAlign: 'center' }}><div style={{ fontSize: 22, fontWeight: 700, color: textPrimary }}>{record.workDays}</div><div style={{ fontSize: 11, color: textMuted }}>Ngày công</div></div></Col>
          <Col span={8}><div style={{ textAlign: 'center' }}><div style={{ fontSize: 22, fontWeight: 700, color: textPrimary }}>{record.paidLeaveDays ?? 0}</div><div style={{ fontSize: 11, color: textMuted }}>Nghỉ phép</div></div></Col>
          <Col span={8}><div style={{ textAlign: 'center' }}><div style={{ fontSize: 22, fontWeight: 700, color: Number(record.unpaidLeaveDays) > 0 ? '#EF4444' : textPrimary }}>{record.unpaidLeaveDays ?? 0}</div><div style={{ fontSize: 11, color: textMuted }}>Nghỉ ko phép</div></div></Col>
        </Row>
        {Number(record.overtimeHours) > 0 && (
          <div style={{ marginTop: 8, textAlign: 'center', color: '#F59E0B', fontSize: 13 }}>
            Tăng ca: {record.overtimeHours}h
          </div>
        )}
      </div>

      {/* Thu nhập */}
      <div style={{ background: bgCard, borderRadius: 8, padding: '12px 16px', border: `1px solid ${borderColor}`, marginBottom: 16 }}>
        <Text style={{ color: textMuted, fontSize: 12, display: 'block', marginBottom: 8, fontWeight: 600, letterSpacing: '0.05em' }}>THU NHẬP</Text>
        {block('Lương theo công', Number(record.baseSalary))}
        {Number(record.overtimePay) > 0 && block('Lương tăng ca', Number(record.overtimePay))}
        {Number(record.allowances) > 0 && block('Phụ cấp', Number(record.allowances))}
        {Number(record.bonus) > 0 && block('Thưởng', Number(record.bonus), '#10B981')}
        {separator}
        {block('TỔNG THU NHẬP', Number(record.grossSalary), linkColor)}
      </div>

      {/* Khấu trừ */}
      <div style={{ background: bgCard, borderRadius: 8, padding: '12px 16px', border: `1px solid ${borderColor}`, marginBottom: 16 }}>
        <Text style={{ color: textMuted, fontSize: 12, display: 'block', marginBottom: 8, fontWeight: 600, letterSpacing: '0.05em' }}>KHẤU TRỪ</Text>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}>
          <Text style={{ color: textMuted, fontSize: 13 }}>BHXH NLĐ (8%)</Text>
          <Text style={{ color: '#EF4444', fontSize: 13 }}>{formatCurrency(Number(record.bhxhEmployee))}</Text>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}>
          <Text style={{ color: textMuted, fontSize: 13 }}>BHYT NLĐ (1.5%)</Text>
          <Text style={{ color: '#EF4444', fontSize: 13 }}>{formatCurrency(Number(record.bhytEmployee))}</Text>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}>
          <Text style={{ color: textMuted, fontSize: 13 }}>BHTN NLĐ (1%)</Text>
          <Text style={{ color: '#EF4444', fontSize: 13 }}>{formatCurrency(Number(record.bhtnEmployee))}</Text>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', paddingLeft: 12 }}>
          <Text style={{ color: textMuted, fontSize: 12 }}>Tổng BH NLĐ</Text>
          <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: 600 }}>-{formatCurrency(totalBhxhEmployee)}</Text>
        </div>
        {separator}
        {record.dependentCount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}>
            <Text style={{ color: textMuted, fontSize: 13 }}>Giảm trừ gia cảnh ({record.dependentCount} NPT)</Text>
            <Text style={{ color: textMuted, fontSize: 13 }}>-{formatCurrency(Number(record.selfDeduction) + Number(record.dependentDeduction))}</Text>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}>
          <Text style={{ color: textMuted, fontSize: 13 }}>Thu nhập chịu thuế</Text>
          <Text style={{ color: textPrimary, fontSize: 13 }}>{formatCurrency(Number(record.taxableIncome))}</Text>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}>
          <Text style={{ color: textMuted, fontSize: 13 }}>Thuế TNCN</Text>
          <Text style={{ color: '#EF4444', fontSize: 13, fontWeight: 600 }}>-{formatCurrency(Number(record.pitAmount))}</Text>
        </div>
      </div>

      {/* Kết quả */}
      <div style={{ background: isDark ? `${linkColor}15` : `${linkColor}08`, borderRadius: 8, padding: '14px 16px', border: `1px solid ${linkColor}40` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: textPrimary, fontSize: 16, fontWeight: 700 }}>THỰC NHẬN</Text>
          <Text style={{ color: linkColor, fontSize: 22, fontWeight: 800 }}>{formatCurrency(Number(record.netSalary))}</Text>
        </div>
        {separator}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
          <Text style={{ color: textMuted, fontSize: 12 }}>Chi phí SXKD dự kiến (gồm đóng BH NSDLĐ)</Text>
          <Text style={{ color: textMuted, fontSize: 12 }}>{formatCurrency(Number(record.totalLaborCost))}</Text>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', paddingLeft: 12 }}>
          <Text style={{ color: textMuted, fontSize: 11 }}>BH NSDLĐ (BHXH 17.5% + BHYT 3% + BHTN 1% + TNLĐ 0.5%)</Text>
          <Text style={{ color: textMuted, fontSize: 11 }}>{formatCurrency(totalBhxhEmployer)}</Text>
        </div>
      </div>
    </CenteredModal>
  );
}

// ─── EditRecordModal ───────────────────────────────────────────────────────────

function EditRecordModal({
  record,
  onClose,
}: {
  record: PayrollRecord | null;
  onClose: () => void;
}) {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const [form] = Form.useForm();
  const { bgCard, borderColor, linkColor, textMuted } = useThemePalette();

  const updateMut = useMutation({
    mutationFn: (values: { bonus?: number; deductions?: number; note?: string }) =>
      payrollApi.updateRecord(record!.id, values),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payroll-records', record?.periodId] });
      message.success('Đã cập nhật bản ghi lương');
      onClose();
    },
    onError: (e: Error) => message.error(e.message ?? 'Lỗi cập nhật'),
  });

  if (!record) return null;

  return (
    <CenteredModal
      open={!!record}
      onClose={onClose}
      title={`Điều chỉnh — ${record.employee?.user?.name ?? '—'}`}
      width={420}
      extra={
        <Button type="primary" loading={updateMut.isPending} disabled={updateMut.isPending}
          onClick={() => form.validateFields().then(v => updateMut.mutate(v))}>
          Lưu
        </Button>
      }
    >
      <div style={{ padding: '8px 0 12px', background: bgCard, borderRadius: 8, border: `1px solid ${borderColor}`, padding: '12px 16px', marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={12}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: textMuted }}>{record.workDays}c</div>
              <div style={{ fontSize: 11, color: textMuted }}>Ngày công</div>
            </div>
          </Col>
          <Col span={12}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: linkColor }}>{formatCurrency(Number(record.grossSalary))}</div>
              <div style={{ fontSize: 11, color: textMuted }}>Tổng thu nhập</div>
            </div>
          </Col>
        </Row>
      </div>
      <Form form={form} layout="vertical"
        initialValues={{ bonus: record.bonus, deductions: record.deductions, note: record.note ?? '' }}>
        <Form.Item name="bonus" label="Thưởng thêm (đ)">
          <InputNumber style={{ width: '100%' }} min={0} step={500000}
            formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={v => Number(v?.replace(/,/g, '') ?? 0)} />
        </Form.Item>
        <Form.Item name="deductions" label="Khấu trừ thêm (đ)">
          <InputNumber style={{ width: '100%' }} min={0} step={100000}
            formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={v => Number(v?.replace(/,/g, '') ?? 0)} />
        </Form.Item>
        <Form.Item name="note" label="Ghi chú">
          <Input.TextArea rows={2} placeholder="Ghi chú về điều chỉnh..." />
        </Form.Item>
      </Form>
    </CenteredModal>
  );
}

// ─── PeriodDetailModal ─────────────────────────────────────────────────────────

function PeriodDetailModal({
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
  const { textPrimary, textMuted, bgCard, borderColor, linkColor, isDark } = useThemePalette();

  const { data, isLoading } = useQuery({
    queryKey: ['payroll-records', period?.id, page],
    queryFn: () => payrollApi.getPeriodRecords(period!.id, page, 50),
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

  const records = data?.data ?? [];
  const totalGross = records.reduce((s, r) => s + Number(r.grossSalary), 0);
  const totalNet = records.reduce((s, r) => s + Number(r.netSalary), 0);
  const totalPIT = records.reduce((s, r) => s + Number(r.pitAmount), 0);
  const totalBHXH = records.reduce((s, r) => s + Number(r.bhxhEmployee) + Number(r.bhytEmployee) + Number(r.bhtnEmployee), 0);

  const canGenerate = period?.status === 'DRAFT';
  const canReview   = period?.status === 'PROCESSING';
  const canRerun    = period?.status === 'REVIEWED';
  const canApprove  = period?.status === 'REVIEWED';
  const canPay      = period?.status === 'APPROVED';
  const canEdit     = period?.status !== 'APPROVED' && period?.status !== 'PAID';

  const cols: ColumnsType<PayrollRecord> = [
    {
      title: 'Nhân viên',
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 13, color: textPrimary }}>{r.employee?.user?.name ?? '—'}</div>
          <div style={{ fontSize: 11, color: textMuted }}>{r.employee?.user?.email}</div>
        </div>
      ),
    },
    {
      title: 'Công / OT',
      width: 90,
      align: 'center',
      render: (_, r) => (
        <div style={{ fontSize: 12, lineHeight: 1.8 }}>
          <Tag style={isDark ? { background: 'rgba(96,165,250,0.15)', color: '#93C5FD', borderColor: 'rgba(96,165,250,0.3)' } : {}} color={isDark ? undefined : 'blue'}>{r.workDays}c</Tag>
          {Number(r.overtimeHours) > 0 && <Tag style={isDark ? { background: 'rgba(245,158,11,0.15)', color: '#FCD34D', borderColor: 'rgba(245,158,11,0.3)' } : {}} color={isDark ? undefined : 'orange'}>{r.overtimeHours}h</Tag>}
        </div>
      ),
    },
    {
      title: 'Tổng TN',
      dataIndex: 'grossSalary',
      width: 130,
      align: 'right',
      render: (v: number) => <Text style={{ color: textPrimary, fontSize: 13 }}>{formatCurrency(Number(v))}</Text>,
    },
    {
      title: 'BH NLĐ',
      width: 110,
      align: 'right',
      render: (_, r) => {
        const total = Number(r.bhxhEmployee) + Number(r.bhytEmployee) + Number(r.bhtnEmployee);
        return total > 0
          ? <Text style={{ color: '#EF4444', fontSize: 13 }}>-{formatCurrency(total)}</Text>
          : <Text style={{ color: textMuted }}>—</Text>;
      },
    },
    {
      title: 'Thuế TNCN',
      dataIndex: 'pitAmount',
      width: 110,
      align: 'right',
      render: (v: number) => Number(v) > 0
        ? <Text style={{ color: '#EF4444', fontSize: 13 }}>-{formatCurrency(Number(v))}</Text>
        : <Text style={{ color: textMuted }}>—</Text>,
    },
    {
      title: 'Thực nhận',
      dataIndex: 'netSalary',
      width: 130,
      align: 'right',
      render: (v: number) => (
        <Text strong style={{ color: linkColor, fontSize: 14 }}>{formatCurrency(Number(v))}</Text>
      ),
    },
    {
      title: '',
      width: 100,
      align: 'center',
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
        width={960}
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
              <div style={{ background: bgCard, border: `1px solid ${borderColor}`, borderRadius: 8, padding: '10px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: textPrimary }}>{records.length}</div>
                <div style={{ fontSize: 11, color: textMuted }}><TeamOutlined /> Nhân viên</div>
              </div>
            </Col>
            <Col span={6}>
              <div style={{ background: bgCard, border: `1px solid ${borderColor}`, borderRadius: 8, padding: '10px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: textPrimary }}>{formatCurrency(totalGross)}</div>
                <div style={{ fontSize: 11, color: textMuted }}>Tổng thu nhập</div>
              </div>
            </Col>
            <Col span={6}>
              <div style={{ background: bgCard, border: `1px solid ${borderColor}`, borderRadius: 8, padding: '10px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#EF4444' }}>-{formatCurrency(totalBHXH + totalPIT)}</div>
                <div style={{ fontSize: 11, color: textMuted }}>BH + Thuế TNCN</div>
              </div>
            </Col>
            <Col span={6}>
              <div style={{ background: isDark ? `${linkColor}18` : `${linkColor}0C`, border: `1px solid ${linkColor}30`, borderRadius: 8, padding: '10px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: linkColor }}>{formatCurrency(totalNet)}</div>
                <div style={{ fontSize: 11, color: textMuted }}>Tổng chi trả</div>
              </div>
            </Col>
          </Row>
        )}

        <Table
          loading={isLoading}
          dataSource={records}
          rowKey="id"
          columns={cols}
          size="small"
          scroll={{ x: 780 }}
          pagination={{
            current: page,
            total: data?.total ?? 0,
            pageSize: 50,
            onChange: setPage,
            showTotal: t => `${t} nhân viên`,
          }}
          locale={{ emptyText: <Empty description="Chưa có dữ liệu. Nhấn 'Tính lương' để bắt đầu." /> }}
        />
      </CenteredModal>

      <RecordDetailModal record={detailRecord} onClose={() => setDetailRecord(null)} />
      <EditRecordModal record={editRecord} onClose={() => setEditRecord(null)} />
    </>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────

export default function PayrollPage() {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<PayrollPeriod | null>(null);
  const [form] = Form.useForm();
  const [page, setPage] = useState(1);
  const [exportingTax, setExportingTax] = useState(false);
  const { textPrimary, textMuted, bgContainer, bgCard, borderColor, linkColor, isDark } = useThemePalette();

  // Mock data OT/Leave summary — API chưa sẵn sàng
  const [otSummary] = useState({
    totalHours: 124,
    otPay: 18600000,
    paidLeaveDays: 45,
    unpaidLeaveDays: 8,
    weeklyBreakdown: [
      { week: 'Tuần 1', weekday: 12, weekend: 4, holiday: 0 },
      { week: 'Tuần 2', weekday: 16, weekend: 8, holiday: 0 },
      { week: 'Tuần 3', weekday: 8, weekend: 0, holiday: 16 },
      { week: 'Tuần 4', weekday: 20, weekend: 8, holiday: 0 },
    ],
  });

  const handleExportTax = async () => {
    setExportingTax(true);
    try {
      await payrollApi.downloadPitAnnual(new Date().getFullYear());
      message.success('Đã xuất báo cáo 05-QTT-TNCN');
    } catch {
      message.error('Lỗi xuất báo cáo');
    } finally {
      setExportingTax(false);
    }
  };

  const { data, isLoading } = useQuery({
    queryKey: ['payroll-periods', page],
    queryFn: () => payrollApi.listPeriods(page, 20),
  });

  const createMut = useMutation({
    mutationFn: payrollApi.createPeriod,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payroll-periods'] });
      message.success('Đã tạo kỳ lương');
      setCreateOpen(false);
      form.resetFields();
    },
    onError: (e: Error) => message.error(e.message ?? 'Lỗi tạo kỳ lương'),
  });

  const periods = data?.data ?? [];
  const totalDraft      = periods.filter(p => p.status === 'DRAFT').length;
  const totalProcessing = periods.filter(p => p.status === 'PROCESSING' || p.status === 'REVIEWED').length;
  const totalApproved   = periods.filter(p => p.status === 'APPROVED').length;
  const totalPaid       = periods.filter(p => p.status === 'PAID').length;

  const cols: ColumnsType<PayrollPeriod> = [
    {
      title: 'Kỳ lương',
      dataIndex: 'name',
      render: (name: string, r) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, color: textPrimary }}>{name}</div>
          <div style={{ fontSize: 12, color: textMuted }}>
            <CalendarOutlined style={{ marginRight: 4 }} />
            {dayjs(r.startDate).format('DD/MM/YYYY')} – {dayjs(r.endDate).format('DD/MM/YYYY')}
          </div>
        </div>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      width: 130,
      render: (s: string) => <Tag color={STATUS_COLOR[s]}>{STATUS_LABEL[s]}</Tag>,
    },
    {
      title: 'Nhân viên',
      dataIndex: '_count',
      width: 90,
      align: 'center',
      render: (c: PayrollPeriod['_count']) => (
        <Text style={{ fontWeight: 700, fontSize: 15, color: textPrimary }}>{c?.records ?? 0}</Text>
      ),
    },
    {
      title: 'Người duyệt',
      dataIndex: 'processedBy',
      render: (p: PayrollPeriod['processedBy']) => p
        ? <Text style={{ fontSize: 13, color: textPrimary }}>{p.name}</Text>
        : <Text style={{ color: textMuted }}>—</Text>,
    },
    {
      title: 'Ngày duyệt',
      dataIndex: 'processedAt',
      width: 120,
      render: (d?: string) => d
        ? <Text style={{ color: textMuted }}>{dayjs(d).format('DD/MM/YYYY')}</Text>
        : <Text style={{ color: textMuted }}>—</Text>,
    },
    {
      title: '',
      width: 100,
      render: (_, r) => (
        <Button size="small" icon={<EyeOutlined />} onClick={() => setSelectedPeriod(r)}>
          Chi tiết
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Payroll"
        icon={<DollarOutlined />}
        iconColor="#0D9488"
        actions={
          <Space>
            <Button icon={<FileExcelOutlined />} loading={exportingTax} onClick={handleExportTax}>
              Báo cáo thuế {new Date().getFullYear()}
            </Button>
            <Button icon={<SettingOutlined />} onClick={() => navigate('/payroll/settings')}>
              Cấu hình
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
              Tạo kỳ lương
            </Button>
          </Space>
        }
      />

      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={6}><StatCard label="Bản nháp" value={totalDraft} color="#94A3B8" icon={<CalendarOutlined />} /></Col>
        <Col xs={12} sm={6}><StatCard label="Đang xử lý" value={totalProcessing} color="#F59E0B" icon={<ThunderboltOutlined />} /></Col>
        <Col xs={12} sm={6}><StatCard label="Đã duyệt" value={totalApproved} color="#6366F1" icon={<CheckOutlined />} /></Col>
        <Col xs={12} sm={6}><StatCard label="Đã trả lương" value={totalPaid} color="#10B981" icon={<DollarOutlined />} /></Col>
      </Row>

      {/* ── E16.4 — OT/Leave Summary ───────────────────────────────────────── */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={6}>
          <StatCard
            label="Tổng giờ OT"
            value={`${otSummary.totalHours}h`}
            color="#F97316"
            icon={<FieldTimeOutlined />}
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            label="Chi phí OT"
            value={formatCurrency(otSummary.otPay)}
            color="#EF4444"
            icon={<DollarOutlined />}
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            label="Ngày nghỉ có lương"
            value={`${otSummary.paidLeaveDays} ngày`}
            color="#10B981"
            icon={<CalendarOutlined />}
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            label="Ngày nghỉ không lương"
            value={`${otSummary.unpaidLeaveDays} ngày`}
            color="#6366F1"
            icon={<MinusCircleOutlined />}
          />
        </Col>
      </Row>

      {/* Bảng breakdown OT theo loại */}
      <div style={{
        background: bgCard,
        border: `1px solid ${borderColor}`,
        borderRadius: 8,
        marginBottom: 20,
        overflow: 'hidden',
      }}>
        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${borderColor}` }}>
          <Typography.Text style={{ color: textPrimary, fontWeight: 600, fontSize: 14 }}>
            <FieldTimeOutlined style={{ marginRight: 8, color: '#F97316' }} />
            Breakdown OT theo loại
          </Typography.Text>
        </div>
        <Table<{ key: string; type: string; hours: number; rate: number; amount: number }>
          rowKey="key"
          size="small"
          pagination={false}
          dataSource={[
            {
              key: 'weekday',
              type: 'Ngày thường',
              hours: otSummary.weeklyBreakdown.reduce((s, w) => s + w.weekday, 0),
              rate: 1.5,
              amount: otSummary.weeklyBreakdown.reduce((s, w) => s + w.weekday, 0) * 100000 * 1.5,
            },
            {
              key: 'weekend',
              type: 'T7–CN',
              hours: otSummary.weeklyBreakdown.reduce((s, w) => s + w.weekend, 0),
              rate: 2.0,
              amount: otSummary.weeklyBreakdown.reduce((s, w) => s + w.weekend, 0) * 100000 * 2.0,
            },
            {
              key: 'holiday',
              type: 'Ngày lễ',
              hours: otSummary.weeklyBreakdown.reduce((s, w) => s + w.holiday, 0),
              rate: 3.0,
              amount: otSummary.weeklyBreakdown.reduce((s, w) => s + w.holiday, 0) * 100000 * 3.0,
            },
          ]}
          columns={[
            {
              title: 'Loại',
              dataIndex: 'type',
              render: (v: string) => <Typography.Text style={{ color: textPrimary }}>{v}</Typography.Text>,
            },
            {
              title: 'Số giờ',
              dataIndex: 'hours',
              width: 110,
              align: 'right',
              render: (v: number) => (
                <Typography.Text style={{ color: textPrimary }}>{v}h</Typography.Text>
              ),
            },
            {
              title: 'Hệ số',
              dataIndex: 'rate',
              width: 100,
              align: 'center',
              render: (v: number) => (
                <Typography.Text style={{ color: v >= 3 ? '#EF4444' : v >= 2 ? '#F59E0B' : '#10B981', fontWeight: 600 }}>
                  x{v.toFixed(1)}
                </Typography.Text>
              ),
            },
            {
              title: 'Thành tiền',
              dataIndex: 'amount',
              width: 160,
              align: 'right',
              render: (v: number) => (
                <Typography.Text style={{ color: linkColor, fontWeight: 600 }}>{formatCurrency(v)}</Typography.Text>
              ),
            },
          ]}
        />
      </div>

      <Table
        loading={isLoading}
        dataSource={periods}
        rowKey="id"
        columns={cols}
        size="small"
        style={{ border: `1px solid ${borderColor}`, borderRadius: 8, background: bgContainer }}
        pagination={{
          current: page,
          total: data?.total ?? 0,
          pageSize: 20,
          onChange: setPage,
          showTotal: t => `${t} kỳ lương`,
        }}
        onRow={r => ({ onClick: () => setSelectedPeriod(r), style: { cursor: 'pointer' } })}
      />

      {/* Modal tạo kỳ lương */}
      <Modal
        open={createOpen}
        title="Tạo kỳ lương mới"
        onCancel={() => { setCreateOpen(false); form.resetFields(); }}
        onOk={() => form.validateFields().then(values => createMut.mutate({
          name:      values.name,
          startDate: values.dateRange[0].format('YYYY-MM-DD'),
          endDate:   values.dateRange[1].format('YYYY-MM-DD'),
        }))}
        confirmLoading={createMut.isPending}
        okText="Tạo" cancelText="Huỷ"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="Tên kỳ lương"
            rules={[{ required: true, message: 'Nhập tên kỳ lương' }]}
            extra="Ví dụ: Lương tháng 5/2026">
            <Input placeholder="Lương tháng 5/2026" />
          </Form.Item>
          <Form.Item name="dateRange" label="Khoảng thời gian"
            rules={[{ required: true, message: 'Chọn thời gian' }]}>
            <DatePicker.RangePicker style={{ width: '100%' }} format="DD/MM/YYYY"
              placeholder={['Ngày bắt đầu', 'Ngày kết thúc']} />
          </Form.Item>
        </Form>
      </Modal>

      <PeriodDetailModal period={selectedPeriod} onClose={() => setSelectedPeriod(null)} />
    </div>
  );
}
