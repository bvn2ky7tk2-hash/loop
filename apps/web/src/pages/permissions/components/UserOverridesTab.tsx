import { useState, useMemo } from 'react';
import {
  Table, Tag, Button, Modal, Form, Switch, Select, Space,
  App, Popconfirm, Typography,
} from 'antd';
import { PlusOutlined, DeleteOutlined, UserOutlined } from '@ant-design/icons';
import { EmptyState } from '../../../components/ui/EmptyState';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { permissionsApi } from '../../../api/permissions';
import { useThemePalette } from '../../../hooks/useThemePalette';
import { fetchUsers, buildScreens } from '../helpers';

const { Text } = Typography;

// ─── Tab: Phân quyền người dùng (override cá nhân) ───────────────────────────

export function UserOverridesTab() {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const { isDark, textMuted, bgSubPanel, bgContainer } = useThemePalette();
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [form] = Form.useForm();

  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: fetchUsers });

  const { data: allPermsData = [] } = useQuery({
    queryKey: ['permissions', 'all'],
    queryFn: permissionsApi.listAll,
    staleTime: 5 * 60_000,
  });
  const { screens } = useMemo(() => buildScreens(allPermsData), [allPermsData]);

  const { data: overrides = [], isLoading } = useQuery({
    queryKey: ['permissions', 'overrides', selectedUser],
    queryFn: () => permissionsApi.getUserOverrides(selectedUser!),
    enabled: !!selectedUser,
  });
  const { data: effective = [] } = useQuery({
    queryKey: ['permissions', 'effective', selectedUser],
    queryFn: () => permissionsApi.getUserEffective(selectedUser!),
    enabled: !!selectedUser,
  });
  const { data: userGroups = [] } = useQuery({
    queryKey: ['permissions', 'user-module-roles', selectedUser],
    queryFn: () => permissionsApi.getUserModuleRoles(selectedUser!),
    enabled: !!selectedUser,
  });

  const upsertMut = useMutation({
    mutationFn: (v: { permissionCode: string; granted: boolean }) =>
      permissionsApi.upsertOverride(selectedUser!, v.permissionCode, v.granted),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['permissions', 'overrides', selectedUser] });
      qc.invalidateQueries({ queryKey: ['permissions', 'effective', selectedUser] });
      message.success('Đã cập nhật');
      setAddOpen(false);
      form.resetFields();
    },
  });

  const deleteMut = useMutation({
    mutationFn: (code: string) => permissionsApi.deleteOverride(selectedUser!, code),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['permissions', 'overrides', selectedUser] });
      qc.invalidateQueries({ queryKey: ['permissions', 'effective', selectedUser] });
    },
  });

  const border  = isDark ? '#334155' : '#E2E8F0';
  const selectedObj = users.find(u => u.id === selectedUser);

  const allPerms = screens.flatMap(s => s.funcs.map(f => ({ ...f, screen: s.label, color: s.color })));
  const groupedEffective = screens.map(s => ({
    ...s,
    granted: s.funcs.filter(f => effective.includes(f.perm)),
  })).filter(s => s.granted.length > 0);

  const overrideCols = [
    {
      title: 'Màn hình / Chức năng',
      dataIndex: 'permissionCode',
      render: (code: string) => {
        const p = allPerms.find(a => a.perm === code);
        return (
          <div>
            <Text type="secondary" style={{ fontSize: 11 }}>{p?.screen ?? code.split(':')[0]}</Text>
            <div style={{ fontWeight: 600 }}>{p?.label ?? code.split(':')[1]}</div>
          </div>
        );
      },
    },
    {
      title: 'Override',
      dataIndex: 'granted',
      render: (g: boolean) => g
        ? <Tag color="success">+ Cấp thêm</Tag>
        : <Tag color="error">- Thu hồi</Tag>,
    },
    {
      title: '',
      render: (_: unknown, row: { permissionCode: string }) => (
        <Popconfirm title="Xoá override?" onConfirm={() => deleteMut.mutate(row.permissionCode)} okText="Xoá" cancelText="Huỷ" okButtonProps={{ danger: true }}>
          <Button size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  const permOptions = screens.flatMap(s => s.funcs.map(f => ({
    value: f.perm,
    label: `${s.label} / ${f.label}`,
  })));

  return (
    <div style={{ display: 'flex', gap: 20 }}>
      {/* Left */}
      <div style={{ width: 260, flexShrink: 0 }}>
        <Text strong style={{ display: 'block', marginBottom: 8 }}>Chọn người dùng</Text>
        <Select
          showSearch placeholder="Tìm theo tên hoặc email..."
          style={{ width: '100%' }} value={selectedUser} onChange={setSelectedUser}
          filterOption={(input, opt) => (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())}
          options={users.map(u => ({ value: u.id, label: `${u.name} (${u.email})` }))}
        />
        {selectedObj && (
          <div style={{ marginTop: 14, borderRadius: 8, border: `1px solid ${border}`, overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', background: isDark ? bgSubPanel : '#EEF2FF' }}>
              <div style={{ fontWeight: 600 }}>{selectedObj.name}</div>
              <div style={{ fontSize: 12, color: textMuted }}>{selectedObj.email}</div>
              {userGroups.length > 0 && (
                <div style={{ marginTop: 6 }}>
                  <Text style={{ fontSize: 11, color: isDark ? 'rgba(255,255,255,0.4)' : '#94A3B8' }}>Nhóm: </Text>
                  <Space wrap size={4}>
                    {userGroups.map((r: { code: string; name: string }) => (
                      <Tag key={r.code} style={{ fontSize: 11 }}>{r.name}</Tag>
                    ))}
                  </Space>
                </div>
              )}
            </div>
            <div style={{ padding: '10px 14px' }}>
              <Text style={{ fontSize: 11, fontWeight: 700, color: textMuted }}>
                QUYỀN HIỆU LỰC ({effective.length})
              </Text>
              <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 280, overflowY: 'auto' }}>
                {groupedEffective.map(s => (
                  <div key={s.key}>
                    <div style={{ fontSize: 11, color: s.color, fontWeight: 700, marginBottom: 2 }}>{s.label}</div>
                    <Space wrap size={[4, 2]}>
                      {s.granted.map(f => (
                        <Tag key={f.perm} style={{ fontSize: 10, margin: 0, background: bgContainer }}>{f.label}</Tag>
                      ))}
                    </Space>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right */}
      <div style={{ flex: 1 }}>
        {!selectedUser ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: isDark ? 'rgba(255,255,255,0.25)' : '#CBD5E1' }}>
            <UserOutlined style={{ fontSize: 40, display: 'block', marginBottom: 8 }} />
            <div>Chọn người dùng để xem và chỉnh sửa override</div>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text strong>Override quyền cá nhân</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Cấp thêm hoặc thu hồi quyền riêng, bỏ qua nhóm mặc định.
                </Text>
              </div>
              <Button size="small" icon={<PlusOutlined />} type="primary" onClick={() => setAddOpen(true)}>
                Thêm override
              </Button>
            </div>
            <Table
              loading={isLoading}
              dataSource={overrides}
              rowKey="permissionCode"
              columns={overrideCols}
              size="small"
              pagination={false}
              locale={{ emptyText: <EmptyState compact title="Chưa có override" /> }}
            />
          </>
        )}
      </div>

      <Modal
        open={addOpen}
        title="Override quyền cho người dùng"
        onCancel={() => { setAddOpen(false); form.resetFields(); }}
        onOk={() => form.validateFields().then(v => upsertMut.mutate(v))}
        confirmLoading={upsertMut.isPending}
        okText="Lưu" cancelText="Huỷ"
      >
        <Form form={form} layout="vertical" initialValues={{ granted: true }}>
          <Form.Item name="permissionCode" label="Chức năng" rules={[{ required: true }]}>
            <Select
              showSearch placeholder="Màn hình / Chức năng..."
              options={permOptions}
              filterOption={(input, opt) => (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())}
            />
          </Form.Item>
          <Form.Item name="granted" label="Loại" valuePropName="checked">
            <Switch checkedChildren="Cấp thêm quyền" unCheckedChildren="Thu hồi quyền" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
