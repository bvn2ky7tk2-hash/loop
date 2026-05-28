import { useState, useMemo, useRef, useEffect } from 'react';
import {
  Button, Tree, Form, Input, Select, Modal,
  App, Spin, Space, Popconfirm, Tooltip, theme,
} from 'antd';
import type { DataNode } from 'antd/es/tree';
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  BankOutlined, ApartmentOutlined, TeamOutlined, UserOutlined,
  PlusCircleOutlined, PlusSquareOutlined, MinusSquareOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orgUnitsApi, type OrgUnitTree } from '../../api/org-units';
import { useThemeStore } from '../../store/theme.store';

// ── Helpers ───────────────────────────────────────────────────────────────────

function flattenTree(nodes: OrgUnitTree[]): OrgUnitTree[] {
  return nodes.flatMap((n) => [n, ...flattenTree(n.children ?? [])]);
}

const LEVEL_HUE = ['#7C3AED', '#2563EB', '#16A34A', '#EA580C'];
const LEVEL_ICONS = [BankOutlined, ApartmentOutlined, TeamOutlined, UserOutlined];

function getLevelHue(level: number): string {
  return LEVEL_HUE[Math.min(level ?? 0, LEVEL_HUE.length - 1)];
}

function getLevelIcon(level: number) {
  return LEVEL_ICONS[Math.min(level ?? 0, LEVEL_ICONS.length - 1)];
}

// ─────────────────────────────────────────────────────────────────────────────

