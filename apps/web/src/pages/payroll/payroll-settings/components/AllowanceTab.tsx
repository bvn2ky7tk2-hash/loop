import { useState } from 'react';
import {
  Table, Button, Form, InputNumber, Select, Input, App,
  Switch, Typography, Row, Col, Alert, Tooltip,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, EditOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { payrollApi, type AllowanceType } from '../../../../api/payroll';
import { useThemePalette } from '../../../../hooks/useThemePalette';
import { CenteredModal } from '../../../../components/ui/CenteredModal';
import { StatusBadge } from '../../../../components/ui/StatusBadge';
import { formatCurrency } from '../../../../utils/format';

const { Text } = Typography;

export function AllowanceTab() {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AllowanceType | null>(null);
  const [form] = Form.useForm();
  const { textPrimary, textMuted, linkColor } = useThemePalette();

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
        ? <StatusBadge label="Có" tone="success" />
        : <StatusBadge label="Không" tone="neutral" />,
    },
    {
      title: 'Miễn TNCN',
      dataIndex: 'isPitExempt',
      width: 100,
      align: 'center',
      render: (v: boolean, r) => v
        ? <Tooltip title={r.pitExemptCeiling ? `Trần miễn ${formatCurrency(Number(r.pitExemptCeiling))}` : 'Miễn hoàn toàn'}>
            <StatusBadge label="Có" tone="success" />
          </Tooltip>
        : <StatusBadge label="Không" tone="neutral" />,
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
          <Button type="primary" loading={saveMut.isPending} disabled={saveMut.isPending}
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
                <InputNumber<number>
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
