import { useState } from 'react';
import {
  View, ScrollView, StyleSheet, Pressable,
} from 'react-native';
import {
  Text, useTheme, ActivityIndicator, Divider,
  Portal, Modal, TextInput, Button, Snackbar, Chip,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuthStore } from '../../src/store/auth';
import {
  useBug, useTransitionBug, useApproveBug, useBugComments, useAddBugComment,
  BUG_TRANSITIONS, CR_TRANSITIONS,
  STATUS_LABEL, STATUS_COLOR, SEVERITY_COLOR, SEVERITY_BG,
  type BugStatus,
} from '../../src/api/bugs';

// ── helpers ───────────────────────────────────────────────────────────────────

const fmt = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('vi-VN') : '—';

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

// ── Transition button row ─────────────────────────────────────────────────────

const TRANSITION_LABEL: Partial<Record<BugStatus, { label: string; color: string; icon: string }>> = {
  IN_PROGRESS:    { label: 'Bắt đầu xử lý', color: '#2563EB', icon: 'play-circle-outline' },
  PENDING:        { label: 'Chờ xử lý',     color: '#D97706', icon: 'pause-circle-outline' },
  PENDING_REVIEW: { label: 'Gửi duyệt CR',  color: '#EA580C', icon: 'send-outline' },
  RESOLVED:       { label: 'Đánh dấu xong', color: '#16A34A', icon: 'check-circle-outline' },
  CLOSED:         { label: 'Đóng',           color: '#374151', icon: 'lock-outline' },
  CANCELLED:      { label: 'Huỷ',            color: '#DC2626', icon: 'close-circle-outline' },
};

// ── Screen ────────────────────────────────────────────────────────────────────

