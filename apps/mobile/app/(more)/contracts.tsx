import { useState } from 'react';
import { View, StyleSheet, FlatList, Pressable } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { formatCurrency } from '@loop/shared';
import { useThemePalette } from '../../src/hooks/useThemePalette';
import { StatusBadge, type Tone } from '../../src/components/ui/StatusBadge';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { CenteredModal } from '../../src/components/ui/CenteredModal';
import { SectionCard } from '../../src/components/ui/SectionCard';
import { DetailRow, DetailGrid } from '../../src/components/ui/DetailRow';
import { contractsApi, type Contract, type ContractType, type ContractStatus } from '../../src/api/contracts';

const TYPE_LABEL: Record<ContractType, string> = {
  PROBATION: 'Thử việc', FIXED_12: 'Xác định 12 tháng', FIXED_24: 'Xác định 24 tháng',
  FIXED_36: 'Xác định 36 tháng', INDEFINITE: 'Không xác định thời hạn', PART_TIME: 'Bán thời gian', SEASONAL: 'Thời vụ',
};
const STATUS_LABEL: Record<ContractStatus, string> = { DRAFT: 'Nháp', ACTIVE: 'Hiệu lực', EXPIRED: 'Hết hạn', TERMINATED: 'Chấm dứt' };
const STATUS_TONE: Record<ContractStatus, Tone> = { DRAFT: 'neutral', ACTIVE: 'success', EXPIRED: 'warning', TERMINATED: 'error' };
const pad = (n: number) => String(n).padStart(2, '0');
const fmtDate = (iso?: string | null) => { if (!iso) return '—'; const d = new Date(iso); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`; };
const money = (v?: number | string | null) => (v == null ? '—' : formatCurrency(Number(v)));

export default function ContractsScreen() {
  const { bgPage, bgCard, borderColor, textPrimary, textMuted, linkColor } = useThemePalette();
  const [selected, setSelected] = useState<Contract | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ['my-contracts'], queryFn: contractsApi.mine });
  const items = data?.data ?? [];

  const renderItem = ({ item }: { item: Contract }) => (
    <Pressable onPress={() => setSelected(item)} style={[styles.card, { backgroundColor: bgCard, borderColor }]}>
      <View style={styles.cardRow}>
        <View style={styles.flex}>
          <Text style={[styles.type, { color: textPrimary }]}>{TYPE_LABEL[item.type]}</Text>
          <Text style={[styles.sub, { color: textMuted }]}>{fmtDate(item.startDate)} → {item.endDate ? fmtDate(item.endDate) : 'Vô thời hạn'}</Text>
          <Text style={[styles.salary, { color: linkColor }]}>{money(item.salaryMonthly)}/tháng</Text>
        </View>
        <View style={styles.right}>
          <StatusBadge label={STATUS_LABEL[item.status]} tone={STATUS_TONE[item.status]} />
          <MaterialCommunityIcons name="chevron-right" size={20} color={textMuted} />
        </View>
      </View>
    </Pressable>
  );

  if (isLoading) return <View style={[styles.center, { backgroundColor: bgPage }]}><ActivityIndicator /></View>;

  return (
    <View style={[styles.wrap, { backgroundColor: bgPage }]}>
      <FlatList
        data={items}
        keyExtractor={(it) => it.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyState icon="file-sign" title="Chưa có hợp đồng" description="Hợp đồng lao động của bạn sẽ hiển thị ở đây." />}
      />

      <CenteredModal visible={!!selected} onDismiss={() => setSelected(null)} title="Chi tiết hợp đồng">
        {selected ? (
          <SectionCard noPadding style={{ borderWidth: 0 }}>
            <DetailGrid>
              <DetailRow label="Loại hợp đồng" value={TYPE_LABEL[selected.type]} />
              <DetailRow label="Trạng thái" value={<StatusBadge label={STATUS_LABEL[selected.status]} tone={STATUS_TONE[selected.status]} />} />
              <DetailRow label="Ngày bắt đầu" value={fmtDate(selected.startDate)} />
              <DetailRow label="Ngày kết thúc" value={selected.endDate ? fmtDate(selected.endDate) : 'Vô thời hạn'} />
              <DetailRow label="Lương tháng" value={money(selected.salaryMonthly)} />
              <DetailRow label="Lương đóng BH" value={money(selected.insuranceSalary)} />
              <DetailRow label="Ngày ký" value={fmtDate(selected.signedAt)} />
              <DetailRow label="Số lần gia hạn" value={selected.renewalCount} />
              <DetailRow label="Ghi chú" value={selected.note ?? undefined} />
            </DetailGrid>
          </SectionCard>
        ) : null}
      </CenteredModal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, paddingBottom: 40 },
  card: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 10 },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  type: { fontSize: 15, fontWeight: '600' },
  sub: { fontSize: 12, marginTop: 2 },
  salary: { fontSize: 14, fontWeight: '700', marginTop: 4 },
  right: { alignItems: 'flex-end', gap: 6 },
});
