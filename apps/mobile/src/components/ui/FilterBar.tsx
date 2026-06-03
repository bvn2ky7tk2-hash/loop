import { View, StyleSheet } from 'react-native';

/** Mirror <FilterBar> web — thanh bao ngoài các control filter (search/select), wrap nhiều dòng. */
export function FilterBar({ children }: { children: React.ReactNode }) {
  return <View style={styles.bar}>{children}</View>;
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 12 },
});
