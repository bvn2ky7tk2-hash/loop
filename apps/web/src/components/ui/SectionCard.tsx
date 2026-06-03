import type { ReactNode, CSSProperties } from 'react';
import { useThemePalette } from '../../hooks/useThemePalette';

interface SectionCardProps {
  children: ReactNode;
  /** Tiêu đề khối (tùy chọn) */
  title?: ReactNode;
  /** Nội dung bên phải tiêu đề (nút, filter nhỏ...) */
  extra?: ReactNode;
  /** Dùng nền bgCard (lồng trong modal/section khác) thay vì bgContainer */
  nested?: boolean;
  /** Bỏ padding nội dung (vd: bọc Table tràn viền) */
  noPadding?: boolean;
  style?: CSSProperties;
  bodyStyle?: CSSProperties;
}

/**
 * Khối/section wrapper chuẩn — nền + viền + bo góc theo palette hệ thống.
 * Thay cho div inline `{ background: bgContainer, border, borderRadius, padding }` lặp khắp nơi.
 *
 * @example
 * <SectionCard title="Thông tin chung">...</SectionCard>
 * <SectionCard noPadding><Table ... /></SectionCard>
 */
export function SectionCard({ children, title, extra, nested, noPadding, style, bodyStyle }: SectionCardProps) {
  const { bgContainer, bgCard, borderColor, textPrimary } = useThemePalette();

  return (
    <div
      style={{
        background: nested ? bgCard : bgContainer,
        border: `1px solid ${borderColor}`,
        borderRadius: 12,
        overflow: 'hidden',
        ...style,
      }}
    >
      {(title || extra) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: '12px 16px',
            borderBottom: `1px solid ${borderColor}`,
          }}
        >
          {title && <span style={{ fontSize: 14, fontWeight: 600, color: textPrimary }}>{title}</span>}
          {extra && <div style={{ marginLeft: 'auto' }}>{extra}</div>}
        </div>
      )}
      <div style={{ padding: noPadding ? 0 : 16, ...bodyStyle }}>{children}</div>
    </div>
  );
}
