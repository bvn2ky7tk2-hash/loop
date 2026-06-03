import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemePalette } from '../../hooks/useThemePalette';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: IconName;
  iconColor?: string;
  actions?: React.ReactNode;
}

/** Mirror <PageHeader> web — header đầu mỗi màn hình (title + icon + actions). */
export function PageHeader({ title, subtitle, icon, iconColor, actions }: PageHeaderProps) {
  const { textPrimary, textMuted, preset } = useThemePalette();
  return (
    <View style={styles.row}>
      <View style={styles.left}>
        {icon ? (
          <MaterialCommunityIcons name={icon} size={26} color={iconColor ?? preset.primary} style={styles.icon} />
        ) : null}
        <View style={styles.flex}>
          <Text style={[styles.title, { color: textPrimary }]} numberOfLines={1}>{title}</Text>
          {subtitle ? <Text style={[styles.subtitle, { color: textMuted }]} numberOfLines={1}>{subtitle}</Text> : null}
        </View>
      </View>
      {actions ? <View style={styles.actions}>{actions}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  left: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  flex: { flex: 1 },
  icon: { marginRight: 10 },
  title: { fontSize: 20, fontWeight: '700' },
  subtitle: { fontSize: 12, marginTop: 2 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
