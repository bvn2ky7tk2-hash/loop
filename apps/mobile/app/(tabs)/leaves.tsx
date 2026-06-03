import { useState } from 'react';
import { View, ScrollView, FlatList, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import {
  Text, Button, useTheme, ActivityIndicator, Chip, TextInput,
  Portal, Modal, Divider, SegmentedButtons,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leavesApi, type LeaveRequest, type LeaveStatus, type LeaveType } from '../../src/api/leaves';
import { DatePickerField } from '../../src/components/DatePickerField';

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<LeaveStatus, { label: string; color: string; bg: string }> = {
  PENDING:   { label: 'Chờ duyệt', color: '#92400E', bg: '#FFFBEB' },
  APPROVED:  { label: 'Đã duyệt',  color: '#065F46', bg: '#ECFDF5' },
  REJECTED:  { label: 'Từ chối',   color: '#991B1B', bg: '#FEF2F2' },
  CANCELLED: { label: 'Đã hủy',    color: '#374151', bg: '#F9FAFB' },
};

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

// ── Leave Card ────────────────────────────────────────────────────────────────

function LeaveCard({ item, onCancel }: { item: LeaveRequest; onCancel: (id: string) => void }) {
  const theme = useTheme();
  const cfg = STATUS_CONFIG[item.status];
  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text variant="titleSmall" style={{ fontWeight: '700', color: theme.colors.onSurface }}>
            {item.leaveType?.name ?? 'Nghỉ phép'}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
            {formatDate(item.startDate)} – {formatDate(item.endDate)} · {item.totalDays} ngày
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
          <Text style={{ fontSize: 11, fontWeight: '600', color: cfg.color }}>{cfg.label}</Text>
        </View>
      </View>

      {item.reason ? (
        <Text
          variant="bodySmall"
          style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}
          numberOfLines={2}
        >
          {item.reason}
        </Text>
      ) : null}

      {item.rejectionReason ? (
        <Text variant="bodySmall" style={{ color: '#EF4444', marginTop: 6 }}>
          Lý do từ chối: {item.rejectionReason}
        </Text>
      ) : null}

      {item.status === 'PENDING' && (
        <TouchableOpacity
          onPress={() => onCancel(item.id)}
          style={styles.cancelBtn}
          activeOpacity={0.75}
        >
          <Text style={{ fontSize: 12, color: '#EF4444', fontWeight: '600' }}>Hủy yêu cầu</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function LeavesScreen() {
  const theme = useTheme();
  const qc = useQueryClient();

  const [filterStatus, setFilterStatus] = useState<'ALL' | LeaveStatus>('ALL');
  const [createOpen, setCreateOpen] = useState(false);
  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  const today = new Date().toISOString().split('T')[0];

  // ── Queries ─────────────────────────────────────────────────────────────────

  const { data: res, isLoading } = useQuery({
    queryKey: ['my-leaves'],
    queryFn: leavesApi.list,
  });

  const { data: leaveTypes = [] } = useQuery<LeaveType[]>({
    queryKey: ['leave-types'],
    queryFn: leavesApi.leaveTypes,
  });

  // ── Mutations ────────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: leavesApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-leaves'] });
      setCreateOpen(false);
      resetForm();
    },
    onError: (e: Error) => Alert.alert('Lỗi', e.message),
  });

  const cancelMutation = useMutation({
    mutationFn: leavesApi.cancel,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-leaves'] }),
    onError: (e: Error) => Alert.alert('Lỗi', e.message),
  });

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function resetForm() {
    setLeaveTypeId(''); setStartDate(''); setEndDate(''); setReason('');
  }

  function handleCancel(id: string) {
    Alert.alert('Hủy yêu cầu nghỉ?', 'Xác nhận hủy yêu cầu nghỉ phép này.', [
      { text: 'Không', style: 'cancel' },
      { text: 'Hủy yêu cầu', style: 'destructive', onPress: () => cancelMutation.mutate(id) },
    ]);
  }

  function handleSubmit() {
    if (!leaveTypeId) { Alert.alert('Thiếu thông tin', 'Vui lòng chọn loại nghỉ phép'); return; }
    if (!startDate || !endDate) { Alert.alert('Thiếu thông tin', 'Vui lòng chọn ngày nghỉ'); return; }
    if (endDate < startDate) { Alert.alert('Ngày không hợp lệ', 'Ngày kết thúc phải sau ngày bắt đầu'); return; }
    if (!reason.trim()) { Alert.alert('Thiếu thông tin', 'Vui lòng nhập lý do'); return; }
    createMutation.mutate({ leaveTypeId, startDate, endDate, reason: reason.trim() });
  }

  // ── Data ─────────────────────────────────────────────────────────────────────

  const allLeaves: LeaveRequest[] = res?.data ?? [];
  const filtered = filterStatus === 'ALL'
    ? allLeaves
    : allLeaves.filter((l) => l.status === filterStatus);

  const pendingCount = allLeaves.filter((l) => l.status === 'PENDING').length;

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>

      {/* ── Header stats ────────────────────────────────────────────────── */}
      <View style={[styles.statsBar, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: '#8B5CF6' }]}>{allLeaves.length}</Text>
          <Text style={[styles.statLbl, { color: theme.colors.onSurfaceVariant }]}>Tổng</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: theme.colors.surfaceVariant }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: '#F59E0B' }]}>{pendingCount}</Text>
          <Text style={[styles.statLbl, { color: theme.colors.onSurfaceVariant }]}>Chờ duyệt</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: theme.colors.surfaceVariant }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: '#10B981' }]}>
            {allLeaves.filter((l) => l.status === 'APPROVED').length}
          </Text>
          <Text style={[styles.statLbl, { color: theme.colors.onSurfaceVariant }]}>Đã duyệt</Text>
        </View>
        <View style={{ flex: 1 }} />
        <Button
          mode="contained"
          compact
          icon="plus"
          buttonColor="#8B5CF6"
          onPress={() => setCreateOpen(true)}
          style={{ borderRadius: 8 }}
        >
          Xin nghỉ
        </Button>
      </View>

      {/* ── Filter ──────────────────────────────────────────────────────── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
        {(['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'] as const).map((s) => (
          <Chip
            key={s}
            selected={filterStatus === s}
            onPress={() => setFilterStatus(s)}
            style={{ marginRight: 8 }}
            compact
          >
            {s === 'ALL' ? 'Tất cả' : STATUS_CONFIG[s]?.label ?? s}
          </Chip>
        ))}
      </ScrollView>

      {/* ── List ────────────────────────────────────────────────────────── */}
      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => i.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => <LeaveCard item={item} onCancel={handleCancel} />}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: theme.colors.onSurfaceVariant }]}>
              Chưa có yêu cầu nghỉ phép nào
            </Text>
          }
        />
      )}

      {/* ── Create Modal ─────────────────────────────────────────────────── */}
      <Portal>
        <Modal
          visible={createOpen}
          onDismiss={() => { setCreateOpen(false); resetForm(); }}
          contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text variant="titleMedium" style={styles.modalTitle}>Đăng ký nghỉ phép</Text>

            <Text variant="labelMedium" style={styles.fieldLabel}>Loại nghỉ phép *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {leaveTypes.map((lt) => (
                <Chip
                  key={lt.id}
                  selected={leaveTypeId === lt.id}
                  onPress={() => setLeaveTypeId(lt.id)}
                  style={{ marginRight: 8 }}
                >
                  {lt.name}
                </Chip>
              ))}
              {leaveTypes.length === 0 && (
                <Chip selected={leaveTypeId === 'ANNUAL'} onPress={() => setLeaveTypeId('ANNUAL')}>Nghỉ phép năm</Chip>
              )}
            </ScrollView>

            <Text variant="labelMedium" style={styles.fieldLabel}>Ngày bắt đầu *</Text>
            <DatePickerField
              label="Từ ngày"
              value={startDate}
              onChange={setStartDate}
              style={styles.input}
            />

            <Text variant="labelMedium" style={styles.fieldLabel}>Ngày kết thúc *</Text>
            <DatePickerField
              label="Đến ngày"
              value={endDate}
              onChange={setEndDate}
              style={styles.input}
            />

            <Text variant="labelMedium" style={styles.fieldLabel}>Lý do *</Text>
            <TextInput
              mode="outlined"
              value={reason}
              onChangeText={setReason}
              multiline
              numberOfLines={3}
              placeholder="Nhập lý do nghỉ..."
              style={styles.input}
            />

            <View style={styles.modalActions}>
              <Button
                mode="outlined"
                onPress={() => { setCreateOpen(false); resetForm(); }}
                style={{ flex: 1 }}
              >
                Hủy
              </Button>
              <Button
                mode="contained"
                buttonColor="#8B5CF6"
                onPress={handleSubmit}
                loading={createMutation.isPending}
                style={{ flex: 1 }}
              >
                Gửi yêu cầu
              </Button>
            </View>
          </ScrollView>
        </Modal>
      </Portal>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  statsBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  statItem: { alignItems: 'center', paddingHorizontal: 12 },
  statNum: { fontSize: 22, fontWeight: '800' },
  statLbl: { fontSize: 10, marginTop: 1 },
  statDivider: { width: 1, height: 28, marginHorizontal: 4 },

  filterRow: { paddingHorizontal: 12, paddingVertical: 10, maxHeight: 52 },

  list: { padding: 12, paddingBottom: 80 },
  card: {
    borderRadius: 12, padding: 14,
    marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  statusBadge: { borderRadius: 9999, paddingHorizontal: 8, paddingVertical: 3, marginLeft: 8 },
  cancelBtn: { marginTop: 10, alignSelf: 'flex-start' },

  empty: { textAlign: 'center', marginTop: 60 },

  modal: { margin: 16, padding: 20, borderRadius: 16, maxHeight: '90%' },
  modalTitle: { fontWeight: '700', marginBottom: 16 },
  fieldLabel: { marginBottom: 6, marginTop: 4 },
  input: { marginBottom: 8 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
});
