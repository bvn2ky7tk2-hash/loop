import { useState, useEffect } from 'react';
import {
  Button, Form, Input, Select, DatePicker,
  InputNumber, Space, Tooltip, App,
  Alert,
} from 'antd';
import { CenteredModal } from '../../../components/ui/CenteredModal';
import {
  PlusOutlined, GiftOutlined, MinusCircleOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import {
  contractsApi,
  type Contract, type ContractType, type ContractStatus,
  type CreateContractDto,
} from '../../../api/contracts';
import { payrollApi } from '../../../api/payroll';
import { employeesApi } from '../../../api/employees';
import { positionsApi } from '../../../api/hr-core';
import { useThemePalette } from '../../../hooks/useThemePalette';
import { DetailRow } from '../../../components/ui/DetailRow';
import {
  CONTRACT_TYPE_LABELS, CONTRACT_TYPES, CONTRACT_STATUS_LABELS, CONTRACT_STATUSES,
  FIXED_TYPES, PROBATION_OPTIONS, calcEndDate,
} from '../constants';

// ── Contract Form Drawer ──────────────────────────────────────────────────────

interface ContractDrawerProps {
  open: boolean;
  editing: Contract | null;
  onClose: () => void;
  isDark: boolean;
}

export function ContractDrawer({ open, editing, onClose, isDark }: ContractDrawerProps) {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const [form] = Form.useForm();
  const [empSearch, setEmpSearch] = useState('');
  const [selectedEmpId, setSelectedEmpId] = useState<string | undefined>(undefined);
  const [selectedType, setSelectedType] = useState<ContractType>('INDEFINITE');
  const [probationDays, setProbationDays] = useState(60);
  const { bgContainer, textPrimary, borderColor } = useThemePalette();

  const { data: allowanceTypes = [] } = useQuery({
    queryKey: ['allowance-types'],
    queryFn: payrollApi.listAllowanceTypes,
    staleTime: 5 * 60_000,
  });

  const { data: employees = [], isFetching: empLoading } = useQuery({
    queryKey: ['employees-search', empSearch],
    queryFn: () => empSearch
      ? employeesApi.list().then((r) => Array.isArray(r)
          ? r.filter((e) => e.fullName.toLowerCase().includes(empSearch.toLowerCase()))
          : r)
      : employeesApi.list().then((r) => Array.isArray(r) ? r.slice(0, 50) : []),
    staleTime: 30_000,
  });

  const { data: selectedEmpDetail } = useQuery({
    queryKey: ['employee', selectedEmpId],
    queryFn: () => employeesApi.get(selectedEmpId!),
    enabled: !!selectedEmpId,
    staleTime: 60_000,
  });

  const empOrgUnitId = selectedEmpDetail?.orgUnitId;
  const { data: positionsData } = useQuery({
    queryKey: ['positions-by-unit', empOrgUnitId],
    queryFn: () => positionsApi.list({ orgUnitId: empOrgUnitId, isActive: true, limit: 200 }),
    enabled: !!empOrgUnitId,
    staleTime: 5 * 60_000,
  });
  const positionOptions = (positionsData?.data ?? []).map((p) => ({
    value: p.id,
    label: p.jobTitle ? `${p.jobTitle.name} — ${p.code}` : p.code,
  }));

  // Tự động tính endDate khi đổi loại HĐ hoặc ngày bắt đầu
  function handleTypeChange(type: ContractType) {
    setSelectedType(type);
    const startDate = form.getFieldValue('startDate') as dayjs.Dayjs | null;
    if (startDate) {
      const end = calcEndDate(type, startDate, type === 'PROBATION' ? probationDays : 60);
      form.setFieldValue('endDate', end);
    }
  }

  function handleStartDateChange(date: dayjs.Dayjs | null) {
    if (!date) return;
    const type = (form.getFieldValue('type') ?? selectedType) as ContractType;
    const end = calcEndDate(type, date, probationDays);
    form.setFieldValue('endDate', end);
  }

  function handleProbationDaysChange(days: number) {
    setProbationDays(days);
    const startDate = form.getFieldValue('startDate') as dayjs.Dayjs | null;
    if (startDate && selectedType === 'PROBATION') {
      form.setFieldValue('endDate', startDate.add(days, 'day'));
    }
  }

  function handleEmpChange(empId: string) {
    setSelectedEmpId(empId);
    form.setFieldValue('positionId', undefined);
  }

  const createMutation = useMutation({
    mutationFn: contractsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contracts'] });
      message.success('Đã tạo hợp đồng');
      form.resetFields();
      onClose();
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      message.error(err.response?.data?.message ?? 'Tạo hợp đồng thất bại'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateContractDto> & { status?: ContractStatus } }) =>
      contractsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contracts'] });
      message.success('Đã cập nhật hợp đồng');
      form.resetFields();
      onClose();
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      message.error(err.response?.data?.message ?? 'Cập nhật thất bại'),
  });

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setSelectedEmpId(editing.employeeId);
      setSelectedType(editing.type);
      form.setFieldsValue({
        employeeId:    editing.employeeId,
        type:          editing.type,
        status:        editing.status,
        positionId:    (editing as Contract & { positionId?: string }).positionId ?? undefined,
        startDate:     editing.startDate ? dayjs(editing.startDate) : null,
        endDate:       editing.endDate   ? dayjs(editing.endDate)   : null,
        salaryMonthly: editing.salaryMonthly,
        insuranceSalary: editing.insuranceSalary ?? undefined,
        currency:      editing.currency ?? 'VND',
        note:          editing.note ?? '',
        signedAt:      editing.signedAt  ? dayjs(editing.signedAt)  : null,
        allowances:    (editing.allowances ?? []).map(a => ({
          allowanceTypeId: a.allowanceTypeId,
          amount:          Number(a.amount),
          note:            a.note ?? '',
        })),
      });
    } else {
      setSelectedEmpId(undefined);
      setSelectedType('INDEFINITE');
      setProbationDays(60);
      form.resetFields();
      form.setFieldsValue({ currency: 'VND', status: 'DRAFT', allowances: [] });
    }
  }, [open, editing]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleFinish(values: Record<string, unknown>) {
    const rawAllowances = (values.allowances as any[] | undefined) ?? [];
    const payload: CreateContractDto = {
      employeeId:    values.employeeId as string,
      type:          values.type as ContractType,
      startDate:     (values.startDate as dayjs.Dayjs).format('YYYY-MM-DD'),
      endDate:       values.endDate ? (values.endDate as dayjs.Dayjs).format('YYYY-MM-DD') : undefined,
      salaryMonthly: values.salaryMonthly as number,
      insuranceSalary: values.insuranceSalary != null ? (values.insuranceSalary as number) : undefined,
      currency:      (values.currency as string) ?? 'VND',
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

    if (editing) {
      updateMutation.mutate({ id: editing.id, data: { ...payload, status: values.status as ContractStatus } });
    } else {
      createMutation.mutate(payload);
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;
  const showProbationDays = selectedType === 'PROBATION';
  const hasAutoEndDate = FIXED_TYPES.includes(selectedType);

  return (
    <CenteredModal
      title={editing ? 'Cập nhật hợp đồng' : 'Hợp đồng mới'}
      open={open}
      onClose={onClose}
      width={540}
      styles={{ body: { background: bgContainer } }}
      footer={
        <Space style={{ justifyContent: 'flex-end', width: '100%' }}>
          <Button onClick={onClose}>Huỷ</Button>
          <Button type="primary" loading={isPending} disabled={isPending} onClick={() => form.submit()}>
            {editing ? 'Lưu thay đổi' : 'Tạo hợp đồng'}
          </Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        {/* Nhân viên */}
        <Form.Item
          name="employeeId" label="Nhân viên"
          rules={[{ required: true, message: 'Chọn nhân viên' }]}
        >
          <Select
            showSearch
            placeholder="Tìm kiếm nhân viên..."
            loading={empLoading}
            onSearch={setEmpSearch}
            filterOption={false}
            onChange={handleEmpChange}
            options={employees.map((e) => ({
              value: e.id,
              label: `${e.fullName} — ${e.code}`,
            }))}
          />
        </Form.Item>

        {/* Auto-fill: Đơn vị + Vị trí hiện tại */}
        {selectedEmpDetail && (
          <div style={{
            padding: '8px 12px',
            borderRadius: 8,
            background: isDark ? 'rgba(16,185,129,0.1)' : 'rgba(16,185,129,0.06)',
            border: `1px solid ${isDark ? 'rgba(16,185,129,0.3)' : 'rgba(16,185,129,0.2)'}`,
            marginBottom: 16,
            display: 'flex', gap: 16, flexWrap: 'wrap',
          }}>
            <DetailRow label="Đơn vị hiện tại" value={selectedEmpDetail.orgUnit?.name} vertical />
            <DetailRow label="Vị trí / Chức danh" value={selectedEmpDetail.position?.jobTitle?.name} vertical />
          </div>
        )}

        {/* Vị trí công việc trong hợp đồng */}
        <Form.Item name="positionId" label="Vị trí công việc (hợp đồng)">
          <Select
            allowClear showSearch
            placeholder={empOrgUnitId ? 'Chọn vị trí biên chế...' : 'Chọn nhân viên trước'}
            disabled={!empOrgUnitId}
            filterOption={(input, opt) => (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())}
            options={positionOptions}
          />
        </Form.Item>

        {/* Loại hợp đồng + Trạng thái */}
        <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
          <Form.Item
            name="type" label="Loại hợp đồng" style={{ flex: 1 }}
            rules={[{ required: true, message: 'Chọn loại hợp đồng' }]}
          >
            <Select
              placeholder="Chọn loại..."
              onChange={handleTypeChange}
              options={CONTRACT_TYPES.map((t) => ({
                value: t,
                label: CONTRACT_TYPE_LABELS[t],
              }))}
            />
          </Form.Item>
          <Form.Item name="status" label="Trạng thái" style={{ flex: 1 }}>
            <Select
              placeholder="Chọn trạng thái..."
              options={CONTRACT_STATUSES.map((s) => ({
                value: s,
                label: CONTRACT_STATUS_LABELS[s],
              }))}
            />
          </Form.Item>
        </Space>

        {/* Thử việc: chọn số ngày */}
        {showProbationDays && (
          <Form.Item label="Thời gian thử việc">
            <Select
              value={probationDays}
              onChange={handleProbationDaysChange}
              options={PROBATION_OPTIONS}
            />
          </Form.Item>
        )}

        {/* Ngày bắt đầu + Ngày kết thúc */}
        <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
          <Form.Item
            name="startDate" label="Ngày bắt đầu" style={{ flex: 1 }}
            rules={[{ required: true, message: 'Chọn ngày bắt đầu' }]}
          >
            <DatePicker
              style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Chọn ngày"
              onChange={handleStartDateChange}
            />
          </Form.Item>
          <Form.Item
            name="endDate"
            label={
              <span>
                Ngày kết thúc
                {hasAutoEndDate && (
                  <Tooltip title="Tự động tính theo loại hợp đồng">
                    <InfoCircleOutlined style={{ marginLeft: 4, color: '#3B82F6', fontSize: 12 }} />
                  </Tooltip>
                )}
              </span>
            }
            style={{ flex: 1 }}
          >
            <DatePicker
              style={{ width: '100%' }} format="DD/MM/YYYY"
              placeholder={selectedType === 'INDEFINITE' ? 'Vô thời hạn' : 'Tự động tính'}
              disabled={selectedType === 'INDEFINITE'}
            />
          </Form.Item>
        </Space>

        {/* Info box BLLĐ */}
        {selectedType === 'INDEFINITE' && (
          <Alert
            type="success"
            showIcon
            message="Hợp đồng không xác định thời hạn — phù hợp theo BLLĐ 2019 cho nhân sự dài hạn"
            style={{ marginBottom: 12, fontSize: 12 }}
          />
        )}
        {(selectedType === 'FIXED_24' || selectedType === 'FIXED_36') && (
          <Alert
            type="info"
            showIcon
            message="Lưu ý BLLĐ: Sau tối đa 2 lần ký HĐ có thời hạn, lần gia hạn tiếp theo phải là HĐ vô thời hạn."
            style={{ marginBottom: 12, fontSize: 12 }}
          />
        )}

        {/* Lương tháng + Mức đóng BHXH */}
        <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
          <Form.Item
            name="salaryMonthly" label="Lương tháng (VND)" style={{ flex: 1 }}
            rules={[{ required: true, message: 'Nhập mức lương' }]}
          >
            <InputNumber<number>
              style={{ width: '100%' }}
              min={0} step={500000}
              formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(v) => Number(v?.replace(/,/g, '') ?? 0)}
              placeholder="VD: 15,000,000"
            />
          </Form.Item>
          <Form.Item
            name="insuranceSalary" label="Mức đóng BHXH (VND)" style={{ flex: 1 }}
            tooltip="Lương dùng để tính BHXH/BHYT/BHTN. Bỏ trống → mặc định bằng lương tháng."
          >
            <InputNumber<number>
              style={{ width: '100%' }}
              min={0} step={500000}
              formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(v) => Number(v?.replace(/,/g, '') ?? 0)}
              placeholder="Bỏ trống = bằng lương tháng"
            />
          </Form.Item>
        </Space>

        {/* Phụ cấp */}
        <div style={{
          borderTop: `1px solid ${borderColor}`,
          paddingTop: 14, marginTop: 4, marginBottom: 4,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <GiftOutlined style={{ color: '#10B981' }} />
            <span style={{ fontWeight: 600, fontSize: 13, color: textPrimary }}>Phụ cấp kèm hợp đồng</span>
          </div>
          <Form.List name="allowances">
            {(fields, { add, remove }) => (
              <>
                {fields.map((field) => (
                  <div key={field.key} style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginBottom: 8 }}>
                    <Form.Item
                      {...field} name={[field.name, 'allowanceTypeId']}
                      style={{ flex: 2, marginBottom: 0 }}
                      rules={[{ required: true, message: 'Chọn loại' }]}
                    >
                      <Select
                        placeholder="Loại phụ cấp"
                        options={allowanceTypes
                          .filter(a => a.isActive)
                          .map(a => ({ value: a.id, label: a.name }))}
                        showSearch
                        filterOption={(input, opt) =>
                          (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())
                        }
                      />
                    </Form.Item>
                    <Form.Item
                      {...field} name={[field.name, 'amount']}
                      style={{ flex: 1, marginBottom: 0 }}
                      rules={[{ required: true, message: 'Nhập mức' }]}
                    >
                      <InputNumber<number>
                        style={{ width: '100%' }} min={0} placeholder="Số tiền"
                        formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        parser={v => Number(v?.replace(/,/g, '') ?? 0)}
                      />
                    </Form.Item>
                    <Button
                      type="text" danger size="small"
                      icon={<MinusCircleOutlined />}
                      onClick={() => remove(field.name)}
                      style={{ marginBottom: 0 }}
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

        {/* Ngày ký + Ghi chú */}
        <Form.Item name="signedAt" label="Ngày ký (tuỳ chọn)" style={{ marginTop: 14 }}>
          <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Chọn ngày ký" />
        </Form.Item>
        <Form.Item name="note" label="Ghi chú (tuỳ chọn)">
          <Input.TextArea rows={3} placeholder="Ghi chú thêm về hợp đồng..." />
        </Form.Item>
      </Form>
    </CenteredModal>
  );
}
