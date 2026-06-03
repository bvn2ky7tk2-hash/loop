import { View, useColorScheme } from 'react-native';
import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { useThemeStore } from '../../src/store/theme';
import { useAuthStore } from '../../src/store/auth';
import { api } from '../../src/api/client';
import { StatusFAB } from '../../src/components/StatusFAB';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

function TabIcon({ name, color, size }: { name: IconName; color: string | { toString(): string }; size: number }) {
  return <MaterialCommunityIcons name={name} color={String(color)} size={size} />;
}

export default function TabsLayout() {
  const systemScheme = useColorScheme();
  const { mode } = useThemeStore();
  const { user } = useAuthStore();

  const effectiveScheme = mode === 'system' ? systemScheme : mode;
  const isDark = effectiveScheme === 'dark';
  const theme = useTheme(); // dùng brand theme từ PaperProvider root

  // PM/ADMIN can see approval tab
  const canApprove = user?.role === 'PM' || user?.role === 'ADMIN';

  const { data: pendingCount = 0 } = useQuery<number>({
    queryKey: ['pending-approval-count'],
    queryFn: () =>
      api.get<any[]>('/tasks/pending-approval').then((tasks) => tasks.length),
    enabled: canApprove,
    refetchInterval: 30_000,
  });

  const { data: processTaskCount = 0 } = useQuery<number>({
    queryKey: ['process-task-count'],
    queryFn: () =>
      api
        .get<{ data: any[]; meta: any }>('/processes/user-tasks?page=1&pageSize=50')
        .then((res) => (res.data ?? []).filter((t: any) => t.status === 'PENDING').length),
    refetchInterval: 30_000,
  });

  return (
    <View style={{ flex: 1, position: 'relative' }}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: isDark ? '#94A3B8' : '#64748B',
          tabBarStyle: {
            backgroundColor: isDark ? '#1E293B' : theme.colors.surface,
            borderTopColor: isDark ? '#334155' : theme.colors.surfaceVariant,
            borderTopWidth: 1,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '500',
          },
          headerStyle: { backgroundColor: isDark ? '#1E293B' : theme.colors.surface },
          headerTintColor: isDark ? '#F1F5F9' : theme.colors.onSurface,
          headerShadowVisible: false,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Tổng quan',
            tabBarIcon: ({ color, size }) => (
              <TabIcon name="view-dashboard-outline" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="tasks"
          options={{
            title: 'Công việc',
            tabBarIcon: ({ color, size }) => (
              <TabIcon name="checkbox-marked-outline" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="leaves"
          options={{
            title: 'Nghỉ phép',
            tabBarIcon: ({ color, size }) => (
              <TabIcon name="calendar-account-outline" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="expenses"
          options={{
            title: 'Chi phí',
            tabBarIcon: ({ color, size }) => (
              <TabIcon name="receipt-text-outline" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="timesheet"
          options={{
            title: 'Bảng công',
            tabBarIcon: ({ color, size }) => (
              <TabIcon name="calendar-clock" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="projects"
          options={{
            title: 'Dự án',
            href: null,
          }}
        />
        <Tabs.Screen
          name="bugs"
          options={{
            title: 'Bug & Issues',
            href: null,
          }}
        />
        <Tabs.Screen
          name="approvals"
          options={{
            title: 'Phê duyệt',
            href: canApprove ? undefined : null,
            tabBarBadge: canApprove && pendingCount > 0 ? pendingCount : undefined,
            tabBarIcon: ({ color, size }) => (
              <TabIcon name="clipboard-check-outline" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="processes"
          options={{
            title: 'Quy trình',
            tabBarBadge: processTaskCount > 0 ? processTaskCount : undefined,
            tabBarIcon: ({ color, size }) => (
              <TabIcon name="sitemap" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="notifications"
          options={{
            title: 'Thông báo',
            tabBarIcon: ({ color, size }) => (
              <TabIcon name="bell-outline" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="more"
          options={{
            title: 'Thêm',
            tabBarIcon: ({ color, size }) => (
              <TabIcon name="view-grid-outline" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Tài khoản',
            tabBarIcon: ({ color, size }) => (
              <TabIcon name="account-outline" color={color} size={size} />
            ),
          }}
        />
      </Tabs>
      <StatusFAB />
    </View>
  );
}
