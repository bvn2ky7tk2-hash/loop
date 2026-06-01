import { useState, useMemo, useEffect } from 'react';
import {
  Table, Button, Form, Input, Select, DatePicker,
  InputNumber, Space, Popconfirm, Tooltip, App, theme,
  Typography, Alert, Descriptions,
} from 'antd';
import { CenteredModal } from '../../components/ui/CenteredModal';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined,
  FileTextOutlined, GiftOutlined, MinusCircleOutlined,
  SyncOutlined, HistoryOutlined, InfoCircleOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import {
  contractsApi,
  type Contract, type ContractType, type ContractStatus,
  type CreateContractDto, type RenewContractDto,
} from '../../api/contracts';
import { payrollApi } from '../../api/payroll';
import { employeesApi } from '../../api/employees';
import { positionsApi } from '../../api/hr-core';
import { useThemePalette } from '../../hooks/useThemePalette';
import { EmployeeInfoCell } from '../../components/ui/EmployeeInfoCell';
import { OrgUnitSelect } from '../../components/selects';
import { formatNumber } from '../../utils/format';

const { Text } = Typography;

// ── Constants ─────────────────────────────────────────────────────────────────

const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  PROBATION:  'Thử việc',
  FIXED_12:   'Xác định 12 tháng',
  FIXED_24:   'Xác định 24 tháng',
  FIXED_36:   'Xác định 36 tháng',
  INDEFINITE: 'Không xác định thời hạn',
  PART_TIME:  'Bán thời gian',
  SEASONAL:   'Thời vụ',
};

const CONTRACT_TYPE_HUE: Record<ContractType, string> = {
  PROBATION:  '#F59E0B',
  FIXED_12:   '#3B82F6',
  FIXED_24:   '#6366F1',
  FIXED_36:   '#8B5CF6',
  INDEFINITE: '#10B981',
  PART_TIME:  '#0EA5E9',
  SEASONAL:   '#94A3B8',
};

const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  DRAFT:      'Nháp',
  ACTIVE:     'Đang hiệu lực',
  EXPIRED:    'Đã hết hạn',
  TERMINATED: 'Đã chấm dứt',
};

const CONTRACT_STATUS_HUE: Record<ContractStatus, string> = {
  DRAFT:      '#3B82F6',
  ACTIVE:     '#16A34A',
  EXPIRED:    '#EA580C',
  TERMINATED: '#DC2626',
};

const CONTRACT_TYPES: ContractType[] = [
  'PROBATION', 'FIXED_12', 'FIXED_24', 'FIXED_36', 'INDEFINITE', 'PART_TIME', 'SEASONAL',
];
const CONTRACT_STATUSES: ContractStatus[] = ['DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED'];

// Loại HĐ có thể gia hạn → tự động tính endDate
const FIXED_TYPES: ContractType[] = ['PROBATION', 'FIXED_12', 'FIXED_24', 'FIXED_36'];

// Số ngày/tháng theo loại HĐ
const CONTRACT_TYPE_DURATION: Record<ContractType, { unit: 'day' | 'month' | null; value: number | null }> = {
  PROBATION:  { unit: 'day',   value: 60 },
  FIXED_12:   { unit: 'month', value: 12 },
  FIXED_24:   { unit: 'month', value: 24 },
  FIXED_36:   { unit: 'month', value: 36 },
  INDEFINITE: { unit: null,    value: null },
  PART_TIME:  { unit: null,    value: null },
  SEASONAL:   { unit: null,    value: null },
};

// Tính endDate từ startDate + loại HĐ
function calcEndDate(type: ContractType, start: dayjs.Dayjs, probationDays = 60): dayjs.Dayjs | null {
  const d = CONTRACT_TYPE_DURATION[type];
  if (!d.unit) return null;
  if (d.unit === 'day') return start.add(probationDays, 'day');
  return start.add(d.value!, 'month');
}

