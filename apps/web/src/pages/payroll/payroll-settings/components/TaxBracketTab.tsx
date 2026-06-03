import { useState } from 'react';
import {
  Table, Button, Form, InputNumber, DatePicker, Input, App, Popconfirm,
  Tag, Space, Typography, Alert,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { payrollApi, type TaxBracket, type TaxDeductionConfig } from '../../../../api/payroll';
import { useThemePalette } from '../../../../hooks/useThemePalette';
import { CenteredModal } from '../../../../components/ui/CenteredModal';
import { formatCurrency } from '../../../../utils/format';

const { Text } = Typography;

export function TaxBracketTab() {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editBracket, setEditBracket] = useState<TaxBracket | null>(null);
  const [deductOpen, setDeductOpen] = useState(false);
  const [form] = Form.useForm();
  const [deductForm] = Form.useForm();
  const { textPrimary, textMuted, linkColor } = useThemePalette();

  const { data: brackets, isLoading } = useQuery({
    queryKey: ['tax-brackets'],
    queryFn: () => payrollApi.listTaxBrackets(1, 20),
  });
  const { data: deductions } = useQuery({
    queryKey: ['tax-deductions'],
    queryFn: () => payrollApi.listTaxDeductions(1, 20),
  });

  const toBracketPayload = (values: any) => ({
    name: values.name,
    effectiveFrom: values.effectiveFrom.format('YYYY-MM-DD'),
    brackets: values.brackets.map((b: any, i: number, arr: any[]) => ({
      from: b.from,
      to: i < arr.length - 1 ? b.to : null,
      rate: b.rate / 100,
    })),
  });

  const createBracketMut = useMutation({
    mutationFn: (values: any) => payrollApi.createTaxBracket(toBracketPayload(values)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tax-brackets'] });
      message.success('Đã thêm biểu thuế');
      setOpen(false); form.resetFields();
    },
    onError: (e: Error) => message.error(e.message ?? 'Lỗi'),
  });

  const updateBracketMut = useMutation({
    mutationFn: (values: any) => payrollApi.updateTaxBracket(editBracket!.id, toBracketPayload(values)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tax-brackets'] });
      message.success('Đã cập nhật biểu thuế');
      setOpen(false); setEditBracket(null); form.resetFields();
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

  const openEditBracket = (r: TaxBracket) => {
    setEditBracket(r);
    form.setFieldsValue({
      name: r.name,
      effectiveFrom: dayjs(r.effectiveFrom),
      brackets: (r.brackets as any[]).map(b => ({
        from: b.from,
        to: b.to,
        rate: Number((b.rate * 100).toFixed(2)),
      })),
    });
    setOpen(true);
  };

  const openNewBracket = () => {
    setEditBracket(null);
    form.resetFields();
    setOpen(true);
  };

  const bracketIsPending = editBracket ? updateBracketMut.isPending : createBracketMut.isPending;

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
      width: 90,
      render: (_, r) => (
        <Space size={4}>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEditBracket(r)}>Sửa</Button>
          <Popconfirm title="Xoá biểu thuế?" onConfirm={() => deleteBracketMut.mutate(r.id)} okText="Xoá" cancelText="Huỷ">
            <Button size="small" icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Space>
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
        <Button type="primary" icon={<PlusOutlined />} size="small" onClick={openNewBracket}>Thêm biểu thuế</Button>
      </div>
      <Table loading={isLoading} dataSource={brackets?.data ?? []} rowKey="id" columns={bracketCols} size="small" pagination={false} style={{ marginBottom: 24 }} />

      {/* Giảm trừ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Text style={{ color: textPrimary, fontWeight: 600, fontSize: 14 }}>Mức giảm trừ gia cảnh</Text>
        <Button icon={<PlusOutlined />} size="small" onClick={() => setDeductOpen(true)}>Cập nhật mức</Button>
      </div>
      <Table dataSource={deductions?.data ?? []} rowKey="id" columns={deductCols} size="small" pagination={false} />

      {/* Modal thêm/sửa biểu thuế */}
      <CenteredModal
        open={open}
        onClose={() => { setOpen(false); setEditBracket(null); form.resetFields(); }}
        title={editBracket ? `Sửa biểu thuế: ${editBracket.name}` : 'Thêm biểu thuế TNCN'}
        width={580}
        extra={
          <Button type="primary" loading={bracketIsPending} disabled={bracketIsPending}
            onClick={() => form.validateFields().then(v => editBracket ? updateBracketMut.mutate(v) : createBracketMut.mutate(v))}>
            Lưu
          </Button>
        }>
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
                      <InputNumber<number> style={{ width: '100%' }} min={0} formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={v => Number(v?.replace(/,/g, '') ?? 0)} />
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
        extra={<Button type="primary" loading={createDeductMut.isPending} disabled={createDeductMut.isPending} onClick={() => deductForm.validateFields().then(v => createDeductMut.mutate(v))}>Lưu</Button>}>
        <Form form={deductForm} layout="vertical" initialValues={{ selfDeduction: 11_000_000, dependentDeduction: 4_400_000 }}>
          <Form.Item name="effectiveFrom" label="Hiệu lực từ ngày" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="selfDeduction" label="Giảm trừ bản thân (đ/tháng)">
            <InputNumber<number> style={{ width: '100%' }} min={0} step={1_000_000}
              formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={v => Number(v?.replace(/,/g, '') ?? 0)} />
          </Form.Item>
          <Form.Item name="dependentDeduction" label="Giảm trừ NPT (đ/người/tháng)">
            <InputNumber<number> style={{ width: '100%' }} min={0} step={1_000_000}
              formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={v => Number(v?.replace(/,/g, '') ?? 0)} />
          </Form.Item>
        </Form>
      </CenteredModal>
    </>
  );
}
