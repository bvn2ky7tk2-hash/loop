import React, { useState, useMemo, useEffect } from 'react';
import {
  Table, Button, Modal, Form, Input, Select, DatePicker,
  Space, InputNumber, Slider, App,
  Dropdown, Tabs, Badge, Tag, theme,
  Descriptions, Progress, Tooltip, Checkbox, Divider,
} from 'antd';
import { TaskStatusPill } from '../../components/ui/TaskStatusPill';
import type { TaskStatus as TaskStatusType } from '../../components/ui/TaskStatusPill';
import { CenteredModal } from '../../components/ui/CenteredModal';
import { EmployeeInfoCell } from '../../components/ui/EmployeeInfoCell';
import { CommentThread } from '../../components/comments/CommentThread';
import type { MenuProps } from 'antd';
import {
  PlusOutlined, CheckOutlined, EditOutlined, MoreOutlined,
  SearchOutlined, PlusSquareOutlined, MinusSquareOutlined,
  CheckCircleOutlined, RollbackOutlined, EyeOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import { downloadExport } from '../../utils/exportApi';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi, isProgressLocked, type Task } from '../../api/tasks';
import { projectsApi } from '../../api/projects';
import { employeesApi } from '../../api/employees';
import dayjs from 'dayjs';
import { useColumnVisibility } from '../../hooks/useColumnVisibility';
import { ColumnToggle } from '../../components/ColumnToggle';
import { FilterBar } from '../../components/FilterBar';
import { useThemePalette } from '../../hooks/useThemePalette';

type TaskWithDepth = Task & { _depth: number; children?: TaskWithDepth[] };

function flatForSelector(tasks: Task[]): Task[] {
  return tasks.flatMap((t) => [t, ...flatForSelector(t.children ?? [])]);
}

function addDepth(tasks: Task[], depth = 0): TaskWithDepth[] {
  return tasks.map((t) => ({
    ...t,
    _depth: depth,
    children: t.children?.length ? addDepth(t.children, depth + 1) : undefined,
  }));
}

function filterTree(
  tasks: TaskWithDepth[],
  predicate: (t: TaskWithDepth) => boolean,
): TaskWithDepth[] {
  return tasks.reduce<TaskWithDepth[]>((acc, task) => {
    const filteredChildren = task.children ? filterTree(task.children, predicate) : undefined;
    if (predicate(task) || (filteredChildren && filteredChildren.length > 0)) {
      acc.push({ ...task, children: filteredChildren?.length ? filteredChildren : undefined });
    }
    return acc;
  }, []);
}

const TASK_STATUS_OPTIONS = [
  { value: 'TODO',             label: 'Chưa bắt đầu' },
  { value: 'IN_PROGRESS',      label: 'Đang thực hiện' },
  { value: 'PENDING_APPROVAL', label: 'Chờ duyệt' },
  { value: 'RETURNED',         label: 'Trả lại' },
  { value: 'DONE',             label: 'Hoàn thành' },
  { value: 'CANCELLED',        label: 'Đã hủy' },
];

const COL_DEFS = [
  { key: 'title',    label: 'Tên task' },
  { key: 'status',   label: 'Trạng thái' },
  { key: 'progress', label: 'Tiến độ' },
  { key: 'dueDate',  label: 'Hạn' },
  { key: 'assignee', label: 'Người thực hiện' },
  { key: 'hours',    label: 'Giờ (est/act)' },
];

