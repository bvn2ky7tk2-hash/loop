import { Stack } from 'expo-router';
import { useThemePalette } from '../../src/hooks/useThemePalette';

// Stack cho các module phụ (hub "Thêm") — push chồng lên tabs, có header + nút back.
export default function MoreLayout() {
  const { bgContainer, textPrimary, borderColor } = useThemePalette();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: bgContainer },
        headerTintColor: textPrimary,
        headerTitleStyle: { fontWeight: '700' },
        headerShadowVisible: false,
        contentStyle: { borderTopWidth: 0, borderTopColor: borderColor },
      }}
    >
      <Stack.Screen name="payslip" options={{ title: 'Phiếu lương' }} />
      <Stack.Screen name="kb/index" options={{ title: 'Kiến thức' }} />
      <Stack.Screen name="kb/[id]" options={{ title: 'Bài viết' }} />
      <Stack.Screen name="calendar" options={{ title: 'Lịch' }} />
      <Stack.Screen name="overtime" options={{ title: 'Tăng ca' }} />
      <Stack.Screen name="room-booking" options={{ title: 'Đặt phòng họp' }} />
      <Stack.Screen name="vehicle-booking" options={{ title: 'Đặt xe' }} />
      <Stack.Screen name="feed" options={{ title: 'Bảng tin' }} />
      <Stack.Screen name="contracts" options={{ title: 'Hợp đồng' }} />
      <Stack.Screen name="insurance" options={{ title: 'Bảo hiểm' }} />
      <Stack.Screen name="referral" options={{ title: 'Giới thiệu ứng viên' }} />
    </Stack>
  );
}
