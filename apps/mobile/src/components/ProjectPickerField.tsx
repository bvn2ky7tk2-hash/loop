import { useState, useMemo } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Text, TextInput, useTheme, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export interface PickerProject {
  id: string;
  code: string;
  name: string;
}

interface ProjectPickerFieldProps {
  projects: PickerProject[];
  value: string;          // selected project id
  onChange: (id: string) => void;
  loading?: boolean;
  style?: object;
}

export function ProjectPickerField({
  projects,
  value,
  onChange,
  loading = false,
  style,
}: ProjectPickerFieldProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selected = projects.find((p) => p.id === value);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter(
      (p) =>
        p.code.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q),
    );
  }, [projects, search]);

  function handleSelect(id: string) {
    onChange(id);
    setOpen(false);
    setSearch('');
  }

  function handleOpen() {
    setSearch('');
    setOpen(true);
  }

  const isDark = theme.dark;

  return (
    <>
      {/* ── Trigger field ─────────────────────────────────────────────────── */}
      <TouchableOpacity
        onPress={handleOpen}
        activeOpacity={0.75}
        style={[
          styles.trigger,
          {
            borderColor: value ? theme.colors.primary : theme.colors.outline,
            backgroundColor: theme.colors.surfaceVariant,
          },
          style,
        ]}
      >
        {selected ? (
          <View style={styles.triggerContent}>
            <View style={[styles.codeBadge, { backgroundColor: theme.colors.primaryContainer }]}>
              <Text style={[styles.codeText, { color: theme.colors.onPrimaryContainer }]}>
                {selected.code}
              </Text>
            </View>
            <Text
              numberOfLines={1}
              style={[styles.selectedName, { color: theme.colors.onSurface }]}
            >
              {selected.name}
            </Text>
          </View>
        ) : (
          <View style={styles.triggerContent}>
            <MaterialCommunityIcons
              name="briefcase-search-outline"
              size={18}
              color={theme.colors.onSurfaceVariant}
              style={{ marginRight: 8 }}
            />
            <Text style={[styles.placeholder, { color: theme.colors.onSurfaceVariant }]}>
              {loading ? 'Đang tải dự án...' : 'Chọn dự án...'}
            </Text>
          </View>
        )}
        <MaterialCommunityIcons
          name="chevron-down"
          size={20}
          color={value ? theme.colors.primary : theme.colors.onSurfaceVariant}
        />
      </TouchableOpacity>

      {/* ── Picker modal ──────────────────────────────────────────────────── */}
      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        {/* Backdrop */}
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => { setOpen(false); setSearch(''); }}
        />

        {/* Sheet */}
        <View
          style={[
            styles.sheet,
            { backgroundColor: isDark ? '#1E293B' : theme.colors.surface },
          ]}
        >
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: isDark ? '#475569' : '#CBD5E1' }]} />

          {/* Header */}
          <View style={styles.sheetHeader}>
            <Text variant="titleMedium" style={{ fontWeight: '700', color: theme.colors.onSurface }}>
              Chọn dự án
            </Text>
            <TouchableOpacity
              onPress={() => { setOpen(false); setSearch(''); }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialCommunityIcons name="close" size={22} color={theme.colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={[styles.searchWrap, { borderBottomColor: theme.colors.surfaceVariant }]}>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Tìm theo tên hoặc mã dự án..."
              mode="outlined"
              dense
              autoFocus
              left={<TextInput.Icon icon="magnify" />}
              right={
                search.length > 0 ? (
                  <TextInput.Icon icon="close-circle-outline" onPress={() => setSearch('')} />
                ) : undefined
              }
              style={styles.searchInput}
            />
          </View>

          <Divider />

          {/* Project list */}
          <FlatList
            data={filtered}
            keyExtractor={(p) => p.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const isSelected = item.id === value;
              return (
                <TouchableOpacity
                  onPress={() => handleSelect(item.id)}
                  activeOpacity={0.7}
                  style={[
                    styles.row,
                    isSelected && {
                      backgroundColor: theme.colors.primaryContainer,
                      marginHorizontal: -4,
                      paddingHorizontal: 20,
                      borderRadius: 8,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.codeBadge,
                      {
                        backgroundColor: isSelected
                          ? theme.colors.primary
                          : theme.colors.secondaryContainer,
                        marginRight: 12,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.codeText,
                        {
                          color: isSelected
                            ? theme.colors.onPrimary
                            : theme.colors.onSecondaryContainer,
                        },
                      ]}
                    >
                      {item.code}
                    </Text>
                  </View>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.projectName,
                      {
                        color: isSelected ? theme.colors.onPrimaryContainer : theme.colors.onSurface,
                        fontWeight: isSelected ? '600' : '400',
                        flex: 1,
                      },
                    ]}
                  >
                    {item.name}
                  </Text>
                  {isSelected && (
                    <MaterialCommunityIcons
                      name="check-circle"
                      size={20}
                      color={theme.colors.primary}
                    />
                  )}
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={styles.empty}>
                <MaterialCommunityIcons
                  name="briefcase-off-outline"
                  size={40}
                  color={theme.colors.onSurfaceVariant}
                  style={{ opacity: 0.4 }}
                />
                <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
                  Không tìm thấy dự án nào
                </Text>
              </View>
            }
          />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 56,
  },
  triggerContent: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
  codeBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginRight: 8,
  },
  codeText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  selectedName: { fontSize: 15, flex: 1 },
  placeholder: { fontSize: 15 },

  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '75%',
    paddingBottom: 32,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12, marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  searchWrap: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  searchInput: { backgroundColor: 'transparent' },
  listContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  projectName: { fontSize: 15 },
  empty: { alignItems: 'center', paddingTop: 40 },
});
