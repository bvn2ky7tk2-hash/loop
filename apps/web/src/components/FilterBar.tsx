import { theme } from 'antd';
import type { ReactNode } from 'react';

interface FilterBarProps {
  children: ReactNode;
  right?: ReactNode;
}

export function FilterBar({ children, right }: FilterBarProps) {
  const { token } = theme.useToken();

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
        padding: '10px 12px',
        marginBottom: 16,
        background: token.colorFillQuaternary,
        borderRadius: token.borderRadius,
        border: `1px solid ${token.colorBorderSecondary}`,
      }}
    >
      {children}
      {right && <div style={{ marginLeft: 'auto' }}>{right}</div>}
    </div>
  );
}
