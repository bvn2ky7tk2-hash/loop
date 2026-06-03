import { useState } from 'react';
import { View, StyleSheet, FlatList, Pressable } from 'react-native';
import { Text, ActivityIndicator, FAB, Button, TextInput as PaperInput, Snackbar, SegmentedButtons } from 'react-native-paper';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemePalette } from '../../src/hooks/useThemePalette';
import { StatusBadge, type Tone } from '../../src/components/ui/StatusBadge';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { CenteredModal } from '../../src/components/ui/CenteredModal';
import { confirmDelete } from '../../src/components/ui/confirmDelete';
import { useAuthStore } from '../../src/store/auth';
import { feedApi, type FeedPost, type FeedPostType } from '../../src/api/feed';

const TYPE_META: Record<FeedPostType, { label: string; tone: Tone }> = {
  ANNOUNCEMENT: { label: 'Thông báo', tone: 'info' },
  KUDOS:        { label: 'Khen thưởng', tone: 'success' },
  BIRTHDAY:     { label: 'Sinh nhật', tone: 'warning' },
  ANNIVERSARY:  { label: 'Kỷ niệm', tone: 'processing' },
  DOCUMENT:     { label: 'Tài liệu', tone: 'neutral' },
};
const pad = (n: number) => String(n).padStart(2, '0');
const fmtDate = (iso: string) => { const d = new Date(iso); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`; };
const LIKE = '👍';

export default function FeedScreen() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const { bgPage, bgCard, borderColor, textPrimary, textSecondary, textMuted, preset } = useThemePalette();
  const [open, setOpen] = useState(false);
  const [snack, setSnack] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<FeedPostType>('ANNOUNCEMENT');

  const { data, isLoading } = useQuery({ queryKey: ['feed'], queryFn: () => feedApi.list() });
  const posts = data?.data ?? [];

  const createMut = useMutation({
    mutationFn: () => feedApi.create({ type, title: title.trim() || undefined, content: content.trim() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['feed'] });
      setOpen(false); setTitle(''); setContent(''); setType('ANNOUNCEMENT');
      setSnack('Đã đăng bài');
    },
    onError: (e: any) => setSnack(e?.message ?? 'Đăng bài thất bại'),
  });

  const reactMut = useMutation({
    mutationFn: (id: string) => feedApi.react(id, LIKE),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feed'] }),
  });

  const removeMut = useMutation({
    mutationFn: (id: string) => feedApi.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['feed'] }); setSnack('Đã xóa bài'); },
  });

  const renderItem = ({ item }: { item: FeedPost }) => {
    const meta = TYPE_META[item.type];
    const count = item.reactions?.length ?? 0;
    const reacted = !!item.reactions?.some((r) => r.userId === user?.id);
    const mine = item.author?.id === user?.id;
    return (
      <View style={[styles.card, { backgroundColor: bgCard, borderColor }]}>
        <View style={styles.cardHead}>
          {item.isPinned ? <MaterialCommunityIcons name="pin" size={14} color={preset.primary} /> : null}
          <StatusBadge label={meta.label} tone={meta.tone} />
          <View style={styles.flex} />
          <Text style={[styles.date, { color: textMuted }]}>{fmtDate(item.createdAt)}</Text>
        </View>
        {item.title ? <Text style={[styles.title, { color: textPrimary }]}>{item.title}</Text> : null}
        <Text style={[styles.content, { color: textSecondary }]}>{item.content}</Text>
        <View style={styles.actions}>
          <Pressable style={styles.likeBtn} onPress={() => reactMut.mutate(item.id)}>
            <MaterialCommunityIcons name={reacted ? 'thumb-up' : 'thumb-up-outline'} size={18} color={reacted ? preset.primary : textMuted} />
            <Text style={[styles.likeCount, { color: reacted ? preset.primary : textMuted }]}>{count > 0 ? count : ''} {item.author?.name ?? ''}</Text>
          </Pressable>
          {mine ? (
            <Button compact mode="text" textColor="#EF4444"
              onPress={() => confirmDelete({ title: 'Xóa bài đăng', message: 'Bạn có chắc muốn xóa bài này?', onConfirm: () => removeMut.mutate(item.id) })}>
              Xóa
            </Button>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.wrap, { backgroundColor: bgPage }]}>
      {isLoading ? (
        <View style={styles.center}><ActivityIndicator /></View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(it) => it.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<EmptyState icon="bullhorn-outline" title="Chưa có bài đăng" description="Bảng tin nội bộ sẽ hiển thị ở đây." />}
        />
      )}

      <FAB icon="plus" style={[styles.fab, { backgroundColor: preset.primary }]} color="#fff" onPress={() => setOpen(true)} />

      <CenteredModal
        visible={open}
        onDismiss={() => setOpen(false)}
        title="Đăng bài"
        footer={
          <>
            <Button onPress={() => setOpen(false)}>Hủy</Button>
            <Button mode="contained" loading={createMut.isPending} disabled={!content.trim() || createMut.isPending} onPress={() => createMut.mutate()}>Đăng</Button>
          </>
        }
      >
        <SegmentedButtons
          value={type}
          onValueChange={(v) => setType(v as FeedPostType)}
          buttons={[
            { value: 'ANNOUNCEMENT', label: 'Thông báo' },
            { value: 'KUDOS', label: 'Khen thưởng' },
          ]}
          style={styles.seg}
        />
        <PaperInput mode="outlined" label="Tiêu đề (tùy chọn)" value={title} onChangeText={setTitle} style={styles.input} />
        <PaperInput mode="outlined" label="Nội dung" value={content} onChangeText={setContent} multiline numberOfLines={4} style={styles.input} />
      </CenteredModal>

      <Snackbar visible={!!snack} onDismiss={() => setSnack('')} duration={2500}>{snack}</Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, paddingBottom: 90, gap: 10 },
  card: { borderRadius: 12, borderWidth: 1, padding: 14 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  flex: { flex: 1 },
  date: { fontSize: 12 },
  title: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  content: { fontSize: 14, lineHeight: 20 },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  likeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  likeCount: { fontSize: 13, fontWeight: '500' },
  fab: { position: 'absolute', right: 16, bottom: 24, borderRadius: 28 },
  seg: { marginBottom: 12 },
  input: { marginBottom: 12, backgroundColor: 'transparent' },
});
