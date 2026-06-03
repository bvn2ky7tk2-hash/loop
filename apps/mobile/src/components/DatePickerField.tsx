import { useState } from 'react';
import { Platform, View, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { Text, Surface, Button, useTheme } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface DatePickerFieldProps {
  label: string;
  value: string; // YYYY-MM-DD or ''
  onChange: (date: string) => void;
  style?: object;
  placeholder?: string;
}

export function DatePickerField({ label, value, onChange, style, placeholder = 'Chọn ngày...' }: DatePickerFieldProps) {
  const theme = useTheme();
  const [show, setShow] = useState(false);
  // Avoid timezone shift: parse as local date
  const parsedDate = value ? new Date(`${value}T00:00:00`) : new Date();

  const displayValue = value
    ? parsedDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '';

  const handleChange = (_: unknown, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShow(false);
    if (selectedDate) {
      const y = selectedDate.getFullYear();
      const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const d = String(selectedDate.getDate()).padStart(2, '0');
      onChange(`${y}-${m}-${d}`);
    }
  };

  return (
    <View style={style}>
      <TouchableOpacity
        onPress={() => setShow(true)}
        activeOpacity={0.7}
        style={[
          styles.field,
          {
            borderColor: theme.colors.outline,
            backgroundColor: theme.colors.surfaceVariant,
          },
        ]}
      >
        <MaterialCommunityIcons
          name="calendar-month-outline"
          size={20}
          color={theme.colors.primary}
          style={styles.icon}
        />
        <View style={styles.textWrap}>
          <Text style={[styles.labelText, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
          <Text
            style={[
              styles.valueText,
              { color: value ? theme.colors.onSurface : theme.colors.onSurfaceVariant },
            ]}
          >
            {displayValue || placeholder}
          </Text>
        </View>
        {value ? (
          <TouchableOpacity
            onPress={(e) => { e.stopPropagation(); onChange(''); }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons name="close-circle-outline" size={18} color={theme.colors.onSurfaceVariant} />
          </TouchableOpacity>
        ) : (
          <MaterialCommunityIcons name="chevron-down" size={18} color={theme.colors.onSurfaceVariant} />
        )}
      </TouchableOpacity>

      {/* iOS: bottom-sheet modal */}
      {Platform.OS === 'ios' && (
        <Modal visible={show} transparent animationType="slide" onRequestClose={() => setShow(false)}>
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setShow(false)} />
          <Surface style={[styles.sheet, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.sheetHandle} />
            <DateTimePicker
              value={parsedDate}
              mode="date"
              display="spinner"
              onChange={handleChange}
              locale="vi-VN"
              style={{ width: '100%' }}
            />
            <Button mode="contained" onPress={() => setShow(false)} style={styles.doneBtn}>
              Xong
            </Button>
          </Surface>
        </Modal>
      )}

      {/* Android: native dialog */}
      {Platform.OS === 'android' && show && (
        <DateTimePicker
          value={parsedDate}
          mode="date"
          display="default"
          onChange={handleChange}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 56,
  },
  icon: { marginRight: 10 },
  textWrap: { flex: 1 },
  labelText: { fontSize: 11, lineHeight: 14, marginBottom: 1 },
  valueText: { fontSize: 15 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 32,
    alignItems: 'center',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginVertical: 12,
  },
  doneBtn: { width: '100%', marginTop: 8 },
});
