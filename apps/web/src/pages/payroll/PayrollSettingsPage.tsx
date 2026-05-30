import { useState } from 'react';
import {
  Tabs, Table, Button, Form, InputNumber, DatePicker, Select, Input,
  App, Popconfirm, Tag, Space, Switch, Typography, Row, Col, Alert,
  Tooltip,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined, DeleteOutlined, InfoCircleOutlined,
  SettingOutlined, SafetyOutlined, BarsOutlined, CalculatorOutlined,
  GiftOutlined, EditOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import {
  payrollApi,
  type InsuranceConfig, type TaxBracket, type TaxDeductionConfig, type SalaryColumn,
  type AllowanceType,
} from '../../api/payroll';
import { useThemePalette } from '../../hooks/useThemePalette';
import { PageHeader } from '../../components/ui/PageHeader';
import { CenteredModal } from '../../components/ui/CenteredModal';
import { formatCurrency } from '../../utils/format';

const { Text } = Typography;

// ─── Insurance Config Tab ──────────────────────────────────────────────────────

function InsuranceTab() {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const { textPrimary, textMuted, borderColor, linkColor } = useThemePalette();

  const { data, isLoading } = useQuery({
    queryKey: ['insurance-configs'],
    queryFn: () => payrollApi.listInsuranceConfigs(1, 20),
  });

  const createMut = useMutation({
    mutationFn: (values: any) => payrollApi.createInsuranceConfig({
      effectiveFrom: values.effectiveFrom.format('YYYY-MM-DD'),
      bhxhEmployeeRate: values.bhxhEmployeeRate / 100,
      bhytEmployeeRate: values.bhytEmployeeRate / 100,
      bhtnEmployeeRate: values.bhtnEmployeeRate / 100,
      bhxhEmployerRate: values.bhxhEmployerRate / 100,
      bhytEmployerRate: values.bhytEmployerRate / 100,
      bhtnEmployerRate: values.bhtnEmployerRate / 100,
      tnldRate: values.tnldRate / 100,
      bhxhCeilingMultiple: values.bhxhCeilingMultiple,
      wageBase: values.wageBase,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['insurance-configs'] });
      message.success('Đã thêm cấu hình bảo hiểm');
      setOpen(false); form.resetFields();
    },
    onError: (e: Error) => message.error(e.message ?? 'Lỗi'),
  });

  const deleteMut = useMutation({
    mutationFn: payrollApi.deleteInsuranceConfig,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['insurance-configs'] }); message.success('Đã xoá'); },
    onError: (e: Error) => message.error(e.message ?? 'Lỗi — config đã dùng không thể xoá'),
  });

  const cols: ColumnsType<InsuranceConfig> = [
    {
      title: 'Hiệu lực từ',
      dataIndex: 'effectiveFrom',
      render: (v: string) => <Text style={{ color: textPrimary, fontWeight: 600 }}>{dayjs(v).format('DD/MM/YYYY')}</Text>,
    },
    {
      title: 'NLĐ (BHXH/BHYT/BHTN)',
      render: (_, r) => (
        <Text style={{ color: textMuted, fontFamily: 'monospace' }}>
          {(Number(r.bhxhEmployeeRate) * 100).toFixed(1)}% / {(Number(r.bhytEmployeeRate) * 100).toFixed(1)}% / {(Number(r.bhtnEmployeeRate) * 100).toFixed(1)}%
        </Text>
      ),
    },
    {
      title: 'NSDLĐ (BHXH/BHYT/BHTN/TNLĐ)',
      render: (_, r) => (
        <Text style={{ color: textMuted, fontFamily: 'monospace' }}>
          {(Number(r.bhxhEmployerRate) * 100).toFixed(1)}% / {(Number(r.bhytEmployerRate) * 100).toFixed(1)}% / {(Number(r.bhtnEmployerRate) * 100).toFixed(1)}% / {(Number(r.tnldRate) * 100).toFixed(2)}%
        </Text>
      ),
    },
    {
      title: 'Lương cơ sở',
      dataIndex: 'wageBase',
      width: 130,
      align: 'right',
      render: (v: number) => <Text style={{ color: linkColor }}>{formatCurrency(Number(v))}</Text>,
    },
    {
      title: 'Trần BH',
      dataIndex: 'bhxhCeiling',
      width: 140,
      align: 'right',
      render: (v: number, r) => (
        <Tooltip title={`${r.bhxhCeilingMultiple}× lương cơ sở`}>
          <Text style={{ color: textMuted }}>{formatCurrency(Number(v ?? Number(r.wageBase) * r.bhxhCeilingMultiple))}</Text>
        </Tooltip>
      ),
    },
    {
      title: '',
      width: 50,
      render: (_, r) => (
        <Popconfirm title="Xoá config này?" onConfirm={() => deleteMut.mutate(r.id)} okText="Xoá" cancelText="Huỷ">
          <Button size="small" icon={<DeleteOutlined />} danger />
        </Popconfirm>
      ),
    },
  ];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <Alert
          type="info" showIcon
          message="Config mới chỉ áp dụng cho kỳ lương có endDate sau ngày hiệu lực. Config đã dùng trong payroll không thể xoá."
          style={{ flex: 1, marginRight: 12 }}
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>Thêm config</Button>
      </div>
      <Table loading={isLoading} dataSource={data?.data ?? []} rowKey="id" columns={cols} size="small" pagination={false} />

      <CenteredModal open={open} onClose={() => { setOpen(false); form.resetFields(); }}
        title="Thêm cấu hình bảo hiểm" width={560}
        extra={<Button type="primary" loading={createMut.isPending} onClick={() => form.validateFields().then(v => createMut.mutate(v))}>Lưu</Button>}>
        <Form form={form} layout="vertical"
          initialValues={{ bhxhEmployeeRate: 8, bhytEmployeeRate: 1.5, bhtnEmployeeRate: 1, bhxhEmployerRate: 17.5, bhytEmployerRate: 3, bhtnEmployerRate: 1, tnldRate: 0.5, bhxhCeilingMultiple: 20, wageBase: 2340000 }}>
          <Form.Item name="effectiveFrom" label="Hiệu lực từ ngày" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Text style={{ display: 'block', fontWeight: 600, marginBottom: 8, color: textMuted }}>Người lao động (%)</Text>
              <Form.Item name="bhxhEmployeeRate" label="BHXH NLĐ"><InputNumber style={{ width: '100%' }} min={0} max={30} step={0.1} addonAfter="%" /></Form.Item>
              <Form.Item name="bhytEmployeeRate" label="BHYT NLĐ"><InputNumber style={{ width: '100%' }} min={0} max={10} step={0.1} addonAfter="%" /></Form.Item>
              <Form.Item name="bhtnEmployeeRate" label="BHTN NLĐ"><InputNumber style={{ width: '100%' }} min={0} max={5} step={0.1} addonAfter="%" /></Form.Item>
            </Col>
            <Col span={12}>
              <Text style={{ display: 'block', fontWeight: 600, marginBottom: 8, color: textMuted }}>Người sử dụng lao động (%)</Text>
              <Form.Item name="bhxhEmployerRate" label="BHXH NSDLĐ"><InputNumber style={{ width: '100%' }} min={0} max={30} step={0.5} addonAfter="%" /></Form.Item>
              <Form.Item name="bhytEmployerRate" label="BHYT NSDLĐ"><InputNumber style={{ width: '100%' }} min={0} max={10} step={0.5} addonAfter="%" /></Form.Item>
              <Form.Item name="bhtnEmployerRate" label="BHTN NSDLĐ"><InputNumber style={{ width: '100%' }} min={0} max={5} step={0.5} addonAfter="%" /></Form.Item>
              <Form.Item name="tnldRate" label="TNLĐ & BNN NSDLĐ"><InputNumber style={{ width: '100%' }} min={0} max={2} step={0.1} addonAfter="%" /></Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="wageBase" label="Lương cơ sở (đ)">
                <InputNumber style={{ width: '100%' }} min={0} step={100000}
                  formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={v => Number(v?.replace(/,/g, '') ?? 0)} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="bhxhCeilingMultiple" label="Số nhân trần BH">
                <InputNumber style={{ width: '100%' }} min={1} max={30} addonAfter="× lương cơ sở" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </CenteredModal>
    </>
  );
}

