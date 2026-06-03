import { useState, useMemo, useCallback, useRef } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity, ScrollView, Alert, PanResponder } from 'react-native';
import {
  Text, Card, Chip, ProgressBar, Button, Portal, Modal, FAB,
  useTheme, ActivityIndicator, Divider, TextInput, Snackbar,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../src/api/client';
import { useAuthStore } from '../../src/store/auth';
import { DatePickerField } from '../../src/components/DatePickerField';
import { ProjectPickerField } from '../../src/components/ProjectPickerField';

// ── Types ───────────────────────────────────────────────────────────────────

type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'PENDING_APPROVAL' | 'RETURNED' | 'CANCELLED';

interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  progress: number;
  dueDate?: string;
  estimateHours: number;
  actualHours: number;
  projectId: string;
  parentId?: string;
  project?: { id: string; code: string; name: string };
  assignee?: { id: string; fullName: string };
}

type FlatTask = Task & {
  _depth: number;
  _hasChildren: boolean;
  _parentIds: string[];
};

interface Project {
  id: string;
  code: string;
  name: string;
}

type FilterType = 'ALL' | 'TODAY' | 'OVERDUE' | 'IN_PROGRESS' | 'DONE';

// ── Constants ───────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; bg: string }> = {
  TODO:             { label: 'Chưa bắt đầu',   color: '#475569', bg: '#F1F5F9' },
  IN_PROGRESS:      { label: 'Đang thực hiện', color: '#4338CA', bg: '#EEF2FF' },
  DONE:             { label: 'Hoàn thành',      color: '#065F46', bg: '#ECFDF5' },
  PENDING_APPROVAL: { label: 'Chờ duyệt',       color: '#92400E', bg: '#FFFBEB' },
  RETURNED:         { label: 'Trả lại',          color: '#991B1B', bg: '#FEF2F2' },
  CANCELLED:        { label: 'Đã hủy',           color: '#374151', bg: '#F9FAFB' },
};

const MOVE_OPTIONS: { status: TaskStatus; label: string; icon: string }[] = [
  { status: 'TODO',             label: 'Chưa bắt đầu',   icon: 'checkbox-blank-outline' },
  { status: 'IN_PROGRESS',      label: 'Đang thực hiện', icon: 'progress-clock' },
  { status: 'PENDING_APPROVAL', label: 'Chờ duyệt',       icon: 'clock-outline' },
  { status: 'DONE',             label: 'Hoàn thành',      icon: 'check-circle-outline' },
];

const today = new Date().toISOString().split('T')[0];

// ── Tree helpers ─────────────────────────────────────────────────────────────

function flattenTasks(tasks: Task[]): FlatTask[] {
  const taskIds = new Set(tasks.map(t => t.id));
  const childrenMap: Record<string, Task[]> = {};
  const roots: Task[] = [];
  tasks.forEach(t => {
    // Treat as root if no parent, or parent isn't in this list (assigned to someone else)
    if (!t.parentId || !taskIds.has(t.parentId)) {
      roots.push(t);
    } else {
      (childrenMap[t.parentId] ??= []).push(t);
    }
  });
  const result: FlatTask[] = [];
  function walk(list: Task[], depth: number, parentIds: string[]) {
    list.forEach(t => {
      const children = childrenMap[t.id] ?? [];
      result.push({ ...t, _depth: depth, _hasChildren: children.length > 0, _parentIds: parentIds });
      if (children.length > 0) walk(children, depth + 1, [...parentIds, t.id]);
    });
  }
  walk(roots, 0, []);
  return result;
}

// ── Stat chip component ──────────────────────────────────────────────────────