export default function BugDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const { user } = useAuthStore();
  const isPM = user?.role === 'PM' || user?.role === 'ADMIN';

  const { data: bug, isLoading } = useBug(id);
  const { data: comments = [] } = useBugComments(id);
  const transitionMut = useTransitionBug();
  const approveMut   = useApproveBug();
  const addComment   = useAddBugComment(id);

  const [showApprove, setShowApprove] = useState(false);
  const [approveDecision, setApproveDecision] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [approveNote, setApproveNote] = useState('');
  const [commentText, setCommentText] = useState('');
  const [snack, setSnack] = useState('');

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!bug) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text>Không tìm thấy</Text>
      </View>
    );
  }

  const overdue =
    bug.dueDate &&
    !['RESOLVED', 'CLOSED', 'CANCELLED', 'REJECTED'].includes(bug.status) &&
    new Date(bug.dueDate) < new Date();

  const typeLabel = bug.itemType === 'BUG' ? '🐛 Bug' : bug.isCR ? '🔄 CR' : '📋 Issue';
  const typeColor = bug.itemType === 'BUG' ? '#DC2626' : bug.isCR ? '#7C3AED' : '#2563EB';

  const allowedTransitions = (bug.isCR ? CR_TRANSITIONS : BUG_TRANSITIONS)[bug.status] ?? [];

  const handleTransition = async (toStatus: BugStatus) => {
    try {
      await transitionMut.mutateAsync({ id, toStatus });
      setSnack(`Đã chuyển sang ${STATUS_LABEL[toStatus]}`);
    } catch {
      setSnack('Chuyển trạng thái thất bại');
    }
  };

  const handleApprove = async () => {
    if (approveDecision === 'REJECTED' && !approveNote.trim()) {
      setSnack('Vui lòng nhập lý do từ chối');
      return;
    }
    try {
      await approveMut.mutateAsync({ id, decision: approveDecision, note: approveNote.trim() || undefined });
      setSnack(approveDecision === 'APPROVED' ? '✓ Đã phê duyệt CR' : 'Đã từ chối CR');
      setShowApprove(false);
      setApproveNote('');
    } catch {
      setSnack('Thao tác thất bại');
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    try {
      await addComment.mutateAsync(commentText.trim());
      setCommentText('');
    } catch {
      setSnack('Gửi comment thất bại');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.surfaceVariant }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.onSurface} />
        </Pressable>
        <View style={[styles.typePill, { borderColor: typeColor }]}>
          <Text style={[styles.typePillText, { color: typeColor }]}>{typeLabel}</Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: STATUS_COLOR[bug.status] + '22' }]}>
          <View style={[styles.dot, { backgroundColor: STATUS_COLOR[bug.status] }]} />
          <Text style={[styles.statusPillText, { color: STATUS_COLOR[bug.status] }]}>
            {STATUS_LABEL[bug.status]}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Title + severity */}
        <View style={styles.section}>
          <View style={styles.titleRow}>
            <View style={[styles.sevBadge, { backgroundColor: SEVERITY_BG[bug.severity] }]}>
              <Text style={[styles.sevText, { color: SEVERITY_COLOR[bug.severity] }]}>{bug.severity}</Text>
            </View>
          </View>
          <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.onSurface }]}>
            {bug.title}
          </Text>
        </View>

        {/* Overdue banner */}
        {overdue && (
          <View style={styles.overdueBanner}>
            <MaterialCommunityIcons name="clock-alert-outline" size={16} color="#DC2626" />
            <Text style={styles.overdueText}>
              Quá hạn · Deadline: {fmt(bug.dueDate)}
            </Text>
          </View>
        )}

        {/* CR PENDING_REVIEW — PM approval block */}
        {isPM && bug.isCR && bug.status === 'PENDING_REVIEW' && (
          <View style={styles.crApprovalBlock}>
            <View style={styles.crApprovalHeader}>
              <MaterialCommunityIcons name="shield-check-outline" size={18} color="#EA580C" />
              <Text variant="titleSmall" style={styles.crApprovalTitle}>
                CR đang chờ phê duyệt
              </Text>
            </View>
            <Text variant="bodySmall" style={{ color: '#7C3AED', marginBottom: 12 }}>
              Với tư cách PM, bạn cần phê duyệt hoặc từ chối Change Request này.
            </Text>
            <View style={styles.crBtns}>
              <Button
                mode="contained"
                buttonColor="#16A34A"
                icon="check-circle-outline"
                onPress={() => { setApproveDecision('APPROVED'); setShowApprove(true); }}
                style={{ flex: 1 }}
                compact
              >
                Phê duyệt
              </Button>
              <Button
                mode="outlined"
                textColor="#DC2626"
                icon="close-circle-outline"
                onPress={() => { setApproveDecision('REJECTED'); setShowApprove(true); }}
                style={[{ flex: 1 }, styles.rejectBtn]}
                compact
              >
                Từ chối
              </Button>
            </View>
          </View>
        )}

        {/* Info grid */}
        <View style={[styles.infoCard, { backgroundColor: theme.colors.surface }]}>
          <InfoRow icon="briefcase-outline" label="Dự án" value={bug.project?.name} />
          <Divider style={styles.infoDiv} />
          <InfoRow icon="account-outline" label="Người báo cáo" value={bug.reporter?.name} />
          <Divider style={styles.infoDiv} />
          <InfoRow icon="account-wrench-outline" label="Người xử lý" value={bug.assignee?.name ?? 'Chưa gán'} />
          {bug.requesterName && (
            <>
              <Divider style={styles.infoDiv} />
              <InfoRow icon="account-tie-outline" label="Người yêu cầu" value={bug.requesterName} />
            </>
          )}
          {bug.dueDate && (
            <>
              <Divider style={styles.infoDiv} />
              <InfoRow
                icon="calendar-clock"
                label="Hạn xử lý"
                value={fmt(bug.dueDate)}
                valueStyle={overdue ? { color: '#DC2626', fontWeight: '700' } : undefined}
              />
            </>
          )}
          {bug.estimatedHours && (
            <>
              <Divider style={styles.infoDiv} />
              <InfoRow icon="clock-outline" label="Ước lượng" value={`${bug.estimatedHours} giờ`} />
            </>
          )}
          <Divider style={styles.infoDiv} />
          <InfoRow icon="calendar-plus" label="Tạo lúc" value={fmtTime(bug.createdAt)} />
        </View>

        {/* Approval result (CR approved/rejected) */}
        {bug.isCR && bug.approvalNote && bug.pmApprover && (
          <View style={[styles.approvalResult, { backgroundColor: bug.status === 'REJECTED' ? '#FEF2F2' : '#F0FDF4' }]}>
            <MaterialCommunityIcons
              name={bug.status === 'REJECTED' ? 'close-circle' : 'check-circle'}
              size={18}
              color={bug.status === 'REJECTED' ? '#DC2626' : '#16A34A'}
            />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text variant="labelMedium" style={{ color: bug.status === 'REJECTED' ? '#DC2626' : '#16A34A' }}>
                {bug.status === 'REJECTED' ? 'Bị từ chối bởi PM' : 'Đã được PM phê duyệt'} · {bug.pmApprover.name}
              </Text>
              <Text variant="bodySmall" style={{ color: '#374151', marginTop: 2 }}>{bug.approvalNote}</Text>
            </View>
          </View>
        )}

        {/* Tags */}
        {bug.tags && bug.tags.length > 0 && (
          <View style={styles.tagsRow}>
            {bug.tags.map((t) => (
              <Chip key={t.tag} compact style={styles.tagChip} textStyle={{ fontSize: 10 }}>
                {t.tag}
              </Chip>
            ))}
          </View>
        )}

        {/* Description */}
        {bug.description && (
          <View style={[styles.descCard, { backgroundColor: theme.colors.surface }]}>
            <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 6 }}>
              Mô tả
            </Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, lineHeight: 20 }}>
              {bug.description}
            </Text>
          </View>
        )}

        {/* Resolution note */}
        {bug.resolutionNote && (
          <View style={[styles.descCard, { backgroundColor: '#F0FDF4' }]}>
            <Text variant="labelMedium" style={{ color: '#166534', marginBottom: 6 }}>
              Ghi chú giải quyết
            </Text>
            <Text variant="bodyMedium" style={{ color: '#166534', lineHeight: 20 }}>
              {bug.resolutionNote}
            </Text>
          </View>
        )}

        {/* Status transitions */}
        {allowedTransitions.length > 0 && (
          <View style={styles.transSection}>
            <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 10 }}>
              Chuyển trạng thái
            </Text>
            <View style={styles.transBtns}>
              {allowedTransitions.map((s) => {
                const cfg = TRANSITION_LABEL[s];
                if (!cfg) return null;
                return (
                  <Button
                    key={s}
                    mode="outlined"
                    compact
                    icon={cfg.icon as any}
                    textColor={cfg.color}
                    style={[styles.transBtn, { borderColor: cfg.color + '66' }]}
                    onPress={() => handleTransition(s)}
                    loading={transitionMut.isPending}
                    disabled={transitionMut.isPending}
                  >
                    {cfg.label}
                  </Button>
                );
              })}
            </View>
          </View>
        )}

        {/* Comments */}
        <View style={styles.commentsSection}>
          <Text variant="labelLarge" style={{ color: theme.colors.onSurface, marginBottom: 12, fontWeight: '700' }}>
            Comments ({comments.length})
          </Text>

          {comments.map((c) => (
            <View key={c.id} style={[styles.commentCard, { backgroundColor: theme.colors.surface }]}>
              <View style={styles.commentHeader}>
                <View style={[styles.avatar, { backgroundColor: theme.colors.primaryContainer }]}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: theme.colors.onPrimaryContainer }}>
                    {c.author.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text variant="labelMedium" style={{ color: theme.colors.onSurface }}>{c.author.name}</Text>
                <View style={{ flex: 1 }} />
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, fontSize: 10 }}>
                  {fmtTime(c.createdAt)}
                </Text>
              </View>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, marginLeft: 32, lineHeight: 20 }}>
                {c.content}
              </Text>
            </View>
          ))}

          {/* Add comment */}
          <View style={[styles.commentInput, { backgroundColor: theme.colors.surface }]}>
            <TextInput
              mode="flat"
              value={commentText}
              onChangeText={setCommentText}
              placeholder="Viết comment..."
              style={{ flex: 1, backgroundColor: 'transparent', fontSize: 14 }}
              dense
              multiline
            />
            <Pressable
              onPress={handleAddComment}
              disabled={!commentText.trim() || addComment.isPending}
              style={[styles.sendBtn, { backgroundColor: theme.colors.primary, opacity: commentText.trim() ? 1 : 0.4 }]}
            >
              <MaterialCommunityIcons name="send" size={16} color="#fff" />
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* Approve / Reject Modal */}
      <Portal>
        <Modal
          visible={showApprove}
          onDismiss={() => setShowApprove(false)}
          contentContainerStyle={[styles.approveModal, { backgroundColor: theme.colors.surface }]}
        >
          <View style={styles.approveHeader}>
            <MaterialCommunityIcons
              name={approveDecision === 'APPROVED' ? 'shield-check-outline' : 'shield-off-outline'}
              size={24}
              color={approveDecision === 'APPROVED' ? '#16A34A' : '#DC2626'}
            />
            <Text variant="titleMedium" style={{ fontWeight: '700', marginLeft: 8 }}>
              {approveDecision === 'APPROVED' ? 'Phê duyệt CR' : 'Từ chối CR'}
            </Text>
          </View>

          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16 }}>
            CR: <Text style={{ fontWeight: '600' }}>{bug.title}</Text>
          </Text>

          <TextInput
            mode="outlined"
            label={approveDecision === 'REJECTED' ? 'Lý do từ chối *' : 'Ghi chú (tuỳ chọn)'}
            value={approveNote}
            onChangeText={setApproveNote}
            multiline
            numberOfLines={3}
            style={{ marginBottom: 16 }}
          />

          <View style={styles.modalActions}>
            <Button mode="outlined" onPress={() => setShowApprove(false)} style={{ flex: 1 }}>
              Huỷ
            </Button>
            <Button
              mode="contained"
              buttonColor={approveDecision === 'APPROVED' ? '#16A34A' : '#DC2626'}
              onPress={handleApprove}
              style={{ flex: 1 }}
              loading={approveMut.isPending}
              disabled={approveMut.isPending}
            >
              {approveDecision === 'APPROVED' ? 'Phê duyệt' : 'Từ chối'}
            </Button>
          </View>
        </Modal>
      </Portal>

      <Snackbar visible={!!snack} onDismiss={() => setSnack('')} duration={2500}>{snack}</Snackbar>
    </View>
  );
}

