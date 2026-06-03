import { useState } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import {
  Text, Card, Chip, Button, Portal, Modal, TextInput,
  useTheme, ActivityIndicator, Divider, Snackbar,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../src/api/client';
import { useAuthStore } from '../../src/store/auth';

// ── Types ───────────────────────────────────────────────────────────────────

type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'PENDING_APPROVAL' | 'RETURNED' | 'CANCELLED';

interface PendingTask {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  estimateHours: number;
  dueDate?: string;
  createdAt?: string;
  project?: { id: string; code: string; name: string };
  assignee?: { id: string; name: string; fullName?: string; email?: string };
}

// ── Component ───────────────────────────────────────────────────────────────

export default function ApprovalsScreen() {
  const theme = useTheme();
  const qc = useQueryClient();
  const { user } = useAuthStore();

  const isPM = user?.role === 'PM' || user?.role === 'ADMIN';

  const [selectedTask, setSelectedTask] = useState<PendingTask | null>(null);
  const [returnReason, setReturnReason] = useState('');
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [snack, setSnack] = useState('');

  // ── Query ────────────────────────────────────────────────────────────────

  const { data: tasks = [], isLoading, refetch } = useQuery<PendingTask[]>({
    queryKey: ['pending-approval'],
    queryFn: () =>
      isPM
        ? api.get<PendingTask[]>('/tasks/pending-approval')
        : api.get<PendingTask[]>('/tasks/mine').then((all: any[]) =>
            all.filter((t: any) => t.status === 'PENDING_APPROVAL'),
          ),
    retry: false,
  });

  // ── Mutations ────────────────────────────────────────────────────────────

  const approveMutation = useMutation({
    mutationFn: (taskId: string) => api.put(`/tasks/${taskId}/status`, { status: 'TODO' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pending-approval'] });
      qc.invalidateQueries({ queryKey: ['my-tasks'] });
      setSelectedTask(null);
      setSnack('Đã duyệt task ✓');
    },
    onError: () => setSnack('Có lỗi xảy ra, thử lại'),
  });

  const returnMutation = useMutation({
    mutationFn: ({ taskId, reason }: { taskId: string; reason: string }) =>
      api.put(`/tasks/${taskId}/status`, { status: 'RETURNED', returnReason: reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pending-approval'] });
      qc.invalidateQueries({ queryKey: ['my-tasks'] });
      setShowReturnModal(false);
      setSelectedTask(null);
      setReturnReason('');
      setSnack('Đã trả lại task');
    },
    onError: () => setSnack('Có lỗi xảy ra, thử lại'),
  });

  // ── Render helpers ────────────────────────────────────────────────────────

  function openApproval(task: PendingTask) {
    setSelectedTask(task);
    setReturnReason('');
  }

  const assigneeName = (t: PendingTask) =>
    t.assignee?.fullName ?? t.assignee?.name ?? 'Không rõ';

  const formatDate = (iso?: string) =>
    iso ? new Date(iso.includes('T') ? iso : `${iso}T00:00:00`).toLocaleDateString('vi-VN') : '—';

  // ── Empty state ───────────────────────────────────────────────────────────

  if (!isPM) {
    // Employee view: show their own submitted tasks
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.infoBar, { backgroundColor: theme.colors.primaryContainer }]}>
          <MaterialCommunityIcons name="information-outline" size={16} color={theme.colors.onPrimaryContainer} />
          <Text variant="bodySmall" style={{ color: theme.colors.onPrimaryContainer, marginLeft: 6, flex: 1 }}>
            Đây là các task bạn đã gửi, đang chờ PM duyệt
          </Text>
        </View>

        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 60 }} />
        ) : (
          <FlatList
            data={tasks}
            keyExtractor={(t) => t.id}
            contentContainerStyle={styles.list}
            refreshing={isLoading}
            onRefresh={refetch}
            renderItem={({ item }) => (
              <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                <Card.Content>
                  <View style={styles.row}>
                    {item.project && (
                      <Chip compact textStyle={{ fontSize: 10 }} style={styles.projectChip}>
                        {item.project.code}
                      </Chip>
                    )}
                    <View style={{ flex: 1 }} />
                    <View style={styles.pendingBadge}>
                      <MaterialCommunityIcons name="clock-outline" size={13} color="#F59E0B" />
                      <Text style={styles.pendingText}>Chờ duyệt</Text>
                    </View>
                  </View>
                  <Text variant="titleSmall" style={styles.title}>{item.title}</Text>
                  {item.description ? (
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={2}>
                      {item.description}
                    </Text>
                  ) : null}
                  <View style={styles.metaRow}>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      ⏱ Est: {Number(item.estimateHours)}h
                    </Text>
                    {item.dueDate && (
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                        📅 {formatDate(item.dueDate)}
                      </Text>
                    )}
                    {item.createdAt && (
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                        🕐 Gửi: {formatDate(item.createdAt)}
                      </Text>
                    )}
                  </View>
                </Card.Content>
              </Card>
            )}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <MaterialCommunityIcons name="check-circle-outline" size={56} color={theme.colors.onSurfaceVariant} style={{ opacity: 0.4 }} />
                <Text style={[styles.empty, { color: theme.colors.onSurfaceVariant }]}>
                  Không có task nào đang chờ duyệt
                </Text>
              </View>
            }
          />
        )}
      </View>
    );
  }

  // ── PM view ────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* PM info bar */}
      <View style={[styles.infoBar, { backgroundColor: theme.colors.secondaryContainer }]}>
        <MaterialCommunityIcons name="shield-check-outline" size={16} color={theme.colors.onSecondaryContainer} />
        <Text variant="bodySmall" style={{ color: theme.colors.onSecondaryContainer, marginLeft: 6, flex: 1 }}>
          {tasks.length > 0
            ? `${tasks.length} task đang chờ bạn phê duyệt`
            : 'Không có task nào đang chờ phê duyệt'}
        </Text>
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={(t) => t.id}
          contentContainerStyle={styles.list}
          refreshing={isLoading}
          onRefresh={refetch}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => openApproval(item)} activeOpacity={0.85}>
              <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                <Card.Content>
                  <View style={styles.row}>
                    {item.project && (
                      <Chip compact textStyle={{ fontSize: 10 }} style={styles.projectChip}>
                        {item.project.code}
                      </Chip>
                    )}
                    <View style={{ flex: 1 }} />
                    <View style={styles.pendingBadge}>
                      <MaterialCommunityIcons name="clock-outline" size={13} color="#F59E0B" />
                      <Text style={styles.pendingText}>Chờ duyệt</Text>
                    </View>
                  </View>

                  <Text variant="titleSmall" style={styles.title}>{item.title}</Text>
                  {item.description ? (
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 6 }} numberOfLines={2}>
                      {item.description}
                    </Text>
                  ) : null}

                  <View style={styles.metaRow}>
                    <View style={styles.assigneeRow}>
                      <MaterialCommunityIcons name="account-outline" size={13} color={theme.colors.onSurfaceVariant} />
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 3 }}>
                        {assigneeName(item)}
                      </Text>
                    </View>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      ⏱ Est: {Number(item.estimateHours)}h
                    </Text>
                    {item.dueDate && (
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                        📅 {formatDate(item.dueDate)}
                      </Text>
                    )}
                  </View>

                  {/* Quick action buttons */}
                  <View style={styles.actionRow}>
                    <Button
                      mode="contained"
                      compact
                      onPress={() => {
                        setSelectedTask(item);
                        approveMutation.mutate(item.id);
                      }}
                      style={[styles.actionBtn, { backgroundColor: '#10B981' }]}
                      loading={approveMutation.isPending && selectedTask?.id === item.id}
                      disabled={approveMutation.isPending || returnMutation.isPending}
                      icon="check"
                    >
                      Duyệt
                    </Button>
                    <Button
                      mode="outlined"
                      compact
                      onPress={() => { setSelectedTask(item); setShowReturnModal(true); }}
                      style={[styles.actionBtn, { borderColor: '#EF4444' }]}
                      textColor="#EF4444"
                      disabled={approveMutation.isPending || returnMutation.isPending}
                      icon="undo"
                    >
                      Trả lại
                    </Button>
                  </View>
                </Card.Content>
              </Card>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <MaterialCommunityIcons name="clipboard-check-outline" size={56} color={theme.colors.onSurfaceVariant} style={{ opacity: 0.4 }} />
              <Text style={[styles.empty, { color: theme.colors.onSurfaceVariant }]}>
                Không có task nào đang chờ phê duyệt
              </Text>
            </View>
          }
        />
      )}

      {/* Return reason modal */}
      <Portal>
        <Modal
          visible={showReturnModal && !!selectedTask}
          onDismiss={() => { setShowReturnModal(false); setReturnReason(''); }}
          contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}
        >
          {selectedTask && (
            <>
              <View style={styles.returnHeader}>
                <MaterialCommunityIcons name="undo" size={24} color="#EF4444" />
                <Text variant="titleMedium" style={[styles.modalTitle, { marginLeft: 8 }]}>
                  Trả lại task
                </Text>
              </View>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16 }}>
                Task: <Text style={{ fontWeight: '600' }}>{selectedTask.title}</Text>
              </Text>

              <Divider style={{ marginBottom: 16 }} />

              <Text variant="labelMedium" style={styles.sectionLabel}>Lý do trả lại (tuỳ chọn)</Text>
              <TextInput
                mode="outlined"
                value={returnReason}
                onChangeText={setReturnReason}
                style={{ marginBottom: 4 }}
                placeholder="Nhập lý do để nhân viên biết cần chỉnh sửa gì..."
                multiline
                numberOfLines={4}
              />

              <View style={styles.modalActions}>
                <Button
                  mode="outlined"
                  onPress={() => { setShowReturnModal(false); setReturnReason(''); }}
                  style={{ flex: 1 }}
                >
                  Huỷ
                </Button>
                <Button
                  mode="contained"
                  buttonColor="#EF4444"
                  onPress={() => returnMutation.mutate({ taskId: selectedTask.id, reason: returnReason })}
                  style={{ flex: 1 }}
                  loading={returnMutation.isPending}
                >
                  Trả lại
                </Button>
              </View>
            </>
          )}
        </Modal>
      </Portal>

      <Snackbar visible={!!snack} onDismiss={() => setSnack('')} duration={2500}>
        {snack}
      </Snackbar>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  infoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  list: { padding: 12, paddingBottom: 40 },
  card: { marginBottom: 12, borderRadius: 12 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  projectChip: { height: 22 },
  pendingBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  pendingText: { fontSize: 11, color: '#F59E0B', fontWeight: '600' },
  title: { fontWeight: '600', marginBottom: 4 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4, marginBottom: 8 },
  assigneeRow: { flexDirection: 'row', alignItems: 'center' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  actionBtn: { flex: 1, borderRadius: 8 },
  emptyWrap: { alignItems: 'center', marginTop: 80, gap: 12 },
  empty: { textAlign: 'center', fontSize: 14 },
  modal: { margin: 16, padding: 20, borderRadius: 16 },
  returnHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  modalTitle: { fontWeight: '700' },
  divider: { marginVertical: 14 },
  sectionLabel: { marginBottom: 8 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
});
