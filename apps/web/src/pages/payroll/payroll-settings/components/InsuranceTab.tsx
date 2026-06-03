import { useState } from 'react';
import {
  Table, Button, Form, InputNumber, DatePicker, App, Popconfirm,
  Space, Typography, Row, Col, Alert, Tooltip,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { payrollApi, type InsuranceConfig } from '../../../../api/payroll';
import { useThemePalette } from '../../../../hooks/useThemePalette';
import { CenteredModal } from '../../../../components/ui/CenteredModal';
import { formatCurrency } from '../../../../utils/format';

const { Text } = Typography;

export function InsuranceTab() {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<InsuranceConfig | null>(null);
  const [form] = Form.useForm();
  const { textPrimary, textMuted, linkColor } = useThemePalette();

  const { data, isLoading } = useQuery({
    queryKey: ['insurance-configs'],
    queryFn: () => payrollApi.listInsuranceConfigs(1, 20),
  });

  const toPayload = (values: any) => ({
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
  });

  const createMut = useMutation({
    mutationFn: (values: any) => payrollApi.createInsuranceConfig(toPayload(values)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['insurance-configs'] });
      message.success('Đã thêm cấu hình bảo hiểm');
      setOpen(false); form.resetFields();
    },
    onError: (e: Error) => message.error(e.message ?? 'Lỗi'),
  });

  const updateMut = useMutation({
    mutationFn: (values: any) => payrollApi.updateInsuranceConfig(editItem!.id, toPayload(values)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['insurance-configs'] });
      message.success('Đã cập nhật cấu hình bảo hiểm');
      setOpen(false); setEditItem(null); form.resetFields();
    },
    onError: (e: Error) => message.error(e.message ?? 'Lỗi'),
  });

  const deleteMut = useMutation({
    mutationFn: payrollApi.deleteInsuranceConfig,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['insurance-configs'] }); message.success('Đã xoá'); },
    onError: (e: Error) => message.error(e.message ?? 'Lỗi — config đã dùng không thể xoá'),
  });

  const openEdit = (r: InsuranceConfig) => {
    setEditItem(r);
    form.setFieldsValue({
      effectiveFrom: dayjs(r.effectiveFrom),
      bhxhEmployeeRate: Number(r.bhxhEmployeeRate) * 100,
      bhytEmployeeRate: Number(r.bhytEmployeeRate) * 100,
      bhtnEmployeeRate: Number(r.bhtnEmployeeRate) * 100,
      bhxhEmployerRate: Number(r.bhxhEmployerRate) * 100,
      bhytEmployerRate: Number(r.bhytEmployerRate) * 100,
      bhtnEmployerRate: Number(r.bhtnEmployerRate) * 100,
      tnldRate: Number(r.tnldRate) * 100,
      bhxhCeilingMultiple: r.bhxhCeilingMultiple,
      wageBase: Number(r.wageBase),
    });
    setOpen(true);
  };

  const openNew = () => {
    setEditItem(null);
    form.resetFields();
    setOpen(true);
  };

  const isPending = editItem ? updateMut.isPending : createMut.isPending;

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
      width: 90,
      render: (_, r) => (
        <Space size={4}>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>Sửa</Button>
          <Popconfirm title="Xoá config này?" onConfirm={() => deleteMut.mutate(r.id)} okText="Xoá" cancelText="Huỷ">
            <Button size="small" icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Space>
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
        <Button type="primary" icon={<PlusOutlined />} onClick={openNew}>Thêm config</Button>
      </div>
      <Table loading={isLoading} dataSource={data?.data ?? []} rowKey="id" columns={cols} size="small" pagination={false} />

      <CenteredModal
        open={open}
        onClose={() => { setOpen(false); setEditItem(null); form.resetFields(); }}
        title={editItem ? 'Sửa cấu hình bảo hiểm' : 'Thêm cấu hình bảo hiểm'}
        width={560}
        extra={
          <Button type="primary" loading={isPending} disabled={isPending}
            onClick={() => form.validateFields().then(v => editItem ? updateMut.mutate(v) : createMut.mutate(v))}>
            Lưu
          </Button>
        }>
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
                <InputNumber<number> style={{ width: '100%' }} min={0} step={100000}
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
