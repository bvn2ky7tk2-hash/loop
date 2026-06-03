import { ScrollView, View, StyleSheet, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemePalette } from '../../src/hooks/useThemePalette';
import { PageHeader } from '../../src/components/ui/PageHeader';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface HubItem {
  key: string;
  label: string;
  icon: IconName;
  color: string;
  route?: string;       // có route = active; không có = "sắp có"
}

const ACTIVE: HubItem[] = [
  { key: 'payslip',  label: 'Phiếu lương', icon: 'file-document-outline', color: '#10B981', route: '/(more)/payslip' },
  { key: 'kb',       label: 'Kiến thức',   icon: 'book-open-variant',     color: '#3B82F6', route: '/(more)/kb' },
  { key: 'calendar', label: 'Lịch',        icon: 'calendar-month',        color: '#6366F1', route: '/(more)/calendar' },
  { key: 'overtime', label: 'Tăng ca',    icon: 'clock-alert-outline',    color: '#F97316', route: '/(more)/overtime' },
  { key: 'room',     label: 'Đặt phòng',  icon: 'door',                   color: '#8B5CF6', route: '/(more)/room-booking' },
  { key: 'vehicle',  label: 'Đặt xe',     icon: 'car',                    color: '#0EA5E9', route: '/(more)/vehicle-booking' },
  { key: 'feed',     label: 'Bảng tin',   icon: 'bullhorn-outline',       color: '#F59E0B', route: '/(more)/feed' },
  { key: 'contract', label: 'Hợp đồng',   icon: 'file-sign',              color: '#14B8A6', route: '/(more)/contracts' },
  { key: 'insurance',label: 'Bảo hiểm',   icon: 'shield-account-outline', color: '#EF4444', route: '/(more)/insurance' },
  { key: 'bugs',     label: 'Bug & Issue',icon: 'bug-outline',            color: '#DC2626', route: '/(tabs)/bugs' },
  { key: 'referral', label: 'Giới thiệu', icon: 'account-multiple-plus-outline', color: '#0EA5E9', route: '/(more)/referral' },
];

const COMING: HubItem[] = [];

function Tile({ item, muted, onPress }: { item: HubItem; muted?: boolean; onPress?: () => void }) {
  const { bgCard, borderColor, textPrimary, textMuted } = useThemePalette();
  return (
    <Pressable
      onPress={onPress}
      disabled={muted}
      style={[styles.tile, { backgroundColor: bgCard, borderColor, opacity: muted ? 0.55 : 1 }]}
    >
      <View style={[styles.iconWrap, { backgroundColor: `${item.color}22` }]}>
        <MaterialCommunityIcons name={item.icon} size={26} color={item.color} />
      </View>
      <Text style={[styles.label, { color: muted ? textMuted : textPrimary }]} numberOfLines={1}>{item.label}</Text>
      {muted ? <Text style={[styles.soon, { color: textMuted }]}>Sắp có</Text> : null}
    </Pressable>
  );
}

export default function MoreHubScreen() {
  const { bgPage, textMuted } = useThemePalette();
  return (
    <ScrollView style={{ backgroundColor: bgPage }} contentContainerStyle={styles.content}>
      <PageHeader title="Tiện ích" icon="view-grid-outline" />

      <View style={styles.grid}>
        {ACTIVE.map((it) => (
          <Tile key={it.key} item={it} onPress={() => router.push(it.route as any)} />
        ))}
      </View>

      {COMING.length > 0 ? (
        <>
          <Text style={[styles.section, { color: textMuted }]}>Sắp ra mắt</Text>
          <View style={styles.grid}>
            {COMING.map((it) => (
              <Tile key={it.key} item={it} muted />
            ))}
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

const GAP = 12;
const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 80 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  tile: { width: `${(100 - 6) / 3}%`, aspectRatio: 1, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center', padding: 8 },
  iconWrap: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  label: { fontSize: 12.5, fontWeight: '600', textAlign: 'center' },
  soon: { fontSize: 10, marginTop: 2 },
  section: { fontSize: 13, fontWeight: '600', marginTop: 20, marginBottom: 10 },
});
