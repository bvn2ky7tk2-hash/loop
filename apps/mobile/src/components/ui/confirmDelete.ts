import { Alert } from 'react-native';

interface ConfirmDeleteOptions {
  itemName?: string;
  title?: string;
  message?: string;
  onConfirm: () => void;
}

/**
 * Mirror confirmDelete() web — hộp thoại xác nhận xóa.
 * Trên mobile dùng Alert.alert native với nút "Xóa" kiểu destructive.
 */
export function confirmDelete({ itemName, title, message, onConfirm }: ConfirmDeleteOptions) {
  Alert.alert(
    title ?? 'Xác nhận xóa',
    message ?? `Bạn có chắc muốn xóa ${itemName ? `"${itemName}"` : 'mục này'}? Hành động không thể hoàn tác.`,
    [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: onConfirm },
    ],
  );
}
