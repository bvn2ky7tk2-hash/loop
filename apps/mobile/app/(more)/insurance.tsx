import { ScrollView, View, StyleSheet } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency } from '@loop/shared';
import { useThemePalette } from '../../src/hooks/useThemePalette';
import { StatCard } from '../../src/components/ui/StatCard';
import { StatusBadge, type Tone } from '../../src/components/ui/StatusBadge';
import { SectionCard } from '../../src/components/ui/SectionCard';
import { DetailRow, DetailGrid } from '../../src/components/ui/DetailRow';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { insuranceApi, type InsuranceStatus, type InsuranceEvent } from '../../src/api/insurance';

const STATUS_LABEL: Record<InsuranceStatus, string> = { ACTIVE: 'Đang tham gia', SUSPENDED: 'Tạm dừng', TERMINATED: 'Đã dừng' };
const STATUS_TONE: Record<InsuranceStatus, Tone> = { ACTIVE: 'success', SUSPENDED: 'warning', TERMINATED: 'error' };
const pad = (n: number) => String(n).padStart(2, '0');
const fmtDate = (iso?: string | null) => { if (!iso) return '—'; const d = new Date(iso); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`; };
const money = (v?: number | string | null) => (v == null ? '—' : formatCurrency(Number(v)));

export default function InsuranceScreen() {
  const { bgPage, textPrimary, textMuted, borderColor } = useThemePalette();
  const { data, isLoading } = useQuery({ queryKey: ['my-insurance'], queryFn: insuranceApi.mine });

  if (isLoading) return <View style={[styles.center, { backgroundColor: bgPage }]}><ActivityIndicator /></View>;

  const enrollment = data?.enrollment;

  if (!enrollment) {
    return (
      <View style={[styles.wrap, { backgroundColor: bgPage }]}>
        <EmptyState icon="shield-account-outline" title="Chưa có thông tin BHXH" description="Hồ sơ bảo hiểm xã hội của bạn chưa được thiết lập." />
      </View>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: bgPage }} contentContainerStyle={styles.content}>
      <StatCard label="Mức lương đóng BHXH" value={money(enrollment.insuranceSalary)} color="#EF4444" icon="shield-account" />

      <View style={styles.gap}>
        <SectionCard title="Thông tin tham gia">
          <DetailGrid>
            <DetailRow label="Trạng thái" value={<StatusBadge label={STATUS_LABEL[enrollment.status]} tone={STATUS_TONE[enrollment.status]} />} />
            <DetailRow label="Số sổ BHXH" value={enrollment.bhxhBookNumber ?? enrollment.socialInsuranceBook?.bookNumber ?? undefined} />
            <DetailRow label="Ngày bắt đầu" value={fmtDate(enrollment.startDate)} />
            <DetailRow label="Ngày kết thúc" value={enrollment.endDate ? fmtDate(enrollment.endDate) : 'Đang tham gia'} />
            <DetailRow label="Lương đóng BH" value={money(enrollment.insuranceSalary)} />
          </DetailGrid>
        </SectionCard>

        {enrollment.events && enrollment.events.length > 0 ? (
          <SectionCard title="Lịch sử thay đổi">
            {enrollment.events.map((e: InsuranceEvent, idx) => (
              <View key={e.id} style={[styles.eventRow, idx > 0 && { borderTopWidth: 1, borderTopColor: borderColor }]}>
                <View style={styles.flex}>
                  <Text style={[styles.eventType, { color: textPrimary }]}>{e.eventType}</Text>
                  {e.reason ? <Text style={[styles.eventReason, { color: textMuted }]}>{e.reason}</Text> : null}
                </View>
                <View style={styles.eventRight}>
                  <Text style={[styles.eventDate, { color: textMuted }]}>{fmtDate(e.effectiveDate)}</Text>
                  {e.insuranceSalary != null ? <Text style={[styles.eventSalary, { color: textPrimary }]}>{money(e.insuranceSalary)}</Text> : null}
                </View>
              </View>
            ))}
          </SectionCard>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 40 },
  gap: { marginTop: 16, gap: 12 },
  eventRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10 },
  flex: { flex: 1 },
  eventType: { fontSize: 14, fontWeight: '600' },
  eventReason: { fontSize: 12, marginTop: 2 },
  eventRight: { alignItems: 'flex-end' },
  eventDate: { fontSize: 12 },
  eventSalary: { fontSize: 13, fontWeight: '600', marginTop: 2 },
});
