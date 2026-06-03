import { useState, useMemo, useEffect } from 'react';
import {
  View, FlatList, StyleSheet, TouchableOpacity, Pressable,
} from 'react-native';
import {
  Text, Card, Chip, useTheme, ActivityIndicator,
  Snackbar, FAB, Portal, Modal, TextInput, Button, Divider,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../src/store/auth';
import { api } from '../../src/api/client';
import {
  useMyBugs, useCreateBug,
  STATUS_LABEL, STATUS_COLOR, SEVERITY_COLOR, SEVERITY_BG,
  bugKeys,
  type Bug, type BugSeverity, type BugStatus, type BugItemType,
} from '../../src/api/bugs';

// ── Filter types ──────────────────────────────────────────────────────────────

type FilterType = 'ALL' | 'BUG' | 'ISSUE' | 'CR';
type FilterStatus = 'ALL' | 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | 'PENDING_REVIEW';

const FILTER_TABS: { key: FilterType; label: string }[] = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'BUG', label: '🐛 Bug' },
  { key: 'ISSUE', label: '📋 Issue' },
  { key: 'CR', label: '🔄 CR' },
];

const STATUS_FILTERS: { key: FilterStatus; label: string }[] = [
  { key: 'ALL', label: 'Mọi trạng thái' },
  { key: 'OPEN', label: 'Mở' },
  { key: 'IN_PROGRESS', label: 'Đang xử lý' },
  { key: 'PENDING_REVIEW', label: 'Chờ duyệt' },
  { key: 'RESOLVED', label: 'Đã giải quyết' },
  { key: 'CLOSED', label: 'Đóng' },
];

// ── helpers ───────────────────────────────────────────────────────────────────

const formatDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('vi-VN') : '—';

const isOverdue = (bug: Bug) => {
  if (!bug.dueDate) return false;
  if (['RESOLVED', 'CLOSED', 'CANCELLED', 'REJECTED'].includes(bug.status)) return false;
  return new Date(bug.dueDate) < new Date();
};

// ── Bug card ──────────────────────────────────────────────────────────────────

