import type { ReactNode, CSSProperties } from 'react';
import { Typography } from 'antd';
import { useThemePalette } from '../../hooks/useThemePalette';

const { Title } = Typography;

interface PageHeaderProps {
  /** Tiêu đề trang */
  title: string;
  /** Icon bên trái tiêu đề */
  icon?: ReactNode;
  /** Màu icon — nếu không truyền dùng linkColor */
  iconColor?: string;
  /** Nút hành động bên phải (Button, Space, ...) */
  actions?: ReactNode;
  /** Nội dung phụ bên dưới tiêu đề (badge đếm, sub-title, ...) */
  subtitle?: ReactNode;
  style?: CSSProperties;
}

/**
 * Header chuẩn cho mọi trang — title + icon bên trái, actions bên phải.
 *
 * @example
 * <PageHeader
 *   title="Tài sản"
 *   icon={<LaptopOutlined />}
 *   iconColor="#F97316"
 *   actions={<Button type="primary" icon={<PlusOutlined />}>Thêm</Button>}
 * />
 */
export function PageHeader({ title, icon, iconColor, actions, subtitle, style }: PageHeaderProps) {
  const { textPrimary, linkColor } = useThemePalette();

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        ...style,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {icon && (
          <span style={{ fontSize: 22, color: iconColor ?? linkColor, lineHeight: 1, display: 'flex' }}>
            {icon}
          </span>
        )}
        <div>
          <Title level={4} style={{ margin: 0, color: textPrimary }}>
            {title}
          </Title>
          {subtitle && (
            <div style={{ marginTop: 2 }}>{subtitle}</div>
          )}
        </div>
      </div>

      {actions && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {actions}
        </div>
      )}
    </div>
  );
}
