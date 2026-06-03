import { View, FlatList, StyleSheet } from 'react-native';
import { Text, Card, Button, useTheme, ActivityIndicator, Badge } from 'react-native-paper';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../src/api/client';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationsScreen() {
  const theme = useTheme();
  const qc = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get<Notification[]>('/notifications'),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.put(`/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllMutation = useMutation({
    mutationFn: () => api.put('/notifications/read-all'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={[{ flex: 1 }, { backgroundColor: theme.colors.background }]}>
      {unreadCount > 0 && (
        <View style={styles.header}>
          <Text variant="bodyMedium">{unreadCount} chưa đọc</Text>
          <Button compact onPress={() => markAllMutation.mutate()}>
            Đọc tất cả
          </Button>
        </View>
      )}
      <FlatList
        data={notifications}
        keyExtractor={(n) => n.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <Card
            style={[
              styles.card,
              { backgroundColor: item.isRead ? theme.colors.surface : theme.colors.primaryContainer },
            ]}
          >
            <Card.Content>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text variant="titleSmall">{item.title}</Text>
                  <Text
                    variant="bodySmall"
                    style={{ marginTop: 2, color: theme.colors.onSurfaceVariant }}
                  >
                    {item.body}
                  </Text>
                  <Text
                    variant="bodySmall"
                    style={{ marginTop: 4, color: theme.colors.onSurfaceVariant }}
                  >
                    {new Date(item.createdAt).toLocaleString('vi-VN')}
                  </Text>
                </View>
                {!item.isRead && (
                  <Button compact onPress={() => markReadMutation.mutate(item.id)}>
                    Đọc
                  </Button>
                )}
              </View>
            </Card.Content>
          </Card>
        )}
        ListEmptyComponent={
          <Text style={{ textAlign: 'center', marginTop: 40, color: theme.colors.onSurfaceVariant }}>
            Không có thông báo nào
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', padding: 16, paddingBottom: 0,
  },
  card: { marginBottom: 12, borderRadius: 8 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
});
