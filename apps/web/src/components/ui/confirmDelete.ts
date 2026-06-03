import { Modal } from 'antd';

interface ConfirmDeleteOptions {
  /** Tên item để hiển thị trong title, vd: "Nguyễn Văn A" */
  itemName?: string;
  /** Override toàn bộ title */
  title?: string;
  /** Mô tả thêm bên dưới title */
  content?: string;
  /** Nhãn nút xác nhận — mặc định "Xóa". Đổi cho hành động phá hủy khác (vd "Thu hồi", "Từ chối"). */
  okText?: string;
  /** Nhãn nút hủy — mặc định "Hủy". */
  cancelText?: string;
  /** Nút xác nhận hiển thị màu nguy hiểm (đỏ). Mặc định true. */
  danger?: boolean;
  /** Callback khi user xác nhận — có thể async */
  onConfirm: () => void | Promise<void>;
}

/**
 * Hộp thoại xác nhận cho hành động xóa / phá hủy chuẩn hệ thống.
 * Thay thế mọi `Modal.confirm({ okType: 'danger', ... })` inline.
 *
 * @example
 * // Xóa thông thường
 * confirmDelete({ itemName: asset.name, onConfirm: () => deleteMutation.mutateAsync(asset.id) });
 *
 * @example
 * // Hành động phá hủy khác
 * confirmDelete({ title: 'Thu hồi tài sản này?', okText: 'Thu hồi', onConfirm: () => recall(id) });
 */
export function confirmDelete({ itemName, title, content, okText = 'Xóa', cancelText = 'Hủy', danger = true, onConfirm }: ConfirmDeleteOptions) {
  Modal.confirm({
    title: title ?? `Xóa${itemName ? ` "${itemName}"` : ''}?`,
    content: content ?? 'Thao tác này không thể hoàn tác.',
    okText,
    okButtonProps: { danger },
    cancelText,
    onOk: onConfirm,
  });
}
