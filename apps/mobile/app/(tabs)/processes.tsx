import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../src/store/auth';
import { useThemeStore } from '../../src/store/theme';
import { useColorScheme } from 'react-native';
import {
  processesApi,
  ProcessDefinition,
  ProcessInstance,
  ProcessUserTask,
  FormField,
} from '../../src/api/processes';

// ─── Palette ────────────────────────────────────────────────────────────────

const INDIGO = '#4F46E5';
const INDIGO_BG = '#EEF2FF';

type Scheme = 'light' | 'dark';

function useScheme(): Scheme {
  const sys = useColorScheme();
  const { mode } = useThemeStore();
  return (mode === 'system' ? sys : mode) === 'dark' ? 'dark' : 'light';
}

const C = {
  light: {
    bg: '#F8FAFC',
    card: '#FFFFFF',
    border: '#E2E8F0',
    text: '#0F172A',
    sub: '#64748B',
    inputBg: '#F1F5F9',
  },
  dark: {
    bg: '#0F172A',
    card: '#1E293B',
    border: '#334155',
    text: '#F1F5F9',
    sub: '#94A3B8',
    inputBg: '#334155',
  },
};

// ─── Instance status ─────────────────────────────────────────────────────────

const INSTANCE_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  RUNNING: { label: 'Đang chạy', color: '#1D4ED8', bg: '#DBEAFE' },
  COMPLETED: { label: 'Hoàn thành', color: '#065F46', bg: '#D1FAE5' },
  CANCELLED: { label: 'Đã huỷ', color: '#374151', bg: '#F3F4F6' },
  ERROR: { label: 'Lỗi', color: '#991B1B', bg: '#FEE2E2' },
};

const TASK_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  PENDING: { label: 'Chờ xử lý', color: '#92400E', bg: '#FEF3C7' },
  COMPLETED: { label: 'Đã xử lý', color: '#065F46', bg: '#D1FAE5' },
  CANCELLED: { label: 'Đã huỷ', color: '#374151', bg: '#F3F4F6' },
};

// ─── Small Components ─────────────────────────────────────────────────────────

function StatusPill({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  );
}

function SectionEmpty({ scheme, message }: { scheme: Scheme; message: string }) {
  return (
    <View style={styles.emptyBox}>
      <MaterialCommunityIcons name="inbox-outline" size={40} color={C[scheme].sub} />
      <Text style={[styles.emptyText, { color: C[scheme].sub }]}>{message}</Text>
    </View>
  );
}

// ─── Dynamic Form Fields ──────────────────────────────────────────────────────

interface DynamicFormProps {
  fields: FormField[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  scheme: Scheme;
  readonly?: boolean;
}

function DynamicForm({ fields, values, onChange, scheme, readonly = false }: DynamicFormProps) {
  const c = C[scheme];
  if (!fields.length) return null;
  return (
    <View>
      {fields.map((f) => (
        <View key={f.name} style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: c.text }]}>
            {f.label}
            {f.required && !readonly && <Text style={{ color: '#EF4444' }}> *</Text>}
          </Text>

          {readonly ? (
            <Text style={[styles.fieldReadonly, { color: c.sub, borderColor: c.border }]}>
              {values[f.name] || '—'}
            </Text>
          ) : f.type === 'select' && f.options ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {f.options.map((opt) => {
                const selected = values[f.name] === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => onChange(f.name, opt.value)}
                    style={[
                      styles.optionChip,
                      {
                        borderColor: selected ? INDIGO : c.border,
                        backgroundColor: selected ? INDIGO_BG : c.inputBg,
                      },
                    ]}
                  >
                    <Text style={{ color: selected ? INDIGO : c.text, fontSize: 13 }}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : (
            <TextInput
              style={[
                styles.input,
                {
                  color: c.text,
                  backgroundColor: c.inputBg,
                  borderColor: c.border,
                  height: f.type === 'textarea' ? 80 : 44,
                  textAlignVertical: f.type === 'textarea' ? 'top' : 'center',
                },
              ]}
              placeholder={f.placeholder ?? f.label}
              placeholderTextColor={c.sub}
              value={values[f.name] ?? ''}
              onChangeText={(v) => onChange(f.name, v)}
              keyboardType={f.type === 'number' ? 'numeric' : 'default'}
              multiline={f.type === 'textarea'}
            />
          )}
        </View>
      ))}
    </View>
  );
}

