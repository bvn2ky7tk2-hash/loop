import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemePalette } from '../../hooks/useThemePalette';

export type Tone = 'success' | 'warning' | 'error' | 'info' | 'processing' | 'neutral';

const TONE_COLOR: Record<Tone, string> = {
  success:    '#10B981',
  warning:    '#F59E0B',
  error:      '#EF4444',
  info:       '#3B82F6',
  processing: '#6366F1',
  neutral:    '#94A3B8',
};

interface StatusBadgeProps {
  label: string;
  tone?: Tone;
  color?: string;   // override trực tiếp (vd từ STATUS_COLORS shared)
}

/**
 * Mirror <StatusBadge> web — badge trạng thái, chọn màu qua tone hoặc color trực tiếp.
 * Tự xử dark/light: nền tint mờ + chữ màu đậm, đọc được cả hai mode.
 */
export function StatusBadge({ label, tone = 'neutral', color }: StatusBadgeProps) {
  const { isDark } = useThemePalette();
  const c = color ?? TONE_COLOR[tone];
  return (
    <View style={[styles.badge, { backgroundColor: `${c}${isDark ? '26' : '1F'}`, borderColor: `${c}${isDark ? '4D' : '33'}` }]}>
      <Text style={[styles.text, { color: c }]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  text: { fontSize: 12, fontWeight: '600' },
});
