import { useState } from 'react';
import {
  Table, Button, Form, InputNumber, Select, Input, App,
  Tag, Switch, Typography, Row, Col, Alert,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { payrollApi, type SalaryColumn } from '../../../../api/payroll';
import { useThemePalette } from '../../../../hooks/useThemePalette';
import { CenteredModal } from '../../../../components/ui/CenteredModal';
import { formatCurrency } from '../../../../utils/format';
import { SOURCE_LABEL } from '../constants';

const { Text } = Typography;

export function SalaryColumnsTab() {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editCol, setEditCol] = useState<SalaryColumn | null>(null);
  const [form] = Form.useForm();
  const { textPrimary, textMuted, linkColor } = useThemePalette();

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
        extra={<Button type="primary" loading={createMut.isPending} disabled={createMut.isPending} onClick={() => form.validateFields().then(v => createMut.mutate(v))}>Lưu</Button>}>
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
              <InputNumber<number> style={{ width: '100%' }} min={0} step={100000}
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
