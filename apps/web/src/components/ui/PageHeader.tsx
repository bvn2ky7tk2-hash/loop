import type { ReactNode, CSSProperties } from 'react';
import { Typography } from 'antd';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import { useThemePalette } from '../../hooks/useThemePalette';
import { useAuthStore } from '../../store/auth.store';

dayjs.locale('vi');

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
  /** Hiện lời chào "Xin chào, {tên} 👋" và ngày — dùng cho trang dashboard */
  greeting?: boolean;
  style?: CSSProperties;
}

/**
 * Header chuẩn cho mọi trang — title + icon bên trái, actions bên phải.
 * Thêm prop `greeting` cho trang dashboard để hiện lời chào + ngày.
 */
export function PageHeader({ title, icon, iconColor, actions, subtitle, greeting, style }: PageHeaderProps) {
  const { textPrimary, linkColor } = useThemePalette();
  const { user } = useAuthStore();

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: greeting ? 'flex-start' : 'center',
        marginBottom: 20,
        ...style,
      }}
    >
      <div style={{ display: 'flex', alignItems: greeting ? 'flex-start' : 'center', gap: 10 }}>
        {icon && (
          <span style={{
            fontSize: greeting ? 28 : 22,
            color: iconColor ?? linkColor,
            lineHeight: 1,
            display: 'flex',
            marginTop: greeting ? 2 : 0,
          }}>
            {icon}
          </span>
        )}
        <div>
          <Title level={4} style={{ margin: 0, color: textPrimary }}>
            {title}
          </Title>
          {greeting && (
            <>
              <div style={{ fontSize: 15, fontWeight: 600, color: textPrimary, marginTop: 4 }}>
                Xin chào, {user?.name ?? 'bạn'} 👋
              </div>
              <div style={{ fontSize: 13, color: iconColor ?? (linkColor as string), fontWeight: 500, marginTop: 1 }}>
                {dayjs().format('dddd, DD MMMM YYYY')}
              </div>
            </>
          )}
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