// ─── Start Process Modal ──────────────────────────────────────────────────────

interface StartModalProps {
  definition: ProcessDefinition | null;
  onClose: () => void;
  onSuccess: () => void;
  scheme: Scheme;
}

function StartProcessModal({ definition, onClose, onSuccess, scheme }: StartModalProps) {
  const c = C[scheme];
  const qc = useQueryClient();
  const [values, setValues] = useState<Record<string, string>>({});
  const [step, setStep] = useState<'form' | 'submitting'>('form');

  const startMutation = useMutation({
    mutationFn: async () => {
      const vars: Record<string, unknown> = { ...values };
      const res = await processesApi.startInstance(definition!.id, vars);
      // Try to find and complete the employee's fill-form task automatically
      try {
        const instanceId = (res as any).data?.id ?? (res as any).id;
        if (instanceId) {
          const tasks = await processesApi.getUserTasks(1, 5, instanceId);
          const firstTask = tasks.data?.[0];
          if (firstTask && firstTask.status === 'PENDING') {
            await processesApi.completeTask(firstTask.id, vars);
          }
        }
      } catch {
        // best-effort: the instance is created, task completion may happen from inbox
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['process-instances'] });
      qc.invalidateQueries({ queryKey: ['user-tasks'] });
      onSuccess();
    },
    onError: (e: any) => {
      Alert.alert('Lỗi', e?.message ?? 'Không thể gửi đơn');
    },
  });

  const handleChange = (key: string, val: string) => setValues((v) => ({ ...v, [key]: val }));

  const handleSubmit = () => {
    const fields = definition?.formFields ?? [];
    for (const f of fields) {
      if (f.required && !values[f.name]?.trim()) {
        Alert.alert('Thiếu thông tin', `Vui lòng điền "${f.label}"`);
        return;
      }
    }
    setStep('submitting');
    startMutation.mutate();
  };

  if (!definition) return null;

  return (
    <Modal visible animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: c.border }]}>
            <TouchableOpacity onPress={onClose} style={styles.backBtn}>
              <MaterialCommunityIcons name="arrow-left" size={24} color={c.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: c.text }]} numberOfLines={1}>
              {definition.name}
            </Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
            {definition.description ? (
              <Text style={[styles.defDesc, { color: c.sub }]}>{definition.description}</Text>
            ) : null}

            {(definition.formFields?.length ?? 0) > 0 ? (
              <DynamicForm
                fields={definition.formFields!}
                values={values}
                onChange={handleChange}
                scheme={scheme}
              />
            ) : (
              <Text style={[styles.noFields, { color: c.sub }]}>
                Quy trình này không yêu cầu điền thêm thông tin.
              </Text>
            )}

            <TouchableOpacity
              style={[styles.submitBtn, { opacity: step === 'submitting' ? 0.6 : 1 }]}
              onPress={handleSubmit}
              disabled={step === 'submitting'}
            >
              {step === 'submitting' ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>Gửi đơn đăng ký</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Task Detail Modal ────────────────────────────────────────────────────────

interface TaskModalProps {
  task: ProcessUserTask | null;
  onClose: () => void;
  userId: string;
  scheme: Scheme;
}

function TaskDetailModal({ task, onClose, userId, scheme }: TaskModalProps) {
  const c = C[scheme];
  const qc = useQueryClient();

  const claimMutation = useMutation({
    mutationFn: () => processesApi.claimTask(task!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user-tasks'] });
    },
    onError: (e: any) => Alert.alert('Lỗi', e?.message ?? 'Không thể nhận task'),
  });

  const completeMutation = useMutation({
    mutationFn: (approved: boolean) =>
      processesApi.completeTask(task!.id, { approved }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user-tasks'] });
      qc.invalidateQueries({ queryKey: ['process-instances'] });
      onClose();
    },
    onError: (e: any) => Alert.alert('Lỗi', e?.message ?? 'Không thể xử lý task'),
  });

  if (!task) return null;

  const vars = task.instance?.variables ?? {};
  const isAssignedToMe = task.assigneeId === userId;
  const isUnassigned = !task.assigneeId;
  const canAct = task.status === 'PENDING';
  const fields = task.instance?.definition?.taskFormFields ?? [];

  // Build display values from instance variables
  const displayValues: Record<string, string> = {};
  for (const [k, v] of Object.entries(vars)) {
    displayValues[k] = String(v);
  }

  return (
    <Modal visible animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
        <View style={[styles.modalHeader, { borderBottomColor: c.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={c.text} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: c.text }]} numberOfLines={1}>
            {task.name}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          {/* Instance info */}
          <View style={[styles.infoCard, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[styles.infoRow, { color: c.sub }]}>
              Quy trình:{' '}
              <Text style={{ color: c.text, fontWeight: '600' }}>
                {task.instance?.definition?.name}
              </Text>
            </Text>
            <Text style={[styles.infoRow, { color: c.sub }]}>
              Trạng thái task:{' '}
              <Text style={{ color: TASK_STATUS[task.status]?.color ?? c.text, fontWeight: '600' }}>
                {TASK_STATUS[task.status]?.label ?? task.status}
              </Text>
            </Text>
            {task.assignee && (
              <Text style={[styles.infoRow, { color: c.sub }]}>
                Phụ trách:{' '}
                <Text style={{ color: c.text, fontWeight: '600' }}>{task.assignee.name}</Text>
              </Text>
            )}
          </View>

          {/* Submitted data */}
          {Object.keys(vars).length > 0 && (
            <View style={{ marginTop: 16 }}>
              <Text style={[styles.sectionLabel, { color: c.sub }]}>Thông tin đơn</Text>
              {fields.length > 0 ? (
                <DynamicForm
                  fields={fields}
                  values={displayValues}
                  onChange={() => {}}
                  scheme={scheme}
                  readonly
                />
              ) : (
                Object.entries(vars).map(([k, v]) => (
                  <View
                    key={k}
                    style={[styles.varRow, { backgroundColor: c.card, borderColor: c.border }]}
                  >
                    <Text style={[styles.varKey, { color: c.sub }]}>{k}</Text>
                    <Text style={[styles.varVal, { color: c.text }]}>{String(v)}</Text>
                  </View>
                ))
              )}
            </View>
          )}

          {/* Actions */}
          {canAct && (
            <View style={{ marginTop: 24 }}>
              {isUnassigned && (
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: INDIGO }]}
                  onPress={() => claimMutation.mutate()}
                  disabled={claimMutation.isPending}
                >
                  {claimMutation.isPending ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.actionBtnText}>Nhận task</Text>
                  )}
                </TouchableOpacity>
              )}

              {isAssignedToMe && (
                <View style={{ gap: 12 }}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#059669' }]}
                    onPress={() => completeMutation.mutate(true)}
                    disabled={completeMutation.isPending}
                  >
                    {completeMutation.isPending ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <MaterialCommunityIcons name="check-circle-outline" size={18} color="#fff" />
                        <Text style={styles.actionBtnText}>Đồng ý</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#DC2626' }]}
                    onPress={() => completeMutation.mutate(false)}
                    disabled={completeMutation.isPending}
                  >
                    {completeMutation.isPending ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <MaterialCommunityIcons name="close-circle-outline" size={18} color="#fff" />
                        <Text style={styles.actionBtnText}>Từ chối</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Tab: Đăng ký ────────────────────────────────────────────────────────────

function RegisterTab({ scheme }: { scheme: Scheme }) {
  const c = C[scheme];
  const [selected, setSelected] = useState<ProcessDefinition | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['process-definitions'],
    queryFn: () => processesApi.getDefinitions(1, 50),
    staleTime: 60_000,
  });

  const active = (data?.data ?? []).filter((d) => d.status === 'ACTIVE');

  const handleSuccess = () => {
    setSelected(null);
    Alert.alert('Thành công', 'Đã gửi đơn đăng ký thành công!');
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={INDIGO} />
      </View>
    );
  }

  return (
    <>
      <FlatList
        data={active}
        keyExtractor={(d) => d.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 12 }}
        onRefresh={refetch}
        refreshing={isLoading}
        ListEmptyComponent={
          <SectionEmpty scheme={scheme} message="Không có quy trình nào đang mở đăng ký" />
        }
        renderItem={({ item: def }) => (
          <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
            <View style={styles.cardHead}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: c.text }]}>{def.name}</Text>
                {def.description ? (
                  <Text style={[styles.cardSub, { color: c.sub }]} numberOfLines={2}>
                    {def.description}
                  </Text>
                ) : null}
              </View>
              <View style={[styles.versionBadge, { backgroundColor: INDIGO_BG }]}>
                <Text style={{ color: INDIGO, fontSize: 11, fontWeight: '700' }}>v{def.version}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.startBtn}
              onPress={() => setSelected(def)}
            >
              <MaterialCommunityIcons name="send-outline" size={16} color="#fff" />
              <Text style={styles.startBtnText}>Gửi đơn</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      <StartProcessModal
        definition={selected}
        onClose={() => setSelected(null)}
        onSuccess={handleSuccess}
        scheme={scheme}
      />
    </>
  );
}

