import { useState } from 'react';
import {
  View, FlatList, StyleSheet, TouchableOpacity,
  ScrollView, Alert,
} from 'react-native';
import {
  Text, Card, Chip, ProgressBar, Button, Portal, Modal, FAB,
  useTheme, ActivityIndicator, Divider, TextInput, Snackbar, Appbar,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../src/api/client';
import { DatePickerField } from '../../src/components/DatePickerField';

// ── Types ───────────────────────────────────────────────────────────────────

type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'PENDING_APPROVAL' | 'RETURNED' | 'CANCELLED';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  progress: number;
  dueDate?: string;
  estimateHours: number;
  actualHours: number;
  projectId: string;
  assignee?: { id: string; fullName: string };
}

type FilterType = 'ALL' | 'TODO' | 'IN_PROGRESS' | 'DONE' | 'OVERDUE';

// ── Constants ───────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string }> = {
  TODO:             { label: 'To Do',       color: '#94A3B8' },
  IN_PROGRESS:      { label: 'Đang làm',    color: '#4F46E5' },
  DONE:             { label: 'Hoàn thành',  color: '#10B981' },
  PENDING_APPROVAL: { label: 'Chờ duyệt',  color: '#F59E0B' },
  RETURNED:         { label: 'Trả lại',     color: '#EF4444' },
  CANCELLED:        { label: 'Đã huỷ',      color: '#CBD5E1' },
};

const MOVE_OPTIONS: { status: TaskStatus; label: string; icon: string }[] = [
  { status: 'TODO',             label: 'To Do',      icon: '⬜' },
  { status: 'IN_PROGRESS',      label: 'Đang làm',   icon: '🔵' },
  { status: 'PENDING_APPROVAL', label: 'Chờ duyệt',  icon: '🟠' },
  { status: 'DONE',             label: 'Xong',        icon: '✅' },
];

const today = new Date().toISOString().split('T')[0];

// ── Component ───────────────────────────────────────────────────────────────

