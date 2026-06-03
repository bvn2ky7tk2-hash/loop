import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemePalette } from '../../hooks/useThemePalette';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface EmptyStateProps {
  icon?: IconName;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

/** Mirror <EmptyState> web — màn hình trống (icon + title + mô tả + action). */
export function EmptyState({ icon = 'inbox-outline', title, description, action }: EmptyStateProps) {
  const { textPrimary, textMuted, borderColor } = useThemePalette();
  return (
    <View style={styles.wrap}>
      <MaterialCommunityIcons name={icon} size={56} color={borderColor} />
      <Text style={[styles.title, { color: textPrimary }]}>{title}</Text>
      {description ? <Text style={[styles.desc, { color: textMuted }]}>{description}</Text> : null}
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, paddingHorizontal: 24 },
  title: { fontSize: 16, fontWeight: '600', marginTop: 12, textAlign: 'center' },
  desc: { fontSize: 13, marginTop: 4, textAlign: 'center' },
  action: { marginTop: 16 },
});