// ─── Tab: Hồ sơ ──────────────────────────────────────────────────────────────

function HistoryTab({ scheme }: { scheme: Scheme }) {
  const c = C[scheme];

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['process-instances'],
    queryFn: () => processesApi.getInstances(1, 50),
    staleTime: 30_000,
  });

  const qc = useQueryClient();

  const cancelMutation = useMutation({
    mutationFn: (id: string) => processesApi.cancelInstance(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['process-instances'] }),
    onError: (e: any) => Alert.alert('Lỗi', e?.message ?? 'Không thể huỷ'),
  });

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return iso;
    }
  };

  const instances = data?.data ?? [];

  return (
    <FlatList
      data={instances}
      keyExtractor={(i) => i.id}
      contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 12 }}
      onRefresh={refetch}
      refreshing={isLoading}
      ListEmptyComponent={
        <SectionEmpty scheme={scheme} message="Chưa có hồ sơ nào" />
      }
      renderItem={({ item: inst }) => {
        const s = INSTANCE_STATUS[inst.status] ?? INSTANCE_STATUS.ERROR;
        return (
          <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
            <View style={styles.cardHead}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: c.text }]}>{inst.definition?.name}</Text>
                <Text style={[styles.cardSub, { color: c.sub }]}>
                  Người gửi: {inst.startedByUser?.name} · {formatDate(inst.startedAt)}
                </Text>
              </View>
              <StatusPill label={s.label} color={s.color} bg={s.bg} />
            </View>

            {inst.status === 'RUNNING' && (
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() =>
                  Alert.alert('Huỷ hồ sơ', 'Bạn có chắc muốn huỷ hồ sơ này?', [
                    { text: 'Không', style: 'cancel' },
                    { text: 'Huỷ', style: 'destructive', onPress: () => cancelMutation.mutate(inst.id) },
                  ])
                }
              >
                <Text style={styles.cancelBtnText}>Huỷ hồ sơ</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      }}
    />
  );
}

