import { useState } from 'react';
import { View, ScrollView, FlatList, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import {
  Text, Button, useTheme, ActivityIndicator, Chip, TextInput, Portal, Modal,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { expensesApi, type Expense, type ExpenseStatus } from '../../src/api/expenses';

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<ExpenseStatus, { label: string; color: string; bg: string }> = {
  PENDING:  { label: 'Chờ duyệt', color: '#92400E', bg: '#FFFBEB' },
  APPROVED: { label: 'Đã duyệt',  color: '#065F46', bg: '#ECFDF5' },
  REJECTED: { label: 'Từ chối',   color: '#991B1B', bg: '#FEF2F2' },
  PAID:     { label: 'Đã thanh toán', color: '#1D4ED8', bg: '#EFF6FF' },
};

const CATEGORIES = [
  { key: 'TRAVEL',       label: 'Di chuyển',    icon: 'airplane' },
  { key: 'MEAL',         label: 'Ăn uống',       icon: 'food' },
  { key: 'ACCOMMODATION',label: 'Lưu trú',       icon: 'bed' },
  { key: 'OFFICE',       label: 'Văn phòng',     icon: 'office-building' },
  { key: 'OTHER',        label: 'Khác',          icon: 'dots-horizontal' },
] as const;

type CategoryKey = typeof CATEGORIES[number]['key'];

function formatMoney(amount: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

function categoryLabel(cat: string) {
  return CATEGORIES.find((c) => c.key === cat)?.label ?? cat;
}

// ── Expense Card ──────────────────────────────────────────────────────────────

function ExpenseCard({ item, onCancel }: { item: Expense; onCancel: (id: string) => void }) {
  const theme = useTheme();
  const cfg = STATUS_CONFIG[item.status];
  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text variant="titleSmall" style={{ fontWeight: '700', color: theme.colors.onSurface }}>
            {item.title}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
            {new Date(item.createdAt).toLocaleDateString('vi-VN', {
              day: '2-digit', month: '2-digit', year: 'numeric',
            })}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
          <Text style={{ fontSize: 11, fontWeight: '600', color: cfg.color }}>{cfg.label}</Text>
        </View>
      </View>

      <Text style={[styles.amount, { color: '#F97316' }]}>
        {formatMoney(item.totalAmount)}
      </Text>

      {item.items?.length > 0 && (
        <View style={styles.itemsRow}>
          {item.items.slice(0, 3).map((it, idx) => (
            <View key={idx} style={[styles.itemChip, { backgroundColor: theme.colors.surfaceVariant }]}>
              <Text style={{ fontSize: 10, color: theme.colors.onSurfaceVariant }}>
                {categoryLabel(it.category)}: {formatMoney(it.amount)}
              </Text>
            </View>
          ))}
          {item.items.length > 3 && (
            <Text style={{ fontSize: 10, color: theme.colors.onSurfaceVariant }}>
              +{item.items.length - 3} khoản
            </Text>
          )}
        </View>
      )}

      {item.rejectionReason ? (
        <Text variant="bodySmall" style={{ color: '#EF4444', marginTop: 6 }}>
          Lý do từ chối: {item.rejectionReason}
        </Text>
      ) : null}

      {item.status === 'PENDING' && (
        <TouchableOpacity onPress={() => onCancel(item.id)} style={styles.cancelBtn} activeOpacity={0.75}>
          <Text style={{ fontSize: 12, color: '#EF4444', fontWeight: '600' }}>Hủy yêu cầu</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Line Item Row ─────────────────────────────────────────────────────────────

interface LineItem {
  description: string;
  amount: string;
  category: CategoryKey;
}

function LineItemRow({
  item, index, onChange, onRemove,
}: {
  item: LineItem;
  index: number;
  onChange: (idx: number, field: keyof LineItem, val: string) => void;
  onRemove: (idx: number) => void;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.lineItem, { borderColor: theme.colors.surfaceVariant }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
          Khoản #{index + 1}
        </Text>
        <TouchableOpacity onPress={() => onRemove(index)}>
          <MaterialCommunityIcons name="close-circle-outline" size={18} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <TextInput
        mode="outlined"
        dense
        label="Mô tả"
        value={item.description}
        onChangeText={(v) => onChange(index, 'description', v)}
        style={{ marginTop: 6 }}
      />
      <TextInput
        mode="outlined"
        dense
        label="Số tiền (VNĐ)"
        value={item.amount}
        onChangeText={(v) => onChange(index, 'amount', v)}
        keyboardType="numeric"
        style={{ marginTop: 6 }}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
        {CATEGORIES.map((cat) => (
          <Chip
            key={cat.key}
            selected={item.category === cat.key}
            onPress={() => onChange(index, 'category', cat.key)}
            compact
            style={{ marginRight: 6 }}
          >
            {cat.label}
          </Chip>
        ))}
      </ScrollView>
    </View>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ExpensesScreen() {
  const theme = useTheme();
  const qc = useQueryClient();

  const [filterStatus, setFilterStatus] = useState<'ALL' | ExpenseStatus>('ALL');
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: '', amount: '', category: 'OTHER' },
  ]);

  // ── Queries ─────────────────────────────────────────────────────────────────

  const { data: res, isLoading } = useQuery({
    queryKey: ['my-expenses'],
    queryFn: expensesApi.list,
  });

  // ── Mutations ────────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: expensesApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-expenses'] });
      setCreateOpen(false);
      resetForm();
    },
    onError: (e: Error) => Alert.alert('Lỗi', e.message),
  });

  const cancelMutation = useMutation({
    mutationFn: expensesApi.cancel,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-expenses'] }),
    onError: (e: Error) => Alert.alert('Lỗi', e.message),
  });

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function resetForm() {
    setTitle('');
    setDescription('');
    setLineItems([{ description: '', amount: '', category: 'OTHER' }]);
  }

  function handleLineChange(idx: number, field: keyof LineItem, val: string) {
    setLineItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: val } : it)));
  }

  function handleAddLine() {
    setLineItems((prev) => [...prev, { description: '', amount: '', category: 'OTHER' }]);
  }

  function handleRemoveLine(idx: number) {
    if (lineItems.length === 1) return;
    setLineItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleCancel(id: string) {
    Alert.alert('Hủy yêu cầu chi phí?', 'Xác nhận hủy yêu cầu chi phí này.', [
      { text: 'Không', style: 'cancel' },
      { text: 'Hủy yêu cầu', style: 'destructive', onPress: () => cancelMutation.mutate(id) },
    ]);
  }

  function handleSubmit() {
    if (!title.trim()) { Alert.alert('Thiếu thông tin', 'Vui lòng nhập tiêu đề'); return; }
    const items = lineItems.filter((it) => it.description.trim() && Number(it.amount) > 0);
    if (items.length === 0) {
      Alert.alert('Thiếu thông tin', 'Vui lòng thêm ít nhất 1 khoản chi phí hợp lệ');
      return;
    }
    createMutation.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
      items: items.map((it) => ({
        description: it.description.trim(),
        amount: Number(it.amount),
        category: it.category,
      })),
    });
  }

  // ── Data ─────────────────────────────────────────────────────────────────────

  const allExpenses: Expense[] = res?.data ?? [];
  const filtered = filterStatus === 'ALL'
    ? allExpenses
    : allExpenses.filter((e) => e.status === filterStatus);

  const pendingCount = allExpenses.filter((e) => e.status === 'PENDING').length;
  const approvedCount = allExpenses.filter((e) => e.status === 'APPROVED').length;
  const totalAmount = allExpenses
    .filter((e) => e.status === 'APPROVED' || e.status === 'PAID')
    .reduce((sum, e) => sum + e.totalAmount, 0);

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>

      {/* ── Header stats ────────────────────────────────────────────────── */}
      <View style={[styles.statsBar, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: '#8B5CF6' }]}>{allExpenses.length}</Text>
          <Text style={[styles.statLbl, { color: theme.colors.onSurfaceVariant }]}>Tổng</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: theme.colors.surfaceVariant }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: '#F59E0B' }]}>{pendingCount}</Text>
          <Text style={[styles.statLbl, { color: theme.colors.onSurfaceVariant }]}>Chờ duyệt</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: theme.colors.surfaceVariant }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: '#10B981' }]}>{approvedCount}</Text>
          <Text style={[styles.statLbl, { color: theme.colors.onSurfaceVariant }]}>Đã duyệt</Text>
        </View>
        <View style={{ flex: 1 }} />
        <Button
          mode="contained"
          compact
          icon="plus"
          buttonColor="#F97316"
          onPress={() => setCreateOpen(true)}
          style={{ borderRadius: 8 }}
        >
          Khai chi
        </Button>
      </View>

      {/* ── Total approved amount ────────────────────────────────────────── */}
      {totalAmount > 0 && (
        <View style={[styles.amountBar, { backgroundColor: '#FFF7ED' }]}>
          <MaterialCommunityIcons name="cash-multiple" size={16} color="#F97316" />
          <Text style={{ fontSize: 12, color: '#92400E', marginLeft: 6, fontWeight: '600' }}>
            Đã được duyệt: {formatMoney(totalAmount)}
          </Text>
        </View>
      )}

      {/* ── Filter ──────────────────────────────────────────────────────── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
        {(['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'PAID'] as const).map((s) => (
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
          renderItem={({ item }) => <ExpenseCard item={item} onCancel={handleCancel} />}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: theme.colors.onSurfaceVariant }]}>
              Chưa có yêu cầu chi phí nào
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
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text variant="titleMedium" style={styles.modalTitle}>Khai báo chi phí</Text>

            <TextInput
              mode="outlined"
              label="Tiêu đề *"
              value={title}
              onChangeText={setTitle}
              style={styles.input}
            />
            <TextInput
              mode="outlined"
              label="Mô tả (tùy chọn)"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={2}
              style={styles.input}
            />

            <Text variant="labelMedium" style={styles.fieldLabel}>
              Chi tiết khoản chi ({lineItems.length} khoản)
            </Text>

            {lineItems.map((item, idx) => (
              <LineItemRow
                key={idx}
                item={item}
                index={idx}
                onChange={handleLineChange}
                onRemove={handleRemoveLine}
              />
            ))}

            <Button
              mode="outlined"
              icon="plus"
              onPress={handleAddLine}
              style={{ marginTop: 8, marginBottom: 16 }}
            >
              Thêm khoản chi
            </Button>

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
                buttonColor="#F97316"
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

  amountBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 8,
  },

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
  amount: { fontSize: 16, fontWeight: '700', marginTop: 8 },
  itemsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 8 },
  itemChip: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  cancelBtn: { marginTop: 10, alignSelf: 'flex-start' },

  empty: { textAlign: 'center', marginTop: 60 },

  modal: { margin: 16, padding: 20, borderRadius: 16, maxHeight: '92%' },
  modalTitle: { fontWeight: '700', marginBottom: 16 },
  fieldLabel: { marginBottom: 6, marginTop: 4 },
  input: { marginBottom: 8 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 4 },

  lineItem: {
    borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 10,
  },
});
