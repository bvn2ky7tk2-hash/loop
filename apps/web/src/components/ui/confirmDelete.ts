import { Modal } from 'antd';

interface ConfirmDeleteOptions {
  /** Tên item để hiển thị trong title, vd: "Nguyễn Văn A" */
  itemName?: string;
  /** Override toàn bộ title */
  title?: string;
  /** Mô tả thêm bên dưới title */
  content?: string;
  /** Callback khi user xác nhận — có thể async */
  onConfirm: () => void | Promise<void>;
}

/**
 * Hộp thoại xác nhận xóa chuẩn hệ thống.
 * Thay thế mọi `Modal.confirm({ okType: 'danger', ... })` inline.
 *
 * @example
 * confirmDelete({
 *   itemName: asset.name,
 *   onConfirm: () => deleteMutation.mutateAsync(asset.id),
 * });
 */
export function confirmDelete({ itemName, title, content, onConfirm }: ConfirmDeleteOptions) {
  Modal.confirm({
    title: title ?? `Xóa${itemName ? ` "${itemName}"` : ''}?`,
    content: content ?? 'Thao tác này không thể hoàn tác.',
    okText: 'Xóa',
    okButtonProps: { danger: true },
    cancelText: 'Hủy',
    onOk: onConfirm,
  });
}