// ─── Tab: Phê duyệt ──────────────────────────────────────────────────────────

function InboxTab({ scheme, userId }: { scheme: Scheme; userId: string }) {
  const c = C[scheme];
  const [selected, setSelected] = useState<ProcessUserTask | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['user-tasks'],
    queryFn: () => processesApi.getUserTasks(1, 50),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  const tasks = (data?.data ?? []).filter((t) => t.status === 'PENDING');

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    } catch {
      return iso;
    }
  };

  return (
    <>
      <FlatList
        data={tasks}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 12 }}
        onRefresh={refetch}
        refreshing={isLoading}
        ListEmptyComponent={
          <SectionEmpty scheme={scheme} message="Không có yêu cầu nào cần xử lý" />
        }
        renderItem={({ item: task }) => {
          const ts = TASK_STATUS[task.status] ?? TASK_STATUS.PENDING;
          const isAssignedToMe = task.assigneeId === userId;
          const isUnassigned = !task.assigneeId;

          return (
            <TouchableOpacity
              style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}
              onPress={() => setSelected(task)}
              activeOpacity={0.7}
            >
              <View style={styles.cardHead}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardTitle, { color: c.text }]}>{task.name}</Text>
                  <Text style={[styles.cardSub, { color: c.sub }]}>
                    {task.instance?.definition?.name} · {formatDate(task.createdAt)}
                  </Text>
                </View>
                <StatusPill label={ts.label} color={ts.color} bg={ts.bg} />
              </View>

              <View style={styles.taskFooter}>
                {isUnassigned ? (
                  <View style={[styles.assignBadge, { backgroundColor: '#FEF3C7' }]}>
                    <Text style={{ color: '#92400E', fontSize: 11, fontWeight: '600' }}>Chưa có người nhận</Text>
                  </View>
                ) : isAssignedToMe ? (
                  <View style={[styles.assignBadge, { backgroundColor: INDIGO_BG }]}>
                    <Text style={{ color: INDIGO, fontSize: 11, fontWeight: '600' }}>Được giao cho bạn</Text>
                  </View>
                ) : (
                  <View style={[styles.assignBadge, { backgroundColor: '#F3F4F6' }]}>
                    <Text style={{ color: '#374151', fontSize: 11 }}>Người nhận: {task.assignee?.name}</Text>
                  </View>
                )}
                <MaterialCommunityIcons name="chevron-right" size={18} color={c.sub} />
              </View>
            </TouchableOpacity>
          );
        }}
      />

      <TaskDetailModal
        task={selected}
        onClose={() => setSelected(null)}
        userId={userId}
        scheme={scheme}
      />
    </>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

