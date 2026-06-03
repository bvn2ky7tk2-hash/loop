import { Button, Form, Input, Row, Col, App, InputNumber } from 'antd';
import { CenteredModal } from '../../../components/ui/CenteredModal';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { payrollApi, type PayrollRecord } from '../../../api/payroll';
import { useThemePalette } from '../../../hooks/useThemePalette';
import { formatCurrency } from '../../../utils/format';

export function EditRecordModal({
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
      title={`Điều chỉnh — ${record.employee?.user?.name ?? record.employee?.fullName ?? '—'}`}
      width={420}
      extra={
        <Button type="primary" loading={updateMut.isPending} disabled={updateMut.isPending}
          onClick={() => form.validateFields().then(v => updateMut.mutate(v))}>
          Lưu
        </Button>
      }
    >
      <div style={{ background: bgCard, borderRadius: 8, border: `1px solid ${borderColor}`, padding: '12px 16px', marginBottom: 16 }}>
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
          <InputNumber<number> style={{ width: '100%' }} min={0} step={500000}
            formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={v => Number(v?.replace(/,/g, '') ?? 0)} />
        </Form.Item>
        <Form.Item name="deductions" label="Khấu trừ thêm (đ)">
          <InputNumber<number> style={{ width: '100%' }} min={0} step={100000}
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
