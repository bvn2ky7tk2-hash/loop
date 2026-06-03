import { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { TextInput, Button, Text, HelperText, useTheme, IconButton } from 'react-native-paper';
import { router } from 'expo-router';
import { useAuthStore } from '../../src/store/auth';
import { useThemeStore, ThemeMode } from '../../src/store/theme';

const THEME_ICONS: Record<ThemeMode, string> = {
  system: 'theme-light-dark',
  light: 'weather-sunny',
  dark: 'weather-night',
};

const NEXT_MODE: Record<ThemeMode, ThemeMode> = {
  system: 'light',
  light: 'dark',
  dark: 'system',
};

export default function LoginScreen() {
  const theme = useTheme();
  const { mode, setMode } = useThemeStore();
  const isDark = theme.dark;

  const [email, setEmail] = useState('admin@loop.vn');
  const [password, setPassword] = useState('admin');
  const [secureEntry, setSecureEntry] = useState(true);
  const [error, setError] = useState('');
  const { login } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) { setError('Vui lòng nhập đầy đủ thông tin'); return; }
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      router.replace('/(tabs)');
    } catch {
      setError('Email hoặc mật khẩu không đúng');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Theme toggle */}
      <IconButton
        icon={THEME_ICONS[mode]}
        size={22}
        onPress={() => setMode(NEXT_MODE[mode])}
        style={styles.themeBtn}
        iconColor={isDark ? '#94A3B8' : '#64748B'}
      />

      {/* Hero header — navy gradient khớp web login */}
      <View style={styles.hero}>
        <View style={styles.logoWrap}>
          <Image
            source={require('../../assets/icon.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.appName}>L∞p</Text>
        <Text style={styles.tagline}>Kết nối công việc, nhân sự và vận hành</Text>
      </View>

      {/* Form card */}
      <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Text variant="titleMedium" style={[styles.formTitle, { color: theme.colors.onSurface }]}>
          Đăng nhập
        </Text>

        <TextInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          style={styles.input}
          mode="outlined"
          left={<TextInput.Icon icon="email-outline" />}
        />
        <TextInput
          label="Mật khẩu"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={secureEntry}
          style={styles.input}
          mode="outlined"
          left={<TextInput.Icon icon="lock-outline" />}
          right={
            <TextInput.Icon
              icon={secureEntry ? 'eye-outline' : 'eye-off-outline'}
              onPress={() => setSecureEntry(!secureEntry)}
            />
          }
        />

        <HelperText type="error" visible={!!error} style={styles.errorText}>
          {error}
        </HelperText>

        <Button
          mode="contained"
          onPress={handleLogin}
          loading={loading}
          disabled={loading}
          style={styles.button}
          contentStyle={styles.buttonContent}
          buttonColor="#0052CC"
        >
          Đăng nhập
        </Button>
      </View>

      <Text variant="bodySmall" style={[styles.version, { color: theme.colors.onSurfaceVariant }]}>
        Loop · Quản trị doanh nghiệp toàn diện
      </Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  themeBtn: { position: 'absolute', top: 48, right: 12, zIndex: 10 },

  hero: {
    paddingTop: 80,
    paddingBottom: 48,
    alignItems: 'center',
    backgroundColor: '#0B1D58',
  },
  logoWrap: {
    width: 96,
    height: 96,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  logo: { width: 96, height: 96 },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
    marginBottom: 4,
  },
  tagline: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 0.3,
  },

  card: {
    marginHorizontal: 20,
    marginTop: -24,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  formTitle: { marginBottom: 20, fontWeight: '600' },
  input: { marginBottom: 12 },
  errorText: { marginBottom: 4 },
  button: { marginTop: 4, borderRadius: 10 },
  buttonContent: { height: 50 },

  version: { textAlign: 'center', marginTop: 24 },
});