export default function TasksPage() {
  const { message, modal } = App.useApp();
  const { token } = theme.useToken();
  const { isDark, linkColor, preset, textMuted } = useThemePalette();
  const qc = useQueryClient();

  // ── Tab 1: Task list state ────────────────────────────────────────────────
  const [projectId, setProjectId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [progressOpen, setProgressOpen] = useState<string | null>(null);
  const [logOpen, setLogOpen] = useState<string | null>(null);
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [logForm] = Form.useForm();
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [searchText, setSearchText]         = useState('');
  const [filterStatus, setFilterStatus]     = useState<string[]>([]);
  const [filterAssignee, setFilterAssignee] = useState<string | null>(null);
  const { isVisible, toggle, reset } = useColumnVisibility('tasks', COL_DEFS);

  // ── Tab 2: Approval state ─────────────────────────────────────────────────
  const [approvalSearch,          setApprovalSearch]          = useState('');
  const [filterApprovalProject,   setFilterApprovalProject]   = useState<string | null>(null);
  const [filterApprovalAssignee,  setFilterApprovalAssignee]  = useState<string | null>(null);
  const [filterApprovalOverdue,   setFilterApprovalOverdue]   = useState(false);
  const [detailTaskId,            setDetailTaskId]            = useState<string | null>(null);
  const [returnOpenId,            setReturnOpenId]            = useState<string | null>(null);
  const [returnForm] = Form.useForm();

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.list,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: employeesApi.list,
  });

  const { data: projectMembers = [] } = useQuery({
    queryKey: ['project-members', projectId],
    queryFn: () => projectsApi.getMembers(projectId!),
    enabled: !!projectId,
  });

  const { data: taskTree = [], isLoading } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => tasksApi.tree(projectId!),
    enabled: !!projectId,
  });

  const { data: pendingTasks = [], isLoading: pendingLoading } = useQuery({
    queryKey: ['tasks', 'pending-approval'],
    queryFn: tasksApi.pendingApproval,
    staleTime: 30_000,
  });

  const { data: detailTask, isLoading: detailLoading } = useQuery({
    queryKey: ['task', detailTaskId],
    queryFn: () => tasksApi.get(detailTaskId!),
    enabled: !!detailTaskId,
  });

  // Options dùng cho filter trong tab phê duyệt
  const approvalProjects = useMemo(() => {
    const seen = new Set<string>();
    return pendingTasks
      .filter((t) => t.project && !seen.has(t.projectId) && seen.add(t.projectId))
      .map((t) => ({ value: t.projectId, label: `${t.project!.code} — ${t.project!.name}` }));
  }, [pendingTasks]);

  const approvalAssignees = useMemo(() => {
    const seen = new Set<string>();
    return pendingTasks
      .filter((t) => t.assigneeId && t.assignee && !seen.has(t.assigneeId) && seen.add(t.assigneeId))
      .map((t) => ({ value: t.assigneeId!, label: t.assignee!.fullName }));
  }, [pendingTasks]);

  const flatTasks = flatForSelector(taskTree as Task[]);

  const allTaskIds = useMemo(() => {
    function collect(tasks: Task[]): string[] {
      return tasks.flatMap((t) => [t.id, ...collect(t.children ?? [])]);
    }
    return collect(taskTree as Task[]);
  }, [taskTree]);

  useEffect(() => {
    setExpandedKeys(allTaskIds);
  }, [taskTree]); // eslint-disable-line react-hooks/exhaustive-deps

  const expandAll = () => setExpandedKeys(allTaskIds);
  const collapseAll = () => setExpandedKeys([]);

  const filteredTree = useMemo(() => {
    const tree = addDepth(taskTree as Task[]);
    const hasFilter = searchText || filterStatus.length > 0 || filterAssignee;
    if (!hasFilter) return tree;
    return filterTree(tree, (t) => {
      if (searchText && !t.title.toLowerCase().includes(searchText.toLowerCase())) return false;
      if (filterStatus.length > 0 && !filterStatus.includes(t.status)) return false;
      if (filterAssignee && t.assigneeId !== filterAssignee) return false;
      return true;
    });
  }, [taskTree, searchText, filterStatus, filterAssignee]);

  const filteredPendingTasks = useMemo(() => {
    return pendingTasks.filter((t) => {
      if (approvalSearch) {
        const q = approvalSearch.toLowerCase();
        if (
          !t.title.toLowerCase().includes(q) &&
          !(t.project?.name.toLowerCase().includes(q)) &&
          !(t.assignee?.fullName.toLowerCase().includes(q))
        ) return false;
      }
      if (filterApprovalProject  && t.projectId  !== filterApprovalProject)  return false;
      if (filterApprovalAssignee && t.assigneeId !== filterApprovalAssignee) return false;
      if (filterApprovalOverdue  && !(t.dueDate && dayjs(t.dueDate).isBefore(dayjs(), 'day'))) return false;
      return true;
    });
  }, [pendingTasks, approvalSearch, filterApprovalProject, filterApprovalAssignee, filterApprovalOverdue]);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const invalidateBoth = () => {
    qc.invalidateQueries({ queryKey: ['tasks', projectId] });
    qc.invalidateQueries({ queryKey: ['tasks', 'pending-approval'] });
  };

  const createMutation = useMutation({
    mutationFn: (data: Partial<Task>) => tasksApi.create(projectId!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', projectId] });
      setCreateOpen(false);
      createForm.resetFields();
      message.success('Tạo task thành công');
    },
  });

  const progressMutation = useMutation({
    mutationFn: ({ id, pct }: { id: string; pct: number }) => tasksApi.updateProgress(id, pct),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', projectId] });
      setProgressOpen(null);
      message.success('Cập nhật tiến độ thành công');
    },
  });

  const logMutation = useMutation({
    mutationFn: (data: { id: string; hours: number; logDate: string; note?: string }) =>
      tasksApi.logEffort(data.id, { hours: data.hours, logDate: data.logDate, note: data.note }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', projectId] });
      setLogOpen(null);
      logForm.resetFields();
      message.success('Đã ghi nhận giờ làm');
    },
  });

  const approveMutation = useMutation({
    mutationFn: tasksApi.approve,
    onSuccess: () => { invalidateBoth(); message.success('Đã duyệt task'); },
  });

  const returnMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      tasksApi.returnTask(id, reason),
    onSuccess: () => {
      invalidateBoth();
      setReturnOpenId(null);
      returnForm.resetFields();
      message.success('Đã trả lại task');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: tasksApi.cancel,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks', projectId] }); message.success('Đã huỷ'); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Task> }) => tasksApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', projectId] });
      setEditTask(null);
      message.success('Đã cập nhật task');
    },
  });

  // ── Column definitions ────────────────────────────────────────────────────
  const buildMenu = (r: Task): MenuProps => ({
    items: [
      {
        key: 'edit', label: 'Chỉnh sửa', icon: <EditOutlined />,
        onClick: () => {
          setEditTask(r);
          editForm.setFieldsValue({
            title: r.title,
            description: r.description,
            assigneeId: r.assigneeId,
            estimateHours: r.estimateHours,
            startDate: r.startDate ? dayjs(r.startDate) : null,
            dueDate: r.dueDate ? dayjs(r.dueDate) : null,
          });
        },
      },
      {
        key: 'progress',
        label: isProgressLocked(r) ? (
          <Tooltip title={r.children?.length ? 'Task cha — tiến độ tự tính từ subtask' : 'Có bug/issue linked — tiến độ tự tính'}>
            <span style={{ opacity: 0.4 }}>Cập nhật tiến độ</span>
          </Tooltip>
        ) : 'Cập nhật tiến độ',
        icon: <CheckOutlined />,
        disabled: isProgressLocked(r),
        onClick: () => !isProgressLocked(r) && setProgressOpen(r.id),
      },
      { key: 'log', label: 'Ghi giờ thực tế', onClick: () => setLogOpen(r.id) },
      ...(r.status === 'PENDING_APPROVAL' ? [{
        key: 'approve', label: 'Duyệt task',
        onClick: () => approveMutation.mutate(r.id),
      }] : []),
      ...(!['DONE', 'CANCELLED'].includes(r.status) ? [{
        key: 'cancel', label: 'Huỷ task', danger: true,
        onClick: () => {
          modal.confirm({
            title: 'Huỷ task?',
            content: `Huỷ "${r.title}"?`,
            okText: 'Huỷ task', okButtonProps: { danger: true },
            cancelText: 'Đóng',
            onOk: () => cancelMutation.mutate(r.id),
          });
        },
      }] : []),
    ],
  });

  const treeColumns = [
    {
      key: 'title',
      title: 'Tên task', dataIndex: 'title',
      ellipsis: true, minWidth: 240,
      render: (v: string, r: Task) => {
        const depth = (r as TaskWithDepth)._depth ?? 0;
        return (
          <span title={v} style={{ fontWeight: depth === 0 ? 600 : 400, opacity: depth === 0 ? 1 : 0.75 }}>
            {v}
          </span>
        );
      },
    },
    {
      key: 'status',
      title: 'Trạng thái', dataIndex: 'status', width: 130,
      render: (v: string) => <TaskStatusPill status={v as TaskStatusType} size="sm" />,
    },
    {
      key: 'progress',
      title: 'Tiến độ', dataIndex: 'progress', width: 80,
      render: (v: number) => (
        <span style={{ fontSize: 13, fontWeight: 600, color: Number(v) >= 100 ? '#10B981' : Number(v) >= 50 ? linkColor : '#F59E0B' }}>
          {Number(v)}%
        </span>
      ),
    },
    {
      key: 'dueDate',
      title: 'Hạn', dataIndex: 'dueDate', width: 95,
      render: (v: string) => {
        if (!v) return <span style={{ color: '#94A3B8' }}>—</span>;
        const overdue = dayjs(v).isBefore(dayjs(), 'day');
        return <span style={{ color: overdue ? '#EF4444' : textMuted, fontSize: 12 }}>{dayjs(v).format('DD/MM/YY')}</span>;
      },
    },
    {
      key: 'assignee',
      title: 'Người thực hiện', width: 140, ellipsis: true,
      render: (_: unknown, r: Task) => {
        const name = r.assignee?.fullName;
        return name
          ? <span style={{ fontSize: 12, color: token.colorText }}>{name}</span>
          : <span style={{ fontSize: 12, color: token.colorTextDisabled }}>—</span>;
      },
    },
    {
      key: 'hours',
      title: 'Giờ (est / act)', width: 120,
      render: (_: unknown, r: Task) => (
        <span style={{ fontSize: 12 }}>
          <span style={{ color: linkColor, fontWeight: 500 }}>{Number(r.estimateHours)}h</span>
          <span style={{ color: '#94A3B8' }}> / </span>
          <span style={{ color: Number(r.actualHours) > Number(r.estimateHours) ? '#EF4444' : '#10B981', fontWeight: 500 }}>
            {Number(r.actualHours)}h
          </span>
        </span>
      ),
    },
    {
      key: 'actions',
      title: '', width: 40, fixed: 'right' as const,
      render: (_: unknown, r: Task) => (
        <Dropdown menu={buildMenu(r)} trigger={['click']} placement="bottomRight">
          <Button type="text" size="small" icon={<MoreOutlined />} />
        </Dropdown>
      ),
    },
  ].filter((c) => c.key === 'actions' || isVisible(c.key));

  const approvalColumns = [
    {
      key: 'title',
      title: 'Tên task', dataIndex: 'title',
      ellipsis: true, minWidth: 220,
      render: (v: string, r: Task) => (
        <div
          style={{ cursor: 'pointer' }}
          onClick={() => setDetailTaskId(r.id)}
        >
          <div style={{ fontWeight: 500, color: token.colorPrimary }}>{v}</div>
          {r.description && (
            <Tooltip title={r.description}>
              <div style={{
                fontSize: 11, color: token.colorTextSecondary,
                marginTop: 2, overflow: 'hidden',
                whiteSpace: 'nowrap', textOverflow: 'ellipsis', maxWidth: 300,
              }}>
                {r.description}
              </div>
            </Tooltip>
          )}
        </div>
      ),
    },
    {
      key: 'project',
      title: 'Dự án', dataIndex: 'project', width: 200, ellipsis: true,
      render: (p: Task['project']) => p
        ? <span style={{ fontSize: 12 }}><Tag color="geekblue" style={{ marginRight: 4 }}>{p.code}</Tag>{p.name}</span>
        : <span style={{ color: '#94A3B8' }}>—</span>,
    },
    {
      key: 'assignee',
      title: 'Người thực hiện', width: 140, ellipsis: true,
      render: (_: unknown, r: Task) => r.assignee
        ? <EmployeeInfoCell employee={{ fullName: r.assignee.fullName, code: r.assignee.code }} />
        : <span style={{ fontSize: 12, color: token.colorTextDisabled }}>—</span>,
    },
    {
      key: 'progress',
      title: 'Tiến độ', dataIndex: 'progress', width: 90,
      render: (v: number) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Progress
            percent={Number(v)}
            size="small"
            showInfo={false}
            style={{ flex: 1, margin: 0 }}
            strokeColor={Number(v) >= 100 ? '#10B981' : '#F59E0B'}
          />
          <span style={{ fontSize: 12, fontWeight: 600, color: Number(v) >= 100 ? '#10B981' : '#F59E0B', minWidth: 30 }}>
            {Number(v)}%
          </span>
        </div>
      ),
    },
    {
      key: 'dueDate',
      title: 'Hạn', dataIndex: 'dueDate', width: 95,
      render: (v: string) => {
        if (!v) return <span style={{ color: '#94A3B8' }}>—</span>;
        const overdue = dayjs(v).isBefore(dayjs(), 'day');
        return (
          <span style={{ color: overdue ? '#EF4444' : token.colorTextSecondary, fontSize: 12, fontWeight: overdue ? 600 : 400 }}>
            {dayjs(v).format('DD/MM/YY')}
            {overdue && <span style={{ marginLeft: 4, fontSize: 10 }}>⚠</span>}
          </span>
        );
      },
    },
    {
      key: 'createdAt',
      title: 'Nộp lúc', dataIndex: 'createdAt', width: 110,
      render: (v: string) => v
        ? <span style={{ fontSize: 12, color: token.colorTextSecondary }}>{dayjs(v).format('DD/MM/YY HH:mm')}</span>
        : <span style={{ color: '#94A3B8' }}>—</span>,
    },
    {
      key: 'actions',
      title: 'Hành động', width: 200, fixed: 'right' as const,
      render: (_: unknown, r: Task) => (
        <Space size={4}>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => setDetailTaskId(r.id)}
          >
            Chi tiết
          </Button>
          <Button
            type="primary"
            size="small"
            icon={<CheckCircleOutlined />}
            loading={approveMutation.isPending}
            disabled={approveMutation.isPending}
            onClick={() => approveMutation.mutate(r.id)}
          >
            Duyệt
          </Button>
          <Button
            size="small"
            danger
            icon={<RollbackOutlined />}
            onClick={() => setReturnOpenId(r.id)}
          >
            Trả lại
          </Button>
        </Space>
      ),
    },
  ];

  const memberOptions = projectMembers.map((m) => ({
    value: m.employeeId,
    label: m.employee?.fullName ?? m.employeeId,
  }));

  // ── Tab label with badge ──────────────────────────────────────────────────
  const approvalTabLabel = (
    <span>
      Phê duyệt
      {pendingTasks.length > 0 && (
        <Badge
          count={pendingTasks.length}
          size="small"
          style={{ marginLeft: 6, backgroundColor: '#F59E0B' }}
        />
      )}
    </span>
  );

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <h1 className="page-title">My Tasks</h1>
      </div>

      <Tabs
        defaultActiveKey="tasks"
        style={{ marginTop: -8 }}
        items={[
          {
            key: 'tasks',
            label: 'Danh sách task',
            children: (
              <>
                {/* Project selector + actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                  <Select
                    style={{ width: 320 }}
                    placeholder="Chọn dự án"
                    onChange={(v) => { setProjectId(v); setFilterAssignee(null); }}
                    showSearch
                    optionFilterProp="label"
                    options={projects.map((p) => ({ value: p.id, label: `${p.code} — ${p.name}` }))}
                  />
                  {projectId && (
                    <Space size="small">
                      <Button size="small" icon={<PlusSquareOutlined />} onClick={expandAll}>Mở rộng tất cả</Button>
                      <Button size="small" icon={<MinusSquareOutlined />} onClick={collapseAll}>Gom tất cả</Button>
                      <Button
                        size="small"
                        icon={<DownloadOutlined />}
                        onClick={() => downloadExport('/tasks/export', 'tasks.xlsx').catch(() => message.error('Export thất bại'))}
                      >
                        Export
                      </Button>
                      <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
                        Thêm task
                      </Button>
                    </Space>
                  )}
                </div>

                <FilterBar right={<ColumnToggle columns={COL_DEFS} isVisible={isVisible} toggle={toggle} reset={reset} />}>
                  <Input
                    prefix={<SearchOutlined style={{ color: '#94A3B8' }} />}
                    placeholder="Tìm tên task..."
                    style={{ width: 200 }}
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    allowClear
                  />
                  <Select
                    mode="multiple"
                    placeholder="Trạng thái"
                    style={{ minWidth: 160 }}
                    value={filterStatus}
                    onChange={setFilterStatus}
                    options={TASK_STATUS_OPTIONS}
                    allowClear
                    maxTagCount="responsive"
                  />
                  <Select
                    placeholder="Người thực hiện"
                    style={{ width: 180 }}
                    value={filterAssignee}
                    onChange={setFilterAssignee}
                    options={memberOptions}
                    allowClear
                    disabled={!projectId}
                    showSearch
                    filterOption={(input, opt) =>
                      (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())
                    }
                  />
                </FilterBar>

                <Table
                  dataSource={filteredTree}
                  columns={treeColumns}
                  rowKey="id"
                  loading={isLoading}
                  size="small"
                  indentSize={28}
                  expandable={{
                    expandedRowKeys: expandedKeys,
                    onExpandedRowsChange: (keys) => setExpandedKeys(keys as React.Key[]),
                  }}
                  pagination={{ pageSize: 50, showSizeChanger: true, showTotal: (t) => `${t} task` }}
                  scroll={{ x: 900 }}
                  locale={{ emptyText: projectId ? 'Không có task phù hợp' : 'Chọn dự án để xem task' }}
                  rowClassName={(r) => (r as TaskWithDepth)._depth === 0 ? 'task-row-root' : 'task-row-child'}
                />
              </>
            ),
          },
          {
            key: 'approvals',
            label: approvalTabLabel,
            children: (
              <>
                <FilterBar>
                  <Input
                    prefix={<SearchOutlined style={{ color: '#94A3B8' }} />}
                    placeholder="Tìm task, dự án, người thực hiện..."
                    style={{ width: 260 }}
                    value={approvalSearch}
                    onChange={(e) => setApprovalSearch(e.target.value)}
                    allowClear
                  />
                  <Select
                    style={{ width: 220 }}
                    placeholder="Lọc theo dự án"
                    allowClear
                    options={approvalProjects}
                    value={filterApprovalProject}
                    onChange={setFilterApprovalProject}
                  />
                  <Select
                    style={{ width: 180 }}
                    placeholder="Người thực hiện"
                    allowClear
                    options={approvalAssignees}
                    value={filterApprovalAssignee}
                    onChange={setFilterApprovalAssignee}
                  />
                  <Checkbox
                    checked={filterApprovalOverdue}
                    onChange={(e) => setFilterApprovalOverdue(e.target.checked)}
                  >
                    <span style={{ fontSize: 12, color: '#EF4444', fontWeight: 500 }}>⚠ Quá hạn</span>
                  </Checkbox>
                </FilterBar>

                <Table
                  dataSource={filteredPendingTasks}
                  columns={approvalColumns}
                  rowKey="id"
                  loading={pendingLoading}
                  size="small"
                  pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t) => `${t} task chờ duyệt` }}
                  scroll={{ x: 1050 }}
                  locale={{ emptyText: 'Không có task nào đang chờ phê duyệt' }}
                  onRow={(r) => ({ onClick: (e) => { if ((e.target as HTMLElement).closest('button')) return; setDetailTaskId(r.id); }, style: { cursor: 'pointer' } })}
                />
              </>
            ),
          },
        ]}
      />

      {/* ── Modals ── */}
      <Modal
        title="Tạo task mới"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={() => createForm.submit()}
        confirmLoading={createMutation.isPending}
      >
        <Form form={createForm} layout="vertical" onFinish={(v) => createMutation.mutate({
          ...v,
          startDate: v.startDate?.format('YYYY-MM-DD'),
          dueDate: v.dueDate?.format('YYYY-MM-DD'),
        })}>
          <Form.Item name="title" label="Tên task" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="assigneeId" label="Người thực hiện">
            <Select
              allowClear showSearch
              placeholder="Chọn nhân sự..."
              filterOption={(input, opt) => (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())}
              options={employees.map((e) => ({ value: e.id, label: `${e.code} - ${e.fullName}` }))}
            />
          </Form.Item>
          <Form.Item name="parentId" label="Task cha">
            <Select
              allowClear showSearch
              placeholder="Không có (task gốc)"
              filterOption={(input, opt) => (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())}
              options={flatTasks.map((t) => ({ value: t.id, label: t.title }))}
            />
          </Form.Item>
          <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item name="startDate" label="Ngày bắt đầu" style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
            <Form.Item name="dueDate" label="Hạn hoàn thành" style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
          </Space>
          <Form.Item name="estimateHours" label="Giờ ước tính">
            <InputNumber min={0} step={0.5} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Cập nhật tiến độ"
        open={!!progressOpen}
        onCancel={() => setProgressOpen(null)}
        onOk={() => {
          const pct = createForm.getFieldValue('_pct') ?? 0;
          progressMutation.mutate({ id: progressOpen!, pct });
        }}
        confirmLoading={progressMutation.isPending}
      >
        <Form form={createForm}>
          <Form.Item name="_pct" initialValue={0}>
            <Slider min={0} max={100} marks={{ 0: '0%', 50: '50%', 100: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`Sửa task: ${editTask?.title ?? ''}`}
        open={!!editTask}
        onCancel={() => setEditTask(null)}
        onOk={() => editForm.submit()}
        confirmLoading={updateMutation.isPending}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={(v) => updateMutation.mutate({
            id: editTask!.id,
            data: {
              ...v,
              startDate: v.startDate?.format('YYYY-MM-DD'),
              dueDate: v.dueDate?.format('YYYY-MM-DD'),
            },
          })}
        >
          <Form.Item name="title" label="Tên task" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="assigneeId" label="Người thực hiện">
            <Select
              allowClear showSearch
              placeholder="Chọn nhân sự..."
              filterOption={(input, opt) => (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())}
              options={employees.map((e) => ({ value: e.id, label: `${e.code} - ${e.fullName}` }))}
            />
          </Form.Item>
          <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item name="startDate" label="Ngày bắt đầu" style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
            <Form.Item name="dueDate" label="Hạn hoàn thành" style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
          </Space>
          <Form.Item name="estimateHours" label="Giờ ước tính">
            <InputNumber min={0} step={0.5} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Ghi giờ thực tế"
        open={!!logOpen}
        onCancel={() => setLogOpen(null)}
        onOk={() => logForm.submit()}
        confirmLoading={logMutation.isPending}
      >
        <Form form={logForm} layout="vertical" onFinish={(v) => logMutation.mutate({
          id: logOpen!,
          hours: v.hours,
          logDate: v.logDate.format('YYYY-MM-DD'),
          note: v.note,
        })}>
          <Form.Item name="hours" label="Số giờ" rules={[{ required: true }]}>
            <InputNumber min={0.5} step={0.5} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="logDate" label="Ngày" rules={[{ required: true }]} initialValue={dayjs()}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="note" label="Ghi chú">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Trả lại task"
        open={!!returnOpenId}
        onCancel={() => { setReturnOpenId(null); returnForm.resetFields(); }}
        onOk={() => returnForm.submit()}
        okText="Xác nhận trả lại"
        okButtonProps={{ danger: true }}
        confirmLoading={returnMutation.isPending}
      >
        <Form
          form={returnForm}
          layout="vertical"
          onFinish={(v) => returnMutation.mutate({ id: returnOpenId!, reason: v.reason })}
        >
          <Form.Item name="reason" label="Lý do trả lại" rules={[{ required: true, message: 'Vui lòng nhập lý do' }]}>
            <Input.TextArea rows={3} placeholder="Nhập lý do trả lại task cho nhân viên..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Chi tiết công việc chờ duyệt ── */}
      <CenteredModal
        open={!!detailTaskId}
        onClose={() => setDetailTaskId(null)}
        title={detailTask ? detailTask.title : 'Chi tiết công việc'}
        width={640}
        loading={detailLoading}
        footer={
          detailTask ? (
            <Space style={{ justifyContent: 'flex-end', width: '100%' }}>
              <Button
                danger
                icon={<RollbackOutlined />}
                onClick={() => { setDetailTaskId(null); setReturnOpenId(detailTask.id); }}
              >
                Trả lại
              </Button>
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                loading={approveMutation.isPending}
                disabled={approveMutation.isPending}
                onClick={() => { approveMutation.mutate(detailTask.id); setDetailTaskId(null); }}
              >
                Duyệt công việc
              </Button>
            </Space>
          ) : null
        }
      >
        {detailTask && (
          <div>
            {/* Trạng thái + Tiến độ */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <TaskStatusPill status={detailTask.status as TaskStatusType} />
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Progress
                  percent={Number(detailTask.progress)}
                  size="small"
                  showInfo={false}
                  style={{ flex: 1, margin: 0 }}
                  strokeColor={Number(detailTask.progress) >= 100 ? '#10B981' : '#F59E0B'}
                />
                <span style={{
                  fontSize: 13, fontWeight: 700, minWidth: 36,
                  color: Number(detailTask.progress) >= 100 ? '#10B981' : '#F59E0B',
                }}>
                  {Number(detailTask.progress)}%
                </span>
              </div>
            </div>

            {/* Thông tin chi tiết */}
            <Descriptions
              column={2}
              size="small"
              bordered
              labelStyle={{ fontWeight: 600, width: 130, color: token.colorTextSecondary }}
              contentStyle={{ color: token.colorText }}
            >
              <Descriptions.Item label="Dự án" span={2}>
                {detailTask.project
                  ? <><Tag color="geekblue" style={{ marginRight: 6 }}>{detailTask.project.code}</Tag>{detailTask.project.name}</>
                  : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Người thực hiện">
                {detailTask.assignee?.fullName ?? '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Ngày nộp">
                {detailTask.createdAt ? dayjs(detailTask.createdAt).format('DD/MM/YYYY HH:mm') : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Ngày bắt đầu">
                {detailTask.startDate ? dayjs(detailTask.startDate).format('DD/MM/YYYY') : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Hạn hoàn thành">
                {detailTask.dueDate ? (
                  (() => {
                    const overdue = dayjs(detailTask.dueDate).isBefore(dayjs(), 'day');
                    return (
                      <span style={{ color: overdue ? '#EF4444' : undefined, fontWeight: overdue ? 700 : undefined }}>
                        {dayjs(detailTask.dueDate).format('DD/MM/YYYY')}
                        {overdue && <span style={{ marginLeft: 6, fontSize: 11 }}>⚠ Quá hạn</span>}
                      </span>
                    );
                  })()
                ) : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Giờ ước tính">
                <span style={{ fontWeight: 500 }}>{Number(detailTask.estimateHours)}h</span>
              </Descriptions.Item>
              <Descriptions.Item label="Giờ thực tế">
                <span style={{
                  fontWeight: 600,
                  color: Number(detailTask.actualHours) > Number(detailTask.estimateHours) ? '#EF4444' : '#10B981',
                }}>
                  {Number(detailTask.actualHours)}h
                </span>
              </Descriptions.Item>
            </Descriptions>

            {/* Mô tả */}
            {detailTask.description && (
              <>
                <Divider style={{ marginTop: 16, marginBottom: 12 }} />
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: token.colorTextSecondary }}>
                  Mô tả công việc
                </div>
                <div style={{
                  fontSize: 13,
                  color: token.colorText,
                  lineHeight: 1.65,
                  background: token.colorBgLayout,
                  border: `1px solid ${token.colorBorder}`,
                  borderRadius: 8,
                  padding: '10px 14px',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}>
                  {detailTask.description}
                </div>
              </>
            )}

            {/* Sub-tasks */}
            {(detailTask.children?.length ?? 0) > 0 && (
              <>
                <Divider style={{ marginTop: 16, marginBottom: 12 }} />
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: token.colorTextSecondary }}>
                  Sub-tasks ({detailTask.children!.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {detailTask.children!.map((child) => (
                    <div
                      key={child.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '6px 10px',
                        background: token.colorBgLayout,
                        border: `1px solid ${token.colorBorder}`,
                        borderRadius: 6,
                      }}
                    >
                      <TaskStatusPill status={child.status as TaskStatusType} />
                      <span style={{ fontSize: 12, flex: 1, color: token.colorText }}>{child.title}</span>
                      <span style={{ fontSize: 11, color: token.colorTextSecondary, fontWeight: 500 }}>
                        {Number(child.progress)}%
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
            <Divider style={{ margin: '16px 0 8px' }}>Thảo luận</Divider>
            <CommentThread entityType="task" entityId={detailTaskId!} />
          </div>
        )}
      </CenteredModal>
    </div>
  );
}