function StatCard({
  icon, count, label, color, onPress,
}: { icon: string; count: number; label: string; color: string; onPress?: () => void }) {
  const theme = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      style={[styles.statCard, { backgroundColor: `${color}18`, borderColor: `${color}30` }]}
    >
      <MaterialCommunityIcons name={icon as any} size={20} color={color} />
      <Text style={[styles.statCount, { color }]}>{count}</Text>
      <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── Progress Slider ──────────────────────────────────────────────────────────

function ProgressSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const trackWidth = useRef(0);
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        if (!trackWidth.current) return;
        const pct = Math.max(0, Math.min(100, Math.round((evt.nativeEvent.locationX / trackWidth.current) * 100)));
        onChange(pct);
      },
      onPanResponderMove: (evt) => {
        if (!trackWidth.current) return;
        const pct = Math.max(0, Math.min(100, Math.round((evt.nativeEvent.locationX / trackWidth.current) * 100)));
        onChange(pct);
      },
    })
  ).current;

  return (
    <View
      style={styles.sliderWrap}
      onLayout={(e) => { trackWidth.current = e.nativeEvent.layout.width; }}
      {...panResponder.panHandlers}
    >
      <View style={styles.sliderTrack}>
        <View style={[styles.sliderFill, { width: `${value}%` as any }]} />
      </View>
      <View style={[styles.sliderThumb, { left: `${value}%` as any }]} />
    </View>
  );
}

// ── Component ───────────────────────────────────────────────────────────────

