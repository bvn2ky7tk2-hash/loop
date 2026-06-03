import { useState, useMemo } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, Card, Chip, Button, useTheme, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { timesheetApi, type TimeEntryDay } from '../../src/api/timesheet';

// ── Constants ────────────────────────────────────────────────────────────────

const VI_MONTH_NAMES = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
];
const WEEKDAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const STD = 8; // tiêu chuẩn giờ/ngày

// ── Helpers ──────────────────────────────────────────────────────────────────

function pad2(n: number): string { return String(n).padStart(2, '0'); }

function toIso(y: number, m: number, d: number): string {
  return `${y}-${pad2(m + 1)}-${pad2(d)}`;
}

function monthBounds(y: number, m: number) {
  const start = toIso(y, m, 1);
  const end = toIso(y, m, new Date(y, m + 1, 0).getDate());
  return { start, end };
}

// 0=Mon…6=Sun (grid column index)
function gridDow(iso: string): number {
  return (new Date(iso + 'T00:00:00').getDay() + 6) % 7;
}

function isWeekend(iso: string): boolean {
  const d = new Date(iso + 'T00:00:00').getDay();
  return d === 0 || d === 6;
}

// ── Cell type ─────────────────────────────────────────────────────────────────

type CellStatus = 'weekend' | 'absent' | 'short' | 'ok' | 'overtime';

function cellStatus(day: TimeEntryDay | undefined, wknd: boolean): CellStatus {
  if (wknd) return 'weekend';
  if (!day || day.status === 'absent' || !day.workHours) return 'absent';
  if (day.workHours < STD) return 'short';
  if (day.workHours > STD) return 'overtime';
  return 'ok';
}

type CellCfg = { bg: string; text: string; border: string; icon?: string; darkBg: string; darkText: string; darkBorder: string };
const CELL_CFG: Record<CellStatus, CellCfg> = {
  weekend:  { bg: '#F1F5F9', text: '#94A3B8', border: 'transparent', darkBg: '#1E293B', darkText: '#475569', darkBorder: 'transparent' },
  absent:   { bg: '#FEE2E2', text: '#EF4444', border: '#FECACA', icon: 'close-circle-outline', darkBg: '#2d0a0a', darkText: '#f87171', darkBorder: '#7f1d1d' },
  short:    { bg: '#FEF3C7', text: '#D97706', border: '#FDE68A', icon: 'alert-outline', darkBg: '#291500', darkText: '#fb923c', darkBorder: '#7c2d12' },
  ok:       { bg: 'transparent', text: '#64748B', border: '#E2E8F0', icon: undefined, darkBg: 'transparent', darkText: '#475569', darkBorder: '#334155' },
  overtime: { bg: 'transparent', text: '#64748B', border: '#E2E8F0', icon: undefined, darkBg: 'transparent', darkText: '#475569', darkBorder: '#334155' },
};

// ── DayCell ───────────────────────────────────────────────────────────────────

