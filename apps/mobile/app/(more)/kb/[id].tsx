import { ScrollView, View, StyleSheet } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useThemePalette } from '../../../src/hooks/useThemePalette';
import { kbApi } from '../../../src/api/kb';

export default function KbArticleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { bgPage, textPrimary, textMuted, preset } = useThemePalette();

  const { data, isLoading } = useQuery({
    queryKey: ['kb-article', id],
    queryFn: () => kbApi.article(String(id)),
    enabled: !!id,
  });

  if (isLoading || !data) {
    return <View style={[styles.center, { backgroundColor: bgPage }]}><ActivityIndicator /></View>;
  }

  return (
    <ScrollView style={{ backgroundColor: bgPage }} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: textPrimary }]}>{data.title}</Text>
      <View style={styles.meta}>
        {data.category ? <Text style={[styles.cat, { color: data.category.color ?? preset.primary }]}>{data.category.name}</Text> : null}
        {data.author ? <Text style={[styles.metaText, { color: textMuted }]}>· {data.author.name}</Text> : null}
        <Text style={[styles.metaText, { color: textMuted }]}>· {data.viewCount} lượt xem</Text>
      </View>
      {/* Render nguyên văn, giữ xuống dòng — parity với web (whitespace-pre-wrap) */}
      <Text style={[styles.body, { color: textPrimary }]}>{data.content ?? ''}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 48 },
  title: { fontSize: 20, fontWeight: '700', lineHeight: 28 },
  meta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4, marginTop: 8, marginBottom: 16 },
  cat: { fontSize: 12, fontWeight: '600' },
  metaText: { fontSize: 12 },
  body: { fontSize: 15, lineHeight: 24 },
});
