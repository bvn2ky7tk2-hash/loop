import { useMemo, useState } from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Text, ActivityIndicator, IconButton, FAB, Button, TextInput as PaperInput, Snackbar } from 'react-native-paper';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemePalette } from '../../src/hooks/useThemePalette';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { CenteredModal } from '../../src/components/ui/CenteredModal';
import { confirmDelete } from '../../src/components/ui/confirmDelete';
import { DatePickerField } from '../../src/components/DatePickerField';
import { calendarApi, type CalendarEvent } from '../../src/api/calendar';

const MONTHS = ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];

const pad = (n: number) => String(n).padStart(2, '0');
const dayLabel = (iso: string) => {
  const d = new Date(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
};
const timeLabel = (e: CalendarEvent) =>
  e.isAllDay ? 'Cả ngày' : `${pad(new Date(e.startTime).getHours())}:${pad(new Date(e.startTime).getMinutes())}`;

export default function CalendarScreen() {
  const qc = useQueryClient();
  const { bgPage, bgCard, borderColor, textPrimary, textMuted, preset, linkColor } = useThemePalette();
  const [cursor, setCursor] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [createOpen, setCreateOpen] = useState(false);
  const [snack, setSnack] = useState('');

  // Form state
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');

  const { from, to } = useMemo(() => ({
    from: new Date(cursor.y, cursor.m, 1).toISOString(),
    to: new Date(cursor.y, cursor.m + 1, 0, 23, 59, 59).toISOString(),
  }), [cursor]);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['calendar-events', cursor.y, cursor.m],
    queryFn: () => calendarApi.events(from, to),
  });

  const grouped = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    [...events].sort((a, b) => a.startTime.localeCompare(b.startTime)).forEach((e) => {
      const key = e.startTime.slice(0, 10);
      (map[key] ??= []).push(e);
    });
    return Object.entries(map);
  }, [events]);

  const createMut = useMutation({
    mutationFn: () => calendarApi.create({
      title: title.trim(),
      startTime: new Date(`${date}T00:00:00`).toISOString(),
      endTime: new Date(`${date}T23:59:59`).toISOString(),
      isAllDay: true,
      location: location.trim() || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calendar-events'] });
      setCreateOpen(false); setTitle(''); setDate(''); setLocation('');
      setSnack('Đã tạo sự kiện');
    },
    onError: (e: any) => setSnack(e?.message ?? 'Tạo sự kiện thất bại'),
  });

  const removeMut = useMutation({
    mutationFn: (id: string) => calendarApi.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['calendar-events'] }); setSnack('Đã xóa sự kiện'); },
  });

  const shift = (delta: number) => setCursor((c) => {
    const d = new Date(c.y, c.m + delta, 1);
    return { y: d.getFullYear(), m: d.getMonth() };
  });

  return (
    <View style={[styles.wrap, { backgroundColor: bgPage }]}>
      {/* Month switcher */}
      <View style={[styles.monthBar, { borderBottomColor: borderColor }]}>
        <IconButton icon="chevron-left" onPress={() => shift(-1)} />
        <Text style={[styles.monthLabel, { color: textPrimary }]}>{MONTHS[cursor.m]} {cursor.y}</Text>
        <IconButton icon="chevron-right" onPress={() => shift(1)} />
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator /></View>
      ) : grouped.length === 0 ? (
        <EmptyState icon="calendar-blank-outline" title="Không có sự kiện" description="Tháng này chưa có sự kiện nào." />
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {grouped.map(([day, evs]) => (
            <View key={day} style={styles.dayBlock}>
              <Text style={[styles.dayHeader, { color: linkColor }]}>{dayLabel(day)}</Text>
              {evs.map((e) => (
                <Pressable
                  key={e.id}
                  onLongPress={() => confirmDelete({ itemName: e.title, onConfirm: () => removeMut.mutate(e.id) })}
                  style={[styles.event, { backgroundColor: bgCard, borderColor, borderLeftColor: e.color ?? preset.primary }]}
                >
                  <View style={styles.flex}>
                    <Text style={[styles.eventTitle, { color: textPrimary }]} numberOfLines={1}>{e.title}</Text>
                    {e.location ? <Text style={[styles.eventMeta, { color: textMuted }]} numberOfLines={1}>📍 {e.location}</Text> : null}
                  </View>
                  <Text style={[styles.eventTime, { color: textMuted }]}>{timeLabel(e)}</Text>
                </Pressable>
              ))}
            </View>
          ))}
        </ScrollView>
      )}

      <FAB icon="plus" style={[styles.fab, { backgroundColor: preset.primary }]} color="#fff" onPress={() => setCreateOpen(true)} />

      <CenteredModal
        visible={createOpen}
        onDismiss={() => setCreateOpen(false)}
        title="Tạo sự kiện"
        footer={
          <>
            <Button onPress={() => setCreateOpen(false)}>Hủy</Button>
            <Button mode="contained" loading={createMut.isPending} disabled={!title.trim() || !date || createMut.isPending} onPress={() => createMut.mutate()}>
              Lưu
            </Button>
          </>
        }
      >
        <PaperInput mode="outlined" label="Tiêu đề" value={title} onChangeText={setTitle} style={styles.input} />
        <DatePickerField label="Ngày" value={date} onChange={setDate} style={styles.input} />
        <PaperInput mode="outlined" label="Địa điểm (tùy chọn)" value={location} onChangeText={setLocation} style={styles.input} />
      </CenteredModal>

      <Snackbar visible={!!snack} onDismiss={() => setSnack('')} duration={2500}>{snack}</Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  monthBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1 },
  monthLabel: { fontSize: 16, fontWeight: '700' },
  list: { padding: 16, paddingBottom: 90 },
  dayBlock: { marginBottom: 16 },
  dayHeader: { fontSize: 13, fontWeight: '700', marginBottom: 6 },
  event: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1, borderLeftWidth: 4, padding: 12, marginBottom: 8 },
  flex: { flex: 1 },
  eventTitle: { fontSize: 14, fontWeight: '600' },
  eventMeta: { fontSize: 12, marginTop: 2 },
  eventTime: { fontSize: 12, marginLeft: 8 },
  fab: { position: 'absolute', right: 16, bottom: 24, borderRadius: 28 },
  input: { marginBottom: 12, backgroundColor: 'transparent' },
});
