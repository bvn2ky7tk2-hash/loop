import { useState, useEffect } from 'react';
import {
  Button, Form, Input, Select, DatePicker,
  InputNumber, Space, App,
  Alert,
} from 'antd';
import { CenteredModal } from '../../../components/ui/CenteredModal';
import {
  PlusOutlined, GiftOutlined, MinusCircleOutlined,
  SyncOutlined, HistoryOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import {
  contractsApi,
  type Contract, type ContractType,
  type RenewContractDto,
} from '../../../api/contracts';
import { payrollApi } from '../../../api/payroll';
import { useThemePalette } from '../../../hooks/useThemePalette';
import {
  CONTRACT_TYPE_LABELS, CONTRACT_TYPES,
  calcEndDate, suggestRenewalType,
} from '../constants';

// ── Renewal Modal ─────────────────────────────────────────────────────────────

interface RenewalModalProps {
  open: boolean;
  contract: Contract | null;
  onClose: () => void;
  isDark: boolean;
}

export function RenewalModal({ open, contract, onClose, isDark }: RenewalModalProps) {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const [form] = Form.useForm();
  const { bgContainer, textPrimary, textMuted, borderColor, linkColor } = useThemePalette();

  const { data: allowanceTypes = [] } = useQuery({
    queryKey: ['allowance-types'],
    queryFn: payrollApi.listAllowanceTypes,
    staleTime: 5 * 60_000,
  });

  const renewMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: RenewContractDto }) =>
      contractsApi.renew(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contracts'] });
      message.success('Đã gia hạn hợp đồng. HĐ cũ đã chuyển sang EXPIRED, HĐ mới đã được tạo.');
      form.resetFields();
      onClose();
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      message.error(err.response?.data?.message ?? 'Gia hạn thất bại'),
  });

  const [selectedType, setSelectedType] = useState<ContractType>('FIXED_12');
  const probationDays = 60; // Thử việc mặc định 60 ngày (không thay đổi trong form gia hạn)

  useEffect(() => {
    if (!open || !contract) return;
    const suggestedType = suggestRenewalType(contract.type, contract.renewalCount);
    setSelectedType(suggestedType);

    // Ngày bắt đầu HĐ mới = ngày kết thúc HĐ cũ + 1
    const newStart = contract.endDate
      ? dayjs(contract.endDate).add(1, 'day')
      : dayjs();

    form.setFieldsValue({
      type:          suggestedType,
      startDate:     newStart,
      endDate:       calcEndDate(suggestedType, newStart),
      salaryMonthly: Number(contract.salaryMonthly),
      allowances:    (contract.allowances ?? []).map(a => ({
        allowanceTypeId: a.allowanceTypeId,
        amount:          Number(a.amount),
        note:            a.note ?? '',
      })),
    });
  }, [open, contract]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleTypeChange(type: ContractType) {
    setSelectedType(type);
    const startDate = form.getFieldValue('startDate') as dayjs.Dayjs | null;
    if (startDate) {
      form.setFieldValue('endDate', calcEndDate(type, startDate, probationDays));
    }
  }

  function handleStartDateChange(date: dayjs.Dayjs | null) {
    if (!date) return;
    form.setFieldValue('endDate', calcEndDate(selectedType, date, probationDays));
  }

  function handleFinish(values: Record<string, unknown>) {
    if (!contract) return;
    const rawAllowances = (values.allowances as any[] | undefined) ?? [];
    const payload: RenewContractDto = {
      type:          values.type as ContractType,
      startDate:     (values.startDate as dayjs.Dayjs).format('YYYY-MM-DD'),
      endDate:       values.endDate ? (values.endDate as dayjs.Dayjs).format('YYYY-MM-DD') : undefined,
      salaryMonthly: values.salaryMonthly as number,
      note:          (values.note as string) || undefined,
      signedAt:      values.signedAt ? (values.signedAt as dayjs.Dayjs).format('YYYY-MM-DD') : undefined,
      allowances:    rawAllowances
        .filter((a: any) => a?.allowanceTypeId)
        .map((a: any) => ({
          allowanceTypeId: a.allowanceTypeId,
          amount:          Number(a.amount ?? 0),
          note:            a.note || undefined,
        })),
    };
    renewMutation.mutate({ id: contract.id, data: payload });
  }

  const mustBeIndefinite = (contract?.renewalCount ?? 0) >= 2;

  return (
    <CenteredModal
      title={
        <span>
          <SyncOutlined style={{ marginRight: 8, color: '#6366F1' }} />
          Gia hạn hợp đồng — {contract?.employee?.fullName}
        </span>
      }
      open={open}
      onClose={onClose}
      width={540}
      styles={{ body: { background: bgContainer } }}
      footer={
        <Space style={{ justifyContent: 'flex-end', width: '100%' }}>
          <Button onClick={onClose}>Huỷ</Button>
          <Button
            type="primary"
            loading={renewMutation.isPending}
            disabled={renewMutation.isPending}
            onClick={() => form.submit()}
            icon={<SyncOutlined />}
          >
            Xác nhận gia hạn
          </Button>
        </Space>
      }
    >
      {/* Thông tin HĐ cũ */}
      {contract && (
        <div style={{
          padding: '10px 12px',
          borderRadius: 8,
          background: isDark ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.06)',
          border: `1px solid ${isDark ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.2)'}`,
          marginBottom: 16,
        }}>
          <div style={{ fontSize: 11, color: textMuted, marginBottom: 4 }}>
            <HistoryOutlined style={{ marginRight: 4 }} />
            HĐ hiện tại (sẽ chuyển sang EXPIRED)
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <span style={{ fontSize: 11, color: textMuted }}>Loại: </span>
              <span style={{ fontSize: 12, fontWeight: 600, color: textPrimary }}>
                {CONTRACT_TYPE_LABELS[contract.type]}
              </span>
            </div>
            <div>
              <span style={{ fontSize: 11, color: textMuted }}>Thời gian: </span>
              <span style={{ fontSize: 12, color: textPrimary }}>
                {dayjs(contract.startDate).format('DD/MM/YYYY')}
                {' → '}
                {contract.endDate ? dayjs(contract.endDate).format('DD/MM/YYYY') : 'Vô thời hạn'}
              </span>
            </div>
            <div>
              <span style={{ fontSize: 11, color: textMuted }}>Lần gia hạn: </span>
              <span style={{ fontSize: 12, fontWeight: 600, color: linkColor }}>#{contract.renewalCount}</span>
            </div>
          </div>
        </div>
      )}

      {mustBeIndefinite && (
        <Alert
          type="warning"
          showIcon
          message="BLLĐ 2019: Đây là lần gia hạn thứ 3 trở lên. Theo luật, phải ký HĐ không xác định thời hạn."
          style={{ marginBottom: 12, fontSize: 12 }}
        />
      )}

      <Form form={form} layout="vertical" onFinish={handleFinish}>
        <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
          <Form.Item
            name="type" label="Loại HĐ mới" style={{ flex: 1 }}
            rules={[{ required: true }]}
          >
            <Select
              onChange={handleTypeChange}
              disabled={mustBeIndefinite}
              options={CONTRACT_TYPES
                .filter(t => !mustBeIndefinite || t === 'INDEFINITE')
                .map(t => ({
                  value: t,
                  label: CONTRACT_TYPE_LABELS[t],
                  disabled: mustBeIndefinite && t !== 'INDEFINITE',
                }))}
            />
          </Form.Item>
        </Space>

        <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
          <Form.Item
            name="startDate" label="Ngày bắt đầu HĐ mới" style={{ flex: 1 }}
            rules={[{ required: true }]}
          >
            <DatePicker
              style={{ width: '100%' }} format="DD/MM/YYYY"
              onChange={handleStartDateChange}
            />
          </Form.Item>
          <Form.Item name="endDate" label="Ngày kết thúc" style={{ flex: 1 }}>
            <DatePicker
              style={{ width: '100%' }} format="DD/MM/YYYY"
              placeholder={selectedType === 'INDEFINITE' ? 'Vô thời hạn' : 'Tự động tính'}
              disabled={selectedType === 'INDEFINITE'}
            />
          </Form.Item>
        </Space>

        <Form.Item
          name="salaryMonthly" label="Lương tháng mới (VND)"
          rules={[{ required: true }]}
        >
          <InputNumber<number>
            style={{ width: '100%' }}
            min={0} step={500000}
            formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={v => Number(v?.replace(/,/g, '') ?? 0)}
          />
        </Form.Item>

        {/* Phụ cấp kế thừa */}
        <div style={{
          borderTop: `1px solid ${borderColor}`,
          paddingTop: 12, marginTop: 4, marginBottom: 4,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <GiftOutlined style={{ color: '#10B981' }} />
            <span style={{ fontWeight: 600, fontSize: 13, color: textPrimary }}>
              Phụ cấp (kế thừa từ HĐ cũ)
            </span>
          </div>
          <Form.List name="allowances">
            {(fields, { add, remove }) => (
              <>
                {fields.map((field) => (
                  <div key={field.key} style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginBottom: 8 }}>
                    <Form.Item
                      {...field} name={[field.name, 'allowanceTypeId']}
                      style={{ flex: 2, marginBottom: 0 }}
                      rules={[{ required: true }]}
                    >
                      <Select
                        placeholder="Loại phụ cấp"
                        options={allowanceTypes.filter(a => a.isActive).map(a => ({ value: a.id, label: a.name }))}
                        showSearch
                        filterOption={(input, opt) =>
                          (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())
                        }
                      />
                    </Form.Item>
                    <Form.Item
                      {...field} name={[field.name, 'amount']}
                      style={{ flex: 1, marginBottom: 0 }}
                      rules={[{ required: true }]}
                    >
                      <InputNumber<number>
                        style={{ width: '100%' }} min={0}
                        formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        parser={v => Number(v?.replace(/,/g, '') ?? 0)}
                      />
                    </Form.Item>
                    <Button
                      type="text" danger size="small"
                      icon={<MinusCircleOutlined />}
                      onClick={() => remove(field.name)}
                    />
                  </div>
                ))}
                <Button
                  type="dashed" icon={<PlusOutlined />}
                  onClick={() => add({ allowanceTypeId: undefined, amount: 0 })}
                  size="small" block
                >
                  Thêm phụ cấp
                </Button>
              </>
            )}
          </Form.List>
        </div>

        <Form.Item name="signedAt" label="Ngày ký HĐ mới" style={{ marginTop: 12 }}>
          <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
        </Form.Item>
        <Form.Item name="note" label="Ghi chú">
          <Input.TextArea rows={2} placeholder="Ghi chú gia hạn..." />
        </Form.Item>
      </Form>
    </CenteredModal>
  );
}
