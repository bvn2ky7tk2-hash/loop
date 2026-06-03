import { ScrollView, View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, useTheme, ActivityIndicator, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'react-native';
import { useAuthStore } from '../../src/store/auth';
import { useThemeStore } from '../../src/store/theme';
import { api } from '../../src/api/client';
import { timesheetApi } from '../../src/api/timesheet';
import { leavesApi } from '../../src/api/leaves';
import { expensesApi } from '../../src/api/expenses';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

// ── Stat Card ───────────────────────────────────────────────────────────────

function StatTile({
  icon, label, value, color, onPress,
}: { icon: IconName; label: string; value: string | number; color: string; onPress?: () => void }) {
  const theme = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.75 : 1}
      style={[styles.tile, { backgroundColor: `${color}18`, borderColor: `${color}30` }]}
    >
      <MaterialCommunityIcons name={icon} size={22} color={color} style={{ marginBottom: 6 }} />
      <Text style={[styles.tileValue, { color }]}>{value}</Text>
      <Text style={[styles.tileLabel, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── Quick Action ─────────────────────────────────────────────────────────────

function QuickAction({
  icon, label, color, onPress,
}: { icon: IconName; label: string; color: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75} style={styles.quickAction}>
      <View style={[styles.quickIcon, { backgroundColor: `${color}18` }]}>
        <MaterialCommunityIcons name={icon} size={22} color={color} />
      </View>
      <Text variant="bodySmall" style={{ color: theme.colors.onSurface, textAlign: 'center', marginTop: 4 }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  const theme = useTheme();
  return (
    <Text variant="labelMedium" style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>
      {title.toUpperCase()}
    </Text>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();
  const { mode } = useThemeStore();
  const systemScheme = useColorScheme();
  const isDark = (mode === 'system' ? systemScheme : mode) === 'dark';

  const canApprove = user?.role === 'PM' || user?.role === 'ADMIN';

  // ── Queries ─────────────────────────────────────────────────────────────────

  const { data: todaySummary, isLoading: loadingToday } = useQuery({
    queryKey: ['timesheet-today'],
    queryFn: timesheetApi.todaySummary,
    refetchInterval: 60_000,
  });

  const { data: tasks = [] } = useQuery<any[]>({
    queryKey: ['my-tasks'],
    queryFn: () => api.get<any[]>('/tasks/mine'),
    staleTime: 30_000,
  });

  const { data: leavesRes } = useQuery({
    queryKey: ['my-leaves'],
    queryFn: leavesApi.list,
    staleTime: 60_000,
  });

  const { data: expensesRes } = useQuery({
    queryKey: ['my-expenses'],
    queryFn: expensesApi.list,
    staleTime: 60_000,
  });

  const { data: pendingApprovalCount = 0 } = useQuery<number>({
    queryKey: ['pending-approval-count'],
    queryFn: () => api.get<any[]>('/tasks/pending-approval').then((t) => t.length),
    enabled: canApprove,
    refetchInterval: 30_000,
  });

  const { data: processTaskCount = 0 } = useQuery<number>({
    queryKey: ['process-task-count'],
    queryFn: () =>
      api
        .get<{ data: any[] }>('/processes/user-tasks?page=1&pageSize=50')
        .then((r) => (r.data ?? []).filter((t: any) => t.status === 'PENDING').length),
    refetchInterval: 30_000,
  });

  // ── Computed ─────────────────────────────────────────────────────────────────

  const today = new Date().toISOString().split('T')[0];

  const taskInProgress = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const taskOverdue = tasks.filter(
    (t) => t.dueDate && t.dueDate < today && t.status !== 'DONE',
  ).length;
  const taskDone = tasks.filter((t) => t.status === 'DONE').length;

  const leaves = leavesRes?.data ?? [];
  const leavePending = leaves.filter((l) => l.status === 'PENDING').length;
  const leaveApproved = leaves.filter(
    (l) => l.status === 'APPROVED' && l.startDate >= today.slice(0, 7),
  ).length;

  const expenses = expensesRes?.data ?? [];
  const expensePending = expenses.filter((e) => e.status === 'PENDING').length;

  // ── Greeting ─────────────────────────────────────────────────────────────────

  const firstName = user?.name?.split(' ').pop() ?? '';
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Chào buổi sáng' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';

  // ── Work status display ───────────────────────────────────────────────────────

  const isCheckedIn = !!todaySummary?.checkIn && !todaySummary?.checkOut;
  const checkinTime = todaySummary?.checkIn
    ? new Date(todaySummary.checkIn).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    : null;
  const checkoutTime = todaySummary?.checkOut
    ? new Date(todaySummary.checkOut).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    : null;
  const workingHours = todaySummary?.workingHours ?? 0;

  const attendanceColor = isCheckedIn ? '#10B981' : todaySummary?.checkOut ? '#6366F1' : '#F59E0B';
  const attendanceLabel = isCheckedIn
    ? `Đang làm việc · ${workingHours.toFixed(1)}h`
    : todaySummary?.checkOut
    ? `Đã checkout · ${workingHours.toFixed(1)}h`
    : 'Chưa check-in hôm nay';

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Hero: Greeting ─────────────────────────────────────────────── */}
      <View style={[styles.hero, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC' }]}>
        <View>
          <Text variant="titleMedium" style={[styles.greeting, { color: theme.colors.onSurface }]}>
            {greeting}, {firstName} 👋
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
            {new Date().toLocaleDateString('vi-VN', {
              weekday: 'long', day: 'numeric', month: 'long',
            })}
          </Text>
        </View>
        <View style={[styles.avatar, { backgroundColor: `${theme.colors.primary}22` }]}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: theme.colors.primary }}>
            {firstName.charAt(0).toUpperCase()}
          </Text>
        </View>
      </View>

      {/* ── Attendance Card ─────────────────────────────────────────────── */}
      <TouchableOpacity
        onPress={() => router.push('/(tabs)/timesheet')}
        activeOpacity={0.85}
        style={[
          styles.attendanceCard,
          { backgroundColor: `${attendanceColor}18`, borderColor: `${attendanceColor}35` },
        ]}
      >
        {loadingToday ? (
          <ActivityIndicator size={20} color={attendanceColor} />
        ) : (
          <View style={styles.attendanceInner}>
            <MaterialCommunityIcons
              name={isCheckedIn ? 'briefcase-check-outline' : todaySummary?.checkOut ? 'briefcase-outline' : 'briefcase-clock-outline'}
              size={28}
              color={attendanceColor}
            />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.attendanceLabel, { color: attendanceColor }]}>
                {attendanceLabel}
              </Text>
              {(checkinTime || checkoutTime) && (
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                  {checkinTime && `Vào: ${checkinTime}`}
                  {checkinTime && checkoutTime && '  ·  '}
                  {checkoutTime && `Ra: ${checkoutTime}`}
                </Text>
              )}
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={attendanceColor} />
          </View>
        )}
      </TouchableOpacity>

      {/* ── Quick Actions ───────────────────────────────────────────────── */}
      <SectionHeader title="Thao tác nhanh" />
      <View style={styles.quickRow}>
        <QuickAction
          icon="plus-circle-outline"
          label="Tạo task"
          color="#6366F1"
          onPress={() => router.push('/(tabs)/tasks')}
        />
        <QuickAction
          icon="calendar-plus-outline"
          label="Xin nghỉ"
          color="#8B5CF6"
          onPress={() => router.push('/(tabs)/leaves')}
        />
        <QuickAction
          icon="receipt-text-plus-outline"
          label="Khai chi"
          color="#F97316"
          onPress={() => router.push('/(tabs)/expenses')}
        />
        <QuickAction
          icon="clock-check-outline"
          label="Chấm công"
          color="#10B981"
          onPress={() => router.push('/(tabs)/timesheet')}
        />
      </View>
      <View style={styles.quickRow}>
        <QuickAction
          icon="file-document-outline"
          label="Phiếu lương"
          color="#10B981"
          onPress={() => router.push('/(more)/payslip' as any)}
        />
        <QuickAction
          icon="clock-alert-outline"
          label="Tăng ca"
          color="#F97316"
          onPress={() => router.push('/(more)/overtime' as any)}
        />
        <QuickAction
          icon="door"
          label="Đặt phòng"
          color="#8B5CF6"
          onPress={() => router.push('/(more)/room-booking' as any)}
        />
        <QuickAction
          icon="view-grid-outline"
          label="Tiện ích"
          color="#3B82F6"
          onPress={() => router.push('/(tabs)/more' as any)}
        />
      </View>

      <Divider style={{ marginVertical: 16 }} />

      {/* ── Task Stats ─────────────────────────────────────────────────── */}
      <SectionHeader title="Công việc của tôi" />
      <View style={styles.tileGrid}>
        <StatTile
          icon="format-list-checks"
          label="Tổng task"
          value={tasks.length}
          color="#6366F1"
          onPress={() => router.push('/(tabs)/tasks')}
        />
        <StatTile
          icon="progress-clock"
          label="Đang làm"
          value={taskInProgress}
          color="#3B82F6"
          onPress={() => router.push('/(tabs)/tasks')}
        />
        <StatTile
          icon="alert-circle-outline"
          label="Trễ hạn"
          value={taskOverdue}
          color="#EF4444"
          onPress={() => router.push('/(tabs)/tasks')}
        />
        <StatTile
          icon="check-circle-outline"
          label="Hoàn thành"
          value={taskDone}
          color="#10B981"
          onPress={() => router.push('/(tabs)/tasks')}
        />
      </View>

      <Divider style={{ marginVertical: 16 }} />

      {/* ── Leave & Expense ─────────────────────────────────────────────── */}
      <SectionHeader title="Nghỉ phép & Chi phí" />
      <View style={styles.tileGrid}>
        <StatTile
          icon="beach"
          label="Nghỉ chờ duyệt"
          value={leavePending}
          color="#8B5CF6"
          onPress={() => router.push('/(tabs)/leaves')}
        />
        <StatTile
          icon="umbrella-beach-outline"
          label="Nghỉ tháng này"
          value={leaveApproved}
          color="#0EA5E9"
          onPress={() => router.push('/(tabs)/leaves')}
        />
        <StatTile
          icon="cash-clock"
          label="Chi phí chờ"
          value={expensePending}
          color="#F97316"
          onPress={() => router.push('/(tabs)/expenses')}
        />
        <StatTile
          icon="cash-multiple"
          label="Tổng yêu cầu"
          value={expenses.length}
          color="#F59E0B"
          onPress={() => router.push('/(tabs)/expenses')}
        />
      </View>

      {/* ── Approval & Process (PM/ADMIN only) ──────────────────────────── */}
      {(canApprove || processTaskCount > 0) && (
        <>
          <Divider style={{ marginVertical: 16 }} />
          <SectionHeader title="Cần xử lý" />
          <View style={styles.tileGrid}>
            {processTaskCount > 0 && (
              <StatTile
                icon="sitemap"
                label="Quy trình"
                value={processTaskCount}
                color="#7C3AED"
                onPress={() => router.push('/(tabs)/processes')}
              />
            )}
            {canApprove && (
              <StatTile
                icon="clipboard-check-outline"
                label="Chờ phê duyệt"
                value={pendingApprovalCount}
                color="#DC2626"
                onPress={() => router.push('/(tabs)/approvals')}
              />
            )}
          </View>
        </>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },

  hero: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
  },
  greeting: { fontWeight: '700', fontSize: 17 },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },

  attendanceCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 20,
  },
  attendanceInner: { flexDirection: 'row', alignItems: 'center' },
  attendanceLabel: { fontSize: 14, fontWeight: '600' },

  sectionTitle: {
    fontSize: 11, fontWeight: '700', letterSpacing: 0.8,
    marginBottom: 10,
  },

  quickRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  quickAction: { alignItems: 'center', flex: 1 },
  quickIcon: {
    width: 52, height: 52, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },

  tileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 4,
  },
  tile: {
    width: '47%',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  tileValue: { fontSize: 26, fontWeight: '800', lineHeight: 30 },
  tileLabel: { fontSize: 11, textAlign: 'center', marginTop: 2 },
});
