import { View, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Card, Chip, ProgressBar, useTheme, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { api } from '../../src/api/client';

interface Project {
  id: string;
  name: string;
  code: string;
  type: string;
  status: string;
  progress: number;
  endDate: string;
  customer?: string;
  budgetCost?: number;
  currency?: string;
  pm?: { id: string; name: string };
  _count?: { members: number };
}

const STATUS_COLORS: Record<string, string> = {
  PLANNING: '#8C8C8C', ACTIVE: '#1B4F9C', ON_HOLD: '#FA8C16', CLOSED: '#8C8C8C',
};

const STATUS_LABELS: Record<string, string> = {
  PLANNING: 'Lập kế hoạch', ACTIVE: 'Đang triển khai', ON_HOLD: 'Tạm dừng', CLOSED: 'Đóng',
};

export default function ProjectsScreen() {
  const theme = useTheme();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get<Project[]>('/projects'),
  });

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <FlatList
      style={{ backgroundColor: theme.colors.background }}
      data={projects}
      keyExtractor={(p) => p.id}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      renderItem={({ item }) => (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() =>
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (router.push as any)({
              pathname: '/project/[id]',
              params: { id: item.id, name: item.name, code: item.code },
            })
          }
        >
          <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
              <View style={styles.header}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text variant="titleMedium" numberOfLines={1}>{item.name}</Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    {item.code} · {item.type}
                  </Text>
                </View>
                <Chip
                  compact
                  style={{ backgroundColor: (STATUS_COLORS[item.status] ?? '#8C8C8C') + '20' }}
                  textStyle={{ color: STATUS_COLORS[item.status] ?? '#8C8C8C', fontSize: 11 }}
                >
                  {STATUS_LABELS[item.status] ?? item.status}
                </Chip>
              </View>

              {item.customer && (
                <Text variant="bodySmall" style={{ marginTop: 4, color: theme.colors.onSurfaceVariant }}>
                  KH: {item.customer}
                </Text>
              )}

              <View style={styles.metaRow}>
                {item.pm && (
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    👤 {item.pm.name}
                  </Text>
                )}
                {item._count !== undefined && (
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    👥 {item._count.members} TV
                  </Text>
                )}
                {!!item.budgetCost && (
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    💰 {Number(item.budgetCost).toLocaleString('vi-VN')} {item.currency ?? 'VND'}
                  </Text>
                )}
              </View>

              <View style={styles.progressRow}>
                <ProgressBar
                  progress={Number(item.progress) / 100}
                  color={theme.colors.primary}
                  style={{ flex: 1, height: 6, borderRadius: 3 }}
                />
                <Text variant="bodySmall" style={{ marginLeft: 8, color: theme.colors.onSurfaceVariant }}>
                  {Math.round(Number(item.progress))}%
                </Text>
              </View>

              <View style={styles.footer}>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  📅 Hạn: {new Date(item.endDate).toLocaleDateString('vi-VN')}
                </Text>
                <View style={styles.tapHint}>
                  <Text variant="bodySmall" style={{ color: theme.colors.primary, marginRight: 2 }}>
                    Xem tasks
                  </Text>
                  <MaterialCommunityIcons name="chevron-right" size={16} color={theme.colors.primary} />
                </View>
              </View>
            </Card.Content>
          </Card>
        </TouchableOpacity>
      )}
      ListEmptyComponent={
        <Text style={{ textAlign: 'center', marginTop: 40, color: theme.colors.onSurfaceVariant }}>
          Chưa có dự án nào
        </Text>
      }
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { marginBottom: 12, borderRadius: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  metaRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6 },
  progressRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  tapHint: { flexDirection: 'row', alignItems: 'center' },
});
