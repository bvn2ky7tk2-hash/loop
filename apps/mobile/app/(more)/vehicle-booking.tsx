import { useState } from 'react';
import { View, StyleSheet, FlatList, Pressable } from 'react-native';
import { Text, ActivityIndicator, FAB, Button, TextInput as PaperInput, Snackbar, RadioButton } from 'react-native-paper';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useThemePalette } from '../../src/hooks/useThemePalette';
import { StatusBadge, type Tone } from '../../src/components/ui/StatusBadge';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { CenteredModal } from '../../src/components/ui/CenteredModal';
import { confirmDelete } from '../../src/components/ui/confirmDelete';
import { DatePickerField } from '../../src/components/DatePickerField';
import { vehicleBookingApi, type VehicleRequest, type VehicleStatus } from '../../src/api/vehicleBooking';

const STATUS_LABEL: Record<VehicleStatus, string> = {
  PENDING: 'Chờ duyệt', APPROVED: 'Đã duyệt', REJECTED: 'Từ chối', IN_PROGRESS: 'Đang đi', COMPLETED: 'Hoàn thành', CANCELLED: 'Đã hủy',
};
const STATUS_TONE: Record<VehicleStatus, Tone> = {
  PENDING: 'warning', APPROVED: 'success', REJECTED: 'error', IN_PROGRESS: 'processing', COMPLETED: 'info', CANCELLED: 'neutral',
};
const pad = (n: number) => String(n).padStart(2, '0');
const fmtRange = (s: string, e: string) => {
  const a = new Date(s), b = new Date(e);
  return `${pad(a.getDate())}/${pad(a.getMonth() + 1)} ${pad(a.getHours())}:${pad(a.getMinutes())}–${pad(b.getHours())}:${pad(b.getMinutes())}`;
};
const toIso = (date: string, hm: string) => new Date(`${date}T${hm}:00`).toISOString();
const validHm = (v: string) => /^\d{2}:\d{2}$/.test(v);
const canCancel = (s: VehicleStatus) => s === 'PENDING' || s === 'APPROVED';

