import { Dropdown, Button, Checkbox, Tooltip, Divider, theme } from 'antd';
import { SettingOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ColDef } from '../hooks/useColumnVisibility';

interface ColumnToggleProps {
  columns: ColDef[];
  isVisible: (key: string) => boolean;
  toggle: (key: string) => void;
  reset: () => void;
}

export function ColumnToggle({ columns, isVisible, toggle, reset }: ColumnToggleProps) {
  const { token } = theme.useToken();

  return (
    <Dropdown
      trigger={['click']}
      dropdownRender={() => (
        <div
          style={{
            background: token.colorBgElevated,
            borderRadius: token.borderRadiusLG,
            boxShadow: token.boxShadowSecondary,
            border: `1px solid ${token.colorBorderSecondary}`,
            padding: '6px 0',
            minWidth: 170,
          }}
        >
          <div style={{
            padding: '4px 12px 6px',
            fontSize: 11, fontWeight: 700,
            color: token.colorTextTertiary,
            letterSpacing: 0.5, textTransform: 'uppercase',
          }}>
            Hiển thị cột
          </div>
          <Divider style={{ margin: '0 0 2px' }} />
          {columns.map((col) => (
            <div
              key={col.key}
              onClick={() => toggle(col.key)}
              style={{
                padding: '5px 12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 13,
                color: token.colorText,
                userSelect: 'none',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = token.colorFillTertiary)}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <Checkbox checked={isVisible(col.key)} />
              <span>{col.label}</span>
            </div>
          ))}
          <Divider style={{ margin: '2px 0 0' }} />
          <div style={{ padding: '4px 12px' }}>
            <Button
              size="small"
              type="text"
              icon={<ReloadOutlined />}
              onClick={(e) => { e.stopPropagation(); reset(); }}
              style={{ fontSize: 12, color: token.colorTextTertiary }}
            >
              Đặt lại mặc định
            </Button>
          </div>
        </div>
      )}
    >
      <Tooltip title="Ẩn / hiện cột" placement="topRight">
        <Button icon={<SettingOutlined />} />
      </Tooltip>
    </Dropdown>
  );
}
