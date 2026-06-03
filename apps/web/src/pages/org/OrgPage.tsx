import { useState, useMemo, useRef, useEffect } from 'react';
import {
  Button, Tree, Card, Form, Input, Select, Modal,
  App, Spin, Space, Popconfirm, Tooltip, Row, Col, Tag,
} from 'antd';
import { useThemePalette } from '../../hooks/useThemePalette';
import { StatCard } from '../../components/ui/StatCard';
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  BankOutlined, ApartmentOutlined, TeamOutlined, UserOutlined,
  PlusCircleOutlined, PlusSquareOutlined, MinusSquareOutlined, CrownOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { DataNode } from 'antd/es/tree';
import { orgUnitsApi, type OrgUnitTree } from '../../api/org-units';
import { jobTitlesApi } from '../../api/hr-core';

function flattenTree(nodes: OrgUnitTree[]): OrgUnitTree[] {
  return nodes.flatMap((n) => [n, ...flattenTree(n.children ?? [])]);
}

const LEVEL_CONFIG = [
  { bg: '#F5F3FF', border: '#8B5CF6', iconBg: '#EDE9FE', iconColor: '#8B5CF6', codeBg: '#EDE9FE', codeColor: '#8B5CF6' },
  { bg: '#EFF6FF', border: '#3B82F6', iconBg: '#DBEAFE', iconColor: '#3B82F6', codeBg: '#DBEAFE', codeColor: '#3B82F6' },
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
  const { isDark, textMuted, borderColor: bc } = useThemePalette();
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

  const { data: jobTitlesData } = useQuery({
    queryKey: ['job-titles-active'],
    queryFn: () => jobTitlesApi.list({ isActive: true, limit: 200 }),
    staleTime: 5 * 60_000,
  });
  const jobTitleOptions = (jobTitlesData?.data ?? []).map((jt) => ({
    value: jt.id,
    label: jt.name,
  }));

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
    editForm.setFieldsValue({
      name: node.name,
      code: node.code,
      parentId: node.parentId ?? null,
      headJobTitleId: node.headJobTitleId ?? null,
    });
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
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
                {n.head ? (
                  <Tag
                    icon={<CrownOutlined />}
                    style={{ fontSize: 11, margin: 0, background: '#FEF9C3', color: '#92400E', borderColor: '#FDE68A' }}
                  >
                    {n.head.fullName} · {n.head.jobTitleName}
                  </Tag>
                ) : n.headJobTitle ? (
                  <Tag
                    icon={<CrownOutlined />}
                    style={{ fontSize: 11, margin: 0, background: isDark ? 'rgba(148,163,184,0.1)' : '#F3F4F6', color: textMuted, borderColor: bc }}
                  >
                    {n.headJobTitle.name} · Chưa có người
                  </Tag>
                ) : null}
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

  const jobTitleSelectField = (
    <Form.Item name="headJobTitleId" label="Chức danh trưởng đơn vị">
      <Select
        allowClear
        showSearch
        optionFilterProp="label"
        placeholder="VD: Trưởng phòng, Giám đốc..."
        options={jobTitleOptions}
      />
    </Form.Item>
  );

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
            { value: stats.totalUnits,     label: 'Đơn vị tổ chức',    color: '#8B5CF6', Icon: ApartmentOutlined },
            { value: stats.totalEmployees, label: 'Tổng nhân sự',       color: '#3B82F6', Icon: UserOutlined },
            { value: stats.maxLevel,       label: 'Cấp độ phân cấp',   color: '#10B981', Icon: BankOutlined },
          ].map(({ value, label, color, Icon }) => (
            <Col span={8} key={label}>
              <StatCard label={label} value={value} color={color} icon={<Icon />} />
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

      {/* Modal Thêm */}
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
          {jobTitleSelectField}
        </Form>
      </Modal>

      {/* Modal Sửa */}
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
          {jobTitleSelectField}
        </Form>
      </Modal>
    </div>
  );
}
