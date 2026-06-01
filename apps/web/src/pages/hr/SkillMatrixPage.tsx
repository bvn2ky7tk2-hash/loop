import { useState } from 'react';
import {
  Table, Button, Tag, Typography, Select, Input, Form, Row, Col,
  Space, Tabs, Progress, Modal, InputNumber, DatePicker, Tooltip, Badge,
  Popconfirm,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, ApartmentOutlined,
  StarFilled, TrophyOutlined, UserOutlined, TeamOutlined, CheckCircleOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import {
  skillsApi, type Skill, type SkillLevel, type SkillCategory,
  type EmployeeSkill, type EmployeeWithSkills, type ResourceAvailabilityItem,
} from '../../api/skills';
import { useThemePalette } from '../../hooks/useThemePalette';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { FilterBar } from '../../components/FilterBar';
import { CenteredModal } from '../../components/ui/CenteredModal';
import { confirmDelete } from '../../components/ui/confirmDelete';
import { EmployeeInfoCell } from '../../components/ui/EmployeeInfoCell';

const { Text } = Typography;

const CATEGORY_META: Record<SkillCategory, { label: string; color: string }> = {
  TECHNICAL:    { label: 'Kỹ thuật',  color: '#3B82F6' },
  SOFT:         { label: 'Kỹ năng mềm', color: '#10B981' },
  LANGUAGE:     { label: 'Ngôn ngữ',  color: '#8B5CF6' },
  DOMAIN:       { label: 'Nghiệp vụ', color: '#F59E0B' },
  CERTIFICATION:{ label: 'Chứng chỉ', color: '#EF4444' },
};

const LEVEL_META: Record<SkillLevel, { label: string; color: string; stars: number; progressColor: string }> = {
  BEGINNER:     { label: 'Mới học',     color: '#94A3B8', stars: 1, progressColor: '#94A3B8' },
  INTERMEDIATE: { label: 'Trung cấp',   color: '#3B82F6', stars: 2, progressColor: '#60A5FA' },
  ADVANCED:     { label: 'Thành thạo',  color: '#10B981', stars: 3, progressColor: '#34D399' },
  EXPERT:       { label: 'Chuyên gia',  color: '#F59E0B', stars: 4, progressColor: '#FBBF24' },
};

function LevelBadge({ level }: { level: SkillLevel }) {
  const meta = LEVEL_META[level];
  return (
    <Tag style={{ borderColor: meta.color, color: meta.color, background: `${meta.color}15` }}>
      {'★'.repeat(meta.stars)} {meta.label}
    </Tag>
  );
}

// ─── Tab 1: Ma trận kỹ năng ───────────────────────────────────────────────────

function MatrixTab({ skills }: { skills: Skill[] }) {
  const { textPrimary, textMuted, borderColor, linkColor, isDark } = useThemePalette();
  const [page, setPage] = useState(1);
  const [filterOrgUnit, setFilterOrgUnit] = useState<string>();
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [editTarget, setEditTarget] = useState<{ employee: EmployeeWithSkills; skill?: EmployeeSkill } | null>(null);
  const [form] = Form.useForm();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['skill-matrix', filterOrgUnit, selectedSkillIds, page],
    queryFn: () => skillsApi.getSkillMatrix({
      orgUnitId: filterOrgUnit,
      skillIds: selectedSkillIds.join(','),
      page,
      limit: 30,
    }),
  });

  const mutateSave = useMutation({
    mutationFn: ({ employeeId, skillId, values }: any) =>
      skillsApi.upsertEmployeeSkill(employeeId, skillId, {
        level: values.level,
        yearsExp: values.yearsExp,
        notes: values.notes,
        certifiedAt: values.certifiedAt ? values.certifiedAt.format('YYYY-MM-DD') : undefined,
      }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['skill-matrix'] }); setEditTarget(null); form.resetFields(); },
  });

  const mutateRemove = useMutation({
    mutationFn: ({ employeeId, skillId }: any) => skillsApi.removeEmployeeSkill(employeeId, skillId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['skill-matrix'] }),
  });

  const employees = data?.data ?? [];

  // Columns: tên nhân viên + phòng ban + mỗi skill đã chọn (hoặc tất cả nếu không filter)
  const displaySkills = selectedSkillIds.length
    ? skills.filter(s => selectedSkillIds.includes(s.id))
    : skills.slice(0, 8); // giới hạn 8 cột khi không filter

  const cols: ColumnsType<EmployeeWithSkills> = [
    {
      title: 'Nhân viên',
      fixed: 'left',
      width: 180,
      render: (_: any, r: EmployeeWithSkills) => (
        <EmployeeInfoCell employee={{ code: r.code, fullName: r.user?.name ?? r.fullName, orgUnit: r.orgUnit }} />
      ),
    },
    ...displaySkills.map(skill => ({
      title: (
        <Tooltip title={skill.description ?? skill.name}>
          <div style={{ fontSize: 12, fontWeight: 600, color: textPrimary, maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {skill.name}
          </div>
          <div style={{ fontSize: 10, color: CATEGORY_META[skill.category].color }}>
            {CATEGORY_META[skill.category].label}
          </div>
        </Tooltip>
      ),
      dataIndex: skill.id,
      width: 120,
      align: 'center' as const,
      render: (_: any, r: EmployeeWithSkills) => {
        const empSkill = r.skills.find(s => s.skillId === skill.id);
        if (!empSkill) {
          return (
            <Button
              size="small"
              type="dashed"
              icon={<PlusOutlined />}
              style={{ fontSize: 11, color: textMuted, borderColor: borderColor }}
              onClick={() => { setEditTarget({ employee: r }); form.setFieldValue('skillId', skill.id); }}
            />
          );
        }
        const meta = LEVEL_META[empSkill.level];
        return (
          <Tooltip title={`${meta.label}${empSkill.yearsExp > 0 ? ` · ${empSkill.yearsExp}y` : ''}${empSkill.notes ? ` · ${empSkill.notes}` : ''}`}>
            <div
              style={{ cursor: 'pointer', padding: '4px 2px' }}
              onClick={() => { setEditTarget({ employee: r, skill: empSkill }); form.setFieldsValue({ skillId: skill.id, level: empSkill.level, yearsExp: empSkill.yearsExp, notes: empSkill.notes, certifiedAt: empSkill.certifiedAt ? dayjs(empSkill.certifiedAt) : null }); }}
            >
              <div style={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <StarFilled key={i} style={{ fontSize: 10, color: i < meta.stars ? meta.color : borderColor }} />
                ))}
              </div>
              <div style={{ fontSize: 10, color: meta.color, marginTop: 2 }}>{meta.label}</div>
            </div>
          </Tooltip>
        );
      },
    })),
  ];

  return (
    <div>
      <FilterBar>
        <Select
          style={{ width: 200 }}
          placeholder="Lọc theo kỹ năng"
          mode="multiple"
          allowClear
          maxTagCount={2}
          options={skills.map(s => ({ value: s.id, label: s.name }))}
          onChange={setSelectedSkillIds}
        />
      </FilterBar>

      <Table
        rowKey="id"
        dataSource={employees}
        columns={cols}
        loading={isLoading}
        scroll={{ x: 180 + displaySkills.length * 120 }}
        size="small"
        style={{ border: `1px solid ${borderColor}`, borderRadius: 8 }}
        pagination={{
          current: page,
          pageSize: 30,
          total: data?.total ?? 0,
          onChange: setPage,
          showSizeChanger: false,
          showTotal: (t) => `${t} nhân viên`,
        }}
      />

      {/* Edit/Add skill modal */}
      <CenteredModal
        open={!!editTarget}
        onClose={() => { setEditTarget(null); form.resetFields(); }}
        title={editTarget?.skill ? `Sửa kỹ năng — ${editTarget.employee.user?.name}` : `Thêm kỹ năng — ${editTarget?.employee.user?.name}`}
        width={440}
        footer={
          <Space>
            {editTarget?.skill && (
              <Popconfirm
                title="Xóa kỹ năng này?"
                onConfirm={() => mutateRemove.mutate({ employeeId: editTarget.employee.id, skillId: editTarget.skill!.skillId })}
              >
                <Button danger type="text" icon={<DeleteOutlined />}>Xóa</Button>
              </Popconfirm>
            )}
            <Button onClick={() => { setEditTarget(null); form.resetFields(); }}>Hủy</Button>
            <Button
              type="primary"
              loading={mutateSave.isPending}
              disabled={mutateSave.isPending}
              onClick={() => form.submit()}
            >
              Lưu
            </Button>
          </Space>
        }
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => {
            const skillId = editTarget?.skill?.skillId ?? values.skillId;
            mutateSave.mutate({ employeeId: editTarget!.employee.id, skillId, values });
          }}
        >
          {!editTarget?.skill && (
            <Form.Item name="skillId" label="Kỹ năng" rules={[{ required: true }]}>
              <Select
                showSearch
                placeholder="Chọn kỹ năng"
                options={skills.map(s => ({ value: s.id, label: `${s.name} (${CATEGORY_META[s.category].label})` }))}
                filterOption={(input, opt) => (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())}
              />
            </Form.Item>
          )}
          <Form.Item name="level" label="Mức độ" rules={[{ required: true }]}>
            <Select
              options={Object.entries(LEVEL_META).map(([k, v]) => ({
                value: k,
                label: <span style={{ color: v.color }}>{'★'.repeat(v.stars)} {v.label}</span>,
              }))}
            />
          </Form.Item>
          <Form.Item name="yearsExp" label="Số năm kinh nghiệm">
            <InputNumber min={0} max={50} step={0.5} style={{ width: '100%' }} addonAfter="năm" />
          </Form.Item>
          <Form.Item name="certifiedAt" label="Ngày cấp chứng chỉ">
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="notes" label="Ghi chú">
            <Input.TextArea rows={2} placeholder="Dự án đã áp dụng, chứng chỉ..." />
          </Form.Item>
        </Form>
      </CenteredModal>
    </div>
  );
}