export default function MyTasksScreen() {
  const theme = useTheme();
  const qc = useQueryClient();
  const { user } = useAuthStore();

  const [filter, setFilter] = useState<FilterType>('ALL');
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [editStatus, setEditStatus] = useState<TaskStatus>('TODO');
  const [editProgress, setEditProgress] = useState(0);
  const [editDueDate, setEditDueDate] = useState('');
  const [effortHours, setEffortHours] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [createDueDate, setCreateDueDate] = useState('');
  const [createEstimate, setCreateEstimate] = useState('');
  const [createProjectId, setCreateProjectId] = useState('');
  const [createParentId, setCreateParentId] = useState('');
  const [createParentTitle, setCreateParentTitle] = useState('');
  const [parentPickerOpen, setParentPickerOpen] = useState(false);

  const [snack, setSnack] = useState('');

  // ── Queries ─────────────────────────────────────────────────────────────────

  const { data: tasks = [], isLoading, isError, error, refetch } = useQuery<Task[]>({
    queryKey: ['my-tasks'],
    queryFn: () => api.get<Task[]>('/tasks/mine'),
    retry: false,
  });

  // Tasks of selected project — used for parent task picker
  const { data: parentTaskOptions = [] } = useQuery<Task[]>({
    queryKey: ['project-tasks', createProjectId],
    queryFn: () => api.get<Task[]>(`/projects/${createProjectId}/tasks`),
    enabled: !!createProjectId,
    staleTime: 30_000,
  });

  // Derive projects the user is assigned to from their own tasks — no extra API call needed
  const projects = useMemo<Project[]>(() => {
    const seen = new Set<string>();
    const result: Project[] = [];
    for (const t of tasks) {
      if (t.project && !seen.has(t.project.id)) {
        seen.add(t.project.id);
        result.push(t.project);
      }
    }
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [tasks]);

  // ── Mutations ────────────────────────────────────────────────────────────────

  const moveMutation = useMutation({
    mutationFn: ({ id, status, dueDate }: { id: string; status: TaskStatus; dueDate?: string }) =>
      api.put(`/tasks/${id}/status`, { status, dueDate }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-tasks'] }); setEditTask(null); },
  });

  const progressMutation = useMutation({
    mutationFn: ({ id, progressPct }: { id: string; progressPct: number }) =>
      api.put(`/tasks/${id}/progress`, { progressPct }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-tasks'] }); setEditTask(null); },
  });

  const effortMutation = useMutation({
    mutationFn: ({ id, hours }: { id: string; hours: number }) =>
      api.post(`/tasks/${id}/log-effort`, { hours, logDate: today }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-tasks'] });
      setEditTask(null);
      setSnack('Đã ghi nhận giờ thực tế');
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: {
      title: string; description?: string; dueDate?: string;
      estimateHours?: number; projectId: string; parentId?: string;
    }) => api.post(`/projects/${data.projectId}/tasks`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-tasks'] });
      setCreateOpen(false);
      resetCreate();
      setSnack('Task đã gửi cho PM duyệt ✓');
    },
    onError: () => setSnack('Tạo task thất bại'),
  });

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function resetCreate() {
    setCreateTitle(''); setCreateDesc(''); setCreateDueDate(today);
    setCreateEstimate('4'); setCreateProjectId('');
    setCreateParentId(''); setCreateParentTitle('');
  }

  function openEdit(task: Task) {
    setEditTask(task);
    setEditStatus(task.status);
    setEditProgress(Math.round(Number(task.progress)));
    setEditDueDate(task.dueDate ?? today);
    setEffortHours('');
  }

  function handleSave() {
    if (!editTask) return;
    const pct = editProgress;
    const hours = parseFloat(effortHours);
    const statusChanged = editStatus !== editTask.status;
    const progressChanged = pct !== Math.round(Number(editTask.progress));
    const hasEffort = !isNaN(hours) && hours > 0;

    if (hasEffort) {
      effortMutation.mutate({ id: editTask.id, hours });
    } else if (statusChanged) {
      moveMutation.mutate({ id: editTask.id, status: editStatus, dueDate: editDueDate || undefined });
    } else if (progressChanged) {
      progressMutation.mutate({ id: editTask.id, progressPct: pct });
    } else {
      setEditTask(null);
    }
  }

  function handleCreate() {
    if (!createProjectId) { Alert.alert('Chọn dự án', 'Vui lòng chọn dự án cho task này'); return; }
    if (!createTitle.trim()) { Alert.alert('Thiếu tiêu đề', 'Vui lòng nhập tên công việc'); return; }
    const estimate = parseFloat(createEstimate);
    if (!isNaN(estimate) && estimate > 4) {
      Alert.alert(
        'Estimate > 4h',
        'Task này ước tính trên 4 giờ — bạn có muốn chia nhỏ không?',
        [
          { text: 'Chia nhỏ', onPress: () => setCreateOpen(false), style: 'cancel' },
          { text: 'Vẫn gửi', onPress: submitCreate },
        ],
      );
      return;
    }
    submitCreate();
  }

  function submitCreate() {
    const estimate = parseFloat(createEstimate);
    createMutation.mutate({
      projectId: createProjectId,
      title: createTitle.trim(),
      description: createDesc.trim() || undefined,
      dueDate: createDueDate || today,
      estimateHours: !isNaN(estimate) ? estimate : 4,
      parentId: createParentId || undefined,
    });
  }

  // ── Collapse/Expand ─────────────────────────────────────────────────────────

  const toggleCollapse = useCallback((id: string) => {
    setCollapsedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => setCollapsedIds(new Set()), []);

  const collapseAll = useCallback(() => {
    const flat = flattenTasks(tasks);
    setCollapsedIds(new Set(flat.filter(t => t._hasChildren).map(t => t.id)));
  }, [tasks]);

  // ── Display logic ─────────────────────────────────────────────────────────────

  const isTreeView = filter === 'ALL';

  const flatTree = useMemo(() => flattenTasks(tasks), [tasks]);

  const displayTasks = useMemo<(Task | FlatTask)[]>(() => {
    if (isTreeView) {
      return flatTree.filter(t => !t._parentIds.some(id => collapsedIds.has(id)));
    }
    const sorted = [...tasks].sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    });
    return sorted.filter((t) => {
      if (filter === 'TODAY') return t.dueDate === today;
      if (filter === 'OVERDUE') return !!t.dueDate && t.dueDate < today && t.status !== 'DONE';
      if (filter === 'IN_PROGRESS') return t.status === 'IN_PROGRESS';
      if (filter === 'DONE') return t.status === 'DONE';
      return true;
    });
  }, [isTreeView, flatTree, collapsedIds, tasks, filter]);

  const overdueCount = tasks.filter((t) => t.dueDate && t.dueDate < today && t.status !== 'DONE').length;
  const inProgressCount = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const doneCount = tasks.filter((t) => t.status === 'DONE').length;
  const todayCount = tasks.filter((t) => t.dueDate === today).length;

  const FILTER_OPTIONS: { value: FilterType; label: string }[] = [
    { value: 'ALL',         label: `Tất cả (${tasks.length})` },
    { value: 'TODAY',       label: `Hôm nay (${todayCount})` },
    { value: 'OVERDUE',     label: `Quá hạn (${overdueCount})` },
    { value: 'IN_PROGRESS', label: `Đang làm (${inProgressCount})` },
    { value: 'DONE',        label: `Xong (${doneCount})` },
  ];

  // ── Greeting ─────────────────────────────────────────────────────────────────

  const firstName = user?.name?.split(' ').pop() ?? '';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Chào buổi sáng' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>

      {/* ── Personal Dashboard ───────────────────────────────────────────── */}
      <View style={[styles.dashboard, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.surfaceVariant }]}>
        <Text variant="titleSmall" style={[styles.greeting, { color: theme.colors.onSurface }]}>
          {greeting}, {firstName} 👋
        </Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12 }}>
          {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}
        </Text>
        <View style={styles.statsRow}>
          <StatCard icon="format-list-checks" count={tasks.length} label="Tổng" color={theme.colors.primary} onPress={() => setFilter('ALL')} />
          <StatCard icon="clock-fast" count={inProgressCount} label="Đang làm" color="#4F46E5" onPress={() => setFilter('IN_PROGRESS')} />
          <StatCard icon="alert-circle-outline" count={overdueCount} label="Trễ hạn" color="#EF4444" onPress={() => setFilter('OVERDUE')} />
          <StatCard icon="check-circle-outline" count={doneCount} label="Xong" color="#10B981" onPress={() => setFilter('DONE')} />
        </View>
      </View>

      {/* ── Filter chips ─────────────────────────────────────────────────── */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {FILTER_OPTIONS.map((opt) => (
            <Chip
              key={opt.value}
              selected={filter === opt.value}
              onPress={() => setFilter(opt.value)}
              style={styles.filterChip}
              compact
            >
              {opt.label}
            </Chip>
          ))}
        </ScrollView>
        {isTreeView && (
          <View style={styles.treeControls}>
            <TouchableOpacity onPress={expandAll} style={styles.treeBtn}>
              <Text style={[styles.treeBtnText, { color: theme.colors.onSurfaceVariant }]}>▼ Mở rộng</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={collapseAll} style={styles.treeBtn}>
              <Text style={[styles.treeBtnText, { color: theme.colors.onSurfaceVariant }]}>▶ Thu gọn</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ── Task list ────────────────────────────────────────────────────── */}
      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 60 }} />
      ) : isError ? (
        <Text style={[styles.empty, { color: '#EF4444' }]} onPress={() => refetch()}>
          {`Lỗi tải dữ liệu: ${error instanceof Error ? error.message : 'Không rõ'}\n(Nhấn để thử lại)`}
        </Text>
      ) : (
        <FlatList
          data={displayTasks}
          keyExtractor={(t) => t.id}
          contentContainerStyle={styles.list}
          refreshing={isLoading}
          onRefresh={refetch}
          renderItem={({ item }) => {
            const flatItem = item as FlatTask;
            const depth = isTreeView ? (flatItem._depth ?? 0) : 0;
            const hasChildren = isTreeView && (flatItem._hasChildren ?? false);
            const isCollapsed = collapsedIds.has(item.id);
            const cfg = STATUS_CONFIG[item.status as TaskStatus];
            const isOverdue = item.dueDate && item.dueDate < today && item.status !== 'DONE';

            const cardContent = (
              <Card.Content>
                <View style={styles.row}>
                  {item.project && (
                    <Chip compact textStyle={{ fontSize: 10 }} style={styles.projectChip}>
                      {item.project.code}
                    </Chip>
                  )}
                  <View style={{ flex: 1 }} />
                  <View style={[styles.statusPill, { backgroundColor: cfg.bg }]}>
                    <Text style={[styles.statusPillText, { color: cfg.color }]}>{cfg.label}</Text>
                  </View>
                </View>

                <Text variant="titleSmall" style={styles.title}>{item.title}</Text>

                <ProgressBar
                  progress={Number(item.progress) / 100}
                  color={Number(item.progress) >= 100 ? '#10B981' : cfg.color}
                  style={styles.progressBar}
                />
                <Text variant="bodySmall" style={[styles.subText, { color: theme.colors.onSurfaceVariant }]}>
                  {Math.round(Number(item.progress))}% · est {Number(item.estimateHours)}h · thực tế {Number(item.actualHours)}h
                </Text>

                {item.assignee && (
                  <View style={[styles.row, { marginBottom: 2 }]}>
                    <MaterialCommunityIcons name="account-outline" size={12} color={theme.colors.onSurfaceVariant} style={{ marginRight: 4 }} />
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{item.assignee.fullName}</Text>
                  </View>
                )}

                {item.dueDate ? (
                  <View style={[styles.row, { marginBottom: 0 }]}>
                    <MaterialCommunityIcons
                      name={isOverdue ? 'alert-circle-outline' : 'calendar-outline'}
                      size={12}
                      color={isOverdue ? '#EF4444' : theme.colors.onSurfaceVariant}
                      style={{ marginRight: 4 }}
                    />
                    <Text variant="bodySmall" style={{ color: isOverdue ? '#EF4444' : theme.colors.onSurfaceVariant }}>
                      {new Date(item.dueDate + 'T00:00:00').toLocaleDateString('vi-VN')}
                      {isOverdue ? ' · Trễ deadline' : ''}
                    </Text>
                  </View>
                ) : (
                  <View style={[styles.row, { marginBottom: 0 }]}>
                    <MaterialCommunityIcons name="calendar-remove-outline" size={12} color="#F59E0B" style={{ marginRight: 4 }} />
                    <Text variant="bodySmall" style={{ color: '#F59E0B' }}>Chưa có deadline</Text>
                  </View>
                )}
              </Card.Content>
            );

            if (!isTreeView) {
              return (
                <TouchableOpacity onPress={() => openEdit(item)} activeOpacity={0.8}>
                  <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                    {cardContent}
                  </Card>
                </TouchableOpacity>
              );
            }

            return (
              <View style={[styles.taskRow, { marginLeft: depth * 16 }]}>
                <TouchableOpacity
                  onPress={() => toggleCollapse(item.id)}
                  style={styles.chevronBtn}
                  disabled={!hasChildren}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={[styles.chevronText, { opacity: hasChildren ? 1 : 0 }]}>
                    {isCollapsed ? '▶' : '▼'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => openEdit(item)} activeOpacity={0.8} style={{ flex: 1 }}>
                  <Card style={[styles.card, { backgroundColor: theme.colors.surface, marginBottom: 0 }]}>
                    {cardContent}
                  </Card>
                </TouchableOpacity>
              </View>
            );
          }}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: theme.colors.onSurfaceVariant }]}>
              {tasks.length === 0 ? 'Chưa có task nào được giao cho bạn' : 'Không có task phù hợp với bộ lọc'}
            </Text>
          }
        />
      )}

      {/* FAB — Create Task */}
      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: '#4F46E5' }]}
        color="#fff"
        onPress={() => setCreateOpen(true)}
      />

      <Portal>
        {/* ── Edit / Progress modal ────────────────────────────────────────── */}
        <Modal
          visible={!!editTask}
          onDismiss={() => setEditTask(null)}
          contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}
        >
          {editTask && (
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text variant="titleMedium" style={styles.modalTitle} numberOfLines={2}>
                {editTask.title}
              </Text>
              {editTask.project && (
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16 }}>
                  Dự án: {editTask.project.name}
                </Text>
              )}

              <Divider style={styles.divider} />

              {/* Status selector */}
              <Text variant="labelMedium" style={styles.sectionLabel}>Trạng thái</Text>
              <View style={styles.statusGrid}>
                {MOVE_OPTIONS.map((opt) => {
                  const isSelected = editStatus === opt.status;
                  const cfg = STATUS_CONFIG[opt.status];
                  return (
                    <TouchableOpacity
                      key={opt.status}
                      onPress={() => setEditStatus(opt.status)}
                      style={[
                        styles.statusBtn,
                        {
                          borderColor: isSelected ? cfg.color : theme.colors.surfaceVariant,
                          backgroundColor: isSelected ? cfg.bg : 'transparent',
                        },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={opt.icon as any}
                        size={18}
                        color={isSelected ? cfg.color : theme.colors.onSurfaceVariant}
                      />
                      <Text
                        variant="bodySmall"
                        style={{ color: isSelected ? cfg.color : theme.colors.onSurfaceVariant, fontWeight: isSelected ? '700' : '400', textAlign: 'center' }}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Divider style={styles.divider} />

              {/* Progress */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <Text variant="labelMedium" style={styles.sectionLabel}>Tiến độ</Text>
                <Text variant="labelLarge" style={{ color: '#4F46E5', fontWeight: '700' }}>{editProgress}%</Text>
              </View>
              <ProgressSlider value={editProgress} onChange={setEditProgress} />

              {/* Effort logging */}
              <Text variant="labelMedium" style={[styles.sectionLabel, { marginTop: 12 }]}>
                + Giờ hôm nay
              </Text>
              <TextInput
                mode="outlined"
                value={effortHours}
                onChangeText={setEffortHours}
                keyboardType="decimal-pad"
                style={styles.input}
                placeholder="VD: 2.5"
                right={<TextInput.Affix text="giờ" />}
              />
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>
                Thực tế hiện tại: {Number(editTask.actualHours)}h
              </Text>

              {/* Due date */}
              <Text variant="labelMedium" style={[styles.sectionLabel, { marginTop: 4 }]}>Deadline</Text>
              <DatePickerField
                label="Deadline"
                value={editDueDate}
                onChange={setEditDueDate}
                style={styles.input}
              />

              {/* Actions */}
              <View style={styles.modalActions}>
                <Button mode="outlined" onPress={() => setEditTask(null)} style={{ flex: 1 }}>
                  Huỷ
                </Button>
                <Button
                  mode="contained"
                  onPress={handleSave}
                  style={[{ flex: 1 }, { backgroundColor: '#4F46E5' }]}
                  loading={moveMutation.isPending || progressMutation.isPending || effortMutation.isPending}
                >
                  Lưu
                </Button>
              </View>
            </ScrollView>
          )}
        </Modal>

        {/* ── Create Task modal ────────────────────────────────────────────── */}
        <Modal
          visible={createOpen}
          onDismiss={() => { setCreateOpen(false); resetCreate(); }}
          contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text variant="titleMedium" style={styles.modalTitle}>Tạo task mới</Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16 }}>
              Task sẽ được gửi cho PM duyệt
            </Text>

            {/* 1. Dự án */}
            <Text variant="labelMedium" style={styles.sectionLabel}>Dự án *</Text>
            <ProjectPickerField
              projects={projects}
              value={createProjectId}
              onChange={(id) => {
                setCreateProjectId(id);
                setCreateParentId('');
                setCreateParentTitle('');
              }}
              loading={isLoading}
              style={styles.input}
            />

            {/* 2. Tiêu đề */}
            <Text variant="labelMedium" style={[styles.sectionLabel, { marginTop: 8 }]}>Tiêu đề *</Text>
            <TextInput
              mode="outlined"
              value={createTitle}
              onChangeText={setCreateTitle}
              style={styles.input}
              placeholder="Tên công việc..."
            />

            {/* 3. Mô tả */}
            <Text variant="labelMedium" style={[styles.sectionLabel, { marginTop: 8 }]}>Mô tả</Text>
            <TextInput
              mode="outlined"
              value={createDesc}
              onChangeText={setCreateDesc}
              style={styles.input}
              placeholder="Mô tả chi tiết (tuỳ chọn)..."
              multiline
              numberOfLines={3}
            />

            {/* 4. Estimate + Deadline */}
            <View style={styles.row2}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text variant="labelMedium" style={styles.sectionLabel}>Estimate (giờ)</Text>
                <TextInput
                  mode="outlined"
                  value={createEstimate}
                  onChangeText={setCreateEstimate}
                  keyboardType="decimal-pad"
                  style={styles.input}
                  placeholder="4"
                  right={<TextInput.Affix text="h" />}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="labelMedium" style={styles.sectionLabel}>Deadline</Text>
                <DatePickerField
                  label="Chọn ngày"
                  value={createDueDate}
                  onChange={setCreateDueDate}
                />
              </View>
            </View>

            {/* 5. Task cha (chỉ hiển thị sau khi chọn dự án) */}
            {!!createProjectId && (
              <>
                <Text variant="labelMedium" style={[styles.sectionLabel, { marginTop: 8 }]}>
                  Task cha (tuỳ chọn)
                </Text>
                <TouchableOpacity
                  style={[styles.parentField, { borderColor: theme.colors.outline }]}
                  onPress={() => setParentPickerOpen(true)}
                  activeOpacity={0.75}
                >
                  <Text
                    style={{ flex: 1, color: createParentId ? theme.colors.onSurface : theme.colors.onSurfaceVariant }}
                    numberOfLines={1}
                  >
                    {createParentTitle || 'Chọn task cha...'}
                  </Text>
                  {createParentId ? (
                    <TouchableOpacity
                      onPress={() => { setCreateParentId(''); setCreateParentTitle(''); }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <MaterialCommunityIcons name="close-circle" size={18} color="#94A3B8" />
                    </TouchableOpacity>
                  ) : (
                    <MaterialCommunityIcons name="chevron-down" size={18} color="#94A3B8" />
                  )}
                </TouchableOpacity>
              </>
            )}

            <View style={styles.modalActions}>
              <Button
                mode="outlined"
                onPress={() => { setCreateOpen(false); resetCreate(); }}
                style={{ flex: 1 }}
              >
                Huỷ
              </Button>
              <Button
                mode="contained"
                onPress={handleCreate}
                style={[{ flex: 1 }, { backgroundColor: '#4F46E5' }]}
                loading={createMutation.isPending}
                disabled={!createTitle.trim() || !createProjectId}
              >
                Gửi duyệt
              </Button>
            </View>
          </ScrollView>
        </Modal>

        {/* ── Parent task picker modal ─────────────────────────────────────── */}
        <Modal
          visible={parentPickerOpen}
          onDismiss={() => setParentPickerOpen(false)}
          contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}
        >
          <Text variant="titleMedium" style={[styles.modalTitle, { marginBottom: 12 }]}>
            Chọn task cha
          </Text>

          {/* "Không có task cha" option */}
          <TouchableOpacity
            style={[styles.parentOption, !createParentId && { backgroundColor: '#4F46E518' }]}
            onPress={() => { setCreateParentId(''); setCreateParentTitle(''); setParentPickerOpen(false); }}
          >
            <MaterialCommunityIcons name="minus-circle-outline" size={16} color="#94A3B8" />
            <Text style={{ flex: 1, color: theme.colors.onSurfaceVariant }}>Không có task cha</Text>
            {!createParentId && <MaterialCommunityIcons name="check" size={16} color="#4F46E5" />}
          </TouchableOpacity>

          <Divider />

          <FlatList
            data={parentTaskOptions.filter(t => !t.parentId)}
            keyExtractor={(t) => t.id}
            style={{ maxHeight: 360 }}
            ItemSeparatorComponent={() => <Divider />}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.parentOption, createParentId === item.id && { backgroundColor: '#4F46E518' }]}
                onPress={() => { setCreateParentId(item.id); setCreateParentTitle(item.title); setParentPickerOpen(false); }}
              >
                <Text numberOfLines={2} style={{ flex: 1, color: theme.colors.onSurface }}>{item.title}</Text>
                {createParentId === item.id && <MaterialCommunityIcons name="check" size={16} color="#4F46E5" />}
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', padding: 20 }}>
                Chưa có task gốc nào trong dự án
              </Text>
            }
          />

          <Button mode="outlined" onPress={() => setParentPickerOpen(false)} style={{ marginTop: 12 }}>
            Đóng
          </Button>
        </Modal>
      </Portal>

      <Snackbar visible={!!snack} onDismiss={() => setSnack('')} duration={2000}>
        {snack}
      </Snackbar>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  dashboard: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  greeting: { fontWeight: '700', fontSize: 16, marginBottom: 2 },
  statsRow: { flexDirection: 'row', gap: 8 },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 3,
  },
  statCount: { fontSize: 20, fontWeight: '800', lineHeight: 24 },
  statLabel: { fontSize: 10, textAlign: 'center' },

  filterBar: { paddingHorizontal: 12, paddingVertical: 8 },
  filterChip: { marginRight: 8 },
  treeControls: { flexDirection: 'row', gap: 8, paddingTop: 6 },
  treeBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, backgroundColor: '#F1F5F9' },
  treeBtnText: { fontSize: 12 },
  taskRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  chevronBtn: { width: 24, justifyContent: 'center', alignItems: 'center', paddingTop: 16 },
  chevronText: { fontSize: 9, color: '#94A3B8' },
  list: { padding: 12, paddingBottom: 100 },
  card: { marginBottom: 10, borderRadius: 10 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  row2: { flexDirection: 'row', marginBottom: 0 },
  projectChip: { height: 22 },
  statusChip: { height: 22, borderWidth: 1, backgroundColor: 'transparent' },
  statusPill: { borderRadius: 9999, paddingHorizontal: 8, paddingVertical: 2 },
  statusPillText: { fontSize: 10, fontWeight: '500' },
  title: { marginBottom: 8 },
  progressBar: { height: 5, borderRadius: 3, marginBottom: 4 },
  subText: { marginBottom: 4 },
  dueDate: { fontSize: 12, marginTop: 4 },
  empty: { textAlign: 'center', marginTop: 60 },
  fab: { position: 'absolute', right: 16, bottom: 80, borderRadius: 28 },
  modal: { margin: 16, padding: 20, borderRadius: 16, maxHeight: '92%' },
  modalTitle: { marginBottom: 4, fontWeight: '700' },
  divider: { marginVertical: 14 },
  sectionLabel: { marginBottom: 8 },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusBtn: {
    flex: 1, minWidth: '44%', borderWidth: 1.5, borderRadius: 10,
    padding: 10, alignItems: 'center', gap: 4,
  },
  input: { marginBottom: 4 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },

  sliderWrap: { height: 40, justifyContent: 'center', marginBottom: 8 },
  sliderTrack: { height: 6, backgroundColor: '#E2E8F0', borderRadius: 3, overflow: 'hidden' },
  sliderFill: { height: '100%', backgroundColor: '#4F46E5', borderRadius: 3 },
  sliderThumb: {
    position: 'absolute', width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#4F46E5', top: 9,
    transform: [{ translateX: -11 }],
    borderWidth: 3, borderColor: '#fff',
    elevation: 3,
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 3, shadowOffset: { width: 0, height: 1 },
  },

  parentField: {
    borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 8,
  },
  parentOption: {
    paddingHorizontal: 16, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
});