type Segment = 'register' | 'history' | 'inbox';

export default function ProcessesScreen() {
  const scheme = useScheme();
  const c = C[scheme];
  const { user } = useAuthStore();
  const [segment, setSegment] = useState<Segment>('register');

  const { data: taskData } = useQuery({
    queryKey: ['user-tasks'],
    queryFn: () => processesApi.getUserTasks(1, 50),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
  const pendingCount = (taskData?.data ?? []).filter((t) => t.status === 'PENDING').length;

  const segments: { key: Segment; label: string; icon: string; badge?: number }[] = [
    { key: 'register', label: 'Đăng ký', icon: 'file-edit-outline' },
    { key: 'history', label: 'Hồ sơ', icon: 'folder-open-outline' },
    { key: 'inbox', label: 'Phê duyệt', icon: 'clipboard-check-outline', badge: pendingCount },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['bottom']}>
      {/* Segment Bar */}
      <View style={[styles.segBar, { backgroundColor: c.card, borderBottomColor: c.border }]}>
        {segments.map((seg) => {
          const active = segment === seg.key;
          return (
            <TouchableOpacity
              key={seg.key}
              style={[styles.segItem, active && styles.segItemActive]}
              onPress={() => setSegment(seg.key)}
            >
              <View>
                <MaterialCommunityIcons
                  name={seg.icon as any}
                  size={18}
                  color={active ? INDIGO : c.sub}
                />
                {seg.badge ? (
                  <View style={styles.segBadge}>
                    <Text style={styles.segBadgeText}>{seg.badge > 9 ? '9+' : seg.badge}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={[styles.segLabel, { color: active ? INDIGO : c.sub }]}>{seg.label}</Text>
              {active && <View style={[styles.segUnderline, { backgroundColor: INDIGO }]} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Content */}
      {segment === 'register' && <RegisterTab scheme={scheme} />}
      {segment === 'history' && <HistoryTab scheme={scheme} />}
      {segment === 'inbox' && <InboxTab scheme={scheme} userId={user?.id ?? ''} />}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  emptyBox: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 14 },

  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  pillText: { fontSize: 11, fontWeight: '700' },

  segBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  segItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 3,
    position: 'relative',
  },
  segItemActive: {},
  segLabel: { fontSize: 12, fontWeight: '600' },
  segUnderline: { position: 'absolute', bottom: 0, left: 8, right: 8, height: 2, borderRadius: 1 },
  segBadge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  segBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },

  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  cardHead: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  cardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  cardSub: { fontSize: 12, lineHeight: 18 },

  versionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },

  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: INDIGO,
    borderRadius: 8,
    paddingVertical: 10,
    gap: 6,
  },
  startBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  cancelBtnText: { color: '#EF4444', fontWeight: '600', fontSize: 13 },

  taskFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  assignBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },

  // Modal
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40, alignItems: 'flex-start' },
  modalTitle: { flex: 1, fontSize: 17, fontWeight: '700', textAlign: 'center' },

  defDesc: { fontSize: 13, lineHeight: 20, marginBottom: 16 },
  noFields: { fontSize: 13, textAlign: 'center', marginVertical: 24 },

  fieldGroup: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  fieldReadonly: {
    fontSize: 14,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  optionChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },

  submitBtn: {
    backgroundColor: INDIGO,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  infoCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  infoRow: { fontSize: 13, lineHeight: 20 },
  sectionLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  varRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  varKey: { fontSize: 12, flex: 1 },
  varVal: { fontSize: 13, fontWeight: '600', flex: 2, textAlign: 'right' },

  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingVertical: 14,
    gap: 8,
  },
  actionBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
