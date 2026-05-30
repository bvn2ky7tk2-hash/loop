import { theme } from 'antd';
import type { ReactNode } from 'react';
import { SavedFiltersDropdown } from './SavedFiltersDropdown';

interface FilterBarProps {
  children: ReactNode;
  right?: ReactNode;
  /** Khi có pageKey, tự động hiện nút "Bộ lọc đã lưu" */
  pageKey?: string;
  /** Bộ lọc hiện tại để lưu (bắt buộc nếu có pageKey) */
  currentFilters?: Record<string, unknown>;
  /** Callback khi user chọn preset từ dropdown */
  onApplyPreset?: (filters: Record<string, unknown>) => void;
}

export function FilterBar({ children, right, pageKey, currentFilters, onApplyPreset }: FilterBarProps) {
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
      {pageKey && currentFilters !== undefined && onApplyPreset && (
        <div style={{ marginLeft: right ? 0 : 'auto' }}>
          <SavedFiltersDropdown
            pageKey={pageKey}
            currentFilters={currentFilters}
            onApply={onApplyPreset}
          />
        </div>
      )}
    </div>
  );
}
