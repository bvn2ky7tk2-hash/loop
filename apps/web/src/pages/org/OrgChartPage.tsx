import { useState, useMemo } from 'react';
import {
  Button, Form, Input, Select, Modal, App, Spin, Space,
  Popconfirm, Tooltip, theme, Checkbox, Tag,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  BankOutlined, ApartmentOutlined, TeamOutlined, UserOutlined,
  PlusCircleOutlined, SettingOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orgUnitsApi, type OrgUnitTree } from '../../api/org-units';
import { employeesApi, type Employee } from '../../api/employees';
import { useThemeStore } from '../../store/theme.store';

// ── Helpers ───────────────────────────────────────────────────────────────────

function flattenTree(nodes: OrgUnitTree[]): OrgUnitTree[] {
  return nodes.flatMap((n) => [n, ...flattenTree(n.children ?? [])]);
}

const LEVEL_HUE = ['#7C3AED', '#2563EB', '#16A34A', '#EA580C', '#0891B2', '#DC2626'];

function getLevelHue(level: number): string {
  return LEVEL_HUE[Math.min(level ?? 0, LEVEL_HUE.length - 1)];
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  const colors = ['#7C3AED', '#2563EB', '#16A34A', '#EA580C', '#0891B2', '#BE185D', '#B45309'];
  return colors[Math.abs(hash) % colors.length];
}

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  const bg = stringToColor(name);
  return (
    <div
      title={name}
      style={{
        width: size, height: size, borderRadius: '50%',
        background: bg, color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.38, fontWeight: 700, flexShrink: 0,
        border: '2px solid rgba(255,255,255,0.3)',
        cursor: 'default', userSelect: 'none',
      }}
    >
      {getInitials(name)}
    </div>
  );
}

// ── OrgNode ───────────────────────────────────────────────────────────────────
interface OrgNodeProps {
  node: OrgUnitTree;
  employees: Employee[];
  levelDirections: Record<number, 'horizontal' | 'vertical'>;
  isDark: boolean;
  onAddChild: (parentId: string) => void;
  onEdit: (node: OrgUnitTree) => void;
  onDelete: (id: string) => void;
}