export default function ProjectTasksScreen() {
  const theme = useTheme();
  const qc = useQueryClient();
  const { id, name, code } = useLocalSearchParams<{ id: string; name: string; code: string }>();

  const [filter, setFilter] = useState<FilterType>('ALL');
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [editStatus, setEditStatus] = useState<TaskStatus>('TODO');
  const [editProgress, setEditProgress] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [effortHours, setEffortHours] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [createDueDate, setCreateDueDate] = useState('');
  const [createEstimate, setCreateEstimate] = useState('');

  const [snack, setSnack] = useState('');

  // ── Queries ─────────────────────────────────────────────────────────────────

  const { data: tasks = [], isLoading, refetch } = useQuery<Task[]>({
    queryKey: ['project-tasks', id],
    queryFn: () => api.get<Task[]>(`/projects/${id}/tasks`),
    enabled: !!id,
    retry: false,
  });

  // ── Mutations ────────────────────────────────────────────────────────────────

  const moveMutation = useMutation({
    mutationFn: ({ tid, status, dueDate }: { tid: string; status: TaskStatus; dueDate?: string }) =>
      api.put(`/tasks/${tid}/status`, { status, dueDate }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-tasks', id] });
      qc.invalidateQueries({ queryKey: ['my-tasks'] });
      setEditTask(null);
    },
  });

  const progressMutation = useMutation({
    mutationFn: ({ tid, progressPct }: { tid: string; progressPct: number }) =>
      api.put(`/tasks/${tid}/progress`, { progressPct }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-tasks', id] });
      qc.invalidateQueries({ queryKey: ['my-tasks'] });
      setEditTask(null);
    },
  });

  const effortMutation = useMutation({
    mutationFn: ({ tid, hours }: { tid: string; hours: number }) =>
      api.post(`/tasks/${tid}/log-effort`, { hours, logDate: today }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-tasks', id] });
      qc.invalidateQueries({ queryKey: ['my-tasks'] });
      setEditTask(null);
      setSnack('Đã ghi nhận giờ thực tế');
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: {
      title: string; description?: string; dueDate?: string; estimateHours?: number;
    }) => api.post(`/projects/${id}/tasks`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-tasks', id] });
      qc.invalidateQueries({ queryKey: ['my-tasks'] });
      setCreateOpen(false);
      resetCreate();
      setSnack('Task đã gửi cho PM duyệt ✓');
    },
    onError: () => setSnack('Tạo task thất bại'),
  });

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function resetCreate() {
    setCreateTitle(''); setCreateDesc(''); setCreateDueDate(''); setCreateEstimate('');
  }

  function openEdit(task: Task) {
    setEditTask(task);
    setEditStatus(task.status);
    setEditProgress(String(Math.round(Number(task.progress))));
    setEditDueDate(task.dueDate ?? '');
    setEffortHours('');
  }

  function handleSave() {
    if (!editTask) return;
    const pct = parseInt(editProgress, 10);
    const hours = parseFloat(effortHours);
    const statusChanged = editStatus !== editTask.status;
    const progressChanged = !isNaN(pct) && pct !== Math.round(Number(editTask.progress));
    const hasEffort = !isNaN(hours) && hours > 0;

    if (hasEffort) {
      effortMutation.mutate({ tid: editTask.id, hours });
    } else if (statusChanged) {
      moveMutation.mutate({ tid: editTask.id, status: editStatus, dueDate: editDueDate || undefined });
    } else if (progressChanged) {
      progressMutation.mutate({ tid: editTask.id, progressPct: pct });
    } else {
      setEditTask(null);
    }
  }

  function handleCreate() {
    if (!createTitle.trim()) return;
    const estimate = parseFloat(createEstimate);
    if (!isNaN(estimate) && estimate > 4) {
      Alert.alert(
        'Estimate > 4h',
        'Task này ước tính trên 4 giờ — bạn có muốn chia nhỏ không?',
        [
          { text: 'Chia nhỏ', style: 'cancel' },
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
      title: createTitle.trim(),
      description: createDesc.trim() || undefined,
      dueDate: createDueDate || undefined,
      estimateHours: !isNaN(estimate) ? estimate : undefined,
    });
  }

  // ── Filter logic ─────────────────────────────────────────────────────────────

  const sorted = [...tasks].sort((a, b) => {
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return a.dueDate.localeCompare(b.dueDate);
  });

  const filtered = sorted.filter((t) => {
    if (filter === 'TODO') return t.status === 'TODO';
    if (filter === 'IN_PROGRESS') return t.status === 'IN_PROGRESS';
    if (filter === 'DONE') return t.status === 'DONE';
    if (filter === 'OVERDUE') return !!t.dueDate && t.dueDate < today && t.status !== 'DONE';
    return true;
  });

  const FILTER_OPTIONS: { value: FilterType; label: string }[] = [
    { value: 'ALL',         label: `Tất cả (${tasks.length})` },
    { value: 'TODO',        label: `To Do (${tasks.filter((t) => t.status === 'TODO').length})` },
    { value: 'IN_PROGRESS', label: `Đang làm (${tasks.filter((t) => t.status === 'IN_PROGRESS').length})` },
    { value: 'DONE',        label: `Xong (${tasks.filter((t) => t.status === 'DONE').length})` },
    { value: 'OVERDUE',     label: `Trễ (${tasks.filter((t) => t.dueDate && t.dueDate < today && t.status !== 'DONE').length})` },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Custom header */}
      <Appbar.Header style={{ backgroundColor: theme.colors.surface }} elevated>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content
          title={name ?? 'Tasks'}
          subtitle={code}
          titleStyle={{ fontSize: 17, fontWeight: '700' }}
        />
      </Appbar.Header>

      {/* Filter chips */}
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
      </View>

      {/* Task list */}
      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(t) => t.id}
          contentContainerStyle={styles.list}
          refreshing={isLoading}
          onRefresh={refetch}
          renderItem={({ item }) => {
            const cfg = STATUS_CONFIG[item.status];
            const isOverdue = item.dueDate && item.dueDate < today && item.status !== 'DONE';

            return (
              <TouchableOpacity onPress={() => openEdit(item)} activeOpacity={0.8}>
                <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                  <Card.Content>
                    <View style={styles.row}>
                      {item.assignee && (
                        <View style={styles.assigneeTag}>
                          <MaterialCommunityIcons name="account-outline" size={12} color={theme.colors.onSurfaceVariant} />
                          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, fontSize: 11, marginLeft: 2 }}>
                            {item.assignee.fullName}
                          </Text>
                        </View>
                      )}
                      <View style={{ flex: 1 }} />
                      <Chip
                        compact
                        textStyle={{ fontSize: 10, color: cfg.color }}
                        style={[styles.statusChip, { borderColor: cfg.color }]}
                      >
                        {cfg.label}
                      </Chip>
                    </View>

                    <Text variant="titleSmall" style={styles.title}>{item.title}</Text>
                    {item.description ? (
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 6 }} numberOfLines={2}>
                        {item.description}
                      </Text>
                    ) : null}

                    <ProgressBar
                      progress={Number(item.progress) / 100}
                      color={Number(item.progress) >= 100 ? '#10B981' : cfg.color}
                      style={styles.progressBar}
                    />
                    <Text variant="bodySmall" style={[styles.subText, { color: theme.colors.onSurfaceVariant }]}>
                      {Math.round(Number(item.progress))}% · est {Number(item.estimateHours)}h · thực tế {Number(item.actualHours)}h
                    </Text>

                    {item.dueDate ? (
                      <Text
                        variant="bodySmall"
                        style={[styles.dueDate, { color: isOverdue ? '#EF4444' : theme.colors.onSurfaceVariant }]}
                      >
                        📅 {new Date(item.dueDate + 'T00:00:00').toLocaleDateString('vi-VN')}
                        {isOverdue ? '  ⚠️ Trễ deadline' : ''}
                      </Text>
                    ) : (
                      <Text variant="bodySmall" style={[styles.dueDate, { color: '#F59E0B' }]}>
                        📅 Chưa có deadline
                      </Text>
                    )}
                  </Card.Content>
                </Card>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: theme.colors.onSurfaceVariant }]}>
              {tasks.length === 0 ? 'Chưa có task nào trong dự án này' : 'Không có task phù hợp bộ lọc'}
            </Text>
          }
        />
      )}

      {/* FAB — Create Task */}
      <FAB
        icon="plus"
        label="Thêm task"
        style={[styles.fab, { backgroundColor: '#4F46E5' }]}
        color="#fff"
        onPress={() => setCreateOpen(true)}
      />

      <Portal>
        {/* ── Edit modal ───────────────────────────────────────────────────── */}
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

              <Divider style={styles.divider} />

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
                          backgroundColor: isSelected ? `${cfg.color}18` : 'transparent',
                        },
                      ]}
                    >
                      <Text style={{ fontSize: 18 }}>{opt.icon}</Text>
                      <Text
                        variant="bodySmall"
                        style={{ color: isSelected ? cfg.color : theme.colors.onSurfaceVariant, fontWeight: isSelected ? '700' : '400' }}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Divider style={styles.divider} />

              <Text variant="labelMedium" style={styles.sectionLabel}>Tiến độ (%)</Text>
              <TextInput
                mode="outlined"
                value={editProgress}
                onChangeText={setEditProgress}
                keyboardType="numeric"
                style={styles.input}
                placeholder="0 – 100"
                right={<TextInput.Affix text="%" />}
              />

              <Text variant="labelMedium" style={[styles.sectionLabel, { marginTop: 12 }]}>+ Giờ hôm nay</Text>
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

              <Text variant="labelMedium" style={[styles.sectionLabel, { marginTop: 4 }]}>Deadline</Text>
              <DatePickerField
                label="Deadline"
                value={editDueDate}
                onChange={setEditDueDate}
                style={styles.input}
              />

              <View style={styles.modalActions}>
                <Button mode="outlined" onPress={() => setEditTask(null)} style={{ flex: 1 }}>Huỷ</Button>
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
              Dự án: <Text style={{ fontWeight: '600' }}>{code} — {name}</Text>
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16 }}>
              Task sẽ được gửi cho PM duyệt
            </Text>

            <Text variant="labelMedium" style={styles.sectionLabel}>Tiêu đề *</Text>
            <TextInput
              mode="outlined"
              value={createTitle}
              onChangeText={setCreateTitle}
              style={styles.input}
              placeholder="Tên công việc..."
            />

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

            <View style={styles.row2}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text variant="labelMedium" style={styles.sectionLabel}>Deadline</Text>
                <DatePickerField
                  label="Chọn ngày"
                  value={createDueDate}
                  onChange={setCreateDueDate}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="labelMedium" style={styles.sectionLabel}>Estimate</Text>
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
            </View>

            <View style={styles.modalActions}>
              <Button mode="outlined" onPress={() => { setCreateOpen(false); resetCreate(); }} style={{ flex: 1 }}>
                Huỷ
              </Button>
              <Button
                mode="contained"
                onPress={handleCreate}
                style={[{ flex: 1 }, { backgroundColor: '#4F46E5' }]}
                loading={createMutation.isPending}
                disabled={!createTitle.trim()}
              >
                Gửi duyệt
              </Button>
            </View>
          </ScrollView>
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
  filterBar: { paddingHorizontal: 12, paddingVertical: 8 },
  filterChip: { marginRight: 8 },
  list: { padding: 12, paddingBottom: 100 },
  card: { marginBottom: 10, borderRadius: 10 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  row2: { flexDirection: 'row', marginBottom: 0 },
  assigneeTag: { flexDirection: 'row', alignItems: 'center' },
  statusChip: { height: 22, borderWidth: 1, backgroundColor: 'transparent' },
  title: { marginBottom: 6, fontWeight: '600' },
  progressBar: { height: 5, borderRadius: 3, marginBottom: 4 },
  subText: { marginBottom: 4 },
  dueDate: { fontSize: 12, marginTop: 4 },
  empty: { textAlign: 'center', marginTop: 60 },
  fab: { position: 'absolute', right: 16, bottom: 24, borderRadius: 28 },
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
});
