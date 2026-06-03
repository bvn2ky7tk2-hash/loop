import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  color: string;            // màu sáng đủ tương phản text trắng (xem bảng CLAUDE.md #8)
  icon?: IconName;
}

/**
 * Mirror <StatCard> web: nền ĐẶC màu + gradient overlay, text trắng hoàn toàn — đẹp cả dark/light.
 * Bảng màu: Primary #6366F1, Done #10B981, Warning #F59E0B, Error #EF4444, Info #3B82F6,
 * OT #F97316, HR #8B5CF6, Neutral #94A3B8. CẤM màu tối (mất tương phản text trắng).
 */
export function StatCard({ label, value, subValue, color, icon }: StatCardProps) {
  return (
    <LinearGradient
      colors={['rgba(255,255,255,0.22)', 'rgba(0,0,0,0.12)']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.card, { backgroundColor: color }]}
    >
      <View style={styles.row}>
        <View style={styles.flex}>
          <Text style={styles.label} numberOfLines={1}>{label}</Text>
          <Text style={styles.value} numberOfLines={1}>{value}</Text>
          {subValue ? <Text style={styles.sub} numberOfLines={1}>{subValue}</Text> : null}
        </View>
        {icon ? <MaterialCommunityIcons name={icon} size={28} color="rgba(255,255,255,0.9)" /> : null}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, padding: 14, minHeight: 84, justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  flex: { flex: 1 },
  label: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '500', marginBottom: 2 },
  value: { color: '#FFFFFF', fontSize: 22, fontWeight: '700' },
  sub: { color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 2 },
});
