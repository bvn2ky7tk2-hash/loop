import { useState, useMemo, useEffect } from 'react';
import {
  Tabs, Table, Tag, Button, Modal, Form, Input, Switch, Select, Space,
  App, Popconfirm, Checkbox, Tooltip, Typography, Alert,
  Tree, Badge, Avatar, Empty, Divider, Segmented,
} from 'antd';
import { CenteredModal } from '../../components/ui/CenteredModal';
import type { DataNode } from 'antd/es/tree';
import {
  PlusOutlined, DeleteOutlined, SettingOutlined, UserOutlined,
  TeamOutlined, SafetyCertificateOutlined, ApartmentOutlined,
  CheckOutlined, CloseOutlined, EditOutlined, UserAddOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { permissionsApi, type PermissionDef } from '../../api/permissions';
import { userGroupsApi, type UserGroup, type UserGroupDetail } from '../../api/user-groups';
import { usersApi } from '../../api/users';
import { orgUnitsApi, type OrgUnitTree } from '../../api/org-units';
import { useThemePalette } from '../../hooks/useThemePalette';
import {
  PERM_DOMAIN_COLOR, PERM_DOMAIN_LABEL, PERM_DOMAIN_MODULE,
  MODULE_LABELS, ACTION_LABELS,
} from '../../config/screens.registry';

const { Text, Title } = Typography;

// ─── Derive screens + module groups từ permission list ───────────────────────

interface PermScreen {
  key: string;
  label: string;
  color: string;
  appModule: string;
  funcs: { perm: string; label: string }[];
}

interface ModuleGroup {
  key: string;
  label: string;
  domains: string[];
}

function buildScreens(perms: PermissionDef[]): { screens: PermScreen[]; moduleGroups: ModuleGroup[] } {
  // Group permissions by domain (module field)
  const domainMap = new Map<string, PermissionDef[]>();
  for (const p of perms) {
    if (!domainMap.has(p.module)) domainMap.set(p.module, []);
    domainMap.get(p.module)!.push(p);
  }

  const screens: PermScreen[] = [];
  for (const [domain, list] of domainMap) {
    screens.push({
      key: domain,
      label: PERM_DOMAIN_LABEL[domain] ?? domain,
      color: PERM_DOMAIN_COLOR[domain] ?? '#94A3B8',
      appModule: PERM_DOMAIN_MODULE[domain] ?? 'general',
      funcs: list.map(p => ({
        perm: p.code,
        label: ACTION_LABELS[p.action] ?? p.action,
      })),
    });
  }

  // Build module groups from unique appModule values
  const moduleSet = new Map<string, string[]>();
  for (const s of screens) {
    if (!moduleSet.has(s.appModule)) moduleSet.set(s.appModule, []);
    moduleSet.get(s.appModule)!.push(s.key);
  }

  const moduleGroups: ModuleGroup[] = [
    { key: 'all', label: 'Tất cả', domains: screens.map(s => s.key) },
    ...Array.from(moduleSet.entries()).map(([mod, domains]) => ({
      key: mod,
      label: MODULE_LABELS[mod] ?? mod,
      domains,
    })),
  ];

  return { screens, moduleGroups };
}

// ─── Flatten OrgUnitTree → map id → {name, code} ─────────────────────────────

function flattenOrgTree(nodes: OrgUnitTree[]): Record<string, { name: string; code: string }> {
  const map: Record<string, { name: string; code: string }> = {};
  function walk(ns: OrgUnitTree[]) {
    for (const n of ns) {
      map[n.id] = { name: n.name, code: n.code };
      if (n.children?.length) walk(n.children);
    }
  }
  walk(nodes);
  return map;
}

function collectAllIds(nodes: OrgUnitTree[]): string[] {
  const ids: string[] = [];
  function walk(ns: OrgUnitTree[]) {
    for (const n of ns) {
      ids.push(n.id);
      if (n.children?.length) walk(n.children);
    }
  }
  walk(nodes);
  return ids;
}

// ─── ScreenPermMatrix — bảng tích chọn màn hình × chức năng ─────────────────

function ScreenPermMatrix({
  selected,
  onChange,
  isDark,
}: {
  selected: string[];
  onChange: (codes: string[]) => void;
  isDark: boolean;
}) {
  const [activeModule, setActiveModule] = useState('all');
  const sel = new Set(selected);

  const { data: allPermsData = [] } = useQuery({
    queryKey: ['permissions', 'all'],
    queryFn: permissionsApi.listAll,
    staleTime: 5 * 60_000,
  });

  const { screens, moduleGroups } = useMemo(() => buildScreens(allPermsData), [allPermsData]);

  const visibleScreens = useMemo(() => {
    const group = moduleGroups.find(g => g.key === activeModule);
    return screens.filter(s => group?.domains.includes(s.key));
  }, [activeModule, screens, moduleGroups]);

  const visiblePerms = visibleScreens.flatMap(s => s.funcs.map(f => f.perm));
  const allVisibleChecked = visiblePerms.length > 0 && visiblePerms.every(p => sel.has(p));
  const someVisibleChecked = visiblePerms.some(p => sel.has(p));

  const toggleSelectAll = () => {
    const next = new Set(sel);
    if (allVisibleChecked) {
      visiblePerms.forEach(p => next.delete(p));
    } else {
      visiblePerms.forEach(p => next.add(p));
    }
    onChange(Array.from(next));
  };

  const toggle = (perm: string) => {
    const next = new Set(sel);
    next.has(perm) ? next.delete(perm) : next.add(perm);
    onChange(Array.from(next));
  };

  const toggleScreen = (screen: PermScreen) => {
    const allPerms = screen.funcs.map(f => f.perm);
    const allChecked = allPerms.every(p => sel.has(p));
    const next = new Set(sel);
    allPerms.forEach(p => allChecked ? next.delete(p) : next.add(p));
    onChange(Array.from(next));
  };

  const { borderColor: border, bgSubPanel: hdrBg, bgContainer: cellBg, bgCard: hoverBg, textSecondary } = useThemePalette();

  return (
    <div>
      {/* Toolbar: filter module + select all/deselect all */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px', borderBottom: `1px solid ${border}`,
        flexWrap: 'wrap', gap: 8,
      }}>
        <Segmented
          size="small"
          value={activeModule}
          onChange={v => setActiveModule(v as string)}
          options={moduleGroups.map(g => ({ label: g.label, value: g.key }))}
        />
        <Space size={6}>
          <Button
            size="small"
            type={allVisibleChecked ? 'default' : 'primary'}
            ghost={!allVisibleChecked}
            onClick={toggleSelectAll}
            disabled={visiblePerms.length === 0}
          >
            {allVisibleChecked ? 'Bỏ tất cả' : 'Chọn tất cả'}
          </Button>
          {someVisibleChecked && !allVisibleChecked && (
            <Button size="small" danger onClick={() => {
              const next = new Set(sel);
              visiblePerms.forEach(p => next.delete(p));
              onChange(Array.from(next));
            }}>
              Bỏ chọn nhóm này
            </Button>
          )}
        </Space>
      </div>

      {/* Bảng */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: hdrBg }}>
              <th style={{ padding: '8px 14px', textAlign: 'left', borderBottom: `2px solid ${border}`, width: 160, fontWeight: 700 }}>
                Màn hình
              </th>
              <th style={{ padding: '8px 12px', textAlign: 'center', borderBottom: `2px solid ${border}`, width: 70, fontWeight: 700, color: textSecondary }}>
                Tất cả
              </th>
              <th style={{ padding: '8px 14px', textAlign: 'left', borderBottom: `2px solid ${border}`, fontWeight: 700, color: textSecondary }}>
                Chức năng
              </th>
            </tr>
          </thead>
          <tbody>
            {visibleScreens.map((screen, idx) => {
              const allPerms   = screen.funcs.map(f => f.perm);
              const checked    = allPerms.filter(p => sel.has(p)).length;
              const allChecked = checked === allPerms.length;
              const partial    = checked > 0 && !allChecked;

              return (
                <tr
                  key={screen.key}
                  style={{ background: idx % 2 === 0 ? cellBg : hdrBg, transition: 'background 0.1s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = hoverBg)}
                  onMouseLeave={e => (e.currentTarget.style.background = idx % 2 === 0 ? cellBg : hdrBg)}
                >
                  <td style={{ padding: '8px 14px', borderBottom: `1px solid ${border}`, whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: screen.color, flexShrink: 0 }} />
                      <span style={{ fontWeight: 600 }}>{screen.label}</span>
                      {checked > 0 && (
                        <Badge count={`${checked}/${allPerms.length}`} style={{ backgroundColor: screen.color, fontSize: 10 }} />
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '8px 12px', borderBottom: `1px solid ${border}`, textAlign: 'center' }}>
                    <Checkbox checked={allChecked} indeterminate={partial} onChange={() => toggleScreen(screen)} />
                  </td>
                  <td style={{ padding: '8px 14px', borderBottom: `1px solid ${border}` }}>
                    <Space wrap size={[6, 6]}>
                      {screen.funcs.map(func => (
                        <Tooltip key={func.perm} title={func.perm}>
                          <div
                            onClick={() => toggle(func.perm)}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 5,
                              padding: '2px 10px', borderRadius: 5, cursor: 'pointer',
                              border: `1px solid ${sel.has(func.perm) ? screen.color : border}`,
                              background: sel.has(func.perm)
                                ? (isDark ? `${screen.color}30` : `${screen.color}12`)
                                : 'transparent',
                              fontSize: 12, transition: 'all 0.12s', userSelect: 'none',
                            }}
                          >
                            {sel.has(func.perm)
                              ? <CheckOutlined style={{ color: screen.color, fontSize: 11 }} />
                              : <CloseOutlined style={{ color: textSecondary, fontSize: 10 }} />
                            }
                            <span style={{ color: sel.has(func.perm) ? (isDark ? '#F1F5F9' : screen.color) : undefined }}>
                              {func.label}
                            </span>
                          </div>
                        </Tooltip>
                      ))}
                    </Space>
                  </td>
                </tr>
              );
            })}
            {visibleScreens.length === 0 && (
              <tr>
                <td colSpan={3} style={{ padding: '24px', textAlign: 'center', color: isDark ? 'rgba(255,255,255,0.3)' : '#CBD5E1' }}>
                  Không có màn hình nào
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Chuyển OrgUnitTree → Tree DataNode ──────────────────────────────────────

function toTreeNodes(nodes: OrgUnitTree[]): DataNode[] {
  return nodes.map(n => ({
    key: n.id,
    title: (
      <span>
        {n.name}
        <Text type="secondary" style={{ fontSize: 11, marginLeft: 6 }}>
          [{n.code}]
        </Text>
      </span>
    ),
    children: n.children?.length ? toTreeNodes(n.children) : undefined,
  }));
}

// ─── GroupDrawer — tạo/sửa nhóm + phân quyền + thành viên + org scope ────────

interface GroupDrawerProps {
  open: boolean;
  groupId: string | null;   // null = tạo mới
  onClose: () => void;
}

function GroupDrawer({ open, groupId, onClose }: GroupDrawerProps) {
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
    queryFn: usersApi.list,
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

  const { borderColor: border, bgContainer: cardBg, textMuted, bgSubPanel } = useThemePalette();

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
                    locale={{ emptyText: <Empty description="Chưa có thành viên" /> }}
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
                      <Empty description="Chưa có sơ đồ tổ chức" />
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

// ─── Tab: Nhóm người dùng ─────────────────────────────────────────────────────

function UserGroupsTab() {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const { isDark, preset, textMuted } = useThemePalette();
  const [drawerGroupId, setDrawerGroupId] = useState<string | null | undefined>(undefined);

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['user-groups'],
    queryFn: userGroupsApi.list,
  });

  const deleteMut = useMutation({
    mutationFn: userGroupsApi.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user-groups'] });
      message.success('Đã xoá nhóm');
    },
  });

  const border = isDark ? '#334155' : '#E2E8F0';

  const cols = [
    {
      title: 'Tên nhóm',
      dataIndex: 'name',
      render: (name: string, row: UserGroup) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{name}</div>
          {row.description && (
            <div style={{ fontSize: 12, color: textMuted }}>{row.description}</div>
          )}
          {row.isDefault && <Tag color="green" style={{ marginTop: 2, fontSize: 11 }}>Mặc định</Tag>}
        </div>
      ),
    },
    {
      title: 'Quyền',
      dataIndex: '_count',
      width: 100,
      render: (c: UserGroup['_count']) => (
        <div style={{ textAlign: 'center' }}>
          <Badge count={c?.permissions ?? 0} showZero style={{ backgroundColor: preset.primary }} />
          <div style={{ fontSize: 10, color: isDark ? 'rgba(255,255,255,0.4)' : '#94A3B8', marginTop: 2 }}>quyền</div>
        </div>
      ),
    },
    {
      title: 'Thành viên',
      dataIndex: '_count',
      width: 100,
      render: (c: UserGroup['_count']) => (
        <div style={{ textAlign: 'center' }}>
          <Badge count={c?.members ?? 0} showZero style={{ backgroundColor: '#059669' }} />
          <div style={{ fontSize: 10, color: isDark ? 'rgba(255,255,255,0.4)' : '#94A3B8', marginTop: 2 }}>người</div>
        </div>
      ),
    },
    {
      title: 'Phạm vi tổ chức',
      dataIndex: 'orgAccess',
      render: (acc: UserGroup['orgAccess']) => (
        acc && acc.length > 0
          ? <Tag color="blue" icon={<ApartmentOutlined />}>{acc.length} đơn vị</Tag>
          : <Tag color="orange">Theo vai trò</Tag>
      ),
    },
    {
      title: 'Thao tác',
      width: 140,
      render: (_: unknown, row: UserGroup) => (
        <Space>
          <Button
            size="small" icon={<SettingOutlined />}
            onClick={() => setDrawerGroupId(row.id)}
          >
            Chỉnh sửa
          </Button>
          <Popconfirm
            title="Xoá nhóm này?"
            description="Tất cả quyền và thành viên sẽ bị xoá theo."
            onConfirm={() => deleteMut.mutate(row.id)}
            okText="Xoá" cancelText="Huỷ" okButtonProps={{ danger: true }}
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Alert
        type="info" showIcon style={{ marginBottom: 14 }}
        message="Nhóm người dùng giúp phân quyền theo tập thể. User thuộc nhiều nhóm sẽ được cộng quyền (union). Phạm vi tổ chức xác định dữ liệu nào user được xem."
      />
      <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'flex-end' }}>
        <Button icon={<PlusOutlined />} type="primary" onClick={() => setDrawerGroupId(null)}>
          Tạo nhóm mới
        </Button>
      </div>
      <Table
        loading={isLoading}
        dataSource={groups}
        rowKey="id"
        columns={cols}
        size="small"
        pagination={false}
        style={{ border: `1px solid ${border}`, borderRadius: 8 }}
        rowClassName={() => 'perm-row'}
      />
      {drawerGroupId !== undefined && (
        <GroupDrawer
          open
          groupId={drawerGroupId}
          onClose={() => setDrawerGroupId(undefined)}
        />
      )}
    </>
  );
}

// ─── Tab: Phân quyền người dùng (override cá nhân) ───────────────────────────

function UserOverridesTab() {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const { isDark, preset, textMuted, bgSubPanel, bgContainer } = useThemePalette();
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [form] = Form.useForm();

  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: usersApi.list });

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
              locale={{ emptyText: <Empty description="Chưa có override" /> }}
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

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function PermissionsPage() {
  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: 20 }}>
        <Title level={4} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          <SafetyCertificateOutlined />
          Quản lý phân quyền
        </Title>
        <Text type="secondary" style={{ fontSize: 13 }}>
          Tạo nhóm người dùng, phân quyền theo màn hình & chức năng, và giới hạn phạm vi tổ chức
        </Text>
      </div>

      <Divider style={{ margin: '0 0 16px' }} />

      <App>
        <Tabs
          defaultActiveKey="groups"
          items={[
            {
              key: 'groups',
              label: <span><TeamOutlined /> Nhóm người dùng</span>,
              children: <UserGroupsTab />,
            },
            {
              key: 'user-overrides',
              label: <span><UserOutlined /> Override cá nhân</span>,
              children: <UserOverridesTab />,
            },
          ]}
        />
      </App>
    </div>
  );
}