// ─── Tab 2: Quản lý danh mục kỹ năng ─────────────────────────────────────────

function SkillCatalogTab() {
  const { textPrimary, textMuted, borderColor, linkColor } = useThemePalette();
  const [filterCat, setFilterCat] = useState<SkillCategory | undefined>();
  const [createOpen, setCreateOpen] = useState(false);
  const [form] = Form.useForm();
  const qc = useQueryClient();

  const { data: skills = [], isLoading } = useQuery({
    queryKey: ['skills', filterCat],
    queryFn: () => skillsApi.listSkills(filterCat, true),
  });

  const { data: stats = [] } = useQuery({
    queryKey: ['skill-stats'],
    queryFn: skillsApi.getSkillStats,
  });

  const statsMap = Object.fromEntries(stats.map(s => [s.id, s]));

  const mutateCreate = useMutation({
    mutationFn: skillsApi.createSkill,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['skills'] }); setCreateOpen(false); form.resetFields(); },
  });

  const mutateToggle = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      skillsApi.updateSkill(id, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['skills'] }),
  });

  const mutateDelete = useMutation({
    mutationFn: skillsApi.deleteSkill,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['skills'] }),
  });

  const cols: ColumnsType<Skill> = [
    {
      title: 'Kỹ năng',
      render: (_: any, r: Skill) => (
        <div>
          <Text style={{ color: textPrimary, fontWeight: 600 }}>{r.name}</Text>
          {r.description && <div style={{ color: textMuted, fontSize: 12 }}>{r.description}</div>}
        </div>
      ),
    },
    {
      title: 'Nhóm',
      width: 130,
      render: (_: any, r: Skill) => {
        const meta = CATEGORY_META[r.category];
        return <Tag style={{ color: meta.color, borderColor: meta.color, background: `${meta.color}15` }}>{meta.label}</Tag>;
      },
    },
    {
      title: 'Nhân viên',
      width: 100,
      align: 'center',
      render: (_: any, r: Skill) => {
        const count = statsMap[r.id]?.totalEmployees ?? (r._count?.employees ?? 0);
        return count > 0
          ? <Tag color="blue"><UserOutlined /> {count}</Tag>
          : <Text style={{ color: textMuted }}>—</Text>;
      },
    },
    {
      title: 'Phân bố',
      width: 200,
      render: (_: any, r: Skill) => {
        const stat = statsMap[r.id];
        if (!stat || stat.totalEmployees === 0) return <Text style={{ color: textMuted }}>—</Text>;
        const total = stat.totalEmployees;
        return (
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {(['EXPERT', 'ADVANCED', 'INTERMEDIATE', 'BEGINNER'] as SkillLevel[]).map(level => {
              const count = stat.levelDistribution[level];
              if (!count) return null;
              return (
                <Tooltip key={level} title={`${LEVEL_META[level].label}: ${count}`}>
                  <div style={{ width: `${(count / total) * 100}%`, minWidth: 12, height: 8, borderRadius: 4, background: LEVEL_META[level].progressColor }} />
                </Tooltip>
              );
            })}
          </div>
        );
      },
    },
    {
      title: 'Trạng thái',
      width: 100,
      render: (_: any, r: Skill) => r.isActive
        ? <Tag color="green">Hoạt động</Tag>
        : <Tag color="default">Tắt</Tag>,
    },
    {
      title: '',
      width: 90,
      render: (_: any, r: Skill) => (
        <Space size={4}>
          <Button
            size="small"
            type="link"
            style={{ color: r.isActive ? textMuted : linkColor, padding: 0, fontSize: 12 }}
            onClick={() => mutateToggle.mutate({ id: r.id, isActive: !r.isActive })}
          >
            {r.isActive ? 'Tắt' : 'Bật'}
          </Button>
          <Popconfirm
            title="Xóa kỹ năng?"
            description="Tất cả nhân viên gán kỹ năng này sẽ bị xóa."
            onConfirm={() => mutateDelete.mutate(r.id)}
          >
            <Button size="small" type="link" danger style={{ padding: 0 }} icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <FilterBar>
          <Select
            style={{ width: 160 }}
            placeholder="Tất cả nhóm"
            allowClear
            options={Object.entries(CATEGORY_META).map(([k, v]) => ({ value: k, label: v.label }))}
            onChange={v => setFilterCat(v as SkillCategory | undefined)}
          />
        </FilterBar>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
          Thêm kỹ năng
        </Button>
      </div>

      <Table
        rowKey="id"
        dataSource={skills}
        columns={cols}
        loading={isLoading}
        size="small"
        style={{ border: `1px solid ${borderColor}`, borderRadius: 8 }}
        pagination={false}
      />

      <CenteredModal
        open={createOpen}
        onClose={() => { setCreateOpen(false); form.resetFields(); }}
        title="Thêm kỹ năng mới"
        width={420}
        footer={
          <Space>
            <Button onClick={() => { setCreateOpen(false); form.resetFields(); }}>Hủy</Button>
            <Button type="primary" loading={mutateCreate.isPending} disabled={mutateCreate.isPending} onClick={() => form.submit()}>Tạo</Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" onFinish={mutateCreate.mutate}>
          <Form.Item name="name" label="Tên kỹ năng" rules={[{ required: true }]}>
            <Input placeholder="VD: ReactJS, Python, Tiếng Anh..." />
          </Form.Item>
          <Form.Item name="category" label="Nhóm" initialValue="TECHNICAL">
            <Select options={Object.entries(CATEGORY_META).map(([k, v]) => ({ value: k, label: v.label }))} />
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={2} placeholder="Mô tả ngắn về kỹ năng..." />
          </Form.Item>
        </Form>
      </CenteredModal>
    </div>
  );
}

// ─── Tab 3: Resource Availability ────────────────────────────────────────────

function ResourceTab({ skills }: { skills: Skill[] }) {
  const { textPrimary, textMuted, bgContainer, borderColor, linkColor, isDark } = useThemePalette();
  const [filterSkillId, setFilterSkillId] = useState<string>();
  const [filterLevel, setFilterLevel]     = useState<string>();
  const [filterDate, setFilterDate]       = useState<any>(null);

  const { data: resources = [], isLoading } = useQuery({
    queryKey: ['resource-availability', filterSkillId, filterLevel, filterDate?.format('YYYY-MM-DD')],
    queryFn: () => skillsApi.getResourceAvailability({
      skillId:    filterSkillId,
      skillLevel: filterLevel,
      date:       filterDate ? filterDate.format('YYYY-MM-DD') : undefined,
    }),
  });

  const available   = resources.filter(r => r.availablePct >= 50);
  const semiBooked  = resources.filter(r => r.availablePct > 0 && r.availablePct < 50);
  const fullyBooked = resources.filter(r => r.availablePct === 0);

  const columns: ColumnsType<ResourceAvailabilityItem> = [
    {
      title: <Text style={{ color: textMuted }}>Nhân sự</Text>,
      render: (_: any, r) => (
        <EmployeeInfoCell employee={{ code: r.code, fullName: r.user?.name ?? r.fullName, orgUnit: r.orgUnit ?? undefined }} />
      ),
    },
    {
      title: <Text style={{ color: textMuted }}>Phòng ban</Text>, width: 160,
      render: (_: any, r) => <Text style={{ color: textMuted }}>{r.orgUnit?.name ?? '—'}</Text>,
    },
    {
      title: <Text style={{ color: textMuted }}>Kỹ năng liên quan</Text>, width: 220,
      render: (_: any, r) => (
        <Space wrap size={4}>
          {r.skills.filter(s => !filterSkillId || s.skillId === filterSkillId).slice(0, 4).map(s => (
            <Tag key={s.skillId}
              style={isDark ? { background: `${LEVEL_META[s.level].progressColor}22`, color: LEVEL_META[s.level].progressColor, borderColor: `${LEVEL_META[s.level].progressColor}44` } : {}}
              color={isDark ? undefined : 'blue'}
            >
              {s.skill.name} · {LEVEL_META[s.level].stars}★
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: <Text style={{ color: textMuted }}>Dự án hiện tại</Text>, width: 200,
      render: (_: any, r) => (
        r.allocations.length === 0
          ? <Tag style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981', borderColor: 'rgba(16,185,129,0.3)' }}>Chưa có việc</Tag>
          : <Space direction="vertical" size={2}>
              {r.allocations.map(a => (
                <Text key={a.projectId} style={{ color: textMuted, fontSize: 12 }}>
                  {a.projectCode}: {a.pct}%
                </Text>
              ))}
            </Space>
      ),
    },
    {
      title: <Text style={{ color: textMuted }}>Khả năng tiếp nhận</Text>, width: 180,
      render: (_: any, r) => {
        const pct = r.availablePct;
        const color = pct >= 50 ? '#10B981' : pct > 0 ? '#F59E0B' : '#EF4444';
        const label = pct >= 50 ? 'Có thể nhận việc' : pct > 0 ? 'Bận một phần' : 'Đã full';
        return (
          <div>
            <Progress percent={pct} showInfo={false} strokeColor={color} trailColor={isDark ? '#334155' : '#E2E8F0'} size="small" style={{ marginBottom: 2 }} />
            <Text style={{ color, fontSize: 12 }}>{pct}% • {label}</Text>
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <Row gutter={12} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={4}><div style={{ textAlign: 'center', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, padding: '8px 0' }}>
          <Text style={{ fontSize: 20, fontWeight: 700, color: '#10B981', display: 'block' }}>{available.length}</Text>
          <Text style={{ color: textMuted, fontSize: 12 }}>Có thể nhận (≥50%)</Text>
        </div></Col>
        <Col xs={12} sm={4}><div style={{ textAlign: 'center', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8, padding: '8px 0' }}>
          <Text style={{ fontSize: 20, fontWeight: 700, color: '#F59E0B', display: 'block' }}>{semiBooked.length}</Text>
          <Text style={{ color: textMuted, fontSize: 12 }}>Bận một phần</Text>
        </div></Col>
        <Col xs={12} sm={4}><div style={{ textAlign: 'center', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '8px 0' }}>
          <Text style={{ fontSize: 20, fontWeight: 700, color: '#EF4444', display: 'block' }}>{fullyBooked.length}</Text>
          <Text style={{ color: textMuted, fontSize: 12 }}>Đã full</Text>
        </div></Col>
      </Row>

      <FilterBar>
        <Select
          placeholder="Lọc theo kỹ năng"
          allowClear style={{ width: 200 }}
          value={filterSkillId}
          onChange={setFilterSkillId}
          showSearch
          filterOption={(input, opt) => (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())}
          options={skills.map(s => ({ value: s.id, label: s.name }))}
        />
        <Select
          placeholder="Mức độ"
          allowClear style={{ width: 150 }}
          value={filterLevel}
          onChange={setFilterLevel}
          options={[
            { value: 'BEGINNER',     label: 'Mới học' },
            { value: 'INTERMEDIATE', label: 'Trung cấp' },
            { value: 'ADVANCED',     label: 'Thành thạo' },
            { value: 'EXPERT',       label: 'Chuyên gia' },
          ]}
        />
        <DatePicker
          placeholder="Tính đến ngày"
          format="DD/MM/YYYY"
          value={filterDate}
          onChange={setFilterDate}
          style={{ width: 160 }}
        />
      </FilterBar>

      <div style={{ background: bgContainer, borderRadius: 8, border: `1px solid ${borderColor}` }}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={resources}
          loading={isLoading}
          scroll={{ x: 900 }}
          pagination={{ pageSize: 20, showTotal: t => <Text style={{ color: textMuted }}>Tổng {t} nhân sự</Text> }}
          rowClassName={(r) => r.availablePct >= 50 ? '' : ''}
        />
      </div>
    </div>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────

export default function SkillMatrixPage() {
  const { textPrimary, textMuted } = useThemePalette();

  const { data: skills = [] } = useQuery({
    queryKey: ['skills'],
    queryFn: () => skillsApi.listSkills(),
  });

  const { data: stats = [] } = useQuery({
    queryKey: ['skill-stats'],
    queryFn: skillsApi.getSkillStats,
  });

  const totalSkills = skills.length;
  const totalEmployeesCovered = stats.reduce((max, s) => Math.max(max, s.totalEmployees), 0);
  const expertCount = stats.reduce((s, sk) => s + (sk.levelDistribution.EXPERT ?? 0), 0);
  const catCounts = skills.reduce((acc, s) => { acc[s.category] = (acc[s.category] ?? 0) + 1; return acc; }, {} as Record<string, number>);
  const topCat = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0];

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Skill Matrix"
        icon={<ApartmentOutlined />}
        iconColor="#8B5CF6"
      />

      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={6}><StatCard label="Tổng kỹ năng" value={totalSkills} color="#6366F1" icon={<ApartmentOutlined />} /></Col>
        <Col xs={12} sm={6}><StatCard label="NV có kỹ năng" value={totalEmployeesCovered} color="#10B981" icon={<UserOutlined />} /></Col>
        <Col xs={12} sm={6}><StatCard label="Chuyên gia" value={expertCount} color="#F59E0B" icon={<TrophyOutlined />} /></Col>
        <Col xs={12} sm={6}><StatCard label={`Top nhóm`} value={topCat ? `${CATEGORY_META[topCat[0] as SkillCategory]?.label} (${topCat[1]})` : '—'} color="#3B82F6" icon={<StarFilled />} /></Col>
      </Row>

      <Tabs
        defaultActiveKey="matrix"
        items={[
          {
            key: 'matrix',
            label: 'Ma trận kỹ năng',
            children: <MatrixTab skills={skills} />,
          },
          {
            key: 'catalog',
            label: `Danh mục kỹ năng (${totalSkills})`,
            children: <SkillCatalogTab />,
          },
        ]}
      />
    </div>
  );
}