function OrgNode({ node, employees, levelDirections, isDark, onAddChild, onEdit, onDelete }: OrgNodeProps) {
  const hue = getLevelHue(node.level ?? 0);
  const LevelIcon = [BankOutlined, ApartmentOutlined, TeamOutlined, UserOutlined][Math.min(node.level ?? 0, 3)];
  const unitEmps = employees.filter((e) => e.orgUnitId === node.id);
  const hasChildren = (node.children ?? []).length > 0;
  const childDirection = levelDirections[(node.level ?? 0) + 1] ?? 'horizontal';

  const nodeBg     = isDark ? `${hue}18` : `${hue}0A`;
  const borderTop  = hue;
  const textMain   = isDark ? '#F1F5F9' : '#0F172A';
  const textSub    = isDark ? 'rgba(255,255,255,0.5)' : '#475569';
  const connColor  = isDark ? '#334155' : '#CBD5E1';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
      {/* Card */}
      <div style={{
        background: nodeBg,
        border: `1px solid ${borderTop}40`,
        borderTop: `3px solid ${borderTop}`,
        borderRadius: 10,
        padding: '10px 14px',
        minWidth: 160,
        maxWidth: 200,
        boxShadow: isDark
          ? '0 2px 8px rgba(0,0,0,0.35)'
          : '0 2px 8px rgba(0,0,0,0.08)',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            background: isDark ? `${hue}25` : `${hue}18`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <LevelIcon style={{ color: hue, fontSize: 15 }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 12, color: textMain, lineHeight: 1.35, wordBreak: 'break-word' }}>
              {node.name}
            </div>
            <span style={{
              fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4,
              background: isDark ? `${hue}28` : `${hue}15`, color: hue,
              letterSpacing: '0.4px', display: 'inline-block', marginTop: 2,
            }}>
              {node.code}
            </span>
          </div>
        </div>

        {/* Avatars */}
        {unitEmps.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
            {unitEmps.slice(0, 5).map((e) => (
              <Avatar key={e.id} name={e.fullName} size={26} />
            ))}
            {unitEmps.length > 5 && (
              <div style={{
                width: 26, height: 26, borderRadius: '50%', fontSize: 10, fontWeight: 700,
                background: isDark ? '#334155' : '#E2E8F0',
                color: textSub,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                +{unitEmps.length - 5}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, color: textSub, display: 'flex', alignItems: 'center', gap: 3 }}>
            <UserOutlined style={{ fontSize: 10 }} />
            {unitEmps.length} nhân sự
          </span>
          <Space size={2}>
            <Tooltip title="Thêm đơn vị con">
              <Button type="text" size="small" icon={<PlusCircleOutlined />}
                style={{ color: hue, height: 22, width: 22, padding: 0, fontSize: 13 }}
                onClick={() => onAddChild(node.id)} />
            </Tooltip>
            <Tooltip title="Sửa">
              <Button type="text" size="small" icon={<EditOutlined />}
                style={{ color: textSub, height: 22, width: 22, padding: 0, fontSize: 12 }}
                onClick={() => onEdit(node)} />
            </Tooltip>
            <Popconfirm
              title="Xoá đơn vị này?"
              description="Đơn vị con và nhân sự liên kết sẽ bị ảnh hưởng."
              onConfirm={() => onDelete(node.id)}
              okText="Xoá" cancelText="Huỷ" okButtonProps={{ danger: true }}
            >
              <Tooltip title="Xoá">
                <Button type="text" size="small" danger icon={<DeleteOutlined />}
                  style={{ height: 22, width: 22, padding: 0, fontSize: 12 }} />
              </Tooltip>
            </Popconfirm>
          </Space>
        </div>
      </div>

      {/* Connector line down to children */}
      {hasChildren && (
        <div style={{ width: 2, height: 20, background: connColor, flexShrink: 0 }} />
      )}

      {/* Children container */}
      {hasChildren && (
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {childDirection === 'horizontal' ? (
            <>
              {/* Horizontal bar spanning children */}
              <div style={{ position: 'relative', display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: 0 }}>
                {(node.children ?? []).map((child, idx, arr) => (
                  <div key={child.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                    {/* Horizontal connector */}
                    <div style={{
                      height: 2, background: connColor,
                      position: 'absolute', top: 0,
                      left: idx === 0 ? '50%' : 0,
                      right: idx === arr.length - 1 ? '50%' : 0,
                      width: arr.length === 1 ? 0
                        : (idx === 0 || idx === arr.length - 1) ? 'calc(50% + 1px)' : '100%',
                    }} />
                    {/* Vertical drop */}
                    <div style={{ width: 2, height: 20, background: connColor, marginTop: 0 }} />
                    {/* Padding between siblings */}
                    <div style={{ paddingLeft: 12, paddingRight: 12 }}>
                      <OrgNode node={child} employees={employees} levelDirections={levelDirections}
                        isDark={isDark} onAddChild={onAddChild} onEdit={onEdit} onDelete={onDelete} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            /* Vertical: children stacked */
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
              {(node.children ?? []).map((child) => (
                <div key={child.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <OrgNode node={child} employees={employees} levelDirections={levelDirections}
                    isDark={isDark} onAddChild={onAddChild} onEdit={onEdit} onDelete={onDelete} />
                  {/* connector between vertical siblings handled by child's own top connector */}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function OrgChartPage() {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const { token } = theme.useToken();
  const { mode } = useThemeStore();
  const isDark = mode === 'dark';

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<OrgUnitTree | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();

  // level → direction: true = horizontal, false = vertical
  const [horizontalLevels, setHorizontalLevels] = useState<Set<number>>(new Set([1, 2]));

  const bgContainer  = isDark ? '#1E293B' : '#ffffff';
  const borderColor  = isDark ? '#334155' : '#E2E8F0';
  const textPrimary  = isDark ? '#F1F5F9' : '#0F172A';
  const textSecondary = isDark ? 'rgba(255,255,255,0.5)' : '#475569';

  const { data: tree = [], isLoading: treeLoading } = useQuery({
    queryKey: ['org-units'],
    queryFn: orgUnitsApi.getTree,
  });

  const { data: allEmployees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: employeesApi.list,
  });

  const flat = flattenTree(tree);
  const maxLevel = flat.reduce((m, n) => Math.max(m, n.level ?? 0), 0);

  // Convert horizontalLevels set to record for OrgNode
  const levelDirections = useMemo(() => {
    const map: Record<number, 'horizontal' | 'vertical'> = {};
    for (let i = 0; i <= maxLevel + 1; i++) {
      map[i] = i <= 2 && horizontalLevels.has(i) ? 'horizontal' : 'vertical';
    }
    return map;
  }, [horizontalLevels, maxLevel]);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: orgUnitsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['org-units'] });
      message.success('Đã tạo đơn vị tổ chức');
      setCreateOpen(false);
      createForm.resetFields();
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      message.error(err.response?.data?.message ?? 'Tạo thất bại'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof orgUnitsApi.update>[1] }) =>
      orgUnitsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['org-units'] });
      message.success('Đã cập nhật');
      setEditTarget(null);
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      message.error(err.response?.data?.message ?? 'Cập nhật thất bại'),
  });

  const deleteMutation = useMutation({
    mutationFn: orgUnitsApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['org-units'] });
      message.success('Đã xoá đơn vị');
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      message.error(err.response?.data?.message ?? 'Xoá thất bại'),
  });

  function openEdit(node: OrgUnitTree) {
    setEditTarget(node);
    editForm.setFieldsValue({ name: node.name, code: node.code, parentId: node.parentId ?? null });
  }

  function openCreateWithParent(parentId: string) {
    createForm.setFieldValue('parentId', parentId);
    setCreateOpen(true);
  }

  const MAX_CONFIGURABLE = 2; // chỉ cấp 0–2 được tuỳ chỉnh, cấp 3+ luôn dọc

  const toggleLevel = (level: number) => {
    if (level > MAX_CONFIGURABLE) return;
    setHorizontalLevels((prev) => {
      const next = new Set(prev);
      if (next.has(level)) next.delete(level);
      else next.add(level);
      return next;
    });
  };

  const isLoading = treeLoading;

  return (
    <div style={{ padding: '20px 24px', minHeight: '100vh', background: token.colorBgLayout }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: textPrimary }}>
            Sơ đồ tổ chức
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: textSecondary }}>
            Cơ cấu và phân cấp phòng ban
          </p>
        </div>
        <Space>
          <Tooltip title="Cài đặt hướng hiển thị">
            <Button icon={<SettingOutlined />} onClick={() => setSettingsOpen(true)}>
              Hướng cấp độ
            </Button>
          </Tooltip>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => { createForm.resetFields(); setCreateOpen(true); }}
          >
            Thêm đơn vị
          </Button>
        </Space>
      </div>

      {/* Level direction legend */}
      {!isLoading && flat.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          marginBottom: 16, flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 12, color: textSecondary }}>Hướng theo cấp:</span>
          {[0, 1, 2].filter((lvl) => lvl <= maxLevel).map((lvl) => (
            <Tag
              key={lvl}
              color={horizontalLevels.has(lvl) ? 'blue' : 'default'}
              style={{ cursor: 'pointer', userSelect: 'none', borderRadius: 6 }}
              onClick={() => toggleLevel(lvl)}
            >
              Cấp {lvl} — {horizontalLevels.has(lvl) ? '⟷ Ngang' : '↕ Dọc'}
            </Tag>
          ))}
          {maxLevel > 2 && (
            <span style={{ fontSize: 11, color: textSecondary, fontStyle: 'italic' }}>
              · Cấp 3+ luôn dọc
            </span>
          )}
        </div>
      )}

      {/* Chart area */}
      <div style={{
        borderRadius: 12,
        background: bgContainer,
        border: `1px solid ${borderColor}`,
        padding: 32,
        overflowX: 'auto',
        overflowY: 'auto',
        minHeight: 400,
      }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>
        ) : flat.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 80, color: textSecondary }}>
            <ApartmentOutlined style={{ fontSize: 48, marginBottom: 16, display: 'block' }} />
            <p style={{ margin: 0, fontSize: 15 }}>Chưa có đơn vị tổ chức nào</p>
            <p style={{ margin: '6px 0 0', fontSize: 13 }}>Nhấn "Thêm đơn vị" để bắt đầu</p>
          </div>
        ) : (
          <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', minWidth: '100%' }}>
            {tree.map((root) => (
              <OrgNode
                key={root.id}
                node={root}
                employees={allEmployees}
                levelDirections={levelDirections}
                isDark={isDark}
                onAddChild={openCreateWithParent}
                onEdit={openEdit}
                onDelete={(id) => deleteMutation.mutate(id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Modal: Cài đặt hướng ─────────────────────────────────────────── */}
      <Modal
        title="Cài đặt hướng hiển thị theo cấp"
        open={settingsOpen}
        onCancel={() => setSettingsOpen(false)}
        footer={<Button type="primary" onClick={() => setSettingsOpen(false)}>Đóng</Button>}
        styles={{
          body: { background: bgContainer },
          header: { background: bgContainer, borderBottom: `1px solid ${borderColor}` },
        }}
      >
        <div style={{ padding: '12px 0' }}>
          <p style={{ margin: '0 0 16px', fontSize: 13, color: textSecondary }}>
            Chọn cấp nào hiển thị <b>ngang</b> (con xếp cạnh nhau). Cấp 3 trở đi luôn hiển thị <b>dọc</b>.
          </p>
          {[0, 1, 2].map((lvl) => {
            const hue = getLevelHue(lvl);
            const count = flat.filter((n) => n.level === lvl).length;
            return (
              <div
                key={lvl}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px', borderRadius: 8, marginBottom: 8,
                  background: isDark ? '#253348' : '#F8FAFC',
                  border: `1px solid ${borderColor}`,
                  cursor: 'pointer',
                }}
                onClick={() => toggleLevel(lvl)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: hue, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: textPrimary }}>Cấp {lvl}</span>
                  {count > 0 && (
                    <span style={{ fontSize: 12, color: textSecondary }}>({count} đơn vị)</span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, color: textSecondary }}>
                    {horizontalLevels.has(lvl) ? '⟷ Ngang' : '↕ Dọc'}
                  </span>
                  <Checkbox checked={horizontalLevels.has(lvl)} onChange={() => toggleLevel(lvl)} />
                </div>
              </div>
            );
          })}
          {maxLevel > 2 && (
            <div style={{
              padding: '8px 14px', borderRadius: 8,
              background: isDark ? '#1A2744' : '#F1F5F9',
              border: `1px dashed ${borderColor}`,
              fontSize: 12, color: textSecondary, fontStyle: 'italic',
            }}>
              Cấp 3 trở đi ({flat.filter((n) => (n.level ?? 0) > 2).length} đơn vị) — luôn hiển thị dọc
            </div>
          )}
        </div>
      </Modal>

      {/* ── Modal: Tạo đơn vị ─────────────────────────────────────────────── */}
      <Modal
        title="Thêm đơn vị tổ chức"
        open={createOpen}
        onCancel={() => { setCreateOpen(false); createForm.resetFields(); }}
        onOk={() => createForm.submit()}
        confirmLoading={createMutation.isPending}
        styles={{
          body: { background: bgContainer },
          header: { background: bgContainer, borderBottom: `1px solid ${borderColor}` },
        }}
      >
        <Form form={createForm} layout="vertical" onFinish={(v) => createMutation.mutate(v)} style={{ marginTop: 12 }}>
          <Form.Item name="name" label="Tên đơn vị" rules={[{ required: true, message: 'Nhập tên đơn vị' }]}>
            <Input placeholder="VD: Phòng Kỹ thuật" />
          </Form.Item>
          <Form.Item
            name="code" label="Mã đơn vị"
            rules={[{ required: true }, { pattern: /^[A-Z0-9_-]+$/, message: 'Chỉ dùng chữ hoa, số, gạch ngang' }]}
          >
            <Input placeholder="VD: KT001" onChange={(e) => createForm.setFieldValue('code', e.target.value.toUpperCase())} />
          </Form.Item>
          <Form.Item name="parentId" label="Đơn vị cha (để trống nếu là gốc)">
            <Select allowClear placeholder="Chọn đơn vị cha" showSearch optionFilterProp="label"
              options={flat.map((u) => ({ value: u.id, label: `${u.name} — ${u.code}` }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Modal: Sửa đơn vị ─────────────────────────────────────────────── */}
      <Modal
        title={`Sửa: ${editTarget?.name ?? ''}`}
        open={!!editTarget}
        onCancel={() => setEditTarget(null)}
        onOk={() => editForm.submit()}
        confirmLoading={updateMutation.isPending}
        styles={{
          body: { background: bgContainer },
          header: { background: bgContainer, borderBottom: `1px solid ${borderColor}` },
        }}
      >
        <Form form={editForm} layout="vertical"
          onFinish={(v) => updateMutation.mutate({ id: editTarget!.id, data: v })}
          style={{ marginTop: 12 }}
        >
          <Form.Item name="name" label="Tên đơn vị" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item
            name="code" label="Mã đơn vị"
            rules={[{ required: true }, { pattern: /^[A-Z0-9_-]+$/, message: 'Chỉ dùng chữ hoa, số, gạch ngang' }]}
          >
            <Input onChange={(e) => editForm.setFieldValue('code', e.target.value.toUpperCase())} />
          </Form.Item>
          <Form.Item name="parentId" label="Đơn vị cha (để trống nếu là gốc)">
            <Select allowClear placeholder="Chọn đơn vị cha" showSearch
              filterOption={(input, opt) => (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())}
              options={flat.filter((u) => u.id !== editTarget?.id).map((u) => ({ value: u.id, label: `${u.name} — ${u.code}` }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
