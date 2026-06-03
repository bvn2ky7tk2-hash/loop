import { Row, Col, Typography } from 'antd';
import { CenteredModal } from '../../../components/ui/CenteredModal';
import type { PayrollRecord } from '../../../api/payroll';
import { useThemePalette } from '../../../hooks/useThemePalette';
import { formatCurrency } from '../../../utils/format';

const { Text } = Typography;

export function RecordDetailModal({
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
      title={`Chi tiết phiếu lương — ${record.employee?.user?.name ?? record.employee?.fullName ?? '—'}`}
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