export default function VehicleBookingScreen() {
  const qc = useQueryClient();
  const { bgPage, bgCard, borderColor, textPrimary, textMuted, preset } = useThemePalette();
  const [open, setOpen] = useState(false);
  const [snack, setSnack] = useState('');

  const [vehicleId, setVehicleId] = useState('');
  const [purpose, setPurpose] = useState('');
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState('');
  const [from, setFrom] = useState('08:00');
  const [to, setTo] = useState('17:00');

  const { data: vehicles = [] } = useQuery({ queryKey: ['vehicles'], queryFn: vehicleBookingApi.vehicles });
  const { data, isLoading } = useQuery({ queryKey: ['vehicle-requests'], queryFn: vehicleBookingApi.requests });
  const items = data?.data ?? [];

  const valid = vehicleId && purpose.trim() && destination.trim() && date && validHm(from) && validHm(to);

  const createMut = useMutation({
    mutationFn: () => vehicleBookingApi.create({
      vehicleId, purpose: purpose.trim(), destination: destination.trim(),
      startTime: toIso(date, from), endTime: toIso(date, to),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vehicle-requests'] });
      setOpen(false); setVehicleId(''); setPurpose(''); setDestination(''); setDate('');
      setSnack('Đã gửi yêu cầu đặt xe');
    },
    onError: (e: any) => setSnack(e?.message ?? 'Gửi yêu cầu thất bại'),
  });

  const cancelMut = useMutation({
    mutationFn: (id: string) => vehicleBookingApi.cancel(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vehicle-requests'] }); setSnack('Đã hủy yêu cầu'); },
    onError: (e: any) => setSnack(e?.message ?? 'Hủy thất bại'),
  });

  const renderItem = ({ item }: { item: VehicleRequest }) => (
    <View style={[styles.card, { backgroundColor: bgCard, borderColor }]}>
      <View style={styles.cardRow}>
        <View style={styles.flex}>
          <Text style={[styles.title, { color: textPrimary }]}>{item.destination}</Text>
          <Text style={[styles.sub, { color: textMuted }]}>{item.purpose}</Text>
          <Text style={[styles.sub, { color: textMuted }]}>
            {item.vehicle?.name ? `${item.vehicle.name} (${item.vehicle.plateNumber}) · ` : ''}{fmtRange(item.startTime, item.endTime)}
          </Text>
          {item.rejectionReason ? <Text style={[styles.sub, { color: '#EF4444' }]}>Lý do: {item.rejectionReason}</Text> : null}
        </View>
        <StatusBadge label={STATUS_LABEL[item.status]} tone={STATUS_TONE[item.status]} />
      </View>
      {canCancel(item.status) ? (
        <Button compact mode="text" textColor="#EF4444" style={styles.cancelBtn}
          onPress={() => confirmDelete({ title: 'Hủy yêu cầu đặt xe', message: 'Bạn có chắc muốn hủy?', onConfirm: () => cancelMut.mutate(item.id) })}>
          Hủy yêu cầu
        </Button>
      ) : null}
    </View>
  );

  return (
    <View style={[styles.wrap, { backgroundColor: bgPage }]}>
      {isLoading ? (
        <View style={styles.center}><ActivityIndicator /></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<EmptyState icon="car" title="Chưa có yêu cầu đặt xe" description="Nhấn nút + để tạo yêu cầu." />}
        />
      )}

      <FAB icon="plus" style={[styles.fab, { backgroundColor: preset.primary }]} color="#fff" onPress={() => setOpen(true)} />

      <CenteredModal
        visible={open}
        onDismiss={() => setOpen(false)}
        title="Yêu cầu đặt xe"
        footer={
          <>
            <Button onPress={() => setOpen(false)}>Hủy</Button>
            <Button mode="contained" loading={createMut.isPending} disabled={!valid || createMut.isPending} onPress={() => createMut.mutate()}>Gửi</Button>
          </>
        }
      >
        <Text style={[styles.fieldLabel, { color: textMuted }]}>Chọn xe</Text>
        <RadioButton.Group onValueChange={setVehicleId} value={vehicleId}>
          {vehicles.map((v) => (
            <Pressable key={v.id} onPress={() => setVehicleId(v.id)} style={styles.vehicleRow}>
              <RadioButton value={v.id} />
              <Text style={{ color: textPrimary, flex: 1 }}>{v.name} · {v.plateNumber} · {v.seats} chỗ</Text>
            </Pressable>
          ))}
        </RadioButton.Group>
        <PaperInput mode="outlined" label="Mục đích" value={purpose} onChangeText={setPurpose} style={styles.input} />
        <PaperInput mode="outlined" label="Điểm đến" value={destination} onChangeText={setDestination} style={styles.input} />
        <DatePickerField label="Ngày" value={date} onChange={setDate} style={styles.input} />
        <View style={styles.timeRow}>
          <PaperInput mode="outlined" label="Từ (HH:mm)" value={from} onChangeText={setFrom} style={[styles.input, styles.flex]} />
          <PaperInput mode="outlined" label="Đến (HH:mm)" value={to} onChangeText={setTo} style={[styles.input, styles.flex]} />
        </View>
      </CenteredModal>

      <Snackbar visible={!!snack} onDismiss={() => setSnack('')} duration={2500}>{snack}</Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, paddingBottom: 90 },
  card: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 10 },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  title: { fontSize: 15, fontWeight: '600' },
  sub: { fontSize: 12, marginTop: 2 },
  cancelBtn: { alignSelf: 'flex-start', marginTop: 4, marginLeft: -8 },
  fab: { position: 'absolute', right: 16, bottom: 24, borderRadius: 28 },
  input: { marginBottom: 12, backgroundColor: 'transparent' },
  fieldLabel: { fontSize: 12, marginBottom: 4 },
  vehicleRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeRow: { flexDirection: 'row', gap: 12 },
  flex: { flex: 1 },
});