// Gợi ý loại HĐ kế tiếp khi gia hạn
function suggestRenewalType(current: ContractType, renewalCount: number): ContractType {
  if (renewalCount >= 2) return 'INDEFINITE'; // BLLĐ bắt buộc
  if (current === 'PROBATION') return 'FIXED_12';
  if (current === 'FIXED_12')  return 'FIXED_24';
  if (current === 'FIXED_24')  return 'INDEFINITE';
  return 'INDEFINITE';
}

// ── Sub-components ────────────────────────────────────────────────────────────

function TypeBadge({ type, isDark }: { type: ContractType; isDark: boolean }) {
  const hue = CONTRACT_TYPE_HUE[type] ?? '#94A3B8';
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, borderRadius: 5, padding: '2px 8px',
      color: hue,
      background: isDark ? `${hue}25` : `${hue}15`,
      border: `1px solid ${hue}40`,
      whiteSpace: 'nowrap',
    }}>
      {CONTRACT_TYPE_LABELS[type] ?? type}
    </span>
  );
}

function StatusBadge({ status, isDark }: { status: ContractStatus; isDark: boolean }) {
  const hue = CONTRACT_STATUS_HUE[status] ?? '#94A3B8';
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, borderRadius: 5, padding: '2px 8px',
      color: hue,
      background: isDark ? `${hue}25` : `${hue}15`,
      border: `1px solid ${hue}40`,
      whiteSpace: 'nowrap',
    }}>
      {CONTRACT_STATUS_LABELS[status] ?? status}
    </span>
  );
}

// ── Probation days selector ──────────────────────────────────────────────────

const PROBATION_OPTIONS = [
  { value: 6,   label: '6 ngày (lao động phổ thông)' },
  { value: 30,  label: '30 ngày (trung cấp nghề)' },
  { value: 60,  label: '60 ngày (đại học / cao đẳng)' },
  { value: 180, label: '180 ngày (quản lý / chuyên gia)' },
];

// ── Contract Form Drawer ──────────────────────────────────────────────────────

interface ContractDrawerProps {
  open: boolean;
  editing: Contract | null;
  onClose: () => void;
  isDark: boolean;
}

function ContractDrawer({ open, editing, onClose, isDark }: ContractDrawerProps) {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const [form] = Form.useForm();
  const [empSearch, setEmpSearch] = useState('');
  const [selectedEmpId, setSelectedEmpId] = useState<string | undefined>(undefined);
  const [selectedType, setSelectedType] = useState<ContractType>('INDEFINITE');
  const [probationDays, setProbationDays] = useState(60);
  const { bgContainer, textPrimary, textMuted, borderColor } = useThemePalette();

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
            <div>
              <div style={{ fontSize: 11, color: textMuted }}>Đơn vị hiện tại</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: textPrimary }}>
                {selectedEmpDetail.orgUnit?.name ?? '—'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: textMuted }}>Vị trí / Chức danh</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: textPrimary }}>
                {selectedEmpDetail.position?.jobTitle?.name ?? '—'}
              </div>
            </div>
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

        {/* Lương tháng */}
        <Form.Item
          name="salaryMonthly" label="Lương tháng (VND)"
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

// ── Renewal Modal ─────────────────────────────────────────────────────────────

interface RenewalModalProps {
  open: boolean;
  contract: Contract | null;
  onClose: () => void;
  isDark: boolean;
}