// ── InfoRow component ─────────────────────────────────────────────────────────

function InfoRow({ icon, label, value, valueStyle }: {
  icon: string; label: string; value?: string | null; valueStyle?: any;
}) {
  const theme = useTheme();
  return (
    <View style={styles.infoRow}>
      <MaterialCommunityIcons name={icon as any} size={15} color={theme.colors.onSurfaceVariant} />
      <Text variant="bodySmall" style={[styles.infoLabel, { color: theme.colors.onSurfaceVariant }]}>
        {label}
      </Text>
      <Text variant="bodySmall" style={[styles.infoValue, { color: theme.colors.onSurface }, valueStyle]} numberOfLines={1}>
        {value ?? '—'}
      </Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4, marginRight: 4 },
  typePill: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  typePillText: { fontSize: 12, fontWeight: '700' },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4,
  },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
  statusPillText: { fontSize: 12, fontWeight: '600' },
  scroll: { padding: 16, paddingBottom: 60 },
  section: { marginBottom: 14 },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  sevBadge: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  sevText: { fontSize: 11, fontWeight: '700' },
  title: { fontWeight: '700', lineHeight: 28 },
  overdueBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEF2F2', padding: 10, borderRadius: 8, marginBottom: 12,
  },
  overdueText: { color: '#DC2626', fontSize: 13, fontWeight: '700', flex: 1 },
  crApprovalBlock: {
    backgroundColor: '#FFF7ED', borderRadius: 10, padding: 14, marginBottom: 12,
    borderLeftWidth: 3, borderLeftColor: '#EA580C',
  },
  crApprovalHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  crApprovalTitle: { fontWeight: '700', color: '#EA580C' },
  crBtns: { flexDirection: 'row', gap: 10 },
  rejectBtn: { borderColor: '#DC2626' },
  infoCard: { borderRadius: 12, padding: 14, marginBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, gap: 8 },
  infoLabel: { width: 100, fontSize: 12 },
  infoValue: { flex: 1, fontWeight: '500', fontSize: 13, textAlign: 'right' },
  infoDiv: { marginVertical: 1 },
  approvalResult: {
    flexDirection: 'row', alignItems: 'flex-start',
    borderRadius: 10, padding: 12, marginBottom: 12,
  },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  tagChip: { height: 24 },
  descCard: { borderRadius: 12, padding: 14, marginBottom: 12 },
  transSection: { marginBottom: 12 },
  transBtns: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  transBtn: { borderRadius: 8 },
  commentsSection: { marginTop: 4 },
  commentCard: { borderRadius: 10, padding: 12, marginBottom: 8 },
  commentHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  avatar: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  commentInput: {
    flexDirection: 'row', alignItems: 'flex-end', borderRadius: 12,
    paddingLeft: 12, paddingRight: 8, paddingVertical: 6, gap: 8, marginTop: 8,
  },
  sendBtn: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  approveModal: { margin: 16, padding: 20, borderRadius: 16 },
  approveHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  modalActions: { flexDirection: 'row', gap: 12 },
});
