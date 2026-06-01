import { useState } from 'react';
import {
  Table, Button, Space, Typography, Tag, Form, Input,
  InputNumber, Select, Switch, Divider, message, Tabs,
} from 'antd';
import { PlusOutlined, CalendarOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useThemePalette } from '../../hooks/useThemePalette';
import { PageHeader } from '../../components/ui/PageHeader';
import { CenteredModal } from '../../components/ui/CenteredModal';
import { FilterBar } from '../../components/FilterBar';
import { employeesApi } from '../../api/employees';
import { leavePoliciesApi, type LeavePolicy } from '../../api/hr-attendance';
import LeaveTypesManager from '../../components/leave/LeaveTypesManager';

const { Text } = Typography;

interface SeniorityRow {
  yearsFrom: number;
  bonus: number;
}

export default function LeavePolicyPage() {
  const { textPrimary, textMuted, bgContainer, borderColor, isDark } = useThemePalette();
  const qc = useQueryClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<LeavePolicy | null>(null);
  const [form] = Form.useForm();
  const [seniorityRows, setSeniorityRows] = useState<SeniorityRow[]>([]);

  // Assign section
  const [assignEmpId, setAssignEmpId] = useState<string | undefined>();
  const [assignPolicyId, setAssignPolicyId] = useState<string | undefined>();

  const { data: policiesResp, isLoading } = useQuery({
    queryKey: ['leave-policies'],
    queryFn: () => leavePoliciesApi.list(),
  });
  const policies: LeavePolicy[] = policiesResp?.data ?? [];

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => employeesApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<LeavePolicy>) => leavePoliciesApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leave-policies'] }); message.success('Tạo chính sách thành công'); setModalOpen(false); },
    onError: () => message.error('Có lỗi xảy ra'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<LeavePolicy> }) => leavePoliciesApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leave-policies'] }); message.success('Cập nhật thành công'); setModalOpen(false); },
    onError: () => message.error('Có lỗi xảy ra'),
  });

  const assignMutation = useMutation({
    mutationFn: (data: { employeeId: string; leavePolicyId: string }) => leavePoliciesApi.assign(data),
    onSuccess: () => { message.success('Đã gán chính sách cho nhân viên'); setAssignEmpId(undefined); setAssignPolicyId(undefined); },
    onError: () => message.error('Có lỗi xảy ra khi gán'),
  });

  const openCreate = () => {
    setEditing(null);
    setSeniorityRows([]);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (policy: LeavePolicy) => {
    setEditing(policy);
    setSeniorityRows(policy.seniorityBonus ?? []);
    form.setFieldsValue({
      name: policy.name,
      baseAnnualDays: policy.baseAnnualDays,
      maxCarryOver: policy.maxCarryOver,
      carryOverExpiry: policy.carryOverExpiry ?? '',
      carryOverExpiryAction: policy.carryOverExpiryAction,
      isActive: policy.isActive,
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const payload: Partial<LeavePolicy> = {
      ...values,
      seniorityBonus: seniorityRows,
      // Gửi null thay vì chuỗi rỗng để backend lưu đúng
      carryOverExpiry: values.carryOverExpiry?.trim() || undefined,
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const addSeniorityRow = () => {
    setSeniorityRows(prev => [...prev, { yearsFrom: 1, bonus: 1 }]);
  };

  const removeSeniorityRow = (idx: number) => {
    setSeniorityRows(prev => prev.filter((_, i) => i !== idx));
  };

  const updateSeniorityRow = (idx: number, field: keyof SeniorityRow, value: number) => {
    setSeniorityRows(prev => prev.map((row, i) => i === idx ? { ...row, [field]: value } : row));
  };

  const handleAssign = () => {
    if (!assignEmpId || !assignPolicyId) { message.warning('Vui lòng chọn đầy đủ nhân viên và chính sách'); return; }
    assignMutation.mutate({ employeeId: assignEmpId, leavePolicyId: assignPolicyId });
  };

  const isBusy = createMutation.isPending || updateMutation.isPending;

  const columns: ColumnsType<LeavePolicy> = [
    {
      title: 'Tên chính sách',
      dataIndex: 'name',
      render: (v: string) => <Text style={{ color: textPrimary, fontWeight: 500 }}>{v}</Text>,
    },
    {
      title: 'Ngày phép cơ bản',
      dataIndex: 'baseAnnualDays',
      width: 160,
      render: (v: number) => <Text style={{ color: textPrimary }}>{v} ngày/năm</Text>,
    },
    {
      title: 'Thâm niên',
      dataIndex: 'seniorityBonus',
      render: (rows: SeniorityRow[]) => {
        if (!rows || rows.length === 0) return <Text style={{ color: textMuted }}>—</Text>;
        return (
          <Space direction="vertical" size={0}>
            {rows.map((r, i) => (
              <Text key={i} style={{ color: textMuted, fontSize: 12 }}>
                {r.yearsFrom} năm: +{r.bonus} ngày
              </Text>
            ))}
          </Space>
        );
      },
    },
    {
      title: 'Carry-over tối đa',
      dataIndex: 'maxCarryOver',
      width: 150,
      render: (v: number) => <Text style={{ color: textPrimary }}>{v} ngày</Text>,
    },
    {
      title: 'Hết hạn carry-over',
      dataIndex: 'carryOverExpiry',
      width: 160,
      render: (v?: string) => v
        ? <Text style={{ color: textPrimary }}>{v}</Text>
        : <Text style={{ color: textMuted }}>—</Text>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      width: 110,
      render: (v: boolean) => (
        <Tag
          style={isDark
            ? v
              ? { background: 'rgba(52,211,153,0.15)', color: '#6EE7B7', borderColor: 'rgba(52,211,153,0.3)' }
              : { background: 'rgba(248,113,113,0.15)', color: '#FCA5A5', borderColor: 'rgba(248,113,113,0.3)' }
            : {}}
          color={isDark ? undefined : v ? 'green' : 'red'}
        >
          {v ? 'Hoạt động' : 'Tắt'}
        </Tag>
      ),
    },
    {
      title: 'Hành động',
      key: 'actions',
      width: 80,
      render: (_: unknown, record: LeavePolicy) => (
        <Button
          type="text"
          icon={<EditOutlined />}
          size="small"
          onClick={() => openEdit(record)}
          style={{ color: textMuted }}
        />
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Chính sách phép"
        icon={<CalendarOutlined />}
        iconColor="#10B981"
      />

      <Tabs
        defaultActiveKey="policies"
        items={[
          {
            key: 'policies',
            label: 'Chính sách phép năm',
            children: (
              <>
                <div style={{ textAlign: 'right', marginBottom: 12 }}>
                  <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                    Thêm chính sách
                  </Button>
                </div>
                <div style={{ background: bgContainer, border: `1px solid ${borderColor}`, borderRadius: 8, overflow: 'hidden', marginBottom: 24 }}>
                  <Table
                    rowKey="id"
                    columns={columns}
                    dataSource={policies}
                    loading={isLoading}
                    pagination={{ pageSize: 20 }}
                    size="middle"
                  />
                </div>

                {/* Phân công chính sách */}
                <div style={{ background: bgContainer, border: `1px solid ${borderColor}`, borderRadius: 8, padding: 20 }}>
                  <Text style={{ color: textPrimary, fontWeight: 600, fontSize: 15 }}>Phân công chính sách cho nhân viên</Text>
                  <Divider style={{ margin: '12px 0' }} />
                  <FilterBar>
                    <Select
                      showSearch
                      placeholder="Chọn nhân viên"
                      style={{ width: 260 }}
                      value={assignEmpId}
                      onChange={setAssignEmpId}
                      filterOption={(input, opt) =>
                        String(opt?.label ?? '').toLowerCase().includes(input.toLowerCase())
                      }
                      options={employees.map(e => ({ value: e.id, label: `${e.code} — ${e.fullName}` }))}
                    />
                    <Select
                      placeholder="Chọn chính sách"
                      style={{ width: 240 }}
                      value={assignPolicyId}
                      onChange={setAssignPolicyId}
                      options={policies.map(p => ({ value: p.id, label: p.name }))}
                    />
                    <Button
                      type="primary"
                      loading={assignMutation.isPending}
                      disabled={assignMutation.isPending}
                      onClick={handleAssign}
                    >
                      Gán chính sách
                    </Button>
                  </FilterBar>
                </div>
              </>
            ),
          },
          {
            key: 'types',
            label: 'Loại nghỉ',
            children: <LeaveTypesManager />,
          },
        ]}
      />

      {/* Modal tạo/sửa */}
      <CenteredModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Sửa chính sách phép' : 'Tạo chính sách phép mới'}
        width={600}
        footer={
          <Space>
            <Button onClick={() => setModalOpen(false)}>Hủy</Button>
            <Button type="primary" loading={isBusy} onClick={handleSubmit}>
              {editing ? 'Lưu thay đổi' : 'Tạo mới'}
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="Tên chính sách"
            rules={[{ required: true, message: 'Vui lòng nhập tên chính sách' }]}
          >
            <Input placeholder="VD: Chính sách phép cơ bản 2024" />
          </Form.Item>

          <Form.Item
            name="baseAnnualDays"
            label="Ngày phép cơ bản (ngày/năm)"
            extra="Theo BLLĐ tối thiểu 12 ngày"
            rules={[{ required: true, message: 'Vui lòng nhập số ngày phép' }]}
          >
            <InputNumber min={12} max={30} style={{ width: '100%' }} addonAfter="ngày" />
          </Form.Item>

          <Form.Item
            name="maxCarryOver"
            label="Carry-over tối đa"
            initialValue={0}
          >
            <InputNumber min={0} style={{ width: '100%' }} addonAfter="ngày" />
          </Form.Item>

          <Form.Item
            name="carryOverExpiry"
            label="Hết hạn carry-over"
          >
            <Input placeholder="MM-DD, ví dụ: 03-31" />
          </Form.Item>

          <Form.Item
            name="carryOverExpiryAction"
            label="Hành động khi hết hạn"
            initialValue="CLEAR"
          >
            <Select
              options={[
                { value: 'CLEAR', label: 'Xóa (Clear)' },
                { value: 'PAY_OUT', label: 'Thanh toán (Pay out)' },
              ]}
            />
          </Form.Item>

          <Form.Item name="isActive" label="Trạng thái" valuePropName="checked" initialValue={true}>
            <Switch checkedChildren="Hoạt động" unCheckedChildren="Tắt" />
          </Form.Item>

          <Divider orientation="left" style={{ fontSize: 13 }}>Thâm niên bonus</Divider>

          {seniorityRows.map((row, idx) => (
            <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
              <InputNumber
                min={1}
                value={row.yearsFrom}
                onChange={v => updateSeniorityRow(idx, 'yearsFrom', v ?? 1)}
                addonBefore="Từ"
                addonAfter="năm"
                style={{ flex: 1 }}
              />
              <InputNumber
                min={0}
                value={row.bonus}
                onChange={v => updateSeniorityRow(idx, 'bonus', v ?? 0)}
                addonBefore="+"
                addonAfter="ngày"
                style={{ flex: 1 }}
              />
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={() => removeSeniorityRow(idx)}
              />
            </div>
          ))}

          <Button
            type="dashed"
            block
            icon={<PlusOutlined />}
            onClick={addSeniorityRow}
            style={{ marginTop: 4 }}
          >
            + Thêm mốc thâm niên
          </Button>
        </Form>
      </CenteredModal>
    </div>
  );
}
