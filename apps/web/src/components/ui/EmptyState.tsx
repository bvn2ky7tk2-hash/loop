import type { ReactNode, CSSProperties } from 'react';
import { Empty } from 'antd';
import { useThemePalette } from '../../hooks/useThemePalette';

interface EmptyStateProps {
  /** Tiêu đề chính — mô tả ngắn gọn vì sao trống */
  title?: ReactNode;
  /** Dòng phụ gợi ý hành động tiếp theo */
  description?: ReactNode;
  /** Icon lớn phía trên (thay ảnh Empty mặc định) */
  icon?: ReactNode;
  /** Nút hành động (vd: "Thêm mới") đặt dưới mô tả */
  action?: ReactNode;
  /** Thu gọn padding khi nhúng trong card/section nhỏ */
  compact?: boolean;
  style?: CSSProperties;
}

/**
 * Màn hình trống chuẩn hệ thống — thay cho <Empty> tự dựng lặp lại.
 * Tự lấy màu từ useThemePalette, đọc được cả dark/light.
 *
 * @example
 * <EmptyState icon={<InboxOutlined />} title="Chưa có dữ liệu" description="Hãy thêm mục đầu tiên" action={<Button type="primary">Thêm</Button>} />
 */
export function EmptyState({ title = 'Chưa có dữ liệu', description, icon, action, compact, style }: EmptyStateProps) {
  const { textPrimary, textMuted, linkColor } = useThemePalette();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: compact ? '28px 16px' : '56px 24px',
        ...style,
      }}
    >
      {icon ? (
        <div style={{ fontSize: compact ? 40 : 56, color: linkColor, opacity: 0.8, lineHeight: 1, marginBottom: 16 }}>
          {icon}
        </div>
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={false} style={{ marginBottom: description ? 8 : 0 }} />
      )}
      <div style={{ fontSize: compact ? 14 : 15, fontWeight: 600, color: textPrimary }}>{title}</div>
      {description && (
        <div style={{ fontSize: 13, color: textMuted, marginTop: 6, maxWidth: 360 }}>{description}</div>
      )}
      {action && <div style={{ marginTop: 20 }}>{action}</div>}
    </div>
  );
}
