import { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import {
  Text, Card, Button, useTheme, Divider, List, SegmentedButtons,
  TextInput as PaperInput, ActivityIndicator,
} from 'react-native-paper';
import { router } from 'expo-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuthStore } from '../../src/store/auth';
import { useThemeStore, ThemeMode } from '../../src/store/theme';
import { ThemePresetPicker } from '../../src/components/ui/ThemePresetPicker';
import { leavesApi } from '../../src/api/leaves';
import { api } from '../../src/api/client';

// ── Password change ─────────────────────────────────────────────────────────

function PasswordSection() {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');

  const { mutate: changePassword, isPending } = useMutation({
    mutationFn: () => api.post('/users/me/change-password', { currentPassword: oldPw, newPassword: newPw }),
    onSuccess: () => {
      Alert.alert('Thành công', 'Đã đổi mật khẩu');
      setOpen(false);
      setOldPw(''); setNewPw(''); setConfirmPw('');
    },
    onError: () => Alert.alert('Lỗi', 'Không thể đổi mật khẩu. Kiểm tra lại mật khẩu hiện tại.'),
  });

  function handleSubmit() {
    if (!oldPw || !newPw) return Alert.alert('Thiếu thông tin', 'Vui lòng điền đầy đủ');
    if (newPw.length < 6) return Alert.alert('Mật khẩu quá ngắn', 'Tối thiểu 6 ký tự');
    if (newPw !== confirmPw) return Alert.alert('Không khớp', 'Mật khẩu mới không khớp');
    changePassword();
  }

  if (!open) {
    return (
      <List.Item
        title="Đổi mật khẩu"
        left={(props) => <List.Icon {...props} icon="lock-reset" />}
        right={(props) => <List.Icon {...props} icon="chevron-right" />}
        onPress={() => setOpen(true)}
      />
    );
  }

  return (
    <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
      <Text variant="titleSmall" style={{ marginBottom: 12, color: theme.colors.onSurface }}>Đổi mật khẩu</Text>
      <PaperInput
        label="Mật khẩu hiện tại"
        value={oldPw}
        onChangeText={setOldPw}
        secureTextEntry
        mode="outlined"
        style={{ marginBottom: 8 }}
        dense
      />
      <PaperInput
        label="Mật khẩu mới"
        value={newPw}
        onChangeText={setNewPw}
        secureTextEntry
        mode="outlined"
        style={{ marginBottom: 8 }}
        dense
      />
      <PaperInput
        label="Xác nhận mật khẩu mới"
        value={confirmPw}
        onChangeText={setConfirmPw}
        secureTextEntry
        mode="outlined"
        style={{ marginBottom: 12 }}
        dense
      />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button mode="outlined" onPress={() => setOpen(false)} style={{ flex: 1 }}>Hủy</Button>
        <Button mode="contained" onPress={handleSubmit} loading={isPending} disabled={isPending} style={{ flex: 1 }}>Lưu</Button>
      </View>
    </View>
  );
}

// ── Leave balance card ──────────────────────────────────────────────────────

function LeaveBalanceCard() {
  const theme = useTheme();
  const { data, isLoading } = useQuery({
    queryKey: ['leave-balances'],
    queryFn: () => leavesApi.balances(),
  });

  if (isLoading) return <ActivityIndicator style={{ margin: 12 }} />;
  if (!data?.length) return null;

  return (
    <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <Card.Title
        title="Số dư phép"
        titleVariant="titleSmall"
        left={(p) => <List.Icon {...p} icon="calendar-check" />}
      />
      <Card.Content>
        {data.map((b) => (
          <View key={b.leaveType.id} style={styles.balanceRow}>
            <Text variant="bodyMedium" style={{ flex: 1, color: theme.colors.onSurface }}>{b.leaveType.name}</Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.primary, fontWeight: '700' }}>
              {b.remaining}/{b.entitled} ngày
            </Text>
          </View>
        ))}
      </Card.Content>
    </Card>
  );
}

// ── OT balance card ─────────────────────────────────────────────────────────

