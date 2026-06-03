import React, { useState, useMemo, useEffect } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import {
  Table, Button, Form, Input, Select,
  Space, App,
  Tabs, Badge, theme,
  Checkbox,
} from 'antd';
import type { MenuProps } from 'antd';
import {
  PlusOutlined,
  SearchOutlined, PlusSquareOutlined, MinusSquareOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import { downloadExport } from '../../utils/exportApi';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi, type Task } from '../../api/tasks';
import { projectsApi } from '../../api/projects';
import { employeesApi } from '../../api/employees';
import dayjs from 'dayjs';
import { useColumnVisibility } from '../../hooks/useColumnVisibility';
import { usePagination } from '../../hooks/usePagination';
import { ColumnToggle } from '../../components/ColumnToggle';
import { FilterBar } from '../../components/FilterBar';
import { useThemePalette } from '../../hooks/useThemePalette';
import {
  type TaskWithDepth,
  flatForSelector, addDepth, filterTree,
  TASK_STATUS_OPTIONS, COL_DEFS,
} from './tasks.constants';
import { buildMenu, buildTreeColumns, buildApprovalColumns } from './tasks.columns';
import { CreateTaskModal } from './components/CreateTaskModal';
import { EditTaskModal } from './components/EditTaskModal';
import { ProgressModal } from './components/ProgressModal';
import { LogEffortModal } from './components/LogEffortModal';
import { ReturnTaskModal } from './components/ReturnTaskModal';
import { TaskDetailModal } from './components/TaskDetailModal';

export default function TasksPage() {
  const { message, modal } = App.useApp();
  const { token } = theme.useToken();
  const { linkColor, textMuted } = useThemePalette();
  const qc = useQueryClient();

  // ── Pagination ────────────────────────────────────────────────────────────
  const { paginationProps: taskPaginationProps } = usePagination(50);
  const { paginationProps: approvalPaginationProps } = usePagination(50);

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
    queryFn: () => employeesApi.list(),
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
  const buildMenuFor = (r: Task): MenuProps => buildMenu(r, {
    setEditTask, editForm, setProgressOpen, setLogOpen,
    approveMutation, cancelMutation, modal,
  });

  const treeColumns = buildTreeColumns({
    linkColor, textMuted, token, isVisible, buildMenuFor,
  });

  const approvalColumns = buildApprovalColumns({
    token, setDetailTaskId, setReturnOpenId, approveMutation,
  });

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
      <PageHeader title="My Tasks" />

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
                  pagination={taskPaginationProps(filteredTree.length, 'task')}
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
                  pagination={approvalPaginationProps(filteredPendingTasks.length, 'task chờ duyệt')}
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
      <CreateTaskModal
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        form={createForm}
        confirmLoading={createMutation.isPending}
        onFinish={(v) => createMutation.mutate({
          ...v,
          startDate: v.startDate?.format('YYYY-MM-DD'),
          dueDate: v.dueDate?.format('YYYY-MM-DD'),
        })}
        employees={employees}
        flatTasks={flatTasks}
      />

      <ProgressModal
        open={!!progressOpen}
        onCancel={() => setProgressOpen(null)}
        onOk={() => {
          const pct = createForm.getFieldValue('_pct') ?? 0;
          progressMutation.mutate({ id: progressOpen!, pct });
        }}
        form={createForm}
        confirmLoading={progressMutation.isPending}
      />

      <EditTaskModal
        editTask={editTask}
        onCancel={() => setEditTask(null)}
        form={editForm}
        confirmLoading={updateMutation.isPending}
        onFinish={(v) => updateMutation.mutate({
          id: editTask!.id,
          data: {
            ...v,
            startDate: v.startDate?.format('YYYY-MM-DD'),
            dueDate: v.dueDate?.format('YYYY-MM-DD'),
          },
        })}
        employees={employees}
      />

      <LogEffortModal
        open={!!logOpen}
        onCancel={() => setLogOpen(null)}
        form={logForm}
        confirmLoading={logMutation.isPending}
        onFinish={(v) => logMutation.mutate({
          id: logOpen!,
          hours: v.hours,
          logDate: v.logDate.format('YYYY-MM-DD'),
          note: v.note,
        })}
      />

      <ReturnTaskModal
        open={!!returnOpenId}
        onCancel={() => { setReturnOpenId(null); returnForm.resetFields(); }}
        form={returnForm}
        confirmLoading={returnMutation.isPending}
        onFinish={(v) => returnMutation.mutate({ id: returnOpenId!, reason: v.reason })}
      />

      {/* ── Chi tiết công việc chờ duyệt ── */}
      <TaskDetailModal
        detailTaskId={detailTaskId}
        detailTask={detailTask}
        detailLoading={detailLoading}
        onClose={() => setDetailTaskId(null)}
        onReturn={(id) => { setDetailTaskId(null); setReturnOpenId(id); }}
        onApprove={(id) => { approveMutation.mutate(id); setDetailTaskId(null); }}
        approvePending={approveMutation.isPending}
      />
    </div>
  );
}
