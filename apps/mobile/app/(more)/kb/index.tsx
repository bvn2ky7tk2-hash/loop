import { useState } from 'react';
import { View, StyleSheet, Pressable, FlatList } from 'react-native';
import { Text, ActivityIndicator, TextInput as PaperInput, Chip } from 'react-native-paper';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemePalette } from '../../../src/hooks/useThemePalette';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { kbApi, type KbArticleListItem } from '../../../src/api/kb';

export default function KbListScreen() {
  const { bgPage, bgCard, borderColor, textPrimary, textMuted, preset } = useThemePalette();
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string | undefined>();

  const { data: categories = [] } = useQuery({ queryKey: ['kb-categories'], queryFn: kbApi.categories });
  const { data, isLoading } = useQuery({
    queryKey: ['kb-articles', search, categoryId],
    queryFn: () => kbApi.articles({ search: search || undefined, categoryId, limit: 50 }),
  });

  const articles = data?.data ?? [];

  const renderItem = ({ item }: { item: KbArticleListItem }) => (
    <Pressable
      onPress={() => router.push(`/(more)/kb/${item.id}` as any)}
      style={[styles.card, { backgroundColor: bgCard, borderColor }]}
    >
      <View style={styles.cardHead}>
        {item.isPinned ? <MaterialCommunityIcons name="pin" size={14} color={preset.primary} /> : null}
        <Text style={[styles.title, { color: textPrimary }]} numberOfLines={2}>{item.title}</Text>
      </View>
      {item.summary ? <Text style={[styles.summary, { color: textMuted }]} numberOfLines={2}>{item.summary}</Text> : null}
      <View style={styles.meta}>
        {item.category ? (
          <Text style={[styles.cat, { color: item.category.color ?? preset.primary }]}>{item.category.name}</Text>
        ) : null}
        <Text style={[styles.views, { color: textMuted }]}>· {item.viewCount} lượt xem</Text>
      </View>
    </Pressable>
  );

  return (
    <View style={[styles.wrap, { backgroundColor: bgPage }]}>
      <View style={styles.filterBar}>
        <PaperInput
          mode="outlined"
          dense
          placeholder="Tìm bài viết..."
          value={search}
          onChangeText={setSearch}
          left={<PaperInput.Icon icon="magnify" />}
          style={styles.search}
        />
      </View>

      {categories.length > 0 ? (
        <View style={styles.chips}>
          <Chip selected={!categoryId} onPress={() => setCategoryId(undefined)} compact style={styles.chip}>Tất cả</Chip>
          {categories.map((c) => (
            <Chip key={c.id} selected={categoryId === c.id} onPress={() => setCategoryId(c.id)} compact style={styles.chip}>
              {c.name}
            </Chip>
          ))}
        </View>
      ) : null}

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator /></View>
      ) : (
        <FlatList
          data={articles}
          keyExtractor={(it) => it.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<EmptyState icon="book-open-variant" title="Không có bài viết" description="Chưa có tài liệu nào phù hợp." />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  filterBar: { paddingHorizontal: 16, paddingTop: 12 },
  search: { backgroundColor: 'transparent' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 16, paddingTop: 8 },
  chip: { marginRight: 2 },
  list: { padding: 16, paddingBottom: 40, gap: 10 },
  card: { borderRadius: 12, borderWidth: 1, padding: 14 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 15, fontWeight: '600', flex: 1 },
  summary: { fontSize: 13, marginTop: 6, lineHeight: 18 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  cat: { fontSize: 12, fontWeight: '600' },
  views: { fontSize: 12 },
});
