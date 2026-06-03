import { useEffect } from 'react';
import { View, Text as RNText, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Stack, router, type ErrorBoundaryProps } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PaperProvider, MD3DarkTheme, MD3LightTheme } from 'react-native-paper';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { getPalette, type ThemePreset } from '@loop/shared';
import { useAuthStore } from '../src/store/auth';
import { useThemeStore } from '../src/store/theme';
import { usePushNotifications } from '../src/hooks/usePushNotifications';

// Map palette/preset (nguồn @loop/shared) → react-native-paper MD3, ĐỘNG theo preset đang chọn.
// Đồng bộ với useThemePalette web — đổi preset là cả app đổi màu.
function buildPaperTheme(preset: ThemePreset, isDark: boolean) {
  const base = isDark ? MD3DarkTheme : MD3LightTheme;
  const p = getPalette(preset, isDark);
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: preset.primary,
      onPrimary: '#FFFFFF',
      primaryContainer: `${preset.primary}22`,
      onPrimaryContainer: isDark ? '#F1F5F9' : preset.active,
      secondary: preset.hover,
      onSecondary: '#FFFFFF',
      background: p.bgPage,
      surface: p.bgContainer,
      surfaceVariant: p.bgCard,
      onSurface: p.textPrimary,
      onSurfaceVariant: p.textSecondary,
      outline: p.borderColor,
    },
  };
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, retry: 1, refetchOnWindowFocus: false },
    mutations: { retry: 0 },
  },
});

// Error Boundary root — Expo Router tự dùng khi bất kỳ route nào throw.
// Thay màn hình crash trắng bằng UI thân thiện + nút thử lại. KHÔNG log token (CLAUDE.md §3).
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View style={ebStyles.wrap}>
      <RNText style={ebStyles.emoji}>⚠️</RNText>
      <RNText style={ebStyles.title}>Đã có lỗi xảy ra</RNText>
      <RNText style={ebStyles.desc}>Ứng dụng gặp sự cố không mong muốn. Vui lòng thử lại.</RNText>
      <ScrollView style={ebStyles.box}>
        <RNText style={ebStyles.errText}>{error?.message ?? 'Unknown error'}</RNText>
      </ScrollView>
      <Pressable style={ebStyles.btn} onPress={retry}>
        <RNText style={ebStyles.btnText}>Thử lại</RNText>
      </Pressable>
    </View>
  );
}

const ebStyles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#0F172A' },
  emoji: { fontSize: 48, marginBottom: 8 },
  title: { fontSize: 20, fontWeight: '700', color: '#F1F5F9', marginBottom: 6 },
  desc: { fontSize: 14, color: '#94A3B8', textAlign: 'center', marginBottom: 16 },
  box: { maxHeight: 120, alignSelf: 'stretch', backgroundColor: '#1E293B', borderRadius: 8, padding: 12, marginBottom: 20 },
  errText: { fontSize: 12, color: '#FCA5A5', fontFamily: 'monospace' },
  btn: { backgroundColor: '#0052CC', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});

export default function RootLayout() {
  const systemScheme = useColorScheme();
  const { mode, preset, loadTheme } = useThemeStore();
  const effectiveScheme = mode === 'system' ? systemScheme : mode;
  const theme = buildPaperTheme(preset, effectiveScheme === 'dark');
  const { loadUser, user, isLoading } = useAuthStore();
  usePushNotifications();

  useEffect(() => {
    loadTheme();
    loadUser();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      if (!user) router.replace('/(auth)/login');
    }
  }, [user, isLoading]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PaperProvider theme={theme}>
          <QueryClientProvider client={queryClient}>
            <StatusBar style={effectiveScheme === 'dark' ? 'light' : 'dark'} />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="(more)" options={{ headerShown: false }} />
              <Stack.Screen name="project/[id]" options={{ headerShown: false }} />
              <Stack.Screen name="bug/[id]" options={{ headerShown: false }} />
            </Stack>
          </QueryClientProvider>
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
