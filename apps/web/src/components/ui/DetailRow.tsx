import type { ReactNode, CSSProperties } from 'react';
import { useThemePalette } from '../../hooks/useThemePalette';

interface DetailRowProps {
  /** Nhãn trường (vd: "Người tạo") */
  label: ReactNode;
  /** Giá trị — nếu rỗng tự hiển thị dấu "—" màu mờ */
  value?: ReactNode;
  /** Đặt nhãn phía trên giá trị (thay vì cùng hàng) */
  vertical?: boolean;
  /** Bề rộng cột nhãn khi nằm cùng hàng */
  labelWidth?: number;
  style?: CSSProperties;
}

const isEmpty = (v: ReactNode) => v === undefined || v === null || v === '';

/**
 * Một dòng "nhãn: giá trị" trong popup chi tiết — màu theo palette, tự hiển thị "—" khi rỗng.
 *
 * @example
 * <DetailRow label="Người tạo" value={item.creatorName} />
 * <DetailRow label="Ghi chú" value={item.note} vertical />
 */
export function DetailRow({ label, value, vertical, labelWidth = 130, style }: DetailRowProps) {
  const { textPrimary, textMuted, textSecondary } = useThemePalette();
  const empty = isEmpty(value);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: vertical ? 'column' : 'row',
        gap: vertical ? 4 : 12,
        padding: '7px 0',
        ...style,
      }}
    >
      <span
        style={{
          fontSize: 13,
          color: textSecondary,
          flexShrink: 0,
          width: vertical ? undefined : labelWidth,
          fontWeight: 500,
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: 13, color: empty ? textMuted : textPrimary, flex: 1, minWidth: 0 }}>
        {empty ? '—' : value}
      </span>
    </div>
  );
}

interface DetailGridProps {
  children: ReactNode;
  style?: CSSProperties;
}

/**
 * Bọc nhiều <DetailRow> với đường kẻ phân cách mảnh giữa các dòng.
 */
export function DetailGrid({ children, style }: DetailGridProps) {
  const { borderColor } = useThemePalette();
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        // đường kẻ mảnh giữa các dòng con
        ['--detail-divider' as string]: borderColor,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
