import { useState, useMemo } from 'react';
import {
  Button, Form, Input, Select, Modal, App, Spin, Space,
  Popconfirm, Tooltip, theme, Checkbox, Tag, Typography,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  BankOutlined, ApartmentOutlined, TeamOutlined, UserOutlined,
  PlusCircleOutlined, SettingOutlined, CrownOutlined, InfoCircleOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orgUnitsApi, type OrgUnitTree } from '../../api/org-units';
import { employeesApi, type Employee } from '../../api/employees';
import { jobTitlesApi, positionsApi } from '../../api/hr-core';
import { useThemePalette } from '../../hooks/useThemePalette';
import { usePermissions } from '../../hooks/usePermissions';
import { OrgUnitSelect } from '../../components/selects';

const { Text } = Typography;

// ── Helpers ───────────────────────────────────────────────────────────────────

function flattenTree(nodes: OrgUnitTree[]): OrgUnitTree[] {
  return nodes.flatMap((n) => [n, ...flattenTree(n.children ?? [])]);
}

const LEVEL_HUE = ['#8B5CF6', '#3B82F6', '#16A34A', '#EA580C', '#0891B2', '#DC2626'];

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
  const colors = ['#8B5CF6', '#3B82F6', '#16A34A', '#EA580C', '#0891B2', '#BE185D', '#B45309'];
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
  linkColor: string;
  textMuted: string;
  canManageOrg: boolean;
  onAddChild: (parentId: string) => void;
  onEdit: (node: OrgUnitTree) => void;
  onDelete: (id: string) => void;
  onAssignLeader: (node: OrgUnitTree) => void;
}

