import { Modal, Spin } from 'antd';
import type { CSSProperties, ReactNode } from 'react';

interface CenteredModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  /** Chiều rộng modal (px). Mặc định 560. */
  width?: number | string;
  /**
   * Footer buttons.
   * - undefined (không truyền) → không có footer bar
   * - null → không có footer bar
   * - ReactNode → hiển thị trong footer
   */
  footer?: ReactNode | null;
  children?: ReactNode;
  /** Hiển thị Spin overlay thay vì children */
  loading?: boolean;
  /**
   * Nút hành động đặt cạnh title (top-right header area).
   * Được render trong title row, bên trái nút đóng.
   */
  extra?: ReactNode;
  /** Xóa nội dung khi đóng. Mặc định true (reset form). */
  destroyOnClose?: boolean;
  /** Click backdrop để đóng. Mặc định true. */
  maskClosable?: boolean;
  styles?: { body?: CSSProperties };
  style?: CSSProperties;
  zIndex?: number;
}

/**
 * Dialog hiển thị giữa màn hình, thay thế antd Drawer.
 *
 * Dùng top cố định thay vì centered (flexbox), tránh việc popup nhảy vị trí
 * khi content thay đổi chiều cao (switch tab, load data...).
 * Modal sẽ mở rộng xuống từ điểm đầu cố định và scroll bên trong nếu quá dài.
 */
export function CenteredModal({
  open,
  onClose,
  title,
  width = 560,
  footer,
  children,
  loading = false,
  extra,
  destroyOnClose = true,
  maskClosable = true,
  styles: stylesProp,
  style,
  zIndex,
}: CenteredModalProps) {
  const resolvedTitle = extra ? (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingRight: 8,
      }}
    >
      <span>{title}</span>
      <div
        style={{ display: 'flex', gap: 8, alignItems: 'center' }}
        onClick={(e) => e.stopPropagation()}
      >
        {extra}
      </div>
    </div>
  ) : title;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={resolvedTitle}
      width={width}
      footer={footer === undefined ? null : footer}
      destroyOnClose={destroyOnClose}
      maskClosable={maskClosable}
      // top cố định → không nhảy khi content thay đổi chiều cao
      style={{ top: '8vh', maxWidth: 'calc(100vw - 48px)', ...style }}
      styles={{
        body: {
          maxHeight: 'calc(84vh - 130px)',
          overflowY: 'auto',
          padding: '16px 24px',
          ...stylesProp?.body,
        },
        footer: {
          padding: '12px 24px',
        },
      }}
      zIndex={zIndex}
    >
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <Spin size="large" />
        </div>
      ) : (
        children
      )}
    </Modal>
  );
}
