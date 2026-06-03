import { useState } from 'react';
import type { CSSProperties } from 'react';
import {
  DndContext, DragOverlay, closestCorners,
  PointerSensor, useSensor, useSensors, useDroppable, useDraggable,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import {
  Typography, Progress, DatePicker, Popover, Slider, Modal,
  Spin, App, Select, Tooltip, Dropdown, Avatar,
} from 'antd';
import {
  CalendarOutlined,
  HourglassOutlined,
  PlayCircleOutlined,
  ClockCircleOutlined,
  RollbackOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  MoreOutlined,
  InboxOutlined,
  FolderOpenOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { tasksApi, isProgressLocked, type Task, type TaskStatus } from '../../api/tasks';
import { projectsApi } from '../../api/projects';
import { employeesApi } from '../../api/employees';
import { useAuthStore } from '../../store/auth.store';
import { useThemePalette } from '../../hooks/useThemePalette';

const { Text } = Typography;

// ── Config ───────────────────────────────────────────────────────────────────

type FilterType = 'ALL' | 'TODAY' | 'TODO' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';

const MANAGER_ROLES = ['PM', 'ADMIN', 'LEADERSHIP'];

const COLUMNS: {
  status: TaskStatus;
  label: string;
  accent: string;
  icon: React.ReactNode;
  emptyDesc: string;
}[] = [
  { status: 'TODO',             label: 'Chưa bắt đầu',   accent: '#94A3B8', icon: <HourglassOutlined />,    emptyDesc: 'Kéo thả công việc vào đây để bắt đầu' },
  { status: 'IN_PROGRESS',      label: 'Đang thực hiện', accent: '#6366F1', icon: <PlayCircleOutlined />,    emptyDesc: 'Chưa có công việc đang thực hiện' },
  { status: 'PENDING_APPROVAL', label: 'Chờ duyệt',      accent: '#D97706', icon: <ClockCircleOutlined />,   emptyDesc: 'Kéo thả công việc vào đây để cập nhật' },
  { status: 'RETURNED',         label: 'Trả lại',         accent: '#DC2626', icon: <RollbackOutlined />,      emptyDesc: 'Kéo thả công việc vào đây để cập nhật' },
  { status: 'DONE',             label: 'Hoàn thành',      accent: '#059669', icon: <CheckCircleOutlined />,   emptyDesc: 'Công việc hoàn thành sẽ xuất hiện ở đây' },
  { status: 'CANCELLED',        label: 'Đã huỷ',          accent: '#94A3B8', icon: <CloseCircleOutlined />,   emptyDesc: 'Các công việc đã huỷ sẽ xuất hiện ở đây' },
];

const today = dayjs().format('YYYY-MM-DD');

// ── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name.split(' ').slice(-2).map((w) => w[0]).join('').toUpperCase();
}

function avatarColor(name: string) {
  const colors = ['#6366F1', '#059669', '#D97706', '#DC2626', '#0891B2', '#8B5CF6', '#0D9488'];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % colors.length;
  return colors[h];
}

// ── Task Card ────────────────────────────────────────────────────────────────

function TaskCard({
  task, isDragging, showAssignee, onProgressChange, onDueDateChange,
}: {
  task: Task;
  isDragging?: boolean;
  showAssignee: boolean;
  onProgressChange: (id: string, pct: number) => void;
  onDueDateChange: (id: string, date: string) => void;
}) {
  const { isDark, bgContainer, bgPage, borderColor, textPrimary, textMuted } = useThemePalette();
  const progress = Number(task.progress);
  const isOverdue = task.dueDate && task.dueDate < today && task.status !== 'DONE' && task.status !== 'CANCELLED';

  // Màu progress bar theo trạng thái
  const col = COLUMNS.find((c) => c.status === task.status);
  const barColor = col?.accent ?? (progress >= 100 ? '#059669' : progress >= 50 ? '#6366F1' : '#D97706');

  const cardStyle: CSSProperties = {
    background: bgContainer,
    borderRadius: 10,
    padding: '10px 12px',
    marginBottom: 8,
    boxShadow: isDragging
      ? '0 8px 24px rgba(0,0,0,0.18)'
      : isDark ? '0 1px 3px rgba(0,0,0,0.3)' : '0 1px 4px rgba(0,0,0,0.07)',
    border: `1px solid ${borderColor}`,
    cursor: isDragging ? 'grabbing' : 'grab',
    opacity: isDragging ? 0.9 : 1,
    userSelect: 'none',
    transition: 'box-shadow 0.15s',
  };

  const moreMenuItems = [
    { key: 'view',   label: 'Xem chi tiết' },
    { key: 'edit',   label: 'Chỉnh sửa' },
    { type: 'divider' as const },
    { key: 'delete', label: 'Xoá', danger: true },
  ];

  const assigneeName = task.assignee?.fullName ?? '';

  return (
    <div style={cardStyle}>
      {/* Row 1: project tag + assignee + more */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        {task.project && (
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 5,
            background: bgPage,
            color: textMuted,
            letterSpacing: 0.4, flexShrink: 0,
          }}>
            {task.project.code}
          </span>
        )}
        {showAssignee && assigneeName && (
          <span style={{
            fontSize: 11, color: textMuted,
            flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {assigneeName}
          </span>
        )}
        <div style={{ marginLeft: 'auto', flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
          <Dropdown menu={{ items: moreMenuItems }} trigger={['click']} placement="bottomRight">
            <button style={{
              border: 'none', background: 'transparent', cursor: 'pointer',
              color: textMuted, fontSize: 16, padding: '0 2px',
              display: 'flex', alignItems: 'center', borderRadius: 4,
            }}>
              <MoreOutlined />
            </button>
          </Dropdown>
        </div>
      </div>

      {/* Title */}
      <Text style={{
        display: 'block', fontSize: 13.5, fontWeight: 600,
        marginBottom: 9, lineHeight: 1.45,
        color: textPrimary,
      }}>
        {task.title}
      </Text>

      {/* Progress bar */}
      <Popover
        trigger="click"
        open={isProgressLocked(task) ? false : undefined}
        content={
          <div style={{ width: 200 }}>
            <Text style={{ fontSize: 12 }}>Tiến độ: <b>{progress}%</b></Text>
            <Slider
              min={0} max={100} step={5}
              defaultValue={progress}
              onChangeComplete={(v) => onProgressChange(task.id, v)}
              tooltip={{ formatter: (v) => `${v}%` }}
            />
          </div>
        }
      >
        <div
          style={{ cursor: isProgressLocked(task) ? 'default' : 'pointer', marginBottom: 8 }}
          onClick={(e) => e.stopPropagation()}
        >
          <Progress
            percent={progress}
            size={['100%', 5]}
            strokeColor={barColor}

            showInfo={false}
            style={{ marginBottom: 3 }}
          />
          <Text style={{ fontSize: 11, color: textMuted, fontWeight: 500 }}>
            <span style={{ color: barColor, fontWeight: 700 }}>{progress}%</span>
            {' · '}
            {Number(task.estimateHours)}h ước tính
          </Text>
        </div>
      </Popover>

      {/* Row bottom: date + avatar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
           onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <CalendarOutlined style={{
            fontSize: 11,
            color: isOverdue ? '#DC2626' : textMuted,
          }} />
          <DatePicker
            size="small"
            variant="borderless"
            format="DD/MM/YYYY"
            placeholder="Chưa có deadline"
            value={task.dueDate ? dayjs(task.dueDate) : null}
            onChange={(d) => d && onDueDateChange(task.id, d.format('YYYY-MM-DD'))}
            style={{
              padding: 0, fontSize: 12, width: 100,
              color: isOverdue ? '#DC2626' : textMuted,
            }}
            suffixIcon={null}
          />
          {isOverdue && (
            <span style={{
              fontSize: 10, fontWeight: 600, padding: '1px 5px', borderRadius: 4,
              background: '#FEF2F2', color: '#DC2626',
            }}>Trễ</span>
          )}
        </div>

        {assigneeName && (
          <Tooltip title={assigneeName}>
            <Avatar
              size={24}
              style={{
                backgroundColor: avatarColor(assigneeName),
                fontSize: 10, fontWeight: 700, flexShrink: 0,
              }}
            >
              {initials(assigneeName)}
            </Avatar>
          </Tooltip>
        )}
      </div>
    </div>
  );
}

// ── Draggable wrapper ────────────────────────────────────────────────────────

function DraggableCard(props: {
  task: Task;
  showAssignee: boolean;
  onProgressChange: (id: string, pct: number) => void;
  onDueDateChange: (id: string, date: string) => void;
}) {
  const isCancelled = props.task.status === 'CANCELLED';
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: props.task.id,
    data: { status: props.task.status },
    disabled: isCancelled,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), zIndex: isDragging ? 999 : undefined }}
      {...attributes}
    >
      <div {...(!isCancelled ? listeners : {})} style={{ touchAction: 'none', cursor: isCancelled ? 'default' : undefined }}>
        <TaskCard {...props} isDragging={isDragging} />
      </div>
    </div>
  );
}

// ── Kanban Column ────────────────────────────────────────────────────────────

function KanbanColumn({
  status, label, accent, icon, emptyDesc, tasks, showAssignee, onProgressChange, onDueDateChange,
}: {
  status: TaskStatus; label: string; accent: string; icon: React.ReactNode; emptyDesc: string;
  tasks: Task[]; showAssignee: boolean;
  onProgressChange: (id: string, pct: number) => void;
  onDueDateChange: (id: string, date: string) => void;
}) {
  const { bgPage, bgSubPanel, borderColor, textMuted } = useThemePalette();
  const { setNodeRef, isOver } = useDroppable({ id: status });

  const columnMenuItems = [
    { key: 'sort-date',  label: 'Sắp xếp theo ngày' },
    { key: 'sort-title', label: 'Sắp xếp theo tên' },
  ];

  return (
    <div style={{
      width: 264,
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      borderRadius: 12,
      overflow: 'hidden',
      border: `1px solid ${borderColor}`,
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 12px',
        background: bgSubPanel,
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        borderBottom: `2px solid ${accent}20`,
      }}>
        <span style={{ color: accent, fontSize: 14, display: 'flex', alignItems: 'center' }}>
          {icon}
        </span>
        <span style={{
          fontSize: 11, fontWeight: 700, color: accent,
          textTransform: 'uppercase', letterSpacing: 0.7, flex: 1,
        }}>
          {label}
        </span>
        <span style={{
          fontSize: 11, fontWeight: 700,
          background: `${accent}18`, color: accent,
          borderRadius: 20, padding: '1px 8px', minWidth: 22, textAlign: 'center',
        }}>
          {tasks.length}
        </span>
        <Dropdown menu={{ items: columnMenuItems }} trigger={['click']} placement="bottomRight">
          <button style={{
            border: 'none', background: 'transparent', cursor: 'pointer',
            color: textMuted, fontSize: 16,
            display: 'flex', alignItems: 'center', padding: '0 2px', borderRadius: 4,
          }}>
            <MoreOutlined />
          </button>
        </Dropdown>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        style={{
          flex: 1, minHeight: 200,
          padding: '8px 8px 4px',
          background: isOver ? `${accent}0A` : bgPage,
          border: isOver ? `2px dashed ${accent}60` : '2px dashed transparent',
          transition: 'all 0.15s',
        }}
      >
        {tasks.map((task) => (
          <DraggableCard
            key={task.id}
            task={task}
            showAssignee={showAssignee}
            onProgressChange={onProgressChange}
            onDueDateChange={onDueDateChange}
          />
        ))}

        {tasks.length === 0 && (
          <div style={{
            textAlign: 'center',
            paddingTop: 32,
            paddingBottom: 20,
          }}>
            <div style={{ fontSize: 36, color: textMuted, marginBottom: 8 }}>
              <InboxOutlined />
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: textMuted, marginBottom: 4 }}>
              Chưa có công việc
            </div>
            <div style={{ fontSize: 11, color: textMuted, lineHeight: 1.5, padding: '0 8px' }}>
              {emptyDesc}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function MyTasksPage() {
  const { message } = App.useApp();
  const { isDark, preset, bgPage, bgContainer, borderColor, textPrimary, textMuted } = useThemePalette();
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const isManager = MANAGER_ROLES.includes(user?.role ?? '');

  const [filter, setFilter]         = useState<FilterType>('ALL');
  const [projectId, setProjectId]   = useState<string | undefined>();
  const [employeeId, setEmployeeId] = useState<string | undefined>();

  function handleProjectChange(pid: string | undefined) {
    setProjectId(pid);
    if (employeeId) setEmployeeId(undefined);
  }
  const [activeTask, setActiveTask]     = useState<Task | null>(null);
  const [dueDateModal, setDueDateModal] = useState(false);
  const [pendingMove, setPendingMove]   = useState<{ id: string; status: TaskStatus } | null>(null);
  const [pendingDueDate, setPendingDueDate] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  // ── Data ─────────────────────────────────────────────────────────────────

  const { data: tasks = [], isLoading, isFetching } = useQuery({
    queryKey: ['kanban-tasks', projectId, employeeId],
    queryFn: () => tasksApi.myTasks({ projectId, employeeId }),
    enabled: isManager ? !!projectId : true,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.list,
  });

  const { data: projectMembers = [] } = useQuery({
    queryKey: ['project-members', projectId],
    queryFn: () => projectsApi.getMembers(projectId!),
    enabled: isManager && !!projectId,
  });

  const { data: allEmployees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => employeesApi.list(),
    enabled: isManager && !projectId,
  });

  const employeeOptions = projectId
    ? projectMembers.filter((m) => m.employee).map((m) => ({ value: m.employeeId, label: m.employee!.fullName }))
    : allEmployees.map((e) => ({ value: e.id, label: e.fullName }));

  // ── Mutations ─────────────────────────────────────────────────────────────

  const invalidate = () => qc.invalidateQueries({ queryKey: ['kanban-tasks'] });

  const moveMutation = useMutation({
    mutationFn: ({ id, status, dueDate }: { id: string; status: TaskStatus; dueDate?: string }) =>
      tasksApi.moveStatus(id, status, dueDate),
    onSuccess: invalidate,
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      message.error(msg ?? 'Cập nhật thất bại');
    },
  });

  const progressMutation = useMutation({
    mutationFn: ({ id, progressPct }: { id: string; progressPct: number }) =>
      tasksApi.updateProgress(id, progressPct),
    onSuccess: invalidate,
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      message.error(msg ?? 'Cập nhật tiến độ thất bại');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, dueDate }: { id: string; dueDate: string }) =>
      tasksApi.update(id, { dueDate }),
    onSuccess: invalidate,
  });

  // ── Filter logic ──────────────────────────────────────────────────────────

  const filtered = tasks.filter((t) => {
    if (filter === 'TODAY')       return t.dueDate === today;
    if (filter === 'TODO')        return t.status === 'TODO';
    if (filter === 'IN_PROGRESS') return t.status === 'IN_PROGRESS';
    if (filter === 'DONE')        return t.status === 'DONE';
    if (filter === 'CANCELLED')   return t.status === 'CANCELLED';
    return true;
  });

  // ── Drag handlers ─────────────────────────────────────────────────────────

  function handleDragStart(event: DragStartEvent) {
    setActiveTask(tasks.find((t) => t.id === event.active.id) ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;
    const taskId    = active.id as string;
    const newStatus = over.id as TaskStatus;
    const task      = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;
    if (newStatus === 'DONE' && !task.dueDate) {
      setPendingMove({ id: taskId, status: newStatus });
      setPendingDueDate('');
      setDueDateModal(true);
      return;
    }
    moveMutation.mutate({ id: taskId, status: newStatus });
  }

  // ── Filter tabs ───────────────────────────────────────────────────────────

  const FILTERS: { key: FilterType; label: string; count: number }[] = [
    { key: 'ALL',         label: 'Tất cả',         count: tasks.length },
    { key: 'TODAY',       label: 'Hôm nay',         count: tasks.filter((t) => t.dueDate === today).length },
    { key: 'TODO',        label: 'Chưa bắt đầu',   count: tasks.filter((t) => t.status === 'TODO').length },
    { key: 'IN_PROGRESS', label: 'Đang thực hiện', count: tasks.filter((t) => t.status === 'IN_PROGRESS').length },
    { key: 'DONE',        label: 'Hoàn thành',      count: tasks.filter((t) => t.status === 'DONE').length },
    { key: 'CANCELLED',   label: 'Đã huỷ',          count: tasks.filter((t) => t.status === 'CANCELLED').length },
  ];

  const pillBase: CSSProperties = {
    padding: '4px 12px', borderRadius: 9999, cursor: 'pointer',
    fontSize: 12, fontWeight: 500,
    border: `1.5px solid ${borderColor}`,
    background: bgContainer,
    color: textMuted,
    display: 'flex', alignItems: 'center', gap: 6,
    transition: 'all 0.15s', whiteSpace: 'nowrap',
  };
  const pillActive: CSSProperties = {
    ...pillBase,
    borderColor: preset.primary,
    background: isDark ? `${preset.primary}30` : `${preset.primary}18`,
    color: isDark ? textPrimary : preset.primary,
  };

  return (
    <div style={{ padding: '20px 24px', height: '100%', display: 'flex', flexDirection: 'column', background: bgPage }}>

      {/* ── Page header ── */}
      <div style={{ marginBottom: 16 }}>
        <h1 style={{
          fontSize: 22, fontWeight: 800, margin: '0 0 14px',
          color: textPrimary, letterSpacing: '-0.3px',
        }}>
          Kanban Board
        </h1>

        {/* Filter bar */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center',
          background: bgContainer,
          border: `1px solid ${borderColor}`,
          borderRadius: 10, padding: '8px 12px',
        }}>
          {/* Project selector */}
          <Select
            allowClear
            placeholder={
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <FolderOpenOutlined /> Tất cả dự án
              </span>
            }
            style={{ minWidth: 280, flex: '0 1 340px' }}
            value={projectId}
            onChange={handleProjectChange}
            showSearch
            filterOption={(input, opt) => (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())}
            options={projects.map((p) => ({ value: p.id, label: `${p.code} — ${p.name}` }))}
          />

          {/* Assignee filter */}
          {isManager && (
            <Select
              allowClear
              placeholder="Lọc nhân sự, dự án"
              style={{ minWidth: 190, flex: '0 1 220px' }}
              value={employeeId}
              onChange={setEmployeeId}
              showSearch
              filterOption={(input, opt) => (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())}
              options={employeeOptions}
            />
          )}

          {/* Divider */}
          <div style={{ width: 1, height: 22, background: borderColor, flexShrink: 0 }} />

          {/* Status quick-filter pills */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                style={filter === f.key ? pillActive : pillBase}
              >
                {f.label}
                <span style={{
                  background: filter === f.key ? preset.primary : borderColor,
                  color: filter === f.key ? '#fff' : textMuted,
                  borderRadius: 9999, padding: '0 6px', fontSize: 11, fontWeight: 700,
                }}>{f.count}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Board ── */}
      <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        {isLoading ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Spin size="large" />
          </div>
        ) : tasks.length === 0 && !isFetching ? (
          <div style={{
            height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', gap: 12,
            color: textMuted,
          }}>
            <InboxOutlined style={{ fontSize: 48 }} />
            <div style={{ fontSize: 15, fontWeight: 600 }}>
              {isManager && !projectId ? 'Vui lòng chọn dự án' : 'Không có task nào'}
            </div>
            <div style={{ fontSize: 13 }}>
              {isManager && !projectId
                ? 'Chọn dự án để xem danh sách công việc'
                : isManager ? 'Không có task phù hợp với bộ lọc hiện tại' : 'Bạn chưa có task nào được giao'}
            </div>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div style={{
              display: 'flex', gap: 10,
              overflowX: 'auto', height: '100%',
              paddingBottom: 16, alignItems: 'flex-start',
            }}>
              {COLUMNS.map((col) => (
                <KanbanColumn
                  key={col.status}
                  {...col}
                  tasks={filtered.filter((t) => t.status === col.status)}
                  showAssignee={isManager && !employeeId}
                  onProgressChange={(id, pct) => progressMutation.mutate({ id, progressPct: pct })}
                  onDueDateChange={(id, date) => updateMutation.mutate({ id, dueDate: date })}
                />
              ))}
            </div>

            <DragOverlay>
              {activeTask && (
                <TaskCard
                  task={activeTask}
                  isDragging
                  showAssignee={isManager && !employeeId}
                  onProgressChange={() => {}}
                  onDueDateChange={() => {}}
                />
              )}
            </DragOverlay>
          </DndContext>
        )}

        {/* Overlay khi đang fetch dữ liệu mới */}
        {isFetching && !isLoading && (
          <div style={{
            position: 'absolute', inset: 0,
            background: isDark ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 8, zIndex: 10, backdropFilter: 'blur(2px)',
          }}>
            <Spin size="large" />
          </div>
        )}
      </div>

      {/* ── Modal: nhập deadline khi kéo sang DONE ── */}
      <Modal
        title="Nhập deadline trước khi hoàn thành"
        open={dueDateModal}
        onOk={() => {
          if (!pendingMove) return;
          moveMutation.mutate({ id: pendingMove.id, status: pendingMove.status, dueDate: pendingDueDate || undefined });
          setDueDateModal(false);
          setPendingMove(null);
        }}
        onCancel={() => { setDueDateModal(false); setPendingMove(null); }}
        okText="Xác nhận hoàn thành"
        cancelText="Huỷ"
        okButtonProps={{ disabled: !pendingDueDate }}
      >
        <Text style={{ display: 'block', marginBottom: 12 }}>
          Task này chưa có deadline. Chọn deadline để ghi nhận:
        </Text>
        <DatePicker
          style={{ width: '100%' }}
          format="DD/MM/YYYY"
          placeholder="Chọn ngày deadline"
          onChange={(d) => setPendingDueDate(d ? d.format('YYYY-MM-DD') : '')}
        />
      </Modal>
    </div>
  );
}