function BugCard({ bug, onPress }: { bug: Bug; onPress: () => void }) {
  const theme = useTheme();
  const overdue = isOverdue(bug);

  const typeLabel = bug.itemType === 'BUG' ? '🐛 Bug' : bug.isCR ? '🔄 CR' : '📋 Issue';
  const typeColor = bug.itemType === 'BUG' ? '#DC2626' : bug.isCR ? '#7C3AED' : '#2563EB';

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <Card
        style={[
          styles.card,
          { backgroundColor: theme.colors.surface },
          overdue && styles.overdueCard,
        ]}
      >
        <Card.Content style={{ paddingBottom: 10 }}>
          {/* Row 1: type + severity + status */}
          <View style={styles.row}>
            <View style={[styles.typeBadge, { borderColor: typeColor }]}>
              <Text style={[styles.typeBadgeText, { color: typeColor }]}>{typeLabel}</Text>
            </View>

            <View style={[styles.severityBadge, { backgroundColor: SEVERITY_BG[bug.severity] }]}>
              <Text style={[styles.severityText, { color: SEVERITY_COLOR[bug.severity] }]}>
                {bug.severity}
              </Text>
            </View>

            <View style={{ flex: 1 }} />

            <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[bug.status] + '22' }]}>
              <View style={[styles.statusDot, { backgroundColor: STATUS_COLOR[bug.status] }]} />
              <Text style={[styles.statusText, { color: STATUS_COLOR[bug.status] }]}>
                {STATUS_LABEL[bug.status]}
              </Text>
            </View>
          </View>

          {/* Title */}
          <Text variant="titleSmall" style={[styles.title, { color: theme.colors.onSurface }]} numberOfLines={2}>
            {bug.title}
          </Text>

          {/* Requester (ISSUE) */}
          {bug.requesterName ? (
            <View style={styles.metaItem}>
              <MaterialCommunityIcons name="account-tie-outline" size={12} color={theme.colors.onSurfaceVariant} />
              <Text variant="bodySmall" style={[styles.metaText, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
                {bug.requesterName}
              </Text>
            </View>
          ) : null}

          {/* Row 2: project + due date */}
          <View style={[styles.row, { marginTop: 6, gap: 8 }]}>
            {bug.project && (
              <View style={styles.metaItem}>
                <MaterialCommunityIcons name="briefcase-outline" size={12} color={theme.colors.onSurfaceVariant} />
                <Text variant="bodySmall" style={[styles.metaText, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
                  {bug.project.name}
                </Text>
              </View>
            )}
            <View style={{ flex: 1 }} />
            {bug.dueDate && (
              <View style={styles.metaItem}>
                <MaterialCommunityIcons
                  name="calendar-alert"
                  size={12}
                  color={overdue ? '#DC2626' : theme.colors.onSurfaceVariant}
                />
                <Text
                  variant="bodySmall"
                  style={[styles.metaText, { color: overdue ? '#DC2626' : theme.colors.onSurfaceVariant, fontWeight: overdue ? '700' : '400' }]}
                >
                  {overdue ? 'Quá hạn · ' : ''}{formatDate(bug.dueDate)}
                </Text>
              </View>
            )}
          </View>

          {bug.estimatedHours ? (
            <View style={styles.metaItem}>
              <MaterialCommunityIcons name="clock-outline" size={12} color={theme.colors.onSurfaceVariant} />
              <Text variant="bodySmall" style={[styles.metaText, { color: theme.colors.onSurfaceVariant }]}>
                Est: {bug.estimatedHours}h
              </Text>
            </View>
          ) : null}
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );
}

// ── Create Bug Modal ──────────────────────────────────────────────────────────

function CreateBugModal({ visible, onDismiss }: { visible: boolean; onDismiss: () => void }) {
  const theme = useTheme();
  const qc = useQueryClient();
  const [itemType, setItemType] = useState<BugItemType>('BUG');
  const [isCR, setIsCR] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<BugSeverity>('MEDIUM');
  const [requesterName, setRequesterName] = useState('');
  const [snack, setSnack] = useState('');

  const { data: projects = [] } = { data: [] as any[] };
  const createBug = useCreateBug();

  // load projects
  const [projectOptions, setProjectOptions] = useState<{ id: string; name: string }[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');

  useEffect(() => {
    api.get<any[]>('/projects').then(setProjectOptions).catch(() => {});
  }, []);

  const reset = () => {
    setItemType('BUG'); setIsCR(false); setTitle('');
    setDescription(''); setSeverity('MEDIUM'); setRequesterName('');
    setSelectedProjectId('');
  };

  const handleSubmit = async () => {
    if (!title.trim() || !selectedProjectId) {
      setSnack('Vui lòng điền tiêu đề và chọn dự án');
      return;
    }
    try {
      await createBug.mutateAsync({
        projectId: selectedProjectId,
        title: title.trim(),
        description: description.trim() || undefined,
        severity,
        itemType,
        isCR: itemType === 'ISSUE' ? isCR : false,
        requesterName: requesterName.trim() || undefined,
      });
      setSnack('Đã tạo thành công');
      reset();
      qc.invalidateQueries({ queryKey: bugKeys.mine() });
      onDismiss();
    } catch {
      setSnack('Tạo thất bại, thử lại');
    }
  };

  const severities: BugSeverity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
  const severityColors: Record<BugSeverity, string> = {
    CRITICAL: '#DC2626', HIGH: '#EA580C', MEDIUM: '#D97706', LOW: '#16A34A',
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}
      >
        <View style={styles.modalHeader}>
          <Text variant="titleMedium" style={{ fontWeight: '700' }}>
            {itemType === 'ISSUE' ? (isCR ? '🔄 Tạo CR mới' : '📋 Tạo Issue mới') : '🐛 Tạo Bug mới'}
          </Text>
          <Pressable onPress={onDismiss}>
            <MaterialCommunityIcons name="close" size={22} color={theme.colors.onSurfaceVariant} />
          </Pressable>
        </View>

        {/* Type toggle */}
        <View style={[styles.typeRow, { backgroundColor: theme.colors.surfaceVariant, borderRadius: 8 }]}>
          {(['BUG', 'ISSUE'] as BugItemType[]).map((t) => (
            <Pressable
              key={t}
              style={[styles.typeBtn, itemType === t && { backgroundColor: theme.colors.surface, borderRadius: 6 }]}
              onPress={() => { setItemType(t); setIsCR(false); }}
            >
              <Text style={{ fontWeight: '600', color: itemType === t ? theme.colors.primary : theme.colors.onSurfaceVariant }}>
                {t === 'BUG' ? '🐛 Bug' : '📋 Issue'}
              </Text>
            </Pressable>
          ))}
        </View>

        {itemType === 'ISSUE' && (
          <Pressable style={styles.crRow} onPress={() => setIsCR(!isCR)}>
            <MaterialCommunityIcons
              name={isCR ? 'checkbox-marked' : 'checkbox-blank-outline'}
              size={20}
              color={theme.colors.primary}
            />
            <Text variant="bodyMedium" style={{ marginLeft: 8, flex: 1 }}>
              Đây là Change Request (CR) — cần PM phê duyệt
            </Text>
          </Pressable>
        )}

        <Divider style={{ marginVertical: 12 }} />

        {/* Project */}
        <Text variant="labelMedium" style={styles.fieldLabel}>Dự án *</Text>
        <View style={styles.projectScroll}>
          {projectOptions.slice(0, 5).map((p) => (
            <Chip
              key={p.id}
              selected={selectedProjectId === p.id}
              onPress={() => setSelectedProjectId(p.id)}
              style={{ marginRight: 6, marginBottom: 6 }}
              compact
            >
              {p.name}
            </Chip>
          ))}
        </View>

        {/* Title */}
        <Text variant="labelMedium" style={styles.fieldLabel}>Tiêu đề *</Text>
        <TextInput
          mode="outlined"
          value={title}
          onChangeText={setTitle}
          placeholder="Mô tả ngắn về bug/issue..."
          style={styles.input}
          dense
        />

        {/* Severity */}
        <Text variant="labelMedium" style={[styles.fieldLabel, { marginTop: 10 }]}>Mức độ</Text>
        <View style={styles.typeRow}>
          {severities.map((s) => (
            <Pressable
              key={s}
              style={[styles.sevBtn, {
                borderColor: severityColors[s],
                backgroundColor: severity === s ? severityColors[s] + '22' : 'transparent',
              }]}
              onPress={() => setSeverity(s)}
            >
              <Text style={{ fontSize: 11, fontWeight: '600', color: severityColors[s] }}>{s}</Text>
            </Pressable>
          ))}
        </View>

        {/* Requester name for ISSUE */}
        {itemType === 'ISSUE' && (
          <>
            <Text variant="labelMedium" style={[styles.fieldLabel, { marginTop: 10 }]}>Người yêu cầu</Text>
            <TextInput
              mode="outlined"
              value={requesterName}
              onChangeText={setRequesterName}
              placeholder="Tên khách hàng / người yêu cầu..."
              style={styles.input}
              dense
            />
          </>
        )}

        {/* Description */}
        <Text variant="labelMedium" style={[styles.fieldLabel, { marginTop: 10 }]}>Mô tả</Text>
        <TextInput
          mode="outlined"
          value={description}
          onChangeText={setDescription}
          placeholder="Mô tả chi tiết, bước tái hiện..."
          multiline
          numberOfLines={3}
          style={styles.input}
        />

        <View style={styles.modalActions}>
          <Button mode="outlined" onPress={onDismiss} style={{ flex: 1 }}>Huỷ</Button>
          <Button
            mode="contained"
            onPress={handleSubmit}
            style={{ flex: 1 }}
            loading={createBug.isPending}
            disabled={createBug.isPending}
          >
            Tạo
          </Button>
        </View>
      </Modal>
      <Snackbar visible={!!snack} onDismiss={() => setSnack('')} duration={2500}>{snack}</Snackbar>
    </Portal>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────────

export default function BugsScreen() {
  const theme = useTheme();
  const { user } = useAuthStore();
  const [filterType, setFilterType] = useState<FilterType>('ALL');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('ALL');
  const [showCreate, setShowCreate] = useState(false);

  const { data: bugs = [], isLoading, refetch } = useMyBugs();

  const filtered = useMemo(() => {
    return bugs.filter((b) => {
      if (filterType === 'BUG'   && b.itemType !== 'BUG') return false;
      if (filterType === 'ISSUE' && !(b.itemType === 'ISSUE' && !b.isCR)) return false;
      if (filterType === 'CR'    && !b.isCR) return false;
      if (filterStatus !== 'ALL' && b.status !== filterStatus) return false;
      return true;
    });
  }, [bugs, filterType, filterStatus]);

  const overdueCount = bugs.filter(isOverdue).length;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Summary bar */}
      {overdueCount > 0 && (
        <View style={styles.overdueBar}>
          <MaterialCommunityIcons name="alert-circle-outline" size={15} color="#DC2626" />
          <Text style={styles.overdueBarText}>{overdueCount} mục quá hạn xử lý</Text>
        </View>
      )}

      {/* Type filter chips */}
      <View style={styles.filterRow}>
        {FILTER_TABS.map((f) => (
          <Pressable
            key={f.key}
            style={[styles.filterChip, filterType === f.key && styles.filterChipActive]}
            onPress={() => setFilterType(f.key)}
          >
            <Text style={[styles.filterChipText, filterType === f.key && styles.filterChipTextActive]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Status filter */}
      <View style={styles.statusFilterRow}>
        {STATUS_FILTERS.map((f) => (
          <Pressable
            key={f.key}
            style={[styles.statusChip, filterStatus === f.key && { backgroundColor: theme.colors.primaryContainer }]}
            onPress={() => setFilterStatus(f.key)}
          >
            <Text style={[styles.statusChipText, { color: filterStatus === f.key ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant }]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Count */}
      <Text variant="bodySmall" style={[styles.countText, { color: theme.colors.onSurfaceVariant }]}>
        {filtered.length} / {bugs.length} mục
      </Text>

      {/* List */}
      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(b) => b.id}
          contentContainerStyle={styles.list}
          refreshing={isLoading}
          onRefresh={refetch}
          renderItem={({ item }) => (
            <BugCard
              bug={item}
              onPress={() => router.push(`/bug/${item.id}` as any)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <MaterialCommunityIcons name="bug-check-outline" size={56} color={theme.colors.onSurfaceVariant} style={{ opacity: 0.4 }} />
              <Text style={[styles.empty, { color: theme.colors.onSurfaceVariant }]}>
                Không có bug/issue nào được giao
              </Text>
            </View>
          }
        />
      )}

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color="#fff"
        onPress={() => setShowCreate(true)}
      />

      <CreateBugModal visible={showCreate} onDismiss={() => setShowCreate(false)} />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  overdueBar: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FEF2F2', paddingHorizontal: 16, paddingVertical: 8,
  },
  overdueBarText: { color: '#DC2626', fontSize: 13, fontWeight: '600' },
  filterRow: {
    flexDirection: 'row', paddingHorizontal: 12, paddingTop: 10, gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: '#CBD5E1',
  },
  filterChipActive: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
  filterChipText: { fontSize: 12, fontWeight: '500', color: '#64748B' },
  filterChipTextActive: { color: '#fff' },
  statusFilterRow: {
    flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, paddingTop: 8, gap: 6,
  },
  statusChip: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 12, backgroundColor: '#F1F5F9',
  },
  statusChipText: { fontSize: 11, fontWeight: '500' },
  countText: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 2, fontSize: 11 },
  list: { padding: 12, paddingBottom: 100 },
  card: { marginBottom: 10, borderRadius: 12 },
  overdueCard: { borderLeftWidth: 3, borderLeftColor: '#DC2626' },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 6 },
  typeBadge: {
    borderWidth: 1, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2,
  },
  typeBadgeText: { fontSize: 10, fontWeight: '700' },
  severityBadge: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  severityText: { fontSize: 10, fontWeight: '700' },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: '600' },
  title: { fontWeight: '600', marginBottom: 4, lineHeight: 18 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11 },
  emptyWrap: { alignItems: 'center', marginTop: 80, gap: 12 },
  empty: { textAlign: 'center', fontSize: 14 },
  fab: { position: 'absolute', right: 16, bottom: 24 },
  // Modal styles
  modal: { margin: 16, padding: 20, borderRadius: 16, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  typeRow: { flexDirection: 'row', padding: 3, gap: 4, marginBottom: 4 },
  typeBtn: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  crRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  fieldLabel: { marginBottom: 4, marginTop: 6 },
  projectScroll: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 4 },
  input: { marginBottom: 4 },
  sevBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 6,
    borderWidth: 1, borderRadius: 6,
  },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
});
