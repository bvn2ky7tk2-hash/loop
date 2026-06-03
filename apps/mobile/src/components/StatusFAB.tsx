import { useState } from 'react';
import { View, Modal, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
import { Text, useTheme, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useWorkStatus } from '../hooks/useWorkStatus';
import type { WorkStatusType } from '../api/timesheet';

interface StatusOption {
  type: WorkStatusType;
  label: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  color: string;
}

const STATUS_OPTIONS: StatusOption[] = [
  { type: 'WORKING',       label: 'Đang làm việc', icon: 'laptop',          color: '#52C41A' },
  { type: 'WFH',           label: 'Làm từ xa',     icon: 'home-account',    color: '#1677FF' },
  { type: 'MEETING',       label: 'Đang họp',      icon: 'account-group',   color: '#FA8C16' },
  { type: 'BREAK',         label: 'Nghỉ giải lao', icon: 'coffee-outline',  color: '#FADB14' },
  { type: 'OFF',           label: 'Nghỉ phép',     icon: 'calendar-remove', color: '#FF4D4F' },
  { type: 'BUSINESS_TRIP', label: 'Công tác',      icon: 'airplane',        color: '#722ED1' },
];

export function StatusFAB() {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const { currentStatus, isLoading, isUpdating, updateStatus } = useWorkStatus();

  const current = STATUS_OPTIONS.find((o) => o.type === currentStatus);

  const handleSelect = (type: WorkStatusType) => {
    updateStatus(type);
    setOpen(false);
  };

  return (
    <>
      {/* FAB button */}
      <TouchableOpacity
        style={[
          styles.fab,
          { backgroundColor: current?.color ?? theme.colors.primary },
        ]}
        onPress={() => setOpen(true)}
        activeOpacity={0.85}
      >
        {isLoading || isUpdating ? (
          <ActivityIndicator size={18} color="#fff" />
        ) : (
          <>
            <MaterialCommunityIcons
              name={current?.icon ?? 'account-clock-outline'}
              size={20}
              color="#fff"
            />
            <Text style={styles.fabLabel} numberOfLines={1}>
              {current?.label ?? 'Trạng thái'}
            </Text>
          </>
        )}
      </TouchableOpacity>

      {/* Status picker modal */}
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <View
            style={[styles.sheet, { backgroundColor: theme.colors.surface }]}
            // prevent tap-through to overlay
            onStartShouldSetResponder={() => true}
          >
            <Text variant="titleMedium" style={styles.sheetTitle}>
              Cập nhật trạng thái
            </Text>

            {STATUS_OPTIONS.map((opt) => {
              const isSelected = currentStatus === opt.type;
              return (
                <TouchableOpacity
                  key={opt.type}
                  style={[
                    styles.option,
                    isSelected && { backgroundColor: `${opt.color}18` },
                  ]}
                  onPress={() => handleSelect(opt.type)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.optionDot, { backgroundColor: opt.color }]} />
                  <MaterialCommunityIcons
                    name={opt.icon}
                    size={20}
                    color={isSelected ? opt.color : theme.colors.onSurfaceVariant}
                    style={{ marginRight: 10 }}
                  />
                  <Text
                    variant="bodyLarge"
                    style={{ color: isSelected ? opt.color : theme.colors.onSurface, flex: 1 }}
                  >
                    {opt.label}
                  </Text>
                  {isSelected && (
                    <MaterialCommunityIcons name="check" size={18} color={opt.color} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 80,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    maxWidth: 180,
  },
  fabLabel: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 36,
    paddingHorizontal: 16,
    elevation: 8,
  },
  sheetTitle: {
    marginBottom: 16,
    fontWeight: '700',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    marginBottom: 2,
  },
  optionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
});