export default function OrgChartPage() {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const { token } = theme.useToken();
  const { mode } = useThemeStore();
  const isDark = mode === 'dark';

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<OrgUnitTree | null>(null);
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const hasInitialized = useRef(false);

  // ── Derived colors ────────────────────────────────────────────────────────
  const bgContainer  = isDark ? '#1E293B' : '#ffffff';
  const bgCard       = isDark ? '#2D3F56' : '#FAFAFA';
  const bgStatCard   = isDark ? '#253348' : '#F8FAFC';
  const borderColor  = isDark ? '#334155' : '#E2E8F0';
  const textPrimary  = isDark ? '#F1F5F9' : '#0F172A';
  const textSecondary = isDark ? 'rgba(255,255,255,0.5)' : '#475569';
  const textMuted    = isDark ? 'rgba(255,255,255,0.3)' : '#94A3B8';

  // ── Query ─────────────────────────────────────────────────────────────────
  const { data: tree = [], isLoading } = useQuery({
    queryKey: ['org-units'],
    queryFn: orgUnitsApi.getTree,
  });

  const flat = flattenTree(tree);

  useEffect(() => {
    if (tree.length > 0 && !hasInitialized.current) {
      hasInitialized.current = true;
      setExpandedKeys(flattenTree(tree).map((n) => n.id));
    }
  }, [tree]);

  const stats = useMemo(() => ({
    totalUnits:     flat.length,
    totalEmployees: flat.reduce((sum, n) => sum + (n._count?.users ?? 0), 0),
    maxDepth:       flat.reduce((max, n) => Math.max(max, n.level ?? 0), 0) + 1,
  }), [flat]);

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

  // ── Handlers ──────────────────────────────────────────────────────────────
  function openEdit(node: OrgUnitTree) {
    setEditTarget(node);
    editForm.setFieldsValue({ name: node.name, code: node.code, parentId: node.parentId ?? null });
  }

  function openCreateWithParent(parentId: string) {
    createForm.setFieldValue('parentId', parentId);
    setCreateOpen(true);
  }

  // ── Tree node builder ─────────────────────────────────────────────────────
  function toTreeData(nodes: OrgUnitTree[]): DataNode[] {
    return nodes.map((n) => {
      const hue  = getLevelHue(n.level ?? 0);
      const Icon = getLevelIcon(n.level ?? 0);

      const nodeBg     = isDark ? `${hue}14` : `${hue}08`;
      const nodeBorder = hue;
      const iconBg     = isDark ? `${hue}22` : `${hue}18`;
      const codeBg     = isDark ? `${hue}25` : `${hue}15`;

      return {
        key: n.id,
        title: (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: nodeBg,
            border: `1px solid ${nodeBorder}30`,
            borderLeft: `4px solid ${nodeBorder}`,
            borderRadius: '0 10px 10px 0',
            padding: '8px 12px 8px 10px',
            margin: '3px 0',
          }}>
            {/* Icon */}
            <div style={{
              width: 34, height: 34, borderRadius: 8, flexShrink: 0,
              background: iconBg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon style={{ color: hue, fontSize: 16 }} />
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: textPrimary, lineHeight: 1.35 }}>
                {n.name}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, borderRadius: 4,
                  padding: '1px 6px', background: codeBg, color: hue,
                  letterSpacing: '0.5px',
                }}>
                  {n.code}
                </span>
                {n._count?.users ? (
                  <span style={{ fontSize: 11, color: textSecondary, display: 'flex', alignItems: 'center', gap: 3 }}>
                    <UserOutlined style={{ fontSize: 10 }} />
                    {n._count.users} nhân sự
                  </span>
                ) : (
                  <span style={{ fontSize: 11, color: textMuted }}>Chưa có nhân sự</span>
                )}
              </div>
            </div>

            {/* Actions */}
            <Space size={2} onClick={(e) => e.stopPropagation()} style={{ flexShrink: 0 }}>
              <Tooltip title="Thêm đơn vị con">
                <Button
                  type="text" size="small"
                  icon={<PlusCircleOutlined />}
                  style={{ color: hue }}
                  onClick={() => openCreateWithParent(n.id)}
                />
              </Tooltip>
              <Tooltip title="Sửa">
                <Button
                  type="text" size="small"
                  icon={<EditOutlined />}
                  style={{ color: token.colorTextSecondary }}
                  onClick={() => openEdit(n)}
                />
              </Tooltip>
              <Popconfirm
                title="Xoá đơn vị này?"
                description="Đơn vị con và nhân sự liên kết sẽ bị ảnh hưởng."
                onConfirm={() => deleteMutation.mutate(n.id)}
                okText="Xoá" cancelText="Huỷ" okButtonProps={{ danger: true }}
              >
                <Tooltip title="Xoá">
                  <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                </Tooltip>
              </Popconfirm>
            </Space>
          </div>
        ),
        children: toTreeData(n.children ?? []),
      };
    });
  }

  const treeData = useMemo(
    () => toTreeData(tree),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tree, isDark, textPrimary, textSecondary, textMuted],
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '20px 24px', minHeight: '100vh', background: token.colorBgLayout }}>

      {/* Page Header */}
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
          <Tooltip title="Mở rộng tất cả">
            <Button
              icon={<PlusSquareOutlined />}
              onClick={() => setExpandedKeys(flat.map((n) => n.id))}
            />
          </Tooltip>
          <Tooltip title="Thu gọn tất cả">
            <Button
              icon={<MinusSquareOutlined />}
              onClick={() => setExpandedKeys([])}
            />
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

      {/* Stats Row */}
      {!isLoading && flat.length > 0 && (
        <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
          {[
            { value: stats.totalUnits,     label: 'Đơn vị tổ chức',   hue: '#7C3AED', Icon: ApartmentOutlined },
            { value: stats.totalEmployees, label: 'Tổng nhân sự',      hue: '#2563EB', Icon: UserOutlined },
            { value: stats.maxDepth,       label: 'Cấp độ phân cấp',   hue: '#16A34A', Icon: BankOutlined },
          ].map(({ value, label, hue, Icon }) => (
            <div
              key={label}
              style={{
                flex: 1, borderRadius: 12,
                background: bgStatCard,
                border: `1px solid ${borderColor}`,
                padding: '14px 20px',
                display: 'flex', alignItems: 'center', gap: 14,
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 10,
                background: isDark ? `${hue}20` : `${hue}15`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Icon style={{ color: hue, fontSize: 20 }} />
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 700, color: hue, lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: 12, color: textSecondary, marginTop: 4 }}>{label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tree Card */}
      <div style={{
        borderRadius: 12,
        background: bgContainer,
        border: `1px solid ${borderColor}`,
        padding: 20,
      }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
        ) : flat.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: textMuted }}>
            <ApartmentOutlined style={{ fontSize: 40, marginBottom: 12, display: 'block', color: textMuted }} />
            <p style={{ margin: 0, fontSize: 14 }}>Chưa có đơn vị tổ chức nào</p>
            <p style={{ margin: '4px 0 0', fontSize: 12 }}>Nhấn "Thêm đơn vị" để bắt đầu</p>
          </div>
        ) : (
          <Tree
            treeData={treeData}
            expandedKeys={expandedKeys}
            onExpand={(keys) => setExpandedKeys(keys)}
            showLine={{ showLeafIcon: false }}
            blockNode
            style={{ background: 'transparent' }}
          />
        )}
      </div>

      {/* ══ Modal: Tạo đơn vị ═══════════════════════════════════════════════ */}
      <Modal
        title="Thêm đơn vị tổ chức"
        open={createOpen}
        onCancel={() => { setCreateOpen(false); createForm.resetFields(); }}
        onOk={() => createForm.submit()}
        confirmLoading={createMutation.isPending}
        styles={{
          content: { background: bgContainer, border: `1px solid ${borderColor}` },
          header: { background: bgContainer, borderBottom: `1px solid ${borderColor}` },
        }}
      >
        <Form
          form={createForm} layout="vertical"
          onFinish={(v) => createMutation.mutate(v)}
          style={{ marginTop: 12 }}
        >
          <Form.Item name="name" label="Tên đơn vị" rules={[{ required: true, message: 'Nhập tên đơn vị' }]}>
            <Input placeholder="VD: Phòng Kỹ thuật" />
          </Form.Item>
          <Form.Item
            name="code" label="Mã đơn vị"
            rules={[
              { required: true, message: 'Nhập mã đơn vị' },
              { pattern: /^[A-Z0-9_-]+$/, message: 'Chỉ dùng chữ hoa, số, gạch ngang' },
            ]}
          >
            <Input
              placeholder="VD: KT001"
              onChange={(e) => createForm.setFieldValue('code', e.target.value.toUpperCase())}
            />
          </Form.Item>
          <Form.Item name="parentId" label="Đơn vị cha (để trống nếu là gốc)">
            <Select
              allowClear
              placeholder="Chọn đơn vị cha"
              showSearch
              filterOption={(input, opt) =>
                (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())
              }
              options={flat.map((u) => ({ value: u.id, label: `${u.name} — ${u.code}` }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* ══ Modal: Sửa đơn vị ═══════════════════════════════════════════════ */}
      <Modal
        title={`Sửa: ${editTarget?.name ?? ''}`}
        open={!!editTarget}
        onCancel={() => setEditTarget(null)}
        onOk={() => editForm.submit()}
        confirmLoading={updateMutation.isPending}
        styles={{
          content: { background: bgContainer, border: `1px solid ${borderColor}` },
          header: { background: bgContainer, borderBottom: `1px solid ${borderColor}` },
        }}
      >
        <Form
          form={editForm} layout="vertical"
          onFinish={(v) => updateMutation.mutate({ id: editTarget!.id, data: v })}
          style={{ marginTop: 12 }}
        >
          <Form.Item name="name" label="Tên đơn vị" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item
            name="code" label="Mã đơn vị"
            rules={[
              { required: true },
              { pattern: /^[A-Z0-9_-]+$/, message: 'Chỉ dùng chữ hoa, số, gạch ngang' },
            ]}
          >
            <Input onChange={(e) => editForm.setFieldValue('code', e.target.value.toUpperCase())} />
          </Form.Item>
          <Form.Item name="parentId" label="Đơn vị cha (để trống nếu là gốc)">
            <Select
              allowClear
              placeholder="Chọn đơn vị cha"
              showSearch
              filterOption={(input, opt) =>
                (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())
              }
              options={flat
                .filter((u) => u.id !== editTarget?.id)
                .map((u) => ({ value: u.id, label: `${u.name} — ${u.code}` }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
