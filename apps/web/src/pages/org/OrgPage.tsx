import { useState, useMemo, useRef, useEffect } from 'react';
import {
  Button, Tree, Card, Form, Input, Select, Modal,
  App, Spin, Space, Popconfirm, Tooltip, Row, Col,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  BankOutlined, ApartmentOutlined, TeamOutlined, UserOutlined,
  PlusCircleOutlined, PlusSquareOutlined, MinusSquareOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { DataNode } from 'antd/es/tree';
import { orgUnitsApi, type OrgUnitTree } from '../../api/org-units';

function flattenTree(nodes: OrgUnitTree[]): OrgUnitTree[] {
  return nodes.flatMap((n) => [n, ...flattenTree(n.children ?? [])]);
}

const LEVEL_CONFIG = [
  { bg: '#F5F3FF', border: '#7C3AED', iconBg: '#EDE9FE', iconColor: '#7C3AED', codeBg: '#EDE9FE', codeColor: '#5B21B6' },
  { bg: '#EFF6FF', border: '#2563EB', iconBg: '#DBEAFE', iconColor: '#2563EB', codeBg: '#DBEAFE', codeColor: '#1D4ED8' },
  { bg: '#F0FDF4', border: '#16A34A', iconBg: '#DCFCE7', iconColor: '#16A34A', codeBg: '#DCFCE7', codeColor: '#15803D' },
  { bg: '#FFF7ED', border: '#EA580C', iconBg: '#FFEDD5', iconColor: '#EA580C', codeBg: '#FFEDD5', codeColor: '#C2410C' },
];

const LEVEL_ICONS = [BankOutlined, ApartmentOutlined, TeamOutlined, UserOutlined];

function getLevelStyle(level: number) {
  const idx = Math.min(level ?? 0, LEVEL_CONFIG.length - 1);
  return { config: LEVEL_CONFIG[idx], Icon: LEVEL_ICONS[idx] };
}

export default function OrgPage() {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<OrgUnitTree | null>(null);
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const hasInitialized = useRef(false);

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
    totalUnits: flat.length,
    totalEmployees: flat.reduce((sum, n) => sum + (n._count?.users ?? 0), 0),
    maxLevel: flat.reduce((max, n) => Math.max(max, n.level ?? 0), 0) + 1,
  }), [flat]);

  const createMutation = useMutation({
    mutationFn: orgUnitsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['org-units'] });
      message.success('Đã tạo đơn vị');
      setCreateOpen(false);
      createForm.resetFields();
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      message.error(err.response?.data?.message ?? 'Tạo thất bại');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof orgUnitsApi.update>[1] }) =>
      orgUnitsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['org-units'] });
      message.success('Đã cập nhật');
      setEditTarget(null);
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      message.error(err.response?.data?.message ?? 'Cập nhật thất bại');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: orgUnitsApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['org-units'] });
      message.success('Đã xoá đơn vị');
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      message.error(err.response?.data?.message ?? 'Xoá thất bại');
    },
  });

  function openEdit(node: OrgUnitTree) {
    setEditTarget(node);
    editForm.setFieldsValue({ name: node.name, code: node.code, parentId: node.parentId ?? null });
  }

  function openCreateWithParent(parentId: string) {
    createForm.setFieldValue('parentId', parentId);
    setCreateOpen(true);
  }

  function toTreeData(nodes: OrgUnitTree[]): DataNode[] {
    return nodes.map((n) => {
      const { config, Icon } = getLevelStyle(n.level ?? 0);
      return {
        key: n.id,
        title: (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: config.bg,
            borderLeft: `4px solid ${config.border}`,
            borderRadius: '0 10px 10px 0',
            padding: '8px 12px 8px 10px',
            margin: '3px 0',
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: 8, flexShrink: 0,
              background: config.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon style={{ color: config.iconColor, fontSize: 16 }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b', lineHeight: 1.35 }}>
                {n.name}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, borderRadius: 4,
                  padding: '1px 6px', background: config.codeBg, color: config.codeColor,
                  letterSpacing: '0.5px',
                }}>
                  {n.code}
                </span>
                {n._count?.users ? (
                  <span style={{ fontSize: 11, color: '#64748b', display: 'flex', alignItems: 'center', gap: 3 }}>
                    <UserOutlined style={{ fontSize: 10 }} />
                    {n._count.users} nhân sự
                  </span>
                ) : (
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>Chưa có nhân sự</span>
                )}
              </div>
            </div>
            <Space size={2} onClick={(e) => e.stopPropagation()} style={{ flexShrink: 0 }}>
              <Tooltip title="Thêm đơn vị con">
                <Button
                  type="text" size="small"
                  icon={<PlusCircleOutlined />}
                  style={{ color: config.iconColor }}
                  onClick={() => openCreateWithParent(n.id)}
                />
              </Tooltip>
              <Tooltip title="Sửa">
                <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEdit(n)} />
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

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <h1 className="page-title">Cơ cấu tổ chức</h1>
        <Space>
          <Tooltip title="Mở rộng tất cả">
            <Button icon={<PlusSquareOutlined />} onClick={() => setExpandedKeys(flat.map((n) => n.id))} />
          </Tooltip>
          <Tooltip title="Thu gọn tất cả">
            <Button icon={<MinusSquareOutlined />} onClick={() => setExpandedKeys([])} />
          </Tooltip>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
            Thêm đơn vị
          </Button>
        </Space>
      </div>

      {!isLoading && flat.length > 0 && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          {[
            { value: stats.totalUnits, label: 'Đơn vị tổ chức', bg: '#F5F3FF', iconBg: '#EDE9FE', color: '#7C3AED', Icon: ApartmentOutlined },
            { value: stats.totalEmployees, label: 'Tổng nhân sự', bg: '#EFF6FF', iconBg: '#DBEAFE', color: '#2563EB', Icon: UserOutlined },
            { value: stats.maxLevel, label: 'Cấp độ phân cấp', bg: '#F0FDF4', iconBg: '#DCFCE7', color: '#16A34A', Icon: BankOutlined },
          ].map(({ value, label, bg, iconBg, color, Icon }) => (
            <Col span={8} key={label}>
              <div style={{ background: bg, borderRadius: 12, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon style={{ color, fontSize: 20 }} />
                </div>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{label}</div>
                </div>
              </div>
            </Col>
          ))}
        </Row>
      )}

      <Card>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
        ) : (
          <Tree
            treeData={toTreeData(tree)}
            expandedKeys={expandedKeys}
            onExpand={(keys) => setExpandedKeys(keys)}
            showLine={{ showLeafIcon: false }}
            blockNode
          />
        )}
      </Card>

      <Modal
        title="Thêm đơn vị tổ chức"
        open={createOpen}
        onCancel={() => { setCreateOpen(false); createForm.resetFields(); }}
        onOk={() => createForm.submit()}
        confirmLoading={createMutation.isPending}
      >
        <Form form={createForm} layout="vertical" onFinish={(v) => createMutation.mutate(v)}>
          <Form.Item name="name" label="Tên đơn vị" rules={[{ required: true, message: 'Nhập tên' }]}>
            <Input placeholder="VD: Phòng Kỹ thuật" />
          </Form.Item>
          <Form.Item
            name="code" label="Mã đơn vị"
            rules={[
              { required: true, message: 'Nhập mã' },
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
              options={flat.map((u) => ({ value: u.id, label: `${u.name} — ${u.code}` }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`Sửa: ${editTarget?.name ?? ''}`}
        open={!!editTarget}
        onCancel={() => setEditTarget(null)}
        onOk={() => editForm.submit()}
        confirmLoading={updateMutation.isPending}
      >
        <Form
          form={editForm} layout="vertical"
          onFinish={(v) => updateMutation.mutate({ id: editTarget!.id, data: v })}
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
              options={flat.filter((u) => u.id !== editTarget?.id).map((u) => ({ value: u.id, label: `${u.name} — ${u.code}` }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