function RenewalModal({ open, contract, onClose, isDark }: RenewalModalProps) {
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

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ContractsPage() {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const { token } = theme.useToken();
  const { isDark, bgContainer, borderColor, textPrimary, textMuted, textSecondary, linkColor } = useThemePalette();

  const [page, setPage]                         = useState(1);
  const [pageSize, setPageSize]                 = useState(20);
  const [searchText, setSearchText]             = useState('');
  const [filterStatus, setFilterStatus]         = useState<ContractStatus | ''>('');
  const [filterType, setFilterType]             = useState<ContractType | ''>('');
  const [filterOrgUnit, setFilterOrgUnit]       = useState<string | undefined>(undefined);
  const [drawerOpen, setDrawerOpen]             = useState(false);
  const [editingContract, setEditingContract]   = useState<Contract | null>(null);
  const [renewTarget, setRenewTarget]           = useState<Contract | null>(null);
  const [renewModalOpen, setRenewModalOpen]     = useState(false);
  const [detailContract, setDetailContract]     = useState<Contract | null>(null);

  const { data: paginated, isLoading } = useQuery({
    queryKey: ['contracts', page, pageSize, filterOrgUnit],
    queryFn: () => contractsApi.list({ page, limit: pageSize, orgUnitId: filterOrgUnit }),
    placeholderData: (prev) => prev,
  });

  const filteredData = useMemo(() => {
    const all = paginated?.data ?? [];
    return all.filter((c) => {
      if (searchText) {
        const q = searchText.toLowerCase();
        if (!c.employee.fullName.toLowerCase().includes(q)) return false;
      }
      if (filterStatus && c.status !== filterStatus) return false;
      if (filterType   && c.type   !== filterType)   return false;
      return true;
    });
  }, [paginated?.data, searchText, filterStatus, filterType]);

  const deleteMutation = useMutation({
    mutationFn: contractsApi.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contracts'] });
      message.success('Đã xoá hợp đồng');
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      message.error(err.response?.data?.message ?? 'Xoá thất bại'),
  });

  function handleOpenCreate() {
    setEditingContract(null);
    setDrawerOpen(true);
  }

  function handleOpenEdit(contract: Contract) {
    setEditingContract(contract);
    setDrawerOpen(true);
  }

  function handleOpenRenew(contract: Contract) {
    setRenewTarget(contract);
    setRenewModalOpen(true);
  }

  const columns: ColumnsType<Contract> = [
    {
      title: 'Nhân viên',
      dataIndex: ['employee', 'fullName'],
      ellipsis: true,
      width: 220,
      render: (_: string, r: Contract) => (
        <div>
          <EmployeeInfoCell employee={r.employee} />
          {r.renewalCount > 0 && (
            <div style={{ fontSize: 11, color: linkColor }}>
              <HistoryOutlined style={{ marginRight: 2 }} />
              Gia hạn lần {r.renewalCount}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Loại hợp đồng',
      dataIndex: 'type',
      width: 160,
      render: (type: ContractType) => <TypeBadge type={type} isDark={isDark} />,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      width: 140,
      render: (status: ContractStatus) => <StatusBadge status={status} isDark={isDark} />,
    },
    {
      title: 'Thời hạn',
      width: 210,
      render: (_: unknown, r: Contract) => (
        <div>
          <Text style={{ fontSize: 12, color: textSecondary }}>
            {dayjs(r.startDate).format('DD/MM/YYYY')}
          </Text>
          <Text style={{ fontSize: 12, color: textMuted }}> → </Text>
          {r.endDate ? (
            <Text style={{ fontSize: 12, color: textSecondary }}>
              {dayjs(r.endDate).format('DD/MM/YYYY')}
            </Text>
          ) : (
            <Text style={{ fontSize: 12, color: '#10B981', fontWeight: 600 }}>Vô thời hạn</Text>
          )}
        </div>
      ),
    },
    {
      title: 'Lương tháng',
      dataIndex: 'salaryMonthly',
      width: 150,
      align: 'right',
      render: (v: number, r: Contract) => {
        const totalAllowance = (r.allowances ?? []).reduce((s, a) => s + Number(a.amount), 0);
        return (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: textPrimary, fontVariantNumeric: 'tabular-nums' }}>
              {formatNumber(v)}
            </div>
            {totalAllowance > 0 && (
              <div style={{ fontSize: 11, color: '#10B981', fontVariantNumeric: 'tabular-nums' }}>
                +{formatNumber(totalAllowance)} phụ cấp
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: '',
      key: 'actions',
      width: 108,
      render: (_: unknown, r: Contract) => (
        <Space size={2}>
          <Tooltip title="Gia hạn hợp đồng">
            <Button
              type="text" size="small"
              icon={<SyncOutlined style={{ color: '#6366F1' }} />}
              onClick={() => handleOpenRenew(r)}
              disabled={r.status === 'TERMINATED'}
            />
          </Tooltip>
          <Tooltip title="Chỉnh sửa">
            <Button
              type="text" size="small"
              icon={<EditOutlined />}
              onClick={() => handleOpenEdit(r)}
            />
          </Tooltip>
          <Popconfirm
            title="Xoá hợp đồng này?"
            description="Hành động này không thể hoàn tác."
            onConfirm={() => deleteMutation.mutate(r.id)}
            okText="Xoá" cancelText="Huỷ" okButtonProps={{ danger: true }}
          >
            <Tooltip title="Xoá">
              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '20px 24px', minHeight: '100vh', background: token.colorBgLayout }}>

      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: textPrimary, display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileTextOutlined style={{ color: token.colorPrimary }} />
            Quản lý hợp đồng lao động
          </div>
          <div style={{ marginTop: 4, fontSize: 13, color: textSecondary }}>
            {paginated?.total ?? 0} hợp đồng · Theo Bộ luật Lao động Việt Nam 2019
          </div>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreate}>
          Hợp đồng mới
        </Button>
      </div>

      {/* Filter Bar */}
      <div style={{
        display: 'flex', gap: 10, flexWrap: 'wrap',
        marginBottom: 16, padding: '12px 16px',
        background: bgContainer,
        border: `1px solid ${borderColor}`,
        borderRadius: 10,
      }}>
        <Input
          prefix={<SearchOutlined style={{ color: token.colorTextTertiary }} />}
          placeholder="Tìm theo tên nhân viên..."
          style={{ width: 240 }}
          value={searchText}
          onChange={(e) => { setSearchText(e.target.value); setPage(1); }}
          allowClear
        />
        <Select
          placeholder="Trạng thái"
          style={{ minWidth: 160 }}
          value={filterStatus || undefined}
          onChange={(v) => { setFilterStatus(v ?? ''); setPage(1); }}
          allowClear
          options={CONTRACT_STATUSES.map((s) => ({ value: s, label: CONTRACT_STATUS_LABELS[s] }))}
        />
        <Select
          placeholder="Loại hợp đồng"
          style={{ minWidth: 190 }}
          value={filterType || undefined}
          onChange={(v) => { setFilterType(v ?? ''); setPage(1); }}
          allowClear
          options={CONTRACT_TYPES.map((t) => ({ value: t, label: CONTRACT_TYPE_LABELS[t] }))}
        />
        <OrgUnitSelect
          placeholder="Phòng ban"
          style={{ minWidth: 180 }}
          value={filterOrgUnit}
          onChange={(v) => { setFilterOrgUnit(v); setPage(1); }}
          allowClear
        />
      </div>

      {/* Table */}
      <div style={{
        background: bgContainer,
        border: `1px solid ${borderColor}`,
        borderRadius: 10,
        overflow: 'hidden',
      }}>
        <Table<Contract>
          dataSource={filteredData}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          size="small"
          scroll={{ x: 900 }}
          locale={{ emptyText: 'Không có hợp đồng phù hợp' }}
          onRow={(record) => ({
            onClick: (e) => {
              const target = e.target as HTMLElement;
              if (target.closest('button') || target.closest('.ant-popconfirm') || target.closest('.ant-tooltip')) return;
              setDetailContract(record);
            },
            style: { cursor: 'pointer' },
          })}
          pagination={{
            current: page,
            pageSize,
            total: paginated?.total ?? 0,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
            showTotal: (total) => `${total} hợp đồng`,
            onChange: (p, ps) => { setPage(p); setPageSize(ps); },
          }}
        />
      </div>

      {/* ── Modal Chi tiết hợp đồng ────────────────────────────────────────── */}
      <CenteredModal
        open={!!detailContract}
        onClose={() => setDetailContract(null)}
        title="Chi tiết hợp đồng lao động"
        width={560}
        footer={
          <Space>
            <Button
              icon={<EditOutlined />}
              onClick={() => { if (detailContract) { setDetailContract(null); handleOpenEdit(detailContract); } }}
            >
              Chỉnh sửa
            </Button>
            <Button
              icon={<SyncOutlined />}
              disabled={detailContract?.status === 'TERMINATED'}
              onClick={() => { if (detailContract) { setDetailContract(null); handleOpenRenew(detailContract); } }}
            >
              Gia hạn
            </Button>
            <Button onClick={() => setDetailContract(null)}>Đóng</Button>
          </Space>
        }
      >
        {detailContract && (() => {
          const totalAllowance = (detailContract.allowances ?? []).reduce((s, a) => s + Number(a.amount), 0);
          return (
            <Descriptions bordered size="small" column={1} labelStyle={{ width: 160 }}>
              <Descriptions.Item label="Nhân viên">
                <EmployeeInfoCell employee={detailContract.employee} variant="descriptions" />
              </Descriptions.Item>
              <Descriptions.Item label="Loại hợp đồng">
                <TypeBadge type={detailContract.type} isDark={isDark} />
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                <StatusBadge status={detailContract.status} isDark={isDark} />
              </Descriptions.Item>
              <Descriptions.Item label="Ngày bắt đầu">
                <Text style={{ color: textMuted }}>{dayjs(detailContract.startDate).format('DD/MM/YYYY')}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Ngày kết thúc">
                {detailContract.endDate
                  ? <Text style={{ color: textMuted }}>{dayjs(detailContract.endDate).format('DD/MM/YYYY')}</Text>
                  : <Text style={{ color: '#10B981', fontWeight: 600 }}>Vô thời hạn</Text>}
              </Descriptions.Item>
              <Descriptions.Item label="Lương cơ bản">
                <Text style={{ color: textPrimary, fontWeight: 600 }}>{formatNumber(detailContract.salaryMonthly)} {detailContract.currency}</Text>
              </Descriptions.Item>
              {totalAllowance > 0 && (
                <Descriptions.Item label="Phụ cấp">
                  <div>
                    {(detailContract.allowances ?? []).map((a) => (
                      <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                        <Text style={{ color: textMuted }}>{a.allowanceType?.name ?? '—'}</Text>
                        <Text style={{ color: '#10B981', fontVariantNumeric: 'tabular-nums' }}>+{formatNumber(Number(a.amount))}</Text>
                      </div>
                    ))}
                  </div>
                </Descriptions.Item>
              )}
              <Descriptions.Item label="Tổng thu nhập">
                <Text style={{ color: linkColor, fontWeight: 700, fontSize: 15 }}>
                  {formatNumber(detailContract.salaryMonthly + totalAllowance)} {detailContract.currency}
                </Text>
              </Descriptions.Item>
              {detailContract.signedAt && (
                <Descriptions.Item label="Ngày ký">
                  <Text style={{ color: textMuted }}>{dayjs(detailContract.signedAt).format('DD/MM/YYYY')}</Text>
                </Descriptions.Item>
              )}
              {detailContract.renewalCount > 0 && (
                <Descriptions.Item label="Lần gia hạn">
                  <Text style={{ color: linkColor }}>Gia hạn lần {detailContract.renewalCount}</Text>
                </Descriptions.Item>
              )}
              {detailContract.note && (
                <Descriptions.Item label="Ghi chú">
                  <Text style={{ color: textMuted }}>{detailContract.note}</Text>
                </Descriptions.Item>
              )}
            </Descriptions>
          );
        })()}
      </CenteredModal>

      {/* Modals */}
      <ContractDrawer
        open={drawerOpen}
        editing={editingContract}
        onClose={() => { setDrawerOpen(false); setEditingContract(null); }}
        isDark={isDark}
      />
      <RenewalModal
        open={renewModalOpen}
        contract={renewTarget}
        onClose={() => { setRenewModalOpen(false); setRenewTarget(null); }}
        isDark={isDark}
      />
    </div>
  );
}
