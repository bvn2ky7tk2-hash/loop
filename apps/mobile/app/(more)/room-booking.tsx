import { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Text, ActivityIndicator, Button, TextInput as PaperInput, SegmentedButtons, Snackbar } from 'react-native-paper';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemePalette } from '../../src/hooks/useThemePalette';
import { SectionCard } from '../../src/components/ui/SectionCard';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { CenteredModal } from '../../src/components/ui/CenteredModal';
import { confirmDelete } from '../../src/components/ui/confirmDelete';
import { DatePickerField } from '../../src/components/DatePickerField';
import { roomBookingApi, type MeetingRoom, type RoomBooking } from '../../src/api/roomBooking';

const pad = (n: number) => String(n).padStart(2, '0');
const fmtRange = (s: string, e: string) => {
  const a = new Date(s), b = new Date(e);
  return `${pad(a.getDate())}/${pad(a.getMonth() + 1)} ${pad(a.getHours())}:${pad(a.getMinutes())}–${pad(b.getHours())}:${pad(b.getMinutes())}`;
};
const toIso = (date: string, hm: string) => new Date(`${date}T${hm}:00`).toISOString();
const validHm = (v: string) => /^\d{2}:\d{2}$/.test(v);

export default function RoomBookingScreen() {
  const qc = useQueryClient();
  const { bgPage, bgCard, borderColor, textPrimary, textMuted, preset } = useThemePalette();
  const [tab, setTab] = useState<'book' | 'mine'>('book');
  const [snack, setSnack] = useState('');

  // search form
  const [date, setDate] = useState('');
  const [from, setFrom] = useState('09:00');
  const [to, setTo] = useState('10:00');
  const [searched, setSearched] = useState<{ start: string; end: string } | null>(null);

  // booking modal
  const [room, setRoom] = useState<MeetingRoom | null>(null);
  const [title, setTitle] = useState('');

  const canSearch = !!date && validHm(from) && validHm(to);

  const { data: available = [], isFetching: searching } = useQuery({
    queryKey: ['rooms-available', searched?.start, searched?.end],
    queryFn: () => roomBookingApi.available(searched!.start, searched!.end),
    enabled: !!searched,
  });

  const { data: mine, isLoading: loadingMine } = useQuery({
    queryKey: ['room-bookings'],
    queryFn: roomBookingApi.bookings,
    enabled: tab === 'mine',
  });

  const createMut = useMutation({
    mutationFn: () => roomBookingApi.create({
      roomId: room!.id, title: title.trim(),
      startTime: searched!.start, endTime: searched!.end,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['room-bookings'] });
      qc.invalidateQueries({ queryKey: ['rooms-available'] });
      setRoom(null); setTitle(''); setSnack('Đã đặt phòng');
    },
    onError: (e: any) => setSnack(e?.message ?? 'Đặt phòng thất bại'),
  });

  const cancelMut = useMutation({
    mutationFn: (id: string) => roomBookingApi.cancel(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['room-bookings'] }); setSnack('Đã hủy đặt phòng'); },
  });

  return (
    <View style={[styles.wrap, { backgroundColor: bgPage }]}>
      <View style={styles.tabBar}>
        <SegmentedButtons
          value={tab}
          onValueChange={(v) => setTab(v as 'book' | 'mine')}
          buttons={[{ value: 'book', label: 'Đặt phòng', icon: 'door' }, { value: 'mine', label: 'Lịch của tôi', icon: 'calendar-check' }]}
        />
      </View>

      {tab === 'book' ? (
        <ScrollView contentContainerStyle={styles.content}>
          <SectionCard title="Tìm phòng trống">
            <DatePickerField label="Ngày" value={date} onChange={setDate} style={styles.input} />
            <View style={styles.timeRow}>
              <PaperInput mode="outlined" label="Từ (HH:mm)" value={from} onChangeText={setFrom} style={[styles.input, styles.flex]} />
              <PaperInput mode="outlined" label="Đến (HH:mm)" value={to} onChangeText={setTo} style={[styles.input, styles.flex]} />
            </View>
            <Button mode="contained" disabled={!canSearch}
              onPress={() => setSearched({ start: toIso(date, from), end: toIso(date, to) })}>
              Tìm phòng
            </Button>
          </SectionCard>

          {searched ? (
            searching ? (
              <View style={styles.center}><ActivityIndicator /></View>
            ) : available.length === 0 ? (
              <EmptyState icon="door-closed" title="Không có phòng trống" description="Thử khung giờ khác." />
            ) : (
              <View style={styles.roomList}>
                {available.map((r) => (
                  <Pressable key={r.id} onPress={() => setRoom(r)} style={[styles.card, { backgroundColor: bgCard, borderColor }]}>
                    <View style={styles.flex}>
                      <Text style={[styles.roomName, { color: textPrimary }]}>{r.name}</Text>
                      <Text style={[styles.sub, { color: textMuted }]}>
                        {r.floor ? `${r.floor} · ` : ''}{r.capacity} chỗ{r.amenities.length ? ` · ${r.amenities.join(', ')}` : ''}
                      </Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={20} color={textMuted} />
                  </Pressable>
                ))}
              </View>
            )
          ) : null}
        </ScrollView>
      ) : loadingMine ? (
        <View style={styles.center}><ActivityIndicator /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {(mine?.data ?? []).length === 0 ? (
            <EmptyState icon="calendar-blank-outline" title="Chưa có lịch đặt" />
          ) : (
            (mine?.data ?? []).map((b: RoomBooking) => (
              <Pressable key={b.id}
                onLongPress={() => confirmDelete({ itemName: b.title, title: 'Hủy đặt phòng', onConfirm: () => cancelMut.mutate(b.id) })}
                style={[styles.card, { backgroundColor: bgCard, borderColor }]}>
                <View style={styles.flex}>
                  <Text style={[styles.roomName, { color: textPrimary }]}>{b.title}</Text>
                  <Text style={[styles.sub, { color: textMuted }]}>
                    {b.room?.name ? `${b.room.name} · ` : ''}{fmtRange(b.startTime, b.endTime)}
                  </Text>
                </View>
              </Pressable>
            ))
          )}
        </ScrollView>
      )}

      <CenteredModal
        visible={!!room}
        onDismiss={() => setRoom(null)}
        title={`Đặt ${room?.name ?? 'phòng'}`}
        footer={
          <>
            <Button onPress={() => setRoom(null)}>Hủy</Button>
            <Button mode="contained" loading={createMut.isPending} disabled={!title.trim() || createMut.isPending} onPress={() => createMut.mutate()}>Đặt</Button>
          </>
        }
      >
        <Text style={[styles.sub, { color: textMuted, marginBottom: 12 }]}>
          {searched ? fmtRange(searched.start, searched.end) : ''}
        </Text>
        <PaperInput mode="outlined" label="Tiêu đề cuộc họp" value={title} onChangeText={setTitle} style={styles.input} />
      </CenteredModal>

      <Snackbar visible={!!snack} onDismiss={() => setSnack('')} duration={2500}>{snack}</Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  center: { paddingVertical: 32, alignItems: 'center' },
  tabBar: { padding: 16, paddingBottom: 8 },
  content: { padding: 16, paddingTop: 8, paddingBottom: 40, gap: 12 },
  input: { marginBottom: 12, backgroundColor: 'transparent' },
  timeRow: { flexDirection: 'row', gap: 12 },
  flex: { flex: 1 },
  roomList: { gap: 10 },
  card: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, padding: 14 },
  roomName: { fontSize: 15, fontWeight: '600' },
  sub: { fontSize: 12, marginTop: 2 },
});
