import { useState } from 'react';
import { View, StyleSheet, FlatList, Pressable } from 'react-native';
import { Text, ActivityIndicator, FAB, Button, TextInput as PaperInput, Snackbar, RadioButton } from 'react-native-paper';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useThemePalette } from '../../src/hooks/useThemePalette';
import { StatusBadge, type Tone } from '../../src/components/ui/StatusBadge';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { CenteredModal } from '../../src/components/ui/CenteredModal';
import { referralApi, type MyReferral, type CandidateStage } from '../../src/api/referral';

const STAGE_LABEL: Record<CandidateStage, string> = {
  APPLIED: 'Đã nộp', SCREENING: 'Sàng lọc', INTERVIEW: 'Phỏng vấn', OFFER: 'Đề nghị', HIRED: 'Đã tuyển', REJECTED: 'Từ chối',
};
const STAGE_TONE: Record<CandidateStage, Tone> = {
  APPLIED: 'info', SCREENING: 'processing', INTERVIEW: 'warning', OFFER: 'warning', HIRED: 'success', REJECTED: 'error',
};
const pad = (n: number) => String(n).padStart(2, '0');
const fmtDate = (iso: string) => { const d = new Date(iso); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`; };

export default function ReferralScreen() {
  const qc = useQueryClient();
  const { bgPage, bgCard, borderColor, textPrimary, textMuted, preset } = useThemePalette();
  const [open, setOpen] = useState(false);
  const [snack, setSnack] = useState('');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [jobOpeningId, setJobOpeningId] = useState('');
  const [note, setNote] = useState('');

  const { data: openings = [] } = useQuery({ queryKey: ['refer-openings'], queryFn: referralApi.openings, enabled: open });
  const { data: referrals = [], isLoading } = useQuery({ queryKey: ['my-referrals'], queryFn: referralApi.myReferrals });

  const valid = name.trim() && jobOpeningId;

  const referMut = useMutation({
    mutationFn: () => referralApi.refer({
      name: name.trim(), email: email.trim() || undefined, phone: phone.trim() || undefined,
      jobOpeningId, note: note.trim() || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-referrals'] });
      setOpen(false); setName(''); setEmail(''); setPhone(''); setJobOpeningId(''); setNote('');
      setSnack('Đã gửi giới thiệu ứng viên');
    },
    onError: (e: any) => setSnack(e?.message ?? 'Giới thiệu thất bại'),
  });

  const renderItem = ({ item }: { item: MyReferral }) => (
    <View style={[styles.card, { backgroundColor: bgCard, borderColor }]}>
      <View style={styles.cardRow}>
        <View style={styles.flex}>
          <Text style={[styles.name, { color: textPrimary }]}>{item.name}</Text>
          {item.jobOpening ? <Text style={[styles.sub, { color: textMuted }]}>{item.jobOpening.title}</Text> : null}
          <Text style={[styles.sub, { color: textMuted }]}>Giới thiệu ngày {fmtDate(item.createdAt)}</Text>
        </View>
        <StatusBadge label={STAGE_LABEL[item.stage]} tone={STAGE_TONE[item.stage]} />
      </View>
    </View>
  );

  if (isLoading) return <View style={[styles.center, { backgroundColor: bgPage }]}><ActivityIndicator /></View>;

  return (
    <View style={[styles.wrap, { backgroundColor: bgPage }]}>
      <FlatList
        data={referrals}
        keyExtractor={(it) => it.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyState icon="account-multiple-plus-outline" title="Chưa giới thiệu ứng viên nào" description="Nhấn nút + để giới thiệu ứng viên cho công ty." />}
      />

      <FAB icon="plus" style={[styles.fab, { backgroundColor: preset.primary }]} color="#fff" onPress={() => setOpen(true)} />

      <CenteredModal
        visible={open}
        onDismiss={() => setOpen(false)}
        title="Giới thiệu ứng viên"
        footer={
          <>
            <Button onPress={() => setOpen(false)}>Hủy</Button>
            <Button mode="contained" loading={referMut.isPending} disabled={!valid || referMut.isPending} onPress={() => referMut.mutate()}>Gửi</Button>
          </>
        }
      >
        <PaperInput mode="outlined" label="Họ tên ứng viên" value={name} onChangeText={setName} style={styles.input} />
        <PaperInput mode="outlined" label="Email (tùy chọn)" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" style={styles.input} />
        <PaperInput mode="outlined" label="Số điện thoại (tùy chọn)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" style={styles.input} />
        <Text style={[styles.fieldLabel, { color: textMuted }]}>Vị trí ứng tuyển</Text>
        {openings.length === 0 ? (
          <Text style={[styles.sub, { color: textMuted, marginBottom: 12 }]}>Hiện không có vị trí nào đang tuyển.</Text>
        ) : (
          <RadioButton.Group onValueChange={setJobOpeningId} value={jobOpeningId}>
            {openings.map((o) => (
              <Pressable key={o.id} onPress={() => setJobOpeningId(o.id)} style={styles.optRow}>
                <RadioButton value={o.id} />
                <Text style={{ color: textPrimary, flex: 1 }}>{o.title}</Text>
              </Pressable>
            ))}
          </RadioButton.Group>
        )}
        <PaperInput mode="outlined" label="Ghi chú (tùy chọn)" value={note} onChangeText={setNote} multiline style={styles.input} />
      </CenteredModal>

      <Snackbar visible={!!snack} onDismiss={() => setSnack('')} duration={2500}>{snack}</Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, paddingBottom: 90 },
  card: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 10 },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  flex: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600' },
  sub: { fontSize: 12, marginTop: 2 },
  fab: { position: 'absolute', right: 16, bottom: 24, borderRadius: 28 },
  input: { marginBottom: 12, backgroundColor: 'transparent' },
  fieldLabel: { fontSize: 12, marginBottom: 4 },
  optRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
