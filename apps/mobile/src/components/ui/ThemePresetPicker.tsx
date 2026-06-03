import { View, StyleSheet, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { THEME_PRESETS } from '@loop/shared';
import { useThemeStore } from '../../store/theme';

/** Bộ chọn preset màu (12 màu, đồng bộ với web). Đổi preset → cả app đổi màu chủ đạo. */
export function ThemePresetPicker() {
  const { presetId, setPreset } = useThemeStore();
  return (
    <View style={styles.row}>
      {THEME_PRESETS.map((p) => {
        const selected = p.id === presetId;
        return (
          <Pressable
            key={p.id}
            onPress={() => setPreset(p.id)}
            style={[styles.swatch, { backgroundColor: p.primary }, selected && styles.selected]}
            accessibilityLabel={p.name}
          >
            {selected ? <MaterialCommunityIcons name="check" size={18} color="#fff" /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 16, paddingBottom: 16 },
  swatch: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  selected: { borderWidth: 2, borderColor: '#fff', elevation: 3 },
});
