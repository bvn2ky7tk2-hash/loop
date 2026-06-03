import { useState, useMemo, useEffect } from 'react';
import {
  Tabs, Table, Tag, Button, Modal, Form, Input, Switch, Select, Space,
  App, Popconfirm, Typography,
  Tree, Badge, Avatar,
} from 'antd';
import { CenteredModal } from '../../../components/ui/CenteredModal';
import { EmptyState } from '../../../components/ui/EmptyState';
import {
  DeleteOutlined, UserOutlined,
  TeamOutlined, SafetyCertificateOutlined, ApartmentOutlined,
  EditOutlined, UserAddOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userGroupsApi, type UserGroupDetail } from '../../../api/user-groups';
import { orgUnitsApi } from '../../../api/org-units';
import { useThemePalette } from '../../../hooks/useThemePalette';
import { fetchUsers, flattenOrgTree, collectAllIds, toTreeNodes } from '../helpers';
import { ScreenPermMatrix } from './ScreenPermMatrix';

const { Text } = Typography;

// ─── GroupDrawer — tạo/sửa nhóm + phân quyền + thành viên + org scope ────────

export interface GroupDrawerProps {
  open: boolean;
  groupId: string | null;   // null = tạo mới
  onClose: () => void;
}

export function GroupDrawer({ open, groupId, onClose }: GroupDrawerProps) {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const { isDark, preset } = useThemePalette();
  const [tab, setTab] = useState('perms');
  const [form] = Form.useForm();
  const [selPerms, setSelPerms] = useState<string[]>([]);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [memberForm] = Form.useForm();
  const [orgChecked, setOrgChecked] = useState<string[]>([]);
  const [orgInclude, setOrgInclude] = useState<Record<string, boolean>>({});

  const isNew = !groupId;

  const { data: detail } = useQuery({
    queryKey: ['user-groups', groupId],
    queryFn: () => userGroupsApi.get(groupId!),
    enabled: !!groupId && open,
  });
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
  });
  const { data: orgTree = [] } = useQuery({
    queryKey: ['org-units'],
    queryFn: orgUnitsApi.getTree,
  });

  const flatOrgMap = useMemo(() => flattenOrgTree(orgTree), [orgTree]);
  const allOrgIds  = useMemo(() => collectAllIds(orgTree), [orgTree]);

  // sync state khi drawer mở hoặc detail thay đổi
  useEffect(() => {
    if (!open) return;
    if (detail) {
      setSelPerms(detail.permissions.map(p => p.permCode));
      const checked = detail.orgAccess.map(a => a.orgUnit.id);
      setOrgChecked(checked);
      const inc: Record<string, boolean> = {};
      detail.orgAccess.forEach(a => { inc[a.orgUnit.id] = a.includeChildren; });
      setOrgInclude(inc);
      form.setFieldsValue({ name: detail.name, description: detail.description, isDefault: detail.isDefault });
    } else if (isNew) {
      setSelPerms([]);
      setOrgChecked([]);
      setOrgInclude({});
      form.resetFields();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail, open]);

  const createMut = useMutation({
    mutationFn: userGroupsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user-groups'] });
      message.success('Đã tạo nhóm');
      onClose();
    },
    onError: (e: Error) => message.error(e.message ?? 'Lỗi khi tạo'),
  });

  const updateMut = useMutation({
    mutationFn: (data: Parameters<typeof userGroupsApi.update>[1]) =>
      userGroupsApi.update(groupId!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user-groups', groupId] });
      qc.invalidateQueries({ queryKey: ['user-groups'] });
      message.success('Đã lưu');
    },
  });

  const setPermsMut = useMutation({
    mutationFn: (codes: string[]) => userGroupsApi.setPermissions(groupId!, codes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user-groups', groupId] });
      message.success('Đã lưu quyền');
    },
  });

  const addMemberMut = useMutation({
    mutationFn: (userId: string) => userGroupsApi.addMember(groupId!, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user-groups', groupId] });
      message.success('Đã thêm thành viên');
      setAddMemberOpen(false);
      memberForm.resetFields();
    },
  });

  const removeMemberMut = useMutation({
    mutationFn: (userId: string) => userGroupsApi.removeMember(groupId!, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user-groups', groupId] });
      message.success('Đã xoá thành viên');
    },
  });

  const setOrgMut = useMutation({
    mutationFn: () =>
      userGroupsApi.setOrgAccess(
        groupId!,
        orgChecked.map(id => ({ orgUnitId: id, includeChildren: orgInclude[id] ?? true })),
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user-groups', groupId] });
      message.success('Đã lưu phạm vi tổ chức');
    },
  });

  const { borderColor: border, bgContainer: cardBg } = useThemePalette();

  const handleSaveInfo = () =>
    form.validateFields().then(values => {
      if (isNew) createMut.mutate(values);
      else updateMut.mutate(values);
    });

  const memberCols = [
    {
      title: 'Thành viên',
      render: (_: unknown, row: NonNullable<UserGroupDetail['members']>[number]) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar size={32} icon={<UserOutlined />} style={{ background: preset.primary, flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{row.user.name}</div>
            <div style={{ fontSize: 11, color: isDark ? 'rgba(255,255,255,0.4)' : '#94A3B8' }}>{row.user.email}</div>
          </div>
        </div>
      ),
    },
    {
      title: 'Vai trò HT',
      dataIndex: ['user', 'role'],
      render: (r: string) => {
        const c: Record<string, string> = { ADMIN: 'red', LEADERSHIP: 'purple', PM: 'blue', MEMBER: 'default' };
        const n: Record<string, string> = { ADMIN: 'Quản trị viên', LEADERSHIP: 'Ban lãnh đạo', PM: 'Quản lý DA', MEMBER: 'Thành viên' };
        return <Tag color={c[r] ?? 'default'}>{n[r] ?? r}</Tag>;
      },
    },
    {
      title: '',
      render: (_: unknown, row: NonNullable<UserGroupDetail['members']>[number]) => (
        <Popconfirm
          title="Xoá khỏi nhóm?"
          onConfirm={() => removeMemberMut.mutate(row.user.id)}
          okText="Xoá" cancelText="Huỷ" okButtonProps={{ danger: true }}
        >
          <Button size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  const memberOptions = users
    .filter(u => !detail?.members.some(m => m.user.id === u.id))
    .map(u => ({ value: u.id, label: `${u.name} — ${u.email}` }));

  const treeData = useMemo(() => toTreeNodes(orgTree), [orgTree]);

  return (
    <CenteredModal
      title={isNew ? 'Tạo nhóm người dùng mới' : `Nhóm: ${detail?.name ?? '...'}`}
      width={700}
      open={open}
      onClose={onClose}
      styles={{ body: { padding: 0 } }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

        {/* ── Tabs bên trái ── */}
        <Tabs
          activeKey={tab}
          onChange={setTab}
          tabPosition="top"
          style={{ flex: 1, overflow: 'hidden' }}
          tabBarStyle={{ padding: '0 20px', marginBottom: 0 }}
          items={[
            {
              key: 'info',
              label: <><EditOutlined /> Thông tin</>,
              children: (
                <div style={{ padding: '20px 24px' }}>
                  <Form form={form} layout="vertical">
                    <Form.Item name="name" label="Tên nhóm" rules={[{ required: true, message: 'Nhập tên nhóm' }]}>
                      <Input placeholder="Ví dụ: Nhóm Kinh doanh, Nhóm Kỹ thuật..." />
                    </Form.Item>
                    <Form.Item name="description" label="Mô tả">
                      <Input.TextArea rows={2} placeholder="Mô tả ngắn về nhóm này..." />
                    </Form.Item>
                    <Form.Item name="isDefault" label="Nhóm mặc định" valuePropName="checked"
                      extra="Người dùng mới sẽ tự động được gán vào nhóm này">
                      <Switch checkedChildren="Có" unCheckedChildren="Không" />
                    </Form.Item>
                    <Button type="primary" loading={createMut.isPending || updateMut.isPending} disabled={createMut.isPending || updateMut.isPending} onClick={handleSaveInfo}>
                      {isNew ? 'Tạo nhóm' : 'Lưu thông tin'}
                    </Button>
                  </Form>
                </div>
              ),
            },
            {
              key: 'perms',
              label: <><SafetyCertificateOutlined /> Quyền truy cập</>,
              disabled: isNew,
              children: (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <div style={{
                    padding: '10px 20px 8px',
                    borderBottom: `1px solid ${border}`,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    flexShrink: 0,
                  }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Tích chọn màn hình và chức năng được phép sử dụng
                    </Text>
                    <Button
                      type="primary" size="small"
                      loading={setPermsMut.isPending}
                      disabled={setPermsMut.isPending}
                      onClick={() => setPermsMut.mutate(selPerms)}
                    >
                      Lưu quyền
                    </Button>
                  </div>
                  <div style={{ flex: 1, overflowY: 'auto', padding: '0' }}>
                    <ScreenPermMatrix
                      selected={selPerms}
                      onChange={setSelPerms}
                      isDark={isDark}
                    />
                  </div>
                </div>
              ),
            },
            {
              key: 'members',
              label: <><TeamOutlined /> Thành viên {detail && <Badge count={detail._count?.members ?? 0} size="small" style={{ backgroundColor: preset.primary }} />}</>,
              disabled: isNew,
              children: (
                <div style={{ padding: '16px 20px' }}>
                  <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between' }}>
                    <Text type="secondary" style={{ fontSize: 13 }}>
                      Người dùng trong nhóm sẽ nhận toàn bộ quyền của nhóm
                    </Text>
                    <Button size="small" icon={<UserAddOutlined />} type="primary" onClick={() => setAddMemberOpen(true)}>
                      Thêm thành viên
                    </Button>
                  </div>
                  <Table
                    dataSource={detail?.members ?? []}
                    rowKey={r => r.user.id}
                    columns={memberCols}
                    size="small"
                    pagination={false}
                    locale={{ emptyText: <EmptyState compact title="Chưa có thành viên" /> }}
                  />
                  <Modal
                    open={addMemberOpen}
                    title="Thêm thành viên vào nhóm"
                    onCancel={() => { setAddMemberOpen(false); memberForm.resetFields(); }}
                    onOk={() => memberForm.validateFields().then(v => addMemberMut.mutate(v.userId))}
                    confirmLoading={addMemberMut.isPending}
                    okText="Thêm" cancelText="Huỷ"
                  >
                    <Form form={memberForm} layout="vertical">
                      <Form.Item name="userId" label="Người dùng" rules={[{ required: true }]}>
                        <Select
                          showSearch
                          placeholder="Tìm theo tên hoặc email..."
                          options={memberOptions}
                          filterOption={(input, opt) =>
                            (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
                          }
                        />
                      </Form.Item>
                    </Form>
                  </Modal>
                </div>
              ),
            },
            {
              key: 'org',
              label: <><ApartmentOutlined /> Phạm vi tổ chức</>,
              disabled: isNew,
              children: (
                <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <Text strong style={{ fontSize: 14 }}>Đơn vị tổ chức được phép truy cập</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Tích chọn các node. Mặc định bao gồm cả đơn vị con.
                      </Text>
                    </div>
                    <Space size={6}>
                      <Button
                        size="small"
                        onClick={() => {
                          setOrgChecked(allOrgIds);
                          const inc: Record<string, boolean> = {};
                          allOrgIds.forEach(id => { inc[id] = true; });
                          setOrgInclude(inc);
                        }}
                        disabled={allOrgIds.length === 0}
                      >
                        Chọn tất cả
                      </Button>
                      <Button
                        size="small" danger
                        onClick={() => { setOrgChecked([]); setOrgInclude({}); }}
                        disabled={orgChecked.length === 0}
                      >
                        Bỏ tất cả
                      </Button>
                      <Button
                        type="primary" size="small"
                        loading={setOrgMut.isPending}
                        disabled={setOrgMut.isPending}
                        onClick={() => setOrgMut.mutate()}
                      >
                        Lưu phạm vi
                      </Button>
                    </Space>
                  </div>

                  {/* Danh sách đang chọn — hiển thị tên thay vì UUID */}
                  {orgChecked.length > 0 && (
                    <div style={{ padding: '8px 12px', background: cardBg, borderRadius: 6, border: `1px solid ${border}` }}>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        Đang chọn ({orgChecked.length} đơn vị):
                      </Text>
                      <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {orgChecked.map(id => {
                          const unit = flatOrgMap[id];
                          return (
                            <Tag
                              key={id}
                              color="blue"
                              closable
                              onClose={() => {
                                setOrgChecked(prev => prev.filter(x => x !== id));
                                setOrgInclude(prev => { const n = { ...prev }; delete n[id]; return n; });
                              }}
                              style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                            >
                              <span>{unit ? `${unit.name} [${unit.code}]` : id}</span>
                              <Switch
                                size="small"
                                checkedChildren="+Con"
                                unCheckedChildren="Node"
                                checked={orgInclude[id] ?? true}
                                onChange={v => setOrgInclude(prev => ({ ...prev, [id]: v }))}
                                style={{ marginLeft: 4 }}
                              />
                            </Tag>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Cây tổ chức */}
                  <div style={{ border: `1px solid ${border}`, borderRadius: 8, padding: '12px', background: cardBg }}>
                    {treeData.length > 0 ? (
                      <Tree
                        checkable
                        treeData={treeData}
                        checkedKeys={orgChecked}
                        onCheck={(checked) => {
                          const ids = Array.isArray(checked) ? checked : checked.checked;
                          setOrgChecked(ids as string[]);
                        }}
                        defaultExpandAll
                        selectable={false}
                      />
                    ) : (
                      <EmptyState title="Chưa có sơ đồ tổ chức" />
                    )}
                  </div>
                </div>
              ),
            },
          ]}
        />
      </div>
    </CenteredModal>
  );
}
