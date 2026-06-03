import { useState } from 'react';
import {
  Button, Table, Modal, Form, Input, Select,
  App, Space, Tooltip, Switch, Divider, Typography,
} from 'antd';
import { useThemePalette } from '../../hooks/useThemePalette';
import { usePagination } from '../../hooks/usePagination';
import { EmployeeInfoCell } from '../../components/ui/EmployeeInfoCell';
import { PlusOutlined, EditOutlined, KeyOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi, type UserRecord } from '../../api/users';
import { employeesApi } from '../../api/employees';
import { orgUnitsApi } from '../../api/org-units';



const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Quản trị viên', PM: 'PM', MEMBER: 'Thành viên', LEADERSHIP: 'Lãnh đạo',
};
const ROLE_BADGE: Record<string, { bg: string; color: string }> = {
  ADMIN:      { bg: '#FEF2F2', color: '#991B1B' },
  PM:         { bg: '#EEF2FF', color: '#4338CA' },
  MEMBER:     { bg: '#F1F5F9', color: '#94A3B8' },
  LEADERSHIP: { bg: '#F5F3FF', color: '#6D28D9' },
};

const { Text } = Typography;

export default function UsersPage() {
  const { message } = App.useApp();
  const { isDark, textPrimary, textMuted } = useThemePalette();
  const qc = useQueryClient();
  const { paginationProps } = usePagination(50);
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserRecord | null>(null);
  const [pwUser, setPwUser] = useState<UserRecord | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [pwForm] = Form.useForm();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: usersApi.list,
  });

  const { data: orgTree = [] } = useQuery({
    queryKey: ['org-units'],
    queryFn: orgUnitsApi.getTree,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => employeesApi.list(),
    enabled: createOpen,
  });

  const flatOrg = orgTree.flatMap(function flatten(n): typeof orgTree {
    return [n, ...(n.children ?? []).flatMap(flatten)];
  });

  const unlinkedEmployees = employees;

  const createMutation = useMutation({
    mutationFn: usersApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['employees'] });
      message.success('Đã tạo người dùng');
      setCreateOpen(false);
      createForm.resetFields();
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      message.error(err.response?.data?.message ?? 'Tạo thất bại');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof usersApi.update>[1] }) =>
      usersApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      message.success('Đã cập nhật');
      setEditUser(null);
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      message.error(err.response?.data?.message ?? 'Cập nhật thất bại');
    },
  });

  const pwMutation = useMutation({
    mutationFn: ({ id, pw }: { id: string; pw: string }) => usersApi.changePassword(id, pw),
    onSuccess: () => {
      message.success('Đã đổi mật khẩu');
      setPwUser(null);
      pwForm.resetFields();
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      message.error(err.response?.data?.message ?? 'Đổi mật khẩu thất bại');
    },
  });

  function handleEmployeeSelect(employeeId: string | undefined) {
    if (!employeeId) {
      setSelectedEmployee(null);
      createForm.setFieldsValue({ name: undefined, email: undefined, orgUnitId: undefined });
      return;
    }
    const emp = employees.find((e) => e.id === employeeId);
    if (!emp) return;
    setSelectedEmployee(employeeId);
    createForm.setFieldsValue({
      name: emp.fullName,
      email: emp.email ?? '',
      orgUnitId: emp.orgUnitId ?? undefined,
    });
  }

  const columns = [
    {
      title: 'Tên',
      render: (_: unknown, r: UserRecord) => r.employee
        ? <EmployeeInfoCell employee={r.employee} />
        : <Text style={{ color: textPrimary, fontWeight: 600 }}>{r.name}</Text>,
    },
    {
      title: 'Vị trí', width: 130,
      render: (_: unknown, r: UserRecord) => r.employee?.position?.code
        ? <span style={{ fontSize: 11, fontWeight: 600, borderRadius: 4, padding: '1px 6px', background: isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9', color: textMuted }}>{r.employee.position.code}</span>
        : <Text style={{ color: textMuted }}>—</Text>,
    },
    { title: 'Email', dataIndex: 'email' },
    {
      title: 'Vai trò', dataIndex: 'role', width: 130,
      render: (role: string) => {
        const cfg = ROLE_BADGE[role] ?? { bg: '#F1F5F9', color: '#94A3B8' };
        const bg = isDark ? `${cfg.color}20` : cfg.bg;
        return <span style={{ fontSize: 11, fontWeight: 600, borderRadius: 9999, padding: '3px 10px', background: bg, color: cfg.color }}>{ROLE_LABELS[role] ?? role}</span>;
      },
    },
    { title: 'Đơn vị', dataIndex: 'orgUnitName', render: (v: string | null) => v ? <Text style={{ color: textMuted }}>{v}</Text> : <Text style={{ color: textMuted }}>—</Text> },
    {
      title: 'Trạng thái', dataIndex: 'isActive', width: 110,
      render: (v: boolean, r: UserRecord) => (
        <Switch
          size="small"
          checked={v}
          checkedChildren="Hoạt động"
          unCheckedChildren="Khoá"
          onChange={(checked) => updateMutation.mutate({ id: r.id, data: { isActive: checked } as Parameters<typeof usersApi.update>[1] })}
        />
      ),
    },
    {
      title: '', key: 'actions', width: 80,
      render: (_: unknown, r: UserRecord) => (
        <Space size={4}>
          <Tooltip title="Sửa thông tin">
            <Button
              type="text" size="small" icon={<EditOutlined />}
              onClick={() => {
                setEditUser(r);
                editForm.setFieldsValue({
                  name: r.name,
                  email: r.email,
                  role: r.role,
                  orgUnitId: r.orgUnitId,
                });
              }}
            />
          </Tooltip>
          <Tooltip title="Đổi mật khẩu">
            <Button
              type="text" size="small" icon={<KeyOutlined />}
              onClick={() => { setPwUser(r); pwForm.resetFields(); }}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div className="page-wrapper">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 className="page-title">Quản lý người dùng</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
          Thêm người dùng
        </Button>
      </div>

      <Table dataSource={users} columns={columns} rowKey="id" loading={isLoading} size="middle" pagination={paginationProps(users.length, 'người dùng')} />

      {/* Modal tạo mới */}
      <Modal
        title="Thêm người dùng"
        open={createOpen}
        onCancel={() => { setCreateOpen(false); setSelectedEmployee(null); createForm.resetFields(); }}
        onOk={() => createForm.submit()}
        confirmLoading={createMutation.isPending}
        width={520}
      >
        <Form form={createForm} layout="vertical" onFinish={(v) => createMutation.mutate(v)}>
          <Form.Item name="employeeId" label="Liên kết nhân sự (tuỳ chọn)">
            <Select
              allowClear showSearch
              placeholder="Chọn nhân sự để tự điền thông tin..."
              filterOption={(input, opt) => (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())}
              options={unlinkedEmployees.map((e) => ({
                value: e.id,
                label: `${e.code} - ${e.fullName}${e.userId ? ' ✓ đã có TK' : ''}`,
              }))}
              onChange={handleEmployeeSelect}
            />
          </Form.Item>
          <Divider style={{ margin: '4px 0 12px' }} />
          <Form.Item name="name" label="Tên đầy đủ" rules={[{ required: true }]}>
            <Input disabled={!!selectedEmployee} />
          </Form.Item>
          <Form.Item name="email" label="Email đăng nhập" rules={[{ required: true }, { type: 'email' }]}>
            <Input disabled={!!selectedEmployee} />
          </Form.Item>
          <Form.Item name="password" label="Mật khẩu" rules={[{ required: true }, { min: 6, message: 'Tối thiểu 6 ký tự' }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item name="role" label="Vai trò" rules={[{ required: true }]}>
            <Select>
              {Object.keys(ROLE_LABELS).map((r) => (
                <Select.Option key={r} value={r}>{ROLE_LABELS[r] ?? r}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="orgUnitId" label="Đơn vị tổ chức" rules={[{ required: true }]}>
            <Select placeholder="Chọn đơn vị" disabled={!!selectedEmployee}>
              {flatOrg.map((u) => (
                <Select.Option key={u.id} value={u.id}>{u.name} — {u.code}</Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal sửa */}
      <Modal
        title={`Sửa: ${editUser?.name ?? ''}`}
        open={!!editUser}
        onCancel={() => setEditUser(null)}
        onOk={() => editForm.submit()}
        confirmLoading={updateMutation.isPending}
        width={520}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={(v) => updateMutation.mutate({ id: editUser!.id, data: v })}
        >
          <Form.Item name="name" label="Tên đầy đủ" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email đăng nhập" rules={[{ required: true }, { type: 'email' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="role" label="Vai trò" rules={[{ required: true }]}>
            <Select>
              {Object.keys(ROLE_LABELS).map((r) => (
                <Select.Option key={r} value={r}>{ROLE_LABELS[r] ?? r}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="orgUnitId" label="Đơn vị tổ chức">
            <Select allowClear placeholder="Chọn đơn vị">
              {flatOrg.map((u) => (
                <Select.Option key={u.id} value={u.id}>{u.name} — {u.code}</Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal đổi mật khẩu */}
      <Modal
        title={`Đổi mật khẩu: ${pwUser?.name ?? ''}`}
        open={!!pwUser}
        onCancel={() => { setPwUser(null); pwForm.resetFields(); }}
        onOk={() => pwForm.submit()}
        confirmLoading={pwMutation.isPending}
      >
        <Form
          form={pwForm}
          layout="vertical"
          onFinish={(v) => pwMutation.mutate({ id: pwUser!.id, pw: v.newPassword })}
        >
          <Form.Item
            name="newPassword"
            label="Mật khẩu mới"
            rules={[{ required: true, message: 'Nhập mật khẩu mới' }, { min: 6, message: 'Tối thiểu 6 ký tự' }]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item
            name="confirm"
            label="Xác nhận mật khẩu"
            dependencies={['newPassword']}
            rules={[
              { required: true },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) return Promise.resolve();
                  return Promise.reject(new Error('Mật khẩu không khớp'));
                },
              }),
            ]}
          >
            <Input.Password />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