function DayCell({
  date, day, isToday, onPress,
}: {
  date: string; day: TimeEntryDay | undefined; isToday: boolean;
  onPress?: (date: string, currentHours: number | null) => void;
}) {
  const theme = useTheme();
  const isDark = theme.dark;
  const wknd = isWeekend(date);
  const st = cellStatus(day, wknd);
  const cfg = CELL_CFG[st];
  const dayNum = Number(date.slice(8));
  const hours = day?.workHours ?? null;

  const bg = isDark ? cfg.darkBg : cfg.bg;
  const textColor = isDark ? cfg.darkText : cfg.text;
  const borderColor = isToday ? '#4F46E5' : (isDark ? cfg.darkBorder : cfg.border);

  const inner = (
    <View style={[styles.cell, { backgroundColor: bg, borderColor }]}>
      <Text style={[styles.cellDay, { color: isToday ? '#4F46E5' : textColor, fontWeight: isToday ? '800' : '600' }]}>
        {dayNum}
      </Text>
      {wknd ? (
        <Text style={[styles.cellHours, { color: isDark ? '#334155' : '#CBD5E1' }]}>—</Text>
      ) : hours !== null ? (
        <Text style={[styles.cellHours, { color: textColor }]}>
          {hours.toFixed(1)}h
        </Text>
      ) : (
        <MaterialCommunityIcons name="minus" size={11} color={textColor} />
      )}
      {!wknd && cfg.icon && (
        <MaterialCommunityIcons name={cfg.icon as any} size={10} color={textColor} style={{ marginTop: 1 }} />
      )}
    </View>
  );

  if (wknd || !onPress) return inner;
  return (
    <TouchableOpacity onPress={() => onPress(date, hours)} activeOpacity={0.7}>
      {inner}
    </TouchableOpacity>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function TimesheetScreen() {
  const theme = useTheme();
  const isDark = theme.dark;
  const qc = useQueryClient();

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-indexed
  const [refreshing, setRefreshing] = useState(false);

  // Bottom sheet state for manual entry
  const [editDate, setEditDate] = useState<string | null>(null);
  const [hoursInput, setHoursInput] = useState('');

  const { start, end } = monthBounds(year, month);
  const todayIso = now.toISOString().slice(0, 10);

  const { data, isLoading } = useQuery({
    queryKey: ['timesheet-period', start],
    queryFn: () => timesheetApi.periodDetail(start, end),
  });

  const { mutate: generate, isPending: isGenerating } = useMutation({
    mutationFn: () => timesheetApi.generatePeriod(start, end),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['timesheet-period', start] }),
  });

  const { mutate: saveManual, isPending: isSaving } = useMutation({
    mutationFn: ({ date, hours }: { date: string; hours: number }) =>
      timesheetApi.manualDayEntry(date, hours),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['timesheet-period', start] });
      setEditDate(null);
      setHoursInput('');
    },
  });

  function handleDayTap(date: string, currentHours: number | null) {
    setEditDate(date);
    setHoursInput(currentHours !== null ? String(currentHours) : '');
  }

  function handleSaveHours() {
    if (!editDate) return;
    const h = parseFloat(hoursInput.replace(',', '.'));
    if (isNaN(h) || h < 0 || h > 24) return;
    saveManual({ date: editDate, hours: h });
  }

  const onRefresh = async () => {
    setRefreshing(true);
    await qc.invalidateQueries({ queryKey: ['timesheet-period', start] });
    setRefreshing(false);
  };

  // ── Build day map ──────────────────────────────────────────────────────────

  const dayMap = useMemo(() => {
    const m = new Map<string, TimeEntryDay>();
    for (const d of (data?.days ?? [])) m.set(d.date.slice(0, 10), d);
    return m;
  }, [data]);

  // ── Build calendar weeks ───────────────────────────────────────────────────

  const weeks = useMemo(() => {
    const totalDays = new Date(year, month + 1, 0).getDate();
    const allDays = Array.from({ length: totalDays }, (_, i) => toIso(year, month, i + 1));
    const firstDow = gridDow(allDays[0]); // leading empty cells

    // flatten into grid: null = empty cell
    const grid: (string | null)[] = [
      ...Array(firstDow).fill(null),
      ...allDays,
    ];
    // pad to multiple of 7
    while (grid.length % 7 !== 0) grid.push(null);

    const rows: (string | null)[][] = [];
    for (let i = 0; i < grid.length; i += 7) rows.push(grid.slice(i, i + 7));
    return rows;
  }, [year, month]);

  // ── Summary stats ──────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const days = data?.days ?? [];
    let ok = 0, short = 0, absent = 0, ot = 0, totalH = 0;
    for (const d of days) {
      const h = d.workHours ?? 0;
      totalH += h;
      if (d.status === 'absent' || h === 0) { absent++; continue; }
      if (h < STD) short++;
      else if (h > STD) ot++;
      else ok++;
    }
    return { ok, short, absent, ot, totalH: +totalH.toFixed(1), total: days.length };
  }, [data]);

  // ── Month navigation ───────────────────────────────────────────────────────

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* ── Month navigator ─────────────────────────────────────────────── */}
      <View style={styles.monthNav}>
        <TouchableOpacity onPress={prevMonth} style={styles.navBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialCommunityIcons name="chevron-left" size={26} color={theme.colors.onSurface} />
        </TouchableOpacity>
        <View style={styles.monthCenter}>
          <Text variant="titleMedium" style={{ fontWeight: '700', color: theme.colors.onSurface }}>
            {VI_MONTH_NAMES[month]} {year}
          </Text>
          <Button
            mode="text"
            compact
            onPress={() => generate()}
            loading={isGenerating}
            icon="refresh"
            style={{ marginTop: -4 }}
          >
            Tính lại
          </Button>
        </View>
        <TouchableOpacity onPress={nextMonth} style={styles.navBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialCommunityIcons name="chevron-right" size={26} color={theme.colors.onSurface} />
        </TouchableOpacity>
      </View>

      {/* ── Summary stats ────────────────────────────────────────────────── */}
      <View style={styles.statsRow}>
        <StatChip icon="check-circle-outline" color={theme.colors.onSurfaceVariant} bg={theme.colors.surfaceVariant} label="Đủ giờ"  value={stats.ok} />
        <StatChip icon="alert-outline"        color={theme.dark ? '#fb923c' : '#D97706'} bg={theme.dark ? '#291500' : '#FEF3C7'} label="Thiếu"   value={stats.short} />
        <StatChip icon="close-circle-outline" color={theme.dark ? '#f87171' : '#EF4444'} bg={theme.dark ? '#2d0a0a' : '#FEE2E2'} label="Vắng"    value={stats.absent} />
        <StatChip icon="clock-alert-outline"  color={theme.colors.onSurfaceVariant} bg={theme.colors.surfaceVariant} label="Tăng ca" value={stats.ot} />
      </View>

      {/* Total hours summary */}
      <Card style={[styles.totalCard, { backgroundColor: theme.colors.surface }]}>
        <Card.Content style={styles.totalContent}>
          <View style={styles.totalItem}>
            <Text style={[styles.totalNum, { color: theme.colors.onSurface }]}>{stats.totalH}h</Text>
            <Text style={[styles.totalLabel, { color: theme.colors.onSurfaceVariant }]}>Tổng giờ công</Text>
          </View>
          <View style={styles.totalDivider} />
          <View style={styles.totalItem}>
            <Text style={[styles.totalNum, { color: theme.colors.onSurface }]}>{stats.total * STD}h</Text>
            <Text style={[styles.totalLabel, { color: theme.colors.onSurfaceVariant }]}>Cần đạt</Text>
          </View>
          <View style={styles.totalDivider} />
          <View style={styles.totalItem}>
            <Text style={[styles.totalNum, { color: stats.totalH < stats.total * STD ? (theme.dark ? '#f87171' : '#EF4444') : (theme.dark ? '#34d399' : '#059669') }]}>
              {stats.totalH >= stats.total * STD ? '+' : ''}{(stats.totalH - stats.total * STD).toFixed(1)}h
            </Text>
            <Text style={[styles.totalLabel, { color: theme.colors.onSurfaceVariant }]}>Lệch</Text>
          </View>
        </Card.Content>
      </Card>

      {/* ── Calendar ──────────────────────────────────────────────────────── */}
      <Card style={[styles.calCard, { backgroundColor: theme.colors.surface }]}>
        {/* Weekday header */}
        <View style={styles.weekHeader}>
          {WEEKDAY_LABELS.map((lbl) => (
            <View key={lbl} style={styles.weekHeaderCell}>
              <Text style={[styles.weekHeaderText, { color: lbl === 'T7' || lbl === 'CN' ? '#94A3B8' : theme.colors.onSurfaceVariant }]}>
                {lbl}
              </Text>
            </View>
          ))}
        </View>

        {/* Loading */}
        {isLoading ? (
          <ActivityIndicator style={{ margin: 24 }} />
        ) : (
          weeks.map((week, wi) => (
            <View key={wi} style={styles.weekRow}>
              {week.map((date, ci) => (
                <View key={ci} style={styles.cellWrap}>
                  {date ? (
                    <DayCell
                      date={date}
                      day={dayMap.get(date)}
                      isToday={date === todayIso}
                      onPress={handleDayTap}
                    />
                  ) : (
                    <View style={styles.cellEmpty} />
                  )}
                </View>
              ))}
            </View>
          ))
        )}
      </Card>

      {/* ── Legend ───────────────────────────────────────────────────────── */}
      <View style={styles.legend}>
        {(['ok', 'short', 'absent', 'overtime'] as CellStatus[]).map((st) => {
          const cfg = CELL_CFG[st];
          const bg = theme.dark ? cfg.darkBg : cfg.bg;
          const border = theme.dark ? cfg.darkBorder : cfg.border;
          const label = st === 'ok' ? 'Đủ 8h' : st === 'short' ? '< 8h' : st === 'absent' ? 'Vắng' : '> 8h';
          return (
            <View key={st} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: bg || theme.colors.surfaceVariant, borderColor: border || theme.colors.outline }]} />
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{label}</Text>
            </View>
          );
        })}
      </View>

      {/* ── Manual entry bottom sheet ────────────────────────────────────── */}
      <Modal
        visible={!!editDate}
        transparent
        animationType="slide"
        onRequestClose={() => setEditDate(null)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheetOverlay}>
          <View style={[styles.sheetContainer, { backgroundColor: isDark ? '#1E293B' : '#ffffff' }]}>
            <Text variant="titleMedium" style={{ color: isDark ? '#F1F5F9' : '#0F172A', marginBottom: 4 }}>
              Nhập giờ công
            </Text>
            <Text variant="bodySmall" style={{ color: isDark ? '#94A3B8' : '#64748B', marginBottom: 16 }}>
              {editDate ? (() => { const d = new Date(editDate + 'T00:00:00'); return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`; })() : ''}
            </Text>
            <TextInput
              value={hoursInput}
              onChangeText={setHoursInput}
              placeholder="Số giờ (vd: 8)"
              placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
              keyboardType="decimal-pad"
              style={[styles.hoursInput, {
                color: isDark ? '#F1F5F9' : '#0F172A',
                backgroundColor: isDark ? '#0F172A' : '#F1F5F9',
                borderColor: isDark ? '#334155' : '#E2E8F0',
              }]}
              autoFocus
            />
            <View style={styles.sheetActions}>
              <Button
                mode="outlined"
                onPress={() => { setEditDate(null); setHoursInput(''); }}
                style={{ flex: 1 }}
              >
                Hủy
              </Button>
              <Button
                mode="contained"
                onPress={handleSaveHours}
                loading={isSaving}
                disabled={isSaving || !hoursInput.trim()}
                style={{ flex: 1, marginLeft: 8 }}
              >
                Lưu
              </Button>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Alerts list ──────────────────────────────────────────────────── */}
      {(stats.short > 0 || stats.absent > 0) && (
        <Card style={[styles.alertCard, { backgroundColor: theme.colors.surface }]}>
          <Card.Title
            title="Cảnh báo giờ công"
            titleStyle={{ fontSize: 14, fontWeight: '700' }}
            left={(p) => <MaterialCommunityIcons name="alert-circle-outline" size={p.size} color={theme.dark ? '#f87171' : '#EF4444'} />}
          />
          <Card.Content>
            {(data?.days ?? [])
              .filter((d) => {
                const h = d.workHours ?? 0;
                return (d.status === 'absent' || h === 0 || (h > 0 && h < STD));
              })
              .map((d) => {
                const wknd = isWeekend(d.date.slice(0, 10));
                if (wknd) return null;
                const st = cellStatus(d, false);
                const cfg = CELL_CFG[st];
                const bg = theme.dark ? cfg.darkBg : cfg.bg;
                const border = theme.dark ? cfg.darkBorder : cfg.border;
                const textColor = theme.dark ? cfg.darkText : cfg.text;
                const dt = new Date(d.date.slice(0, 10) + 'T00:00:00');
                const label = `${pad2(dt.getDate())}/${pad2(dt.getMonth() + 1)}`;
                const h = d.workHours ?? 0;
                const msg =
                  st === 'absent'
                    ? 'Vắng — không ghi nhận giờ công'
                    : `Chỉ ${h.toFixed(1)}h (thiếu ${(STD - h).toFixed(1)}h)`;
                return (
                  <View key={d.date} style={styles.alertRow}>
                    <View style={[styles.alertDot, { backgroundColor: bg, borderColor: border }]}>
                      <MaterialCommunityIcons name={(cfg.icon ?? 'alert') as any} size={12} color={textColor} />
                    </View>
                    <Text variant="labelMedium" style={{ color: theme.colors.onSurface, width: 52 }}>{label}</Text>
                    <Text variant="bodySmall" style={{ flex: 1, color: textColor }}>{msg}</Text>
                  </View>
                );
              })}
          </Card.Content>
        </Card>
      )}
    </ScrollView>
  );
}

// ── StatChip ──────────────────────────────────────────────────────────────────

function StatChip({
  icon, color, bg, label, value,
}: { icon: string; color: string; bg: string; label: string; value: number }) {
  return (
    <View style={[styles.statChip, { backgroundColor: bg }]}>
      <MaterialCommunityIcons name={icon as any} size={16} color={color} />
      <Text style={[styles.statNum, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color }]}>{label}</Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 80 },

  monthNav: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  navBtn: { padding: 4 },
  monthCenter: { flex: 1, alignItems: 'center' },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statChip: { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center', gap: 2 },
  statNum: { fontSize: 18, fontWeight: '800', lineHeight: 22 },
  statLabel: { fontSize: 10, fontWeight: '600' },

  totalCard: { borderRadius: 12, marginBottom: 14 },
  totalContent: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 12 },
  totalItem: { alignItems: 'center', flex: 1 },
  totalNum: { fontSize: 20, fontWeight: '800' },
  totalLabel: { fontSize: 11, marginTop: 2 },
  totalDivider: { width: 1, backgroundColor: 'rgba(148,163,184,0.3)', marginVertical: 4 },

  calCard: { borderRadius: 12, marginBottom: 14, overflow: 'hidden' },
  weekHeader: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(148,163,184,0.2)' },
  weekHeaderCell: { flex: 1, alignItems: 'center' },
  weekHeaderText: { fontSize: 11, fontWeight: '600' },
  weekRow: { flexDirection: 'row', paddingHorizontal: 6, paddingVertical: 3 },
  cellWrap: { flex: 1, padding: 2 },
  cell: {
    borderRadius: 6, borderWidth: 1,
    paddingVertical: 5, paddingHorizontal: 2,
    alignItems: 'center', minHeight: 54,
    justifyContent: 'center', gap: 2,
  },
  cellEmpty: { minHeight: 54 },
  cellDay: { fontSize: 13, lineHeight: 16 },
  cellHours: { fontSize: 10, fontWeight: '700' },

  legend: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginBottom: 14, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 12, height: 12, borderRadius: 3, borderWidth: 1 },

  alertCard: { borderRadius: 12 },
  alertRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  alertDot: { width: 22, height: 22, borderRadius: 6, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },

  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheetContainer: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  hoursInput: {
    borderWidth: 1, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 18, marginBottom: 20,
  },
  sheetActions: { flexDirection: 'row' },
});
