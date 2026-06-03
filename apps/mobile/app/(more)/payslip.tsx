import { useState } from 'react';
import { ScrollView, View, StyleSheet, Pressable, Alert, Linking } from 'react-native';
import { Text, ActivityIndicator, Button } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { formatCurrency } from '@loop/shared';
import { useThemePalette } from '../../src/hooks/useThemePalette';
import { StatCard } from '../../src/components/ui/StatCard';
import { SectionCard } from '../../src/components/ui/SectionCard';
import { DetailRow, DetailGrid } from '../../src/components/ui/DetailRow';
import { CenteredModal } from '../../src/components/ui/CenteredModal';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { payrollApi, type PayrollRecord } from '../../src/api/payroll';

const n = (v: number | string) => Number(v ?? 0);
const money = (v: number | string) => formatCurrency(n(v));

export default function PayslipScreen() {
  const { bgPage, bgCard, borderColor, textPrimary, textMuted, linkColor } = useThemePalette();
  const [selected, setSelected] = useState<PayrollRecord | null>(null);
  const [downloading, setDownloading] = useState(false);

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['my-payroll-records'],
    queryFn: payrollApi.myRecords,
  });

  const latest = records[0];

  const openPdf = async (rec: PayrollRecord) => {
    setDownloading(true);
    try {
      const { url, pending } = await payrollApi.payslipUrl(rec.id);
      if (pending || !url) {
        Alert.alert('Phiếu lương đang tạo', 'Phiếu lương PDF đang được tạo. Vui lòng thử lại sau ít phút.');
        return;
      }
      await Linking.openURL(url);
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message ?? 'Không tải được phiếu lương.');
    } finally {
      setDownloading(false);
    }
  };

  if (isLoading) {
    return <View style={[styles.center, { backgroundColor: bgPage }]}><ActivityIndicator /></View>;
  }

  return (
    <ScrollView style={{ backgroundColor: bgPage }} contentContainerStyle={styles.content}>
      {latest ? (
        <View style={styles.statRow}>
          <View style={styles.flex}>
            <StatCard label="Thực nhận kỳ gần nhất" value={money(latest.netSalary)} subValue={latest.periodName} color="#10B981" icon="cash-multiple" />
          </View>
        </View>
      ) : null}

      {records.length === 0 ? (
        <EmptyState icon="file-document-outline" title="Chưa có phiếu lương" description="Phiếu lương của bạn sẽ hiển thị ở đây khi kỳ lương được chốt." />
      ) : (
        records.map((rec) => (
          <Pressable key={rec.id} onPress={() => setSelected(rec)} style={[styles.card, { backgroundColor: bgCard, borderColor }]}>
            <View style={styles.cardRow}>
              <View style={styles.flex}>
                <Text style={[styles.period, { color: textPrimary }]}>{rec.periodName}</Text>
                <Text style={[styles.sub, { color: textMuted }]}>Công: {n(rec.workDays)} · OT: {n(rec.overtimeHours)}h</Text>
              </View>
              <View style={styles.right}>
                <Text style={[styles.net, { color: linkColor }]}>{money(rec.netSalary)}</Text>
                <MaterialCommunityIcons name="chevron-right" size={20} color={textMuted} />
              </View>
            </View>
          </Pressable>
        ))
      )}

      <CenteredModal
        visible={!!selected}
        onDismiss={() => setSelected(null)}
        title={selected?.periodName ?? 'Phiếu lương'}
        footer={
          <Button mode="contained" icon="download" loading={downloading} disabled={downloading} onPress={() => selected && openPdf(selected)}>
            Tải PDF
          </Button>
        }
      >
        {selected ? (
          <SectionCard noPadding style={{ borderWidth: 0 }}>
            <DetailGrid>
              <DetailRow label="Lương cơ bản" value={money(selected.baseSalary)} />
              <DetailRow label="Lương gross" value={money(selected.grossSalary)} />
              <DetailRow label="Phụ cấp" value={money(selected.allowances)} />
              <DetailRow label="Thưởng" value={money(selected.bonus)} />
              <DetailRow label="Lương tăng ca" value={money(selected.overtimePay)} />
              <DetailRow label="BHXH (NLĐ)" value={money(selected.bhxhEmployee)} />
              <DetailRow label="BHYT (NLĐ)" value={money(selected.bhytEmployee)} />
              <DetailRow label="BHTN (NLĐ)" value={money(selected.bhtnEmployee)} />
              <DetailRow label="Thuế TNCN" value={money(selected.pitAmount)} />
              <DetailRow label="Khấu trừ khác" value={money(selected.deductions)} />
              <DetailRow
                label="Thực nhận"
                value={<Text style={{ color: linkColor, fontWeight: '700', fontSize: 15 }}>{money(selected.netSalary)}</Text>}
              />
            </DetailGrid>
          </SectionCard>
        ) : null}
      </CenteredModal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 40 },
  statRow: { flexDirection: 'row', marginBottom: 16 },
  flex: { flex: 1 },
  card: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 10 },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  period: { fontSize: 15, fontWeight: '600' },
  sub: { fontSize: 12, marginTop: 2 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  net: { fontSize: 15, fontWeight: '700' },
});