function OtBalanceCard() {
  const theme = useTheme();
  const { data, isLoading } = useQuery({
    queryKey: ['my-ot-summary'],
    queryFn: () => api.get<{ totalHours: number; pendingHours: number; approvedHours: number }>(
      '/timesheets/me/today'
    ).then(() =>
      // Fallback: get OT from timesheet current month summary
      api.get<{ overtimeHours?: number }>('/timesheets/period?start=' +
        new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10) +
        '&end=' + new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10)
      )
    ),
  });

  const otHours = (data as any)?.record?.overtimeHours ?? 0;
  if (isLoading) return null;

  return (
    <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <Card.Title
        title="Tăng ca tháng này"
        titleVariant="titleSmall"
        left={(p) => <List.Icon {...p} icon="clock-plus-outline" />}
      />
      <Card.Content>
        <Text variant="headlineSmall" style={{ color: theme.colors.primary, fontWeight: '800' }}>
          {otHours.toFixed(1)}h
        </Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          Giờ tăng ca đã ghi nhận
        </Text>
      </Card.Content>
    </Card>
  );
}

// ── Main ────────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const theme = useTheme();
  const { mode, setMode } = useThemeStore();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <ScrollView style={{ backgroundColor: theme.colors.background }} contentContainerStyle={styles.content}>
      {/* Avatar card */}
      <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Card.Content style={styles.profile}>
          <View style={[styles.avatar, { backgroundColor: theme.colors.primaryContainer }]}>
            <Text variant="headlineMedium" style={{ color: theme.colors.primary }}>
              {user?.name?.[0]?.toUpperCase() ?? '?'}
            </Text>
          </View>
          <Text variant="titleLarge" style={{ marginTop: 12, color: theme.colors.onSurface }}>{user?.name ?? '—'}</Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            {user?.email ?? '—'}
          </Text>
          <Text variant="bodySmall" style={{ marginTop: 4, color: theme.colors.primary }}>
            {user?.role ?? '—'}
          </Text>
        </Card.Content>
      </Card>

      {/* Leave balance */}
      <LeaveBalanceCard />

      {/* OT balance */}
      <OtBalanceCard />

      {/* Payslip link */}
      <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <List.Item
          title="Phiếu lương"
          description="Xem và tải phiếu lương của bạn"
          left={(props) => <List.Icon {...props} icon="file-document-outline" />}
          right={(props) => <List.Icon {...props} icon="open-in-new" />}
          onPress={() => Alert.alert('Phiếu lương', 'Vui lòng truy cập Loop Web để xem và tải phiếu lương.')}
        />
      </Card>

      {/* Settings card */}
      <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <List.Item
          title="Giao diện"
          left={(props) => <List.Icon {...props} icon="theme-light-dark" />}
        />
        <View style={styles.segmentWrapper}>
          <SegmentedButtons
            value={mode}
            onValueChange={(v) => setMode(v as ThemeMode)}
            buttons={[
              { value: 'light', label: 'Sáng', icon: 'weather-sunny' },
              { value: 'system', label: 'Hệ thống', icon: 'theme-light-dark' },
              { value: 'dark', label: 'Tối', icon: 'weather-night' },
            ]}
          />
        </View>
        <List.Item
          title="Màu chủ đề"
          left={(props) => <List.Icon {...props} icon="palette-outline" />}
        />
        <ThemePresetPicker />
        <Divider />
        <PasswordSection />
        <Divider />
        <List.Item
          title="Phiên bản"
          description="Loop · v4.0.0"
          left={(props) => <List.Icon {...props} icon="information-outline" />}
        />
      </Card>

      <Button
        mode="outlined"
        onPress={handleLogout}
        style={styles.logoutBtn}
        textColor={theme.colors.error}
      >
        Đăng xuất
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 80 },
  card: { marginBottom: 16, borderRadius: 8 },
  profile: { alignItems: 'center', paddingVertical: 24 },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    justifyContent: 'center', alignItems: 'center',
  },
  segmentWrapper: { paddingHorizontal: 16, paddingBottom: 16 },
  logoutBtn: { marginTop: 8 },
  balanceRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: 'rgba(148,163,184,0.2)' },
});
