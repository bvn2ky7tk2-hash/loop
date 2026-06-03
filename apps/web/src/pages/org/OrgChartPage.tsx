import { useState, useMemo } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import {
  Button, Form, App, Spin, Space, Tooltip, theme, Tag,
} from 'antd';
import {
  PlusOutlined, ApartmentOutlined, SettingOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orgUnitsApi, type OrgUnitTree } from '../../api/org-units';
import { employeesApi } from '../../api/employees';
import { jobTitlesApi, positionsApi } from '../../api/hr-core';
import { useThemePalette } from '../../hooks/useThemePalette';
import { usePermissions } from '../../hooks/usePermissions';
import { flattenTree } from './orgChartHelpers';
import { OrgNode } from './components/OrgNode';
import { LevelDirectionSettingsModal } from './components/LevelDirectionSettingsModal';
import { CreateOrgUnitModal } from './components/CreateOrgUnitModal';
import { EditOrgUnitModal } from './components/EditOrgUnitModal';
import { AssignLeaderModal } from './components/AssignLeaderModal';

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
        <PageHeader
          title="Sơ đồ tổ chức"
          style={{ marginBottom: 0 }}
          subtitle={<span style={{ fontSize: 13, color: textSecondary }}>Cơ cấu và phân cấp phòng ban</span>}
        />
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
      <LevelDirectionSettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        flat={flat}
        maxLevel={maxLevel}
        horizontalLevels={horizontalLevels}
        toggleLevel={toggleLevel}
        isDark={isDark}
        textPrimary={textPrimary}
        textSecondary={textSecondary}
        bgContainer={bgContainer}
        borderColor={borderColor}
      />

      {/* ── Modal: Tạo đơn vị ─────────────────────────────────────────────── */}
      <CreateOrgUnitModal
        open={createOpen}
        form={createForm}
        onCancel={() => { setCreateOpen(false); createForm.resetFields(); }}
        onFinish={(v) => createMutation.mutate(v)}
        confirmLoading={createMutation.isPending}
        jobTitleOptions={jobTitleOptions}
        isDark={isDark}
        linkColor={linkColor}
        bgContainer={bgContainer}
        borderColor={borderColor}
      />

      {/* ── Modal: Sửa đơn vị ─────────────────────────────────────────────── */}
      <EditOrgUnitModal
        editTarget={editTarget}
        form={editForm}
        onCancel={() => setEditTarget(null)}
        onFinish={(v) => updateMutation.mutate({ id: editTarget!.id, data: v })}
        confirmLoading={updateMutation.isPending}
        jobTitleOptions={jobTitleOptions}
        autoLeader={autoLeader}
        watchEditHeadJobTitle={watchEditHeadJobTitle}
        isDark={isDark}
        linkColor={linkColor}
        textPrimary={textPrimary}
        textMuted={textMuted}
        bgContainer={bgContainer}
        borderColor={borderColor}
      />

      {/* ── Modal: Gán lãnh đạo ───────────────────────────────────────────── */}
      <AssignLeaderModal
        leaderTarget={leaderTarget}
        form={leaderForm}
        onCancel={() => { setLeaderTarget(null); leaderForm.resetFields(); }}
        onFinish={handleAssignLeader}
        onRemoveLeader={handleRemoveLeader}
        confirmLoading={setLeaderMutation.isPending}
        leaderUnitEmployees={leaderUnitEmployees}
        linkColor={linkColor}
        textMuted={textMuted}
        textSecondary={textSecondary}
        bgContainer={bgContainer}
        borderColor={borderColor}
      />
    </div>
  );
}