function OrgNode({
  node, employees, levelDirections, isDark, linkColor, textMuted,
  canManageOrg, onAddChild, onEdit, onDelete, onAssignLeader,
}: OrgNodeProps) {
  const hue = getLevelHue(node.level ?? 0);
  const LevelIcon = [BankOutlined, ApartmentOutlined, TeamOutlined, UserOutlined][Math.min(node.level ?? 0, 3)];
  const unitEmps = employees.filter((e) => e.orgUnitId === node.id);
  const hasChildren = (node.children ?? []).length > 0;
  const childDirection = levelDirections[(node.level ?? 0) + 1] ?? 'horizontal';

  const nodeBg    = isDark ? `${hue}18` : `${hue}0A`;
  const borderTop = hue;
  const { textPrimary: textMain, textSecondary: textSub } = useThemePalette();
  const connColor = isDark ? '#334155' : '#CBD5E1';

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

        {/* Leader badge */}
        {node.leaderInfo ? (
          <div style={{
            fontSize: 10, marginBottom: 6,
            display: 'flex', alignItems: 'center', gap: 4,
            background: isDark ? 'rgba(147,197,253,0.12)' : 'rgba(99,102,241,0.08)',
            border: `1px solid ${isDark ? 'rgba(147,197,253,0.25)' : 'rgba(99,102,241,0.25)'}`,
            borderRadius: 5, padding: '3px 6px',
          }}>
            <CrownOutlined style={{ color: linkColor, fontSize: 10 }} />
            <Text style={{ color: linkColor, fontWeight: 600, fontSize: 10, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {node.leaderInfo.fullName}
            </Text>
          </div>
        ) : (
          <div style={{ fontSize: 10, color: textMuted, fontStyle: 'italic', marginBottom: 4 }}>
            Chưa có lãnh đạo
          </div>
        )}

        {/* Head row */}
        {node.head ? (
          <div style={{
            fontSize: 10, marginBottom: 6,
            display: 'flex', alignItems: 'center', gap: 4,
            background: isDark ? 'rgba(251,191,36,0.12)' : 'rgba(251,191,36,0.15)',
            border: `1px solid ${isDark ? 'rgba(251,191,36,0.25)' : 'rgba(251,191,36,0.4)'}`,
            borderRadius: 5, padding: '3px 6px',
          }}>
            <span style={{ fontSize: 10 }}>👑</span>
            <span style={{ color: isDark ? '#FCD34D' : '#92400E', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {node.head.fullName}
            </span>
            <span style={{ color: textSub, fontSize: 9, flexShrink: 0 }}>· {node.head.jobTitleName}</span>
          </div>
        ) : node.headJobTitle ? (
          <div style={{
            fontSize: 10, marginBottom: 6,
            display: 'flex', alignItems: 'center', gap: 4,
            background: isDark ? 'rgba(148,163,184,0.1)' : 'rgba(148,163,184,0.12)',
            borderRadius: 5, padding: '3px 6px',
          }}>
            <span style={{ fontSize: 9 }}>👑</span>
            <span style={{ color: textSub, fontStyle: 'italic' }}>Chưa có {node.headJobTitle.name}</span>
          </div>
        ) : null}

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, color: textSub, display: 'flex', alignItems: 'center', gap: 3 }}>
            <UserOutlined style={{ fontSize: 10 }} />
            {unitEmps.length} nhân sự
          </span>
          <Space size={2}>
            {canManageOrg && (
              <Tooltip title="Gán lãnh đạo">
                <Button type="text" size="small" icon={<CrownOutlined />}
                  style={{ color: linkColor, height: 22, width: 22, padding: 0, fontSize: 12 }}
                  onClick={() => onAssignLeader(node)} />
              </Tooltip>
            )}
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
                      <OrgNode
                        node={child}
                        employees={employees}
                        levelDirections={levelDirections}
                        isDark={isDark}
                        linkColor={linkColor}
                        textMuted={textMuted}
                        canManageOrg={canManageOrg}
                        onAddChild={onAddChild}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onAssignLeader={onAssignLeader}
                      />
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
                  <OrgNode
                    node={child}
                    employees={employees}
                    levelDirections={levelDirections}
                    isDark={isDark}
                    linkColor={linkColor}
                    textMuted={textMuted}
                    canManageOrg={canManageOrg}
                    onAddChild={onAddChild}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onAssignLeader={onAssignLeader}
                  />
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
  const { isDark, textPrimary, textMuted, bgContainer, borderColor, linkColor } = useThemePalette();
  const { canAny } = usePermissions();

  const { textSecondary } = useThemePalette();

  // Permission guard: admin:org hoặc hr:manager
  const canManageOrg = canAny('admin:org', 'hr:manager');

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<OrgUnitTree | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [leaderTarget, setLeaderTarget] = useState<OrgUnitTree | null>(null);
  const [leaderForm] = Form.useForm();
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();

  // Watch headJobTitleId trong edit form để auto-load lãnh đạo
  const watchEditHeadJobTitle = Form.useWatch('headJobTitleId', editForm);

  // level → direction: true = horizontal, false = vertical
  const [horizontalLevels, setHorizontalLevels] = useState<Set<number>>(new Set([1, 2]));

  const { data: tree = [], isLoading: treeLoading } = useQuery({
    queryKey: ['org-units'],
    queryFn: orgUnitsApi.getTree,
  });

  const { data: allEmployees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => employeesApi.list(),
  });

  const { data: jobTitlesData } = useQuery({
    queryKey: ['job-titles-active'],
    queryFn: () => jobTitlesApi.list({ isActive: true, limit: 200 }),
    staleTime: 5 * 60_000,
  });
  const jobTitleOptions = (jobTitlesData?.data ?? []).map((jt) => ({ value: jt.id, label: jt.name }));

  // Positions của đơn vị đang edit — để tìm lãnh đạo tự động
  const { data: editPositions } = useQuery({
    queryKey: ['positions-by-unit', editTarget?.id],
    queryFn: () => positionsApi.list({ orgUnitId: editTarget!.id, isActive: true, limit: 200 }),
    enabled: !!editTarget?.id,
    staleTime: 5 * 60_000,
  });

  // Auto-tính lãnh đạo: employee thuộc unit + có position.jobTitleId khớp
  const autoLeader = useMemo(() => {
    if (!editTarget || !watchEditHeadJobTitle) return null;
    const matchIds = new Set(
      (editPositions?.data ?? [])
        .filter((p) => p.jobTitleId === watchEditHeadJobTitle)
        .map((p) => p.id),
    );
    if (matchIds.size === 0) return null;
    return (
      allEmployees.find(
        (e) => e.orgUnitId === editTarget.id && e.positionId && matchIds.has(e.positionId),
      ) ?? null
    );
  }, [editTarget, watchEditHeadJobTitle, editPositions?.data, allEmployees]);

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

  const setLeaderMutation = useMutation({
    mutationFn: ({ orgUnitId, leaderId }: { orgUnitId: string; leaderId: string | null }) =>
      orgUnitsApi.setLeader(orgUnitId, leaderId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['org-units'] });
      message.success('Đã cập nhật lãnh đạo đơn vị');
      setLeaderTarget(null);
      leaderForm.resetFields();
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      message.error(err.response?.data?.message ?? 'Cập nhật lãnh đạo thất bại'),
  });

  function openEdit(node: OrgUnitTree) {
    setEditTarget(node);
    editForm.setFieldsValue({
      name: node.name,
      code: node.code,
      parentId: node.parentId ?? null,
      headJobTitleId: node.headJobTitleId ?? null,
      leaderId: node.leaderInfo?.id ?? null,
    });
  }

  function openCreateWithParent(parentId: string) {
    createForm.setFieldValue('parentId', parentId);
    setCreateOpen(true);
  }

  function openAssignLeader(node: OrgUnitTree) {
    setLeaderTarget(node);
    leaderForm.setFieldsValue({
      leaderId: node.leaderInfo?.id ?? null,
    });
  }

  function handleAssignLeader(values: { leaderId?: string | null }) {
    if (!leaderTarget) return;
    setLeaderMutation.mutate({
      orgUnitId: leaderTarget.id,
      leaderId: values.leaderId ?? null,
    });
  }

  function handleRemoveLeader() {
    if (!leaderTarget) return;
    setLeaderMutation.mutate({ orgUnitId: leaderTarget.id, leaderId: null });
  }

  const MAX_CONFIGURABLE = 2;

  const toggleLevel = (level: number) => {
    if (level > MAX_CONFIGURABLE) return;
    setHorizontalLevels((prev) => {
      const next = new Set(prev);
      if (next.has(level)) next.delete(level);
      else next.add(level);
      return next;
    });
  };

  // Employees belonging to the currently selected leaderTarget unit
  const leaderUnitEmployees = useMemo(() => {
    if (!leaderTarget) return [];
    return allEmployees.filter((e) => e.orgUnitId === leaderTarget.id);
  }, [allEmployees, leaderTarget]);

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
                linkColor={linkColor}
                textMuted={textMuted}
                canManageOrg={canManageOrg}
                onAddChild={openCreateWithParent}
                onEdit={openEdit}
                onDelete={(id) => deleteMutation.mutate(id)}
                onAssignLeader={openAssignLeader}
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
              background: isDark ? bgContainer : '#F1F5F9',
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
            <OrgUnitSelect allowClear placeholder="Chọn đơn vị cha..." style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="headJobTitleId" label="Chức danh trưởng đơn vị">
            <Select allowClear showSearch optionFilterProp="label"
              placeholder="VD: Trưởng phòng, Giám đốc..."
              options={jobTitleOptions}
            />
          </Form.Item>
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 8,
            padding: '8px 12px', borderRadius: 6, marginTop: 4,
            background: isDark ? 'rgba(147,197,253,0.08)' : 'rgba(99,102,241,0.06)',
            border: `1px dashed ${isDark ? 'rgba(147,197,253,0.25)' : 'rgba(99,102,241,0.25)'}`,
            fontSize: 12, color: linkColor,
          }}>
            <InfoCircleOutlined style={{ marginTop: 2, flexShrink: 0 }} />
            <span>Lãnh đạo đơn vị sẽ được tự động xác định sau khi tạo, dựa trên nhân viên có chức danh trưởng đơn vị.</span>
          </div>
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
            <OrgUnitSelect allowClear placeholder="Chọn đơn vị cha..." style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="headJobTitleId" label="Chức danh trưởng đơn vị">
            <Select
              allowClear showSearch optionFilterProp="label"
              placeholder="VD: Trưởng phòng, Giám đốc..."
              options={jobTitleOptions}
            />
          </Form.Item>
          <Form.Item label={
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <CrownOutlined style={{ color: linkColor, fontSize: 12 }} />
              Lãnh đạo đơn vị (tự động theo chức danh)
            </span>
          }>
            <div style={{
              padding: '5px 11px', borderRadius: 6, minHeight: 32,
              display: 'flex', alignItems: 'center',
              border: `1px solid ${borderColor}`,
              background: isDark ? 'rgba(255,255,255,0.03)' : '#FAFAFA',
              color: autoLeader ? textPrimary : textMuted,
              fontSize: 13,
            }}>
              {autoLeader ? (
                <>
                  <UserOutlined style={{ marginRight: 8, color: linkColor }} />
                  <Text style={{ color: linkColor, fontWeight: 600 }}>{autoLeader.code}</Text>
                  <Text style={{ color: textPrimary, marginLeft: 6 }}>— {autoLeader.fullName}</Text>
                </>
              ) : watchEditHeadJobTitle ? (
                <span style={{ fontStyle: 'italic', fontSize: 12 }}>Chưa có nhân viên phù hợp trong đơn vị này</span>
              ) : (
                <span style={{ fontStyle: 'italic', fontSize: 12 }}>Chọn chức danh để xem lãnh đạo</span>
              )}
            </div>
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Modal: Gán lãnh đạo ───────────────────────────────────────────── */}
      <Modal
        title={
          <span>
            <CrownOutlined style={{ color: linkColor, marginRight: 8 }} />
            Gán lãnh đạo — {leaderTarget?.name ?? ''}
          </span>
        }
        open={!!leaderTarget}
        onCancel={() => { setLeaderTarget(null); leaderForm.resetFields(); }}
        onOk={() => leaderForm.submit()}
        confirmLoading={setLeaderMutation.isPending}
        footer={[
          <Button key="remove" danger
            disabled={!leaderTarget?.leaderInfo || setLeaderMutation.isPending}
            onClick={handleRemoveLeader}
            loading={setLeaderMutation.isPending}
          >
            Xoá lãnh đạo
          </Button>,
          <Button key="cancel" onClick={() => { setLeaderTarget(null); leaderForm.resetFields(); }}>
            Huỷ
          </Button>,
          <Button key="ok" type="primary" onClick={() => leaderForm.submit()} loading={setLeaderMutation.isPending} disabled={setLeaderMutation.isPending}>
            Xác nhận
          </Button>,
        ]}
        styles={{
          body: { background: bgContainer },
          header: { background: bgContainer, borderBottom: `1px solid ${borderColor}` },
        }}
      >
        <Form form={leaderForm} layout="vertical" onFinish={handleAssignLeader} style={{ marginTop: 12 }}>
          <Form.Item name="leaderId" label="Chọn lãnh đạo đơn vị">
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder={
                leaderUnitEmployees.length === 0
                  ? 'Đơn vị chưa có nhân sự'
                  : 'Chọn nhân viên làm lãnh đạo...'
              }
              options={leaderUnitEmployees.map((e) => ({
                value: e.id,
                label: `${e.fullName} (${e.code})`,
              }))}
            />
          </Form.Item>
          {leaderUnitEmployees.length === 0 && (
            <p style={{ margin: 0, fontSize: 12, color: textMuted, fontStyle: 'italic' }}>
              Chưa có nhân viên trong đơn vị này. Thêm nhân sự trước khi gán lãnh đạo.
            </p>
          )}
          {leaderTarget?.leaderInfo && (
            <p style={{ margin: '4px 0 0', fontSize: 12, color: textSecondary }}>
              Lãnh đạo hiện tại: <Text style={{ color: linkColor, fontWeight: 600 }}>{leaderTarget.leaderInfo.fullName}</Text>
            </p>
          )}
        </Form>
      </Modal>
    </div>
  );
}
