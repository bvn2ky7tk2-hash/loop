import { useMemo, useState } from 'react';
import { View, StyleSheet, FlatList, Pressable } from 'react-native';
import { Text, ActivityIndicator, FAB, Button, TextInput as PaperInput, Chip, Snackbar } from 'react-native-paper';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useThemePalette } from '../../src/hooks/useThemePalette';
import { StatCard } from '../../src/components/ui/StatCard';
import { StatusBadge, type Tone } from '../../src/components/ui/StatusBadge';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { CenteredModal } from '../../src/components/ui/CenteredModal';
import { confirmDelete } from '../../src/components/ui/confirmDelete';
import { DatePickerField } from '../../src/components/DatePickerField';
import { overtimeApi, type OvertimeRequest, type OtStatus } from '../../src/api/overtime';

const STATUS_LABEL: Record<OtStatus, string> = { PENDING: 'Chờ duyệt', APPROVED: 'Đã duyệt', REJECTED: 'Từ chối', CANCELLED: 'Đã hủy' };
const STATUS_TONE: Record<OtStatus, Tone> = { PENDING: 'warning', APPROVED: 'success', REJECTED: 'error', CANCELLED: 'neutral' };
const pad = (n: number) => String(n).padStart(2, '0');
const fmtDate = (iso: string) => { const d = new Date(iso); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`; };

export default function OvertimeScreen() {
  const qc = useQueryClient();
  const { bgPage, bgCard, borderColor, textPrimary, textMuted, preset } = useThemePalette();
  const [filter, setFilter] = useState<OtStatus | undefined>();
  const [open, setOpen] = useState(false);
  const [snack, setSnack] = useState('');

  const [date, setDate] = useState('');
  const [hours, setHours] = useState('');
  const [fromTime, setFromTime] = useState('');
  const [toTime, setToTime] = useState('');
  const [reason, setReason] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['overtime', filter],
    queryFn: () => overtimeApi.list({ status: filter }),
  });
  const items = data?.data ?? [];

  const stats = useMemo(() => {
    const pending = items.filter((i) => i.status === 'PENDING').length;
    const totalHours = items.filter((i) => i.status === 'APPROVED').reduce((s, i) => s + Number(i.hours ?? 0), 0);
    return { pending, totalHours };
  }, [items]);

  const createMut = useMutation({
    mutationFn: () => overtimeApi.create({
      date, hours: Number(hours),
      fromTime: fromTime.trim() || undefined,
      toTime: toTime.trim() || undefined,
      reason: reason.trim() || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['overtime'] });
      setOpen(false); setDate(''); setHours(''); setFromTime(''); setToTime(''); setReason('');
      setSnack('Đã gửi đơn tăng ca');
    },
    onError: (e: any) => setSnack(e?.message ?? 'Gửi đơn thất bại'),
  });

  const cancelMut = useMutation({
    mutationFn: (id: string) => overtimeApi.cancel(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['overtime'] }); setSnack('Đã hủy đơn'); },
    onError: (e: any) => setSnack(e?.message ?? 'Hủy thất bại'),
  });

  const renderItem = ({ item }: { item: OvertimeRequest }) => (
    <View style={[styles.card, { backgroundColor: bgCard, borderColor }]}>
      <View style={styles.cardRow}>
        <View style={styles.flex}>
          <Text style={[styles.date, { color: textPrimary }]}>{fmtDate(item.date)} · {Number(item.hours)}h</Text>
          {item.fromTime && item.toTime ? <Text style={[styles.sub, { color: textMuted }]}>{item.fromTime}–{item.toTime}</Text> : null}
          {item.reason ? <Text style={[styles.sub, { color: textMuted }]} numberOfLines={2}>{item.reason}</Text> : null}
          {item.rejectedReason ? <Text style={[styles.sub, { color: '#EF4444' }]}>Lý do từ chối: {item.rejectedReason}</Text> : null}
        </View>
        <StatusBadge label={STATUS_LABEL[item.status]} tone={STATUS_TONE[item.status]} />
      </View>
      {item.status === 'PENDING' ? (
        <Button compact mode="text" textColor="#EF4444" style={styles.cancelBtn}
          onPress={() => confirmDelete({ title: 'Hủy đơn tăng ca', message: 'Bạn có chắc muốn hủy đơn này?', onConfirm: () => cancelMut.mutate(item.id) })}>
          Hủy đơn
        </Button>
      ) : null}
    </View>
  );

  return (
    <View style={[styles.wrap, { backgroundColor: bgPage }]}>
      <View style={styles.header}>
        <View style={styles.statRow}>
          <View style={styles.flex}><StatCard label="Chờ duyệt" value={stats.pending} color="#F59E0B" icon="clock-outline" /></View>
          <View style={styles.flex}><StatCard label="Giờ OT đã duyệt" value={`${stats.totalHours}h`} color="#F97316" icon="timer-outline" /></View>
        </View>
        <View style={styles.chips}>
          <Chip selected={!filter} onPress={() => setFilter(undefined)} compact style={styles.chip}>Tất cả</Chip>
          {(['PENDING', 'APPROVED', 'REJECTED'] as OtStatus[]).map((s) => (
            <Chip key={s} selected={filter === s} onPress={() => setFilter(s)} compact style={styles.chip}>{STATUS_LABEL[s]}</Chip>
          ))}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator /></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<EmptyState icon="clock-alert-outline" title="Chưa có đơn tăng ca" description="Nhấn nút + để tạo đơn mới." />}
        />
      )}

      <FAB icon="plus" style={[styles.fab, { backgroundColor: preset.primary }]} color="#fff" onPress={() => setOpen(true)} />

      <CenteredModal
        visible={open}
        onDismiss={() => setOpen(false)}
        title="Tạo đơn tăng ca"
        footer={
          <>
            <Button onPress={() => setOpen(false)}>Hủy</Button>
            <Button mode="contained" loading={createMut.isPending}
              disabled={!date || !hours || Number(hours) <= 0 || createMut.isPending}
              onPress={() => createMut.mutate()}>Gửi</Button>
          </>
        }
      >
        <DatePickerField label="Ngày làm thêm" value={date} onChange={setDate} style={styles.input} />
        <PaperInput mode="outlined" label="Số giờ" keyboardType="numeric" value={hours} onChangeText={setHours} style={styles.input} />
        <View style={styles.timeRow}>
          <PaperInput mode="outlined" label="Từ (HH:mm)" value={fromTime} onChangeText={setFromTime} style={[styles.input, styles.flex]} />
          <PaperInput mode="outlined" label="Đến (HH:mm)" value={toTime} onChangeText={setToTime} style={[styles.input, styles.flex]} />
        </View>
        <PaperInput mode="outlined" label="Lý do (tùy chọn)" value={reason} onChangeText={setReason} multiline style={styles.input} />
      </CenteredModal>

      <Snackbar visible={!!snack} onDismiss={() => setSnack('')} duration={2500}>{snack}</Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { padding: 16, paddingBottom: 4 },
  statRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  flex: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { marginRight: 2 },
  list: { padding: 16, paddingTop: 8, paddingBottom: 90 },
  card: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 10 },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  date: { fontSize: 15, fontWeight: '600' },
  sub: { fontSize: 12, marginTop: 2 },
  cancelBtn: { alignSelf: 'flex-start', marginTop: 4, marginLeft: -8 },
  fab: { position: 'absolute', right: 16, bottom: 24, borderRadius: 28 },
  input: { marginBottom: 12, backgroundColor: 'transparent' },
  timeRow: { flexDirection: 'row', gap: 12 },
});
