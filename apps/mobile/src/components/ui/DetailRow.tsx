import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemePalette } from '../../hooks/useThemePalette';

interface DetailRowProps {
  label: string;
  value?: React.ReactNode;   // string/number → render text; node → render trực tiếp
}

/** Mirror <DetailRow> web — cặp "nhãn: giá trị". Tự hiển thị "—" khi rỗng. */
export function DetailRow({ label, value }: DetailRowProps) {
  const { textMuted, textPrimary } = useThemePalette();
  const isEmpty = value === undefined || value === null || value === '';
  const isPrimitive = typeof value === 'string' || typeof value === 'number';
  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: textMuted }]}>{label}</Text>
      <View style={styles.valueWrap}>
        {isEmpty ? (
          <Text style={[styles.value, { color: textMuted }]}>—</Text>
        ) : isPrimitive ? (
          <Text style={[styles.value, { color: textPrimary }]}>{value}</Text>
        ) : (
          value
        )}
      </View>
    </View>
  );
}

/** Mirror <DetailGrid> — list các DetailRow trong popup chi tiết. */
export function DetailGrid({ children }: { children: React.ReactNode }) {
  return <View style={styles.grid}>{children}</View>;
}

const styles = StyleSheet.create({
  grid: { gap: 2 },
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 6 },
  label: { width: 120, fontSize: 13 },
  valueWrap: { flex: 1, alignItems: 'flex-start' },
  value: { fontSize: 13, fontWeight: '500' },
});
