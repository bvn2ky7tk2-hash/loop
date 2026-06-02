import { useState } from 'react';
import { Button, Dropdown, Input, Space, Popconfirm, App, Typography } from 'antd';
import {
  BookOutlined, PlusOutlined, DeleteOutlined, CaretDownOutlined,
} from '@ant-design/icons';
import { useSavedFilters, useCreateSavedFilter, useDeleteSavedFilter } from '../hooks/useSavedFilters';
import { useThemePalette } from '../hooks/useThemePalette';

const { Text } = Typography;

interface SavedFiltersDropdownProps {
  /** Khóa trang (ví dụ: 'tasks-list', 'leaves-list') */
  pageKey: string;
  /** Bộ lọc hiện tại để lưu */
  currentFilters: Record<string, unknown>;
  /** Callback khi user chọn preset */
  onApply: (filters: Record<string, unknown>) => void;
}

export function SavedFiltersDropdown({ pageKey, currentFilters, onApply }: SavedFiltersDropdownProps) {
  const { message } = App.useApp();
  const { textPrimary, textMuted, bgCard, borderColor } = useThemePalette();
  const [saveName, setSaveName]   = useState('');
  const [showInput, setShowInput] = useState(false);

  const { data: presets = [] } = useSavedFilters(pageKey);
  const createMut  = useCreateSavedFilter(pageKey);
  const deleteMut  = useDeleteSavedFilter(pageKey);

  const handleSave = async () => {
    const name = saveName.trim();
    if (!name) return;
    try {
      await createMut.mutateAsync({ pageKey, name, filters: currentFilters });
      setSaveName('');
      setShowInput(false);
      message.success('Đã lưu bộ lọc');
    } catch {
      message.error('Lưu thất bại');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMut.mutateAsync(id);
      message.success('Đã xóa');
    } catch {
      message.error('Xóa thất bại');
    }
  };

  const dropdownContent = (
    <div
      style={{
        background: bgCard,
        border: `1px solid ${borderColor}`,
        borderRadius: 8,
        padding: 8,
        minWidth: 220,
        maxWidth: 280,
      }}
    >
      {/* Danh sách presets */}
      {presets.length === 0 && (
        <Text style={{ color: textMuted, fontSize: 12, padding: '4px 8px', display: 'block' }}>
          Chưa có bộ lọc nào
        </Text>
      )}
      {presets.map((p) => (
        <div
          key={p.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '4px 8px',
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          <span
            onClick={() => onApply(p.filters)}
            style={{
              flex: 1,
              color: textPrimary,
              fontSize: 13,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {p.name}
          </span>
          <Popconfirm
            title="Xóa bộ lọc này?"
            onConfirm={() => handleDelete(p.id)}
            okText="Xóa"
            cancelText="Huỷ"
          >
            <Button
              type="text"
              size="small"
              icon={<DeleteOutlined />}
              danger
              style={{ padding: '0 4px', height: 22 }}
              loading={deleteMut.isPending}
            />
          </Popconfirm>
        </div>
      ))}

      {/* Input lưu bộ lọc mới */}
      <div style={{ borderTop: `1px solid ${borderColor}`, marginTop: 6, paddingTop: 6 }}>
        {showInput ? (
          <Space.Compact style={{ width: '100%' }}>
            <Input
              autoFocus
              size="small"
              placeholder="Tên bộ lọc..."
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') { setShowInput(false); setSaveName(''); }
              }}
              maxLength={100}
            />
            <Button
              size="small"
              type="primary"
              onClick={handleSave}
              loading={createMut.isPending}
              disabled={!saveName.trim()}
            >
              Lưu
            </Button>
          </Space.Compact>
        ) : (
          <Button
            type="text"
            size="small"
            icon={<PlusOutlined />}
            onClick={() => setShowInput(true)}
            style={{ width: '100%', textAlign: 'left', color: textMuted, fontSize: 12 }}
          >
            Lưu bộ lọc hiện tại
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <Dropdown
      dropdownRender={() => dropdownContent}
      trigger={['click']}
      placement="bottomRight"
    >
      <Button
        size="small"
        icon={<BookOutlined />}
        style={{ fontSize: 12 }}
      >
        Bộ lọc đã lưu <CaretDownOutlined style={{ fontSize: 10 }} />
      </Button>
    </Dropdown>
  );
}
