import { useState } from 'react';
import {
  Table, Button, Modal, Form, Input, Select, Space,
  Typography, DatePicker, App, Tag, Popconfirm, Spin, theme,
} from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { payrollApi, type Dependent } from '../../../api/payroll';
import { useThemePalette } from '../../../hooks/useThemePalette';

const { Text } = Typography;

export function TaxProfileTab({ employeeId }: { employeeId: string }) {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const { token } = theme.useToken();
  const { textMuted } = useThemePalette();
  const [taxForm] = Form.useForm();
  const [depForm] = Form.useForm();
  const [depOpen, setDepOpen] = useState(false);
  const [terminateTarget, setTerminateTarget] = useState<Dependent | null>(null);
  const [terminateDate, setTerminateDate] = useState<dayjs.Dayjs | null>(null);
  const [terminateOpen, setTerminateOpen] = useState(false);

  const { data: taxProfile, isLoading } = useQuery({
    queryKey: ['tax-profile', employeeId],
    queryFn: () => payrollApi.getEmployeeTaxProfile(employeeId),
  });

  const { data: dependents = [], isLoading: depLoading } = useQuery({
    queryKey: ['dependents', employeeId],
    queryFn: () => payrollApi.listDependents(employeeId),
  });

  const upsertMutation = useMutation({
    mutationFn: (data: Parameters<typeof payrollApi.upsertEmployeeTaxProfile>[1]) =>
      payrollApi.upsertEmployeeTaxProfile(employeeId, data),
    onSuccess: () => {
      message.success('Đã lưu thông tin thuế');
      void qc.invalidateQueries({ queryKey: ['tax-profile', employeeId] });
    },
    onError: () => message.error('Lưu thất bại'),
  });

  const addDepMutation = useMutation({
    mutationFn: (data: Parameters<typeof payrollApi.addDependent>[1]) =>
      payrollApi.addDependent(employeeId, data),
    onSuccess: () => {
      message.success('Đã thêm người phụ thuộc');
      setDepOpen(false);
      depForm.resetFields();
      void qc.invalidateQueries({ queryKey: ['dependents', employeeId] });
      void qc.invalidateQueries({ queryKey: ['tax-profile', employeeId] });
    },
    onError: () => message.error('Thêm thất bại'),
  });

  const terminateMutation = useMutation({
    mutationFn: ({ id, date }: { id: string; date: string }) =>
      payrollApi.terminateDependent(employeeId, id, { registeredTo: date }),
    onSuccess: () => {
      message.success('Đã kết thúc giảm trừ');
      setTerminateOpen(false);
      void qc.invalidateQueries({ queryKey: ['dependents', employeeId] });
    },
    onError: () => message.error('Thao tác thất bại'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => payrollApi.deleteDependent(employeeId, id),
    onSuccess: () => {
      message.success('Đã xóa người phụ thuộc');
      void qc.invalidateQueries({ queryKey: ['dependents', employeeId] });
      void qc.invalidateQueries({ queryKey: ['tax-profile', employeeId] });
    },
    onError: () => message.error('Xóa thất bại'),
  });

  if (isLoading) return <Spin style={{ display: 'block', marginTop: 24 }} />;

  const initialValues = taxProfile
    ? { taxId: taxProfile.taxId ?? '', residencyStatus: taxProfile.residencyStatus, wageZone: taxProfile.wageZone }
    : { residencyStatus: 'RESIDENT', wageZone: 1 };

  const depCols = [
    { title: 'Họ tên', dataIndex: 'name', key: 'name' },
    { title: 'Quan hệ', dataIndex: 'relationship', key: 'relationship' },
    { title: 'MST người phụ thuộc', dataIndex: 'taxId', key: 'taxId', render: (v?: string) => v ?? '—' },
    {
      title: 'Từ ngày',
      dataIndex: 'registeredFrom',
      key: 'registeredFrom',
      render: (v: string) => <Text style={{ color: textMuted }}>{dayjs(v).format('DD/MM/YYYY')}</Text>,
    },
    {
      title: 'Đến ngày',
      dataIndex: 'registeredTo',
      key: 'registeredTo',
      render: (v?: string) => v
        ? <Text style={{ color: textMuted }}>{dayjs(v).format('DD/MM/YYYY')}</Text>
        : <Tag color="green">Đang tính</Tag>,
    },
    {
      title: '',
      key: 'actions',
      width: 100,
      render: (_: unknown, dep: Dependent) => (
        <Space>
          {!dep.registeredTo && (
            <Button
              size="small" type="link"
              onClick={() => { setTerminateTarget(dep); setTerminateOpen(true); }}
            >
              Kết thúc
            </Button>
          )}
          <Popconfirm
            title="Xóa người phụ thuộc?"
            onConfirm={() => deleteMutation.mutate(dep.id)}
            okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}
          >
            <Button size="small" type="link" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const activeCount = dependents.filter((d) => !d.registeredTo || dayjs(d.registeredTo).isAfter(dayjs())).length;

  return (
    <div style={{ paddingTop: 8 }}>
      {/* ── Tax Profile Form ── */}
      <div style={{
        background: token.colorFillAlter, borderRadius: 8,
        padding: '16px 20px', marginBottom: 20,
        border: `1px solid ${token.colorBorderSecondary}`,
      }}>
        <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 13 }}>
          Thông tin thuế & bảo hiểm
        </div>
        <Form
          form={taxForm}
          layout="inline"
          initialValues={initialValues}
          onFinish={(v) => upsertMutation.mutate(v)}
          style={{ flexWrap: 'wrap', gap: 8 }}
        >
          <Form.Item name="taxId" label="MST cá nhân">
            <Input placeholder="0123456789" style={{ width: 160 }} />
          </Form.Item>
          <Form.Item name="residencyStatus" label="Tình trạng cư trú" rules={[{ required: true }]}>
            <Select style={{ width: 160 }} options={[
              { value: 'RESIDENT',     label: 'Cư trú' },
              { value: 'NON_RESIDENT', label: 'Không cư trú' },
            ]} />
          </Form.Item>
          <Form.Item name="wageZone" label="Vùng lương" rules={[{ required: true }]}>
            <Select style={{ width: 120 }} options={[
              { value: 1, label: 'Vùng 1' },
              { value: 2, label: 'Vùng 2' },
              { value: 3, label: 'Vùng 3' },
              { value: 4, label: 'Vùng 4' },
            ]} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={upsertMutation.isPending} disabled={upsertMutation.isPending}>
              Lưu
            </Button>
          </Form.Item>
        </Form>
      </div>

      {/* ── Dependents ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontWeight: 600, fontSize: 13 }}>
          Người phụ thuộc
          {activeCount > 0 && (
            <Tag color="blue" style={{ marginLeft: 8 }}>{activeCount} đang tính giảm trừ</Tag>
          )}
        </span>
        <Button icon={<PlusOutlined />} size="small" onClick={() => setDepOpen(true)}>
          Thêm NPT
        </Button>
      </div>

      <Table
        dataSource={dependents}
        columns={depCols}
        rowKey="id"
        size="small"
        loading={depLoading}
        pagination={false}
        locale={{ emptyText: 'Chưa có người phụ thuộc' }}
      />

      {/* ── Add Dependent Modal ── */}
      <Modal
        title="Thêm người phụ thuộc"
        open={depOpen}
        onCancel={() => { setDepOpen(false); depForm.resetFields(); }}
        onOk={() => depForm.submit()}
        confirmLoading={addDepMutation.isPending}
        width={480}
      >
        <Form
          form={depForm}
          layout="vertical"
          onFinish={(v) => addDepMutation.mutate({
            ...v,
            registeredFrom: v.registeredFrom.format('YYYY-MM-DD'),
          })}
        >
          <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item name="name" label="Họ và tên" rules={[{ required: true, message: 'Nhập tên' }]}>
              <Input />
            </Form.Item>
            <Form.Item name="relationship" label="Quan hệ" rules={[{ required: true, message: 'Nhập quan hệ' }]}>
              <Select options={[
                { value: 'Con ruột', label: 'Con ruột' },
                { value: 'Con nuôi', label: 'Con nuôi' },
                { value: 'Vợ/Chồng', label: 'Vợ/Chồng' },
                { value: 'Bố/Mẹ đẻ', label: 'Bố/Mẹ đẻ' },
                { value: 'Bố/Mẹ vợ/chồng', label: 'Bố/Mẹ vợ/chồng' },
              ]} />
            </Form.Item>
          </Space>
          <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item name="taxId" label="MST người phụ thuộc">
              <Input placeholder="Tùy chọn" />
            </Form.Item>
            <Form.Item name="registeredFrom" label="Ngày bắt đầu tính" rules={[{ required: true, message: 'Chọn ngày' }]}>
              <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
            </Form.Item>
          </Space>
        </Form>
      </Modal>

      {/* ── Terminate Modal ── */}
      <Modal
        title={`Kết thúc giảm trừ: ${terminateTarget?.name}`}
        open={terminateOpen}
        onCancel={() => { setTerminateOpen(false); setTerminateDate(null); }}
        onOk={() => {
          if (!terminateTarget || !terminateDate) return;
          terminateMutation.mutate({ id: terminateTarget.id, date: terminateDate.format('YYYY-MM-DD') });
        }}
        confirmLoading={terminateMutation.isPending}
        okText="Xác nhận"
      >
        <p>Chọn ngày kết thúc tính giảm trừ gia cảnh:</p>
        <DatePicker
          format="DD/MM/YYYY"
          value={terminateDate}
          onChange={setTerminateDate}
          style={{ width: '100%' }}
        />
      </Modal>
    </div>
  );
}
