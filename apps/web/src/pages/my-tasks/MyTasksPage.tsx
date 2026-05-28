import { useState, CSSProperties } from 'react';
import {
  DndContext, DragOverlay,
  PointerSensor, useSensor, useSensors, useDroppable, useDraggable,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import {
  Typography, Progress, DatePicker, Popover, Slider, Modal,
  Spin, Empty, Badge, App, Select, theme,
} from 'antd';
import { CalendarOutlined, HolderOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { tasksApi, type Task, type TaskStatus } from '../../api/tasks';
import { projectsApi } from '../../api/projects';
import { employeesApi } from '../../api/employees';
import { useAuthStore } from '../../store/auth.store';
import { useThemeStore } from '../../store/theme.store';

const { Text } = Typography;

// ── Config ──────────────────────────────────────────────────────────────────

type FilterType = 'ALL' | 'TODAY' | 'TODO' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';

const MANAGER_ROLES = ['PM', 'ADMIN', 'LEADERSHIP'];

const COLUMNS: { status: TaskStatus; label: string; accent: string }[] = [
  { status: 'TODO',             label: 'Chưa bắt đầu',   accent: '#64748B' },
  { status: 'IN_PROGRESS',      label: 'Đang thực hiện', accent: '#4F46E5' },
  { status: 'PENDING_APPROVAL', label: 'Chờ duyệt',       accent: '#D97706' },
  { status: 'RETURNED',         label: 'Trả lại',          accent: '#DC2626' },
  { status: 'DONE',             label: 'Hoàn thành',       accent: '#059669' },
  { status: 'CANCELLED',        label: 'Đã huỷ',           accent: '#6B7280' },
];

const today = dayjs().format('YYYY-MM-DD');

// ── Task Card ────────────────────────────────────────────────────────────────

function TaskCard({
  task, isDragging, onProgressChange, onDueDateChange, showAssignee,
}: {
  task: Task;
  isDragging?: boolean;
  showAssignee: boolean;
  onProgressChange: (id: string, pct: number) => void;
  onDueDateChange: (id: string, date: string) => void;
}) {
  const { token } = theme.useToken();
  const progress = Number(task.progress);
  const isOverdue = task.dueDate && task.dueDate < today && task.status !== 'DONE' && task.status !== 'CANCELLED';

  const cardStyle: CSSProperties = {
    background: token.colorBgContainer,
    borderRadius: 8,
    padding: '10px 12px',
    marginBottom: 8,
    boxShadow: isDragging
      ? `0 8px 24px ${token.colorShadow}`
      : `0 1px 3px ${token.colorBorderSecondary}`,
    border: `1px solid ${token.colorBorderSecondary}`,
    cursor: isDragging ? 'grabbing' : 'grab',
    opacity: isDragging ? 0.88 : 1,
    userSelect: 'none',
  };

  const progressColor = progress >= 100 ? '#059669' : progress >= 50 ? token.colorPrimary : '#D97706';

  return (
    <div style={cardStyle}>
      {/* Project + assignee row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5, flexWrap: 'wrap' }}>
        {task.project && (
          <span style={{
            fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 4,
            background: token.colorFillSecondary, color: token.colorTextSecondary,
            letterSpacing: 0.3,
          }}>
            {task.project.code}
          </span>
        )}
        {showAssignee && task.assignee && (
          <span style={{
            fontSize: 10, padding: '1px 6px', borderRadius: 4,
            background: token.colorFillTertiary, color: token.colorTextTertiary,
          }}>
            {task.assignee.fullName}
          </span>
        )}
      </div>

      {/* Title */}
      <Text style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 7, lineHeight: 1.4, color: token.colorText }}>
        {task.title}
      </Text>

      {/* Progress — click to open slider */}
      <Popover
        trigger="click"
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
        <div style={{ cursor: 'pointer', marginBottom: 5 }} onClick={(e) => e.stopPropagation()}>
          <Progress
            percent={progress}
            size="small"
            strokeColor={progressColor}
            showInfo={false}
          />
          <Text style={{ fontSize: 11, color: token.colorTextQuaternary }}>
            {progress}% · {Number(task.estimateHours)}h ước tính
          </Text>
        </div>
      </Popover>

      {/* Due date */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} onClick={(e) => e.stopPropagation()}>
        <CalendarOutlined style={{ fontSize: 10, color: isOverdue ? '#DC2626' : token.colorTextQuaternary }} />
        <DatePicker
          size="small"
          variant="borderless"
          format="DD/MM/YYYY"
          placeholder="Chưa có deadline"
          value={task.dueDate ? dayjs(task.dueDate) : null}
          onChange={(d) => d && onDueDateChange(task.id, d.format('YYYY-MM-DD'))}
          style={{ padding: 0, fontSize: 11, color: isOverdue ? '#DC2626' : token.colorTextSecondary, width: 115 }}
          suffixIcon={null}
        />
        {isOverdue && (
          <span style={{
            fontSize: 10, fontWeight: 600, padding: '0 5px', borderRadius: 3,
            background: '#FEF2F2', color: '#DC2626',
          }}>Trễ</span>
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

// ── Droppable Column ─────────────────────────────────────────────────────────

function KanbanColumn({
  status, label, accent, tasks, showAssignee, onProgressChange, onDueDateChange,
}: {
  status: TaskStatus; label: string; accent: string; tasks: Task[];
  showAssignee: boolean;
  onProgressChange: (id: string, pct: number) => void;
  onDueDateChange: (id: string, date: string) => void;
}) {
  const { token } = theme.useToken();
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div style={{ width: 248, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        padding: '9px 12px', borderRadius: '8px 8px 0 0',
        background: token.colorFillTertiary,
        borderLeft: `3px solid ${accent}`,
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3,
      }}>
        <span style={{ fontWeight: 700, fontSize: 12, color: accent, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {label}
        </span>
        <Badge count={tasks.length} style={{ backgroundColor: accent }} />
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        style={{
          flex: 1, minHeight: 140, borderRadius: '0 0 8px 8px',
          padding: '6px 5px',
          background: isOver ? token.colorFillSecondary : token.colorFillQuaternary,
          border: isOver ? `2px dashed ${accent}` : `2px dashed transparent`,
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
          <div style={{ textAlign: 'center', color: token.colorTextQuaternary, paddingTop: 24, fontSize: 12 }}>
            Kéo task vào đây
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function MyTasksPage() {
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const { preset } = useThemeStore();
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const isManager = MANAGER_ROLES.includes(user?.role ?? '');

  const [filter, setFilter]           = useState<FilterType>('ALL');
  const [projectId, setProjectId]     = useState<string | undefined>();
  const [employeeId, setEmployeeId]   = useState<string | undefined>();

  function handleProjectChange(pid: string | undefined) {
    setProjectId(pid);
    // Reset nhân sự nếu không còn thuộc dự án vừa chọn
    if (employeeId) setEmployeeId(undefined);
  }
  const [activeTask, setActiveTask]   = useState<Task | null>(null);
  const [dueDateModal, setDueDateModal] = useState(false);
  const [pendingMove, setPendingMove] = useState<{ id: string; status: TaskStatus } | null>(null);
  const [pendingDueDate, setPendingDueDate] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  // ── Data ────────────────────────────────────────────────────────────────────

  const { data: tasks = [], isLoading, isFetching } = useQuery({
    queryKey: ['kanban-tasks', projectId, employeeId],
    queryFn: () => tasksApi.myTasks({ projectId, employeeId }),
    // Manager/Admin phải chọn project để tránh load toàn bộ hệ thống
    // Member load task của mình trực tiếp không cần chọn project
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
    queryFn: employeesApi.list,
    enabled: isManager && !projectId,
  });

  const employeeOptions = projectId
    ? projectMembers
        .filter((m) => m.employee)
        .map((m) => ({ value: m.employeeId, label: m.employee!.fullName }))
    : allEmployees.map((e) => ({ value: e.id, label: e.fullName }));

  // ── Mutations ───────────────────────────────────────────────────────────────

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

  // ── Filter logic ─────────────────────────────────────────────────────────────

  const filtered = tasks.filter((t) => {
    if (filter === 'TODAY') return t.dueDate === today;
    if (filter === 'TODO') return t.status === 'TODO';
    if (filter === 'IN_PROGRESS') return t.status === 'IN_PROGRESS';
    if (filter === 'DONE') return t.status === 'DONE';
    if (filter === 'CANCELLED') return t.status === 'CANCELLED';
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

  // ── Filter pills ──────────────────────────────────────────────────────────

  const FILTERS: { key: FilterType; label: string; count: number }[] = [
    { key: 'ALL',         label: 'Tất cả',          count: tasks.length },
    { key: 'TODAY',       label: 'Hôm nay',          count: tasks.filter((t) => t.dueDate === today).length },
    { key: 'TODO',        label: 'Chưa bắt đầu',    count: tasks.filter((t) => t.status === 'TODO').length },
    { key: 'IN_PROGRESS', label: 'Đang thực hiện',  count: tasks.filter((t) => t.status === 'IN_PROGRESS').length },
    { key: 'DONE',        label: 'Hoàn thành',       count: tasks.filter((t) => t.status === 'DONE').length },
    { key: 'CANCELLED',   label: 'Đã huỷ',           count: tasks.filter((t) => t.status === 'CANCELLED').length },
  ];

  const pillBase: CSSProperties = {
    padding: '4px 12px', borderRadius: 9999, cursor: 'pointer',
    fontSize: 12, fontWeight: 500, border: `1.5px solid ${token.colorBorder}`,
    background: token.colorBgContainer, color: token.colorText,
    display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s',
  };
  const pillActive: CSSProperties = {
    ...pillBase, borderColor: preset.primary,
    background: `${preset.primary}18`, color: preset.primary,
  };

  return (
    <div style={{ padding: 24, height: '100%', display: 'flex', flexDirection: 'column', background: token.colorBgLayout }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 14 }}>

        {/* Row 1: title + hint */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
          <h1 className="page-title" style={{ fontSize: 18 }}>Kanban Board</h1>
          <span style={{ color: token.colorTextQuaternary, fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
            <HolderOutlined /> Kéo thả đổi trạng thái · Click progress cập nhật %
          </span>
        </div>

        {/* Row 2: dropdowns (left) + status pills (right) */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>

          {/* Project filter */}
          <Select
            allowClear
            placeholder="Tất cả dự án"
            style={{ minWidth: 300, flex: '0 1 380px' }}
            value={projectId}
            onChange={handleProjectChange}
            showSearch={{ optionFilterProp: 'label' }}
            options={projects.map((p) => ({ value: p.id, label: `${p.code} — ${p.name}` }))}
          />

          {/* Employee filter — PM/ADMIN/LEADERSHIP only */}
          {isManager && (
            <Select
              allowClear
              placeholder={projectId ? 'Lọc nhân sự dự án' : 'Tất cả nhân sự'}
              style={{ minWidth: 200, flex: '0 1 240px' }}
              value={employeeId}
              onChange={setEmployeeId}
              showSearch={{ optionFilterProp: 'label' }}
              options={employeeOptions}
            />
          )}

          {/* Divider */}
          <div style={{ width: 1, height: 20, background: token.colorBorder, flexShrink: 0 }} />

          {/* Status quick-filter pills */}
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={filter === f.key ? pillActive : pillBase}
            >
              {f.label}
              <span style={{
                background: filter === f.key ? preset.primary : token.colorFillSecondary,
                color: filter === f.key ? '#fff' : token.colorTextSecondary,
                borderRadius: 9999, padding: '0 6px', fontSize: 11, fontWeight: 700,
              }}>{f.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Board ── */}
      <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        {isLoading ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Spin size="large" />
          </div>
        ) : tasks.length === 0 && !isFetching ? (
          (isManager && !projectId)
            ? <Empty description="Vui lòng chọn dự án để xem danh sách task" />
            : <Empty description={isManager ? 'Không có task nào phù hợp' : 'Bạn chưa có task nào được giao'} />
        ) : (
          <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div style={{ display: 'flex', gap: 10, overflowX: 'auto', height: '100%', paddingBottom: 16, alignItems: 'flex-start' }}>
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

        {/* Overlay khi chuyển dự án (có cache cũ, đang fetch mới) */}
        {isFetching && !isLoading && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0,0,0,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 8, zIndex: 10,
          }}>
            <Spin size="large" />
          </div>
        )}
      </div>

      {/* ── Modal nhập deadline khi kéo sang DONE ── */}
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
        <Text style={{ display: 'block', marginBottom: 12, color: token.colorTextSecondary }}>
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