// ─── Tax Bracket Tab ──────────────────────────────────────────────────────────

function TaxBracketTab() {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [deductOpen, setDeductOpen] = useState(false);
  const [form] = Form.useForm();
  const [deductForm] = Form.useForm();
  const { textPrimary, textMuted, linkColor, bgCard, borderColor } = useThemePalette();

  const { data: brackets, isLoading } = useQuery({
    queryKey: ['tax-brackets'],
    queryFn: () => payrollApi.listTaxBrackets(1, 20),
  });
  const { data: deductions } = useQuery({
    queryKey: ['tax-deductions'],
    queryFn: () => payrollApi.listTaxDeductions(1, 20),
  });

  const createBracketMut = useMutation({
    mutationFn: (values: any) => payrollApi.createTaxBracket({
      name: values.name,
      effectiveFrom: values.effectiveFrom.format('YYYY-MM-DD'),
      brackets: values.brackets.map((b: any, i: number, arr: any[]) => ({
        from: b.from,
        to: i < arr.length - 1 ? b.to : null,
        rate: b.rate / 100,
      })),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tax-brackets'] });
      message.success('Đã thêm biểu thuế');
      setOpen(false); form.resetFields();
    },
    onError: (e: Error) => message.error(e.message ?? 'Lỗi'),
  });

  const deleteBracketMut = useMutation({
    mutationFn: payrollApi.deleteTaxBracket,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tax-brackets'] }); message.success('Đã xoá'); },
    onError: (e: Error) => message.error(e.message ?? 'Không thể xoá biểu thuế đã dùng'),
  });

  const createDeductMut = useMutation({
    mutationFn: (values: any) => payrollApi.createTaxDeduction({
      effectiveFrom: values.effectiveFrom.format('YYYY-MM-DD'),
      selfDeduction: values.selfDeduction,
      dependentDeduction: values.dependentDeduction,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tax-deductions'] });
      message.success('Đã cập nhật mức giảm trừ');
      setDeductOpen(false); deductForm.resetFields();
    },
    onError: (e: Error) => message.error(e.message ?? 'Lỗi'),
  });

  const bracketCols: ColumnsType<TaxBracket> = [
    {
      title: 'Tên biểu thuế',
      dataIndex: 'name',
      render: (v: string) => <Text style={{ color: textPrimary, fontWeight: 600 }}>{v}</Text>,
    },
    {
      title: 'Hiệu lực từ',
      dataIndex: 'effectiveFrom',
      width: 120,
      render: (v: string) => <Text style={{ color: textMuted }}>{dayjs(v).format('DD/MM/YYYY')}</Text>,
    },
    {
      title: 'Bậc',
      render: (_, r) => (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {(r.brackets as any[]).map((b, i) => (
            <Tag key={i} style={undefined}>
              {b.to ? `≤${(b.to / 1e6).toFixed(0)}M` : 'Còn lại'}: {(b.rate * 100).toFixed(0)}%
            </Tag>
          ))}
        </div>
      ),
    },
    {
      title: '',
      width: 50,
      render: (_, r) => (
        <Popconfirm title="Xoá biểu thuế?" onConfirm={() => deleteBracketMut.mutate(r.id)} okText="Xoá" cancelText="Huỷ">
          <Button size="small" icon={<DeleteOutlined />} danger />
        </Popconfirm>
      ),
    },
  ];

  const deductCols: ColumnsType<TaxDeductionConfig> = [
    { title: 'Hiệu lực từ', dataIndex: 'effectiveFrom', render: (v: string) => <Text style={{ color: textPrimary }}>{dayjs(v).format('DD/MM/YYYY')}</Text> },
    { title: 'Giảm trừ bản thân', dataIndex: 'selfDeduction', render: (v: number) => <Text style={{ color: linkColor }}>{formatCurrency(Number(v))}</Text> },
    { title: 'Giảm trừ người phụ thuộc', dataIndex: 'dependentDeduction', render: (v: number) => <Text style={{ color: linkColor }}>{formatCurrency(Number(v))}</Text> },
  ];

  return (
    <>
      {/* Biểu thuế */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Text style={{ color: textPrimary, fontWeight: 600, fontSize: 14 }}>Biểu thuế TNCN lũy tiến</Text>
        <Button type="primary" icon={<PlusOutlined />} size="small" onClick={() => setOpen(true)}>Thêm biểu thuế</Button>
      </div>
      <Table loading={isLoading} dataSource={brackets?.data ?? []} rowKey="id" columns={bracketCols} size="small" pagination={false} style={{ marginBottom: 24 }} />

      {/* Giảm trừ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Text style={{ color: textPrimary, fontWeight: 600, fontSize: 14 }}>Mức giảm trừ gia cảnh</Text>
        <Button icon={<PlusOutlined />} size="small" onClick={() => setDeductOpen(true)}>Cập nhật mức</Button>
      </div>
      <Table dataSource={deductions?.data ?? []} rowKey="id" columns={deductCols} size="small" pagination={false} />

      {/* Modal thêm biểu thuế */}
      <CenteredModal open={open} onClose={() => { setOpen(false); form.resetFields(); }}
        title="Thêm biểu thuế TNCN" width={580}
        extra={<Button type="primary" loading={createBracketMut.isPending} onClick={() => form.validateFields().then(v => createBracketMut.mutate(v))}>Lưu</Button>}>
        <Form form={form} layout="vertical"
          initialValues={{
            name: 'Luật 109/2025/QH15 (5 bậc)',
            brackets: [
              { from: 0, to: 60_000_000, rate: 5 },
              { from: 60_000_000, to: 120_000_000, rate: 10 },
              { from: 120_000_000, to: 216_000_000, rate: 15 },
              { from: 216_000_000, to: 384_000_000, rate: 20 },
              { from: 384_000_000, to: null, rate: 25 },
            ],
          }}>
          <Form.Item name="name" label="Tên biểu thuế" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="effectiveFrom" label="Hiệu lực từ ngày" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <Alert type="info" showIcon message="Bậc cuối cùng tự động có 'to = null' (không giới hạn trên)" style={{ marginBottom: 12 }} />
          <Form.List name="brackets">
            {(fields, { add, remove }) => (
              <>
                {fields.map((field, index) => (
                  <div key={field.key} style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginBottom: 8 }}>
                    <Form.Item {...field} name={[field.name, 'from']} label={index === 0 ? 'Từ (đ)' : ''} style={{ flex: 1, marginBottom: 0 }}>
                      <InputNumber style={{ width: '100%' }} min={0} formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={v => Number(v?.replace(/,/g, '') ?? 0)} />
                    </Form.Item>
                    <Form.Item {...field} name={[field.name, 'to']} label={index === 0 ? 'Đến (đ)' : ''} style={{ flex: 1, marginBottom: 0 }}>
                      <InputNumber style={{ width: '100%' }} min={0} placeholder={index === fields.length - 1 ? 'Không giới hạn' : ''} formatter={v => v ? `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''} parser={v => v ? Number(v.replace(/,/g, '')) : null as any} />
                    </Form.Item>
                    <Form.Item {...field} name={[field.name, 'rate']} label={index === 0 ? 'Thuế (%)' : ''} style={{ width: 90, marginBottom: 0 }}>
                      <InputNumber min={0} max={100} addonAfter="%" />
                    </Form.Item>
                    <Button size="small" icon={<DeleteOutlined />} danger onClick={() => remove(field.name)} style={{ marginBottom: 0 }} />
                  </div>
                ))}
                <Button type="dashed" icon={<PlusOutlined />} onClick={() => add({ from: 0, to: 0, rate: 0 })} block>
                  Thêm bậc thuế
                </Button>
              </>
            )}
          </Form.List>
        </Form>
      </CenteredModal>

      {/* Modal cập nhật giảm trừ */}
      <CenteredModal open={deductOpen} onClose={() => { setDeductOpen(false); deductForm.resetFields(); }}
        title="Cập nhật mức giảm trừ gia cảnh" width={420}
        extra={<Button type="primary" loading={createDeductMut.isPending} onClick={() => deductForm.validateFields().then(v => createDeductMut.mutate(v))}>Lưu</Button>}>
        <Form form={deductForm} layout="vertical" initialValues={{ selfDeduction: 11_000_000, dependentDeduction: 4_400_000 }}>
          <Form.Item name="effectiveFrom" label="Hiệu lực từ ngày" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="selfDeduction" label="Giảm trừ bản thân (đ/tháng)">
            <InputNumber style={{ width: '100%' }} min={0} step={1_000_000}
              formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={v => Number(v?.replace(/,/g, '') ?? 0)} />
          </Form.Item>
          <Form.Item name="dependentDeduction" label="Giảm trừ NPT (đ/người/tháng)">
            <InputNumber style={{ width: '100%' }} min={0} step={1_000_000}
              formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={v => Number(v?.replace(/,/g, '') ?? 0)} />
          </Form.Item>
        </Form>
      </CenteredModal>
    </>
  );
}

// ─── Salary Column Tab ─────────────────────────────────────────────────────────

const SOURCE_LABEL: Record<string, string> = {
  CONTRACT_SALARY: 'Lương HĐLĐ',
  ALLOWANCE_TYPE:  'Loại phụ cấp',
  FIXED_VALUE:     'Giá trị cố định',
  FORMULA:         'Công thức',
};

function SalaryColumnsTab() {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editCol, setEditCol] = useState<SalaryColumn | null>(null);
  const [form] = Form.useForm();
  const { textPrimary, textMuted, linkColor, borderColor } = useThemePalette();

  const { data, isLoading } = useQuery({
    queryKey: ['salary-columns'],
    queryFn: payrollApi.listSalaryColumns,
  });
  const { data: allowanceTypes } = useQuery({
    queryKey: ['allowance-types'],
    queryFn: payrollApi.listAllowanceTypes,
  });

  const createMut = useMutation({
    mutationFn: (values: any) => editCol
      ? payrollApi.updateSalaryColumn(editCol.id, values)
      : payrollApi.createSalaryColumn(values),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['salary-columns'] });
      message.success(editCol ? 'Đã cập nhật cột lương' : 'Đã tạo cột lương');
      setOpen(false); setEditCol(null); form.resetFields();
    },
    onError: (e: Error) => message.error(e.message ?? 'Lỗi'),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      payrollApi.updateSalaryColumn(id, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['salary-columns'] }),
  });

  const openEdit = (col: SalaryColumn) => {
    setEditCol(col);
    form.setFieldsValue({
      ...col,
      fixedValue: col.fixedValue ?? undefined,
    });
    setOpen(true);
  };

  const openNew = () => {
    setEditCol(null);
    form.resetFields();
    setOpen(true);
  };

  const sourceValue = Form.useWatch('source', form);

  const cols: ColumnsType<SalaryColumn> = [
    {
      title: 'Thứ tự',
      dataIndex: 'sortOrder',
      width: 60,
      align: 'center',
      render: (v: number) => <Text style={{ color: textMuted }}>{v}</Text>,
    },
    {
      title: 'Tên cột',
      dataIndex: 'name',
      render: (v: string, r) => (
        <div>
          <Text style={{ color: textPrimary, fontWeight: 600 }}>{v}</Text>
          <Tag style={{ marginLeft: 6 }} color={r.type === 'EARNING' ? 'green' : 'red'}>
            {r.type === 'EARNING' ? 'Thu nhập' : 'Khấu trừ'}
          </Tag>
        </div>
      ),
    },
    {
      title: 'Nguồn',
      dataIndex: 'source',
      width: 150,
      render: (v: string, r) => (
        <div>
          <Text style={{ color: textMuted }}>{SOURCE_LABEL[v] ?? v}</Text>
          {r.source === 'FORMULA' && r.formula && (
            <div style={{ fontFamily: 'monospace', fontSize: 11, color: linkColor, marginTop: 2 }}>{r.formula}</div>
          )}
          {r.source === 'ALLOWANCE_TYPE' && r.allowanceType && (
            <div style={{ fontSize: 11, color: textMuted }}>{r.allowanceType.name}</div>
          )}
          {r.source === 'FIXED_VALUE' && r.fixedValue != null && (
            <div style={{ fontSize: 11, color: textMuted }}>{formatCurrency(Number(r.fixedValue))}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Miễn BHXH',
      dataIndex: 'isBhxhExempt',
      width: 90,
      align: 'center',
      render: (v: boolean) => v
        ? <Tag color="green" style={{ fontSize: 11 }}>Có</Tag>
        : <Tag color="default" style={{ fontSize: 11 }}>Không</Tag>,
    },
    {
      title: 'Miễn TNCN',
      dataIndex: 'isPitExempt',
      width: 90,
      align: 'center',
      render: (v: boolean) => v
        ? <Tag color="green" style={{ fontSize: 11 }}>Có</Tag>
        : <Tag color="default" style={{ fontSize: 11 }}>Không</Tag>,
    },
    {
      title: 'Hoạt động',
      dataIndex: 'isActive',
      width: 90,
      align: 'center',
      render: (v: boolean, r) => (
        <Switch checked={v} size="small"
          onChange={checked => toggleMut.mutate({ id: r.id, isActive: checked })} />
      ),
    },
    {
      title: '',
      width: 60,
      render: (_, r) => (
        <Button size="small" onClick={() => openEdit(r)}>Sửa</Button>
      ),
    },
  ];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <Alert type="info" showIcon style={{ flex: 1, marginRight: 12 }}
          message="Cột lương xác định cách tính gross salary. Thứ tự ưu tiên: CONTRACT_SALARY → ALLOWANCE_TYPE → FORMULA." />
        <Button type="primary" icon={<PlusOutlined />} onClick={openNew}>Thêm cột</Button>
      </div>
      <Table loading={isLoading} dataSource={data ?? []} rowKey="id" columns={cols} size="small" pagination={false} />

      <CenteredModal open={open} onClose={() => { setOpen(false); setEditCol(null); form.resetFields(); }}
        title={editCol ? `Sửa: ${editCol.name}` : 'Thêm cột lương'} width={520}
        extra={<Button type="primary" loading={createMut.isPending} onClick={() => form.validateFields().then(v => createMut.mutate(v))}>Lưu</Button>}>
        <Form form={form} layout="vertical" initialValues={{ type: 'EARNING', source: 'CONTRACT_SALARY', sortOrder: 0, isActive: true, isBhxhExempt: false, isPitExempt: false }}>
          <Row gutter={12}>
            <Col span={16}>
              <Form.Item name="name" label="Tên cột" rules={[{ required: true }]}>
                <Input placeholder="Lương cơ bản" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="sortOrder" label="Thứ tự">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="type" label="Loại">
                <Select options={[{ value: 'EARNING', label: 'Thu nhập' }, { value: 'DEDUCTION', label: 'Khấu trừ' }]} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="source" label="Nguồn">
                <Select options={[
                  { value: 'CONTRACT_SALARY', label: 'Lương HĐLĐ' },
                  { value: 'ALLOWANCE_TYPE',  label: 'Loại phụ cấp' },
                  { value: 'FIXED_VALUE',     label: 'Giá trị cố định' },
                  { value: 'FORMULA',         label: 'Công thức' },
                ]} />
              </Form.Item>
            </Col>
          </Row>

          {sourceValue === 'ALLOWANCE_TYPE' && (
            <Form.Item name="allowanceTypeId" label="Loại phụ cấp" rules={[{ required: true }]}>
              <Select
                options={(allowanceTypes ?? []).map(a => ({ value: a.id, label: `${a.name} (${formatCurrency(Number(a.defaultAmount))})` }))}
                placeholder="Chọn loại phụ cấp"
              />
            </Form.Item>
          )}
          {sourceValue === 'FIXED_VALUE' && (
            <Form.Item name="fixedValue" label="Giá trị cố định (đ)" rules={[{ required: true }]}>
              <InputNumber style={{ width: '100%' }} min={0} step={100000}
                formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={v => Number(v?.replace(/,/g, '') ?? 0)} />
            </Form.Item>
          )}
          {sourceValue === 'FORMULA' && (
            <Form.Item name="formula" label="Công thức" rules={[{ required: true }]}
              extra="Biến: {contractSalary} {workDays} {standardDays} {otWeekday} {otWeekend} {otHoliday} {overtimeHours}">
              <Input.TextArea rows={2} placeholder="{contractSalary}/{standardDays}/8*1.5*{otWeekday}" style={{ fontFamily: 'monospace' }} />
            </Form.Item>
          )}

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="isBhxhExempt" label="Miễn đóng BHXH" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="isPitExempt" label="Miễn thuế TNCN" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="isActive" label="Kích hoạt" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </CenteredModal>
    </>
  );
}

// ─── Allowance Types Tab ───────────────────────────────────────────────────────

function AllowanceTab() {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AllowanceType | null>(null);
  const [form] = Form.useForm();
  const { textPrimary, textMuted, linkColor, borderColor, isDark } = useThemePalette();

  const isPitExemptWatch = Form.useWatch('isPitExempt', form);

  const { data: allowanceTypes = [], isLoading } = useQuery({
    queryKey: ['allowance-types'],
    queryFn: payrollApi.listAllowanceTypes,
  });

  const saveMut = useMutation({
    mutationFn: (values: any) => {
      const payload = {
        name:             values.name,
        defaultAmount:    values.defaultAmount,
        calculationMode:  values.calculationMode ?? 'FIXED',
        isBhxhExempt:     values.isBhxhExempt ?? true,
        isPitExempt:      values.isPitExempt ?? false,
        pitExemptCeiling: values.isPitExempt ? (values.pitExemptCeiling ?? null) : null,
        isActive:         values.isActive ?? true,
      };
      return editing
        ? payrollApi.updateAllowanceType(editing.id, payload)
        : payrollApi.createAllowanceType(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['allowance-types'] });
      message.success(editing ? 'Đã cập nhật loại phụ cấp' : 'Đã thêm loại phụ cấp');
      setOpen(false); setEditing(null); form.resetFields();
    },
    onError: (e: Error) => message.error(e.message ?? 'Lỗi'),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      payrollApi.updateAllowanceType(id, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['allowance-types'] }),
  });

  function openEdit(at: AllowanceType) {
    setEditing(at);
    form.setFieldsValue({
      name:             at.name,
      defaultAmount:    Number(at.defaultAmount),
      calculationMode:  at.calculationMode ?? 'FIXED',
      isBhxhExempt:     at.isBhxhExempt,
      isPitExempt:      at.isPitExempt,
      pitExemptCeiling: at.pitExemptCeiling ? Number(at.pitExemptCeiling) : undefined,
      isActive:         at.isActive,
    });
    setOpen(true);
  }

  function openNew() {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ isBhxhExempt: true, isPitExempt: false, isActive: true, calculationMode: 'FIXED' });
    setOpen(true);
  }

  const cols: ColumnsType<AllowanceType> = [
    {
      title: 'Tên loại phụ cấp',
      dataIndex: 'name',
      render: (v: string) => <Text style={{ color: textPrimary, fontWeight: 600 }}>{v}</Text>,
    },
    {
      title: 'Mức mặc định',
      dataIndex: 'defaultAmount',
      width: 160,
      align: 'right',
      render: (v: number, r: AllowanceType) => (
        <div style={{ textAlign: 'right' }}>
          <Text style={{ color: linkColor }}>{formatCurrency(Number(v))}</Text>
          <div style={{ fontSize: 10, color: textMuted }}>
            {r.calculationMode === 'PER_WORK_DAY' ? '/ ngày công' : '/ tháng cố định'}
          </div>
        </div>
      ),
    },
    {
      title: 'Miễn BHXH',
      dataIndex: 'isBhxhExempt',
      width: 100,
      align: 'center',
      render: (v: boolean) => v
        ? <Tag color={isDark ? undefined : 'green'} style={isDark ? { background: 'rgba(52,211,153,0.15)', color: '#6EE7B7', borderColor: 'rgba(52,211,153,0.3)' } : {}}>Có</Tag>
        : <Tag color={isDark ? undefined : 'default'} style={isDark ? { background: 'rgba(148,163,184,0.15)', color: '#94A3B8', borderColor: 'rgba(148,163,184,0.3)' } : {}}>Không</Tag>,
    },
    {
      title: 'Miễn TNCN',
      dataIndex: 'isPitExempt',
      width: 100,
      align: 'center',
      render: (v: boolean, r) => v
        ? <Tooltip title={r.pitExemptCeiling ? `Trần miễn ${formatCurrency(Number(r.pitExemptCeiling))}` : 'Miễn hoàn toàn'}>
            <Tag color={isDark ? undefined : 'blue'} style={isDark ? { background: 'rgba(96,165,250,0.15)', color: '#93C5FD', borderColor: 'rgba(96,165,250,0.3)' } : {}}>Có</Tag>
          </Tooltip>
        : <Tag color={isDark ? undefined : 'default'} style={isDark ? { background: 'rgba(148,163,184,0.15)', color: '#94A3B8', borderColor: 'rgba(148,163,184,0.3)' } : {}}>Không</Tag>,
    },
    {
      title: 'Hoạt động',
      dataIndex: 'isActive',
      width: 90,
      align: 'center',
      render: (v: boolean, r) => (
        <Switch checked={v} size="small"
          onChange={checked => toggleMut.mutate({ id: r.id, isActive: checked })} />
      ),
    },
    {
      title: '',
      width: 60,
      render: (_, r) => (
        <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
      ),
    },
  ];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <Alert type="info" showIcon style={{ flex: 1, marginRight: 12 }}
          message="Loại phụ cấp dùng làm cơ sở tính lương (Cột lương) và gắn với hợp đồng lao động. Mức mặc định có thể override tại từng hợp đồng." />
        <Button type="primary" icon={<PlusOutlined />} onClick={openNew}>Thêm loại</Button>
      </div>
      <Table loading={isLoading} dataSource={allowanceTypes} rowKey="id" columns={cols} size="small" pagination={false} />

      <CenteredModal
        open={open}
        onClose={() => { setOpen(false); setEditing(null); form.resetFields(); }}
        title={editing ? `Sửa: ${editing.name}` : 'Thêm loại phụ cấp'}
        width={480}
        extra={
          <Button type="primary" loading={saveMut.isPending}
            onClick={() => form.validateFields().then(v => saveMut.mutate(v))}>
            Lưu
          </Button>
        }
      >
        <Form form={form} layout="vertical"
          initialValues={{ isBhxhExempt: true, isPitExempt: false, isActive: true }}>
          <Form.Item name="name" label="Tên loại phụ cấp" rules={[{ required: true, message: 'Nhập tên' }]}>
            <Input placeholder="VD: Phụ cấp đi lại, Phụ cấp ăn ca, Phụ cấp điện thoại..." />
          </Form.Item>
          <Row gutter={12}>
            <Col span={14}>
              <Form.Item name="defaultAmount" label="Mức phụ cấp" rules={[{ required: true }]}>
                <InputNumber
                  style={{ width: '100%' }} min={0} step={100_000}
                  formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={v => Number(v?.replace(/,/g, '') ?? 0)}
                  placeholder="500,000"
                />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item name="calculationMode" label="Cách tính" rules={[{ required: true }]}>
                <Select
                  options={[
                    { value: 'FIXED',        label: 'Cố định / tháng' },
                    { value: 'PER_WORK_DAY', label: 'Theo ngày công' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>
          <Alert
            type="info" showIcon style={{ marginBottom: 12, fontSize: 11 }}
            message={
              <span>
                <b>Cố định:</b> Trả đủ bất kể ngày công.{' '}
                <b>Theo ngày công:</b> = mức × ngày công thực tế ÷ ngày chuẩn tháng.
              </span>
            }
          />
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="isBhxhExempt" label="Miễn đóng BHXH" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="isPitExempt" label="Miễn thuế TNCN" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>
          {isPitExemptWatch && (
            <Form.Item name="pitExemptCeiling" label="Trần miễn TNCN (đ/tháng, để trống = miễn hoàn toàn)"
              extra="VD: Phụ cấp đi lại được miễn tối đa 1,000,000đ/tháng">
              <InputNumber
                style={{ width: '100%' }} min={0} step={100_000}
                formatter={v => v ? `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
                parser={v => v ? Number(v.replace(/,/g, '')) : null as any}
                placeholder="Không giới hạn"
              />
            </Form.Item>
          )}
          <Form.Item name="isActive" label="Kích hoạt" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </CenteredModal>
    </>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────

export default function PayrollSettingsPage() {
  const { textMuted } = useThemePalette();

  const tabs = [
    {
      key: 'insurance',
      label: <span><SafetyOutlined /> Bảo hiểm XH</span>,
      children: <InsuranceTab />,
    },
    {
      key: 'tax',
      label: <span><CalculatorOutlined /> Thuế TNCN</span>,
      children: <TaxBracketTab />,
    },
    {
      key: 'allowances',
      label: <span><GiftOutlined /> Phụ cấp</span>,
      children: <AllowanceTab />,
    },
    {
      key: 'columns',
      label: <span><BarsOutlined /> Cột lương</span>,
      children: <SalaryColumnsTab />,
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Cấu hình Payroll"
        icon={<SettingOutlined />}
        iconColor="#0D9488"
      />
      <Tabs items={tabs} defaultActiveKey="insurance" />
    </div>
  );
}
