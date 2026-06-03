import { View, StyleSheet, type ViewStyle } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemePalette } from '../../hooks/useThemePalette';

interface SectionCardProps {
  title?: string;
  extra?: React.ReactNode;
  nested?: boolean;       // card lồng trong card → dùng bgSubPanel
  noPadding?: boolean;
  style?: ViewStyle;
  children: React.ReactNode;
}

/** Mirror <SectionCard> web — khối/section wrapper (nền + viền + bo góc). */
export function SectionCard({ title, extra, nested, noPadding, style, children }: SectionCardProps) {
  const { bgCard, bgSubPanel, borderColor, textPrimary } = useThemePalette();
  return (
    <View style={[styles.card, { backgroundColor: nested ? bgSubPanel : bgCard, borderColor }, style]}>
      {title || extra ? (
        <View style={styles.header}>
          {title ? <Text style={[styles.title, { color: textPrimary }]}>{title}</Text> : <View />}
          {extra}
        </View>
      ) : null}
      <View style={noPadding ? undefined : styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4 },
  title: { fontSize: 15, fontWeight: '600' },
  body: { padding: 14 },
});
