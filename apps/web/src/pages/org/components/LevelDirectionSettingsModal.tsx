import { Button, Modal, Checkbox } from 'antd';
import type { OrgUnitTree } from '../../../api/org-units';
import { getLevelHue } from '../orgChartHelpers';

interface LevelDirectionSettingsModalProps {
  open: boolean;
  onClose: () => void;
  flat: OrgUnitTree[];
  maxLevel: number;
  horizontalLevels: Set<number>;
  toggleLevel: (level: number) => void;
  isDark: boolean;
  textPrimary: string;
  textSecondary: string;
  bgContainer: string;
  borderColor: string;
}

export function LevelDirectionSettingsModal({
  open, onClose, flat, maxLevel, horizontalLevels, toggleLevel,
  isDark, textPrimary, textSecondary, bgContainer, borderColor,
}: LevelDirectionSettingsModalProps) {
  return (
    <Modal
      title="Cài đặt hướng hiển thị theo cấp"
      open={open}
      onCancel={onClose}
      footer={<Button type="primary" onClick={onClose}>Đóng</Button>}
      styles={{
        body: { background: bgContainer },
        header: { background: bgContainer, borderBottom: `1px solid ${borderColor}` },
      }}
    >
      <div style={{ padding: '12px 0' }}>
        <p style={{ margin: '0 0 16px', fontSize: 13, color: textSecondary }}>
          Chọn cấp nào hiển thị <b>ngang</b> (con xếp cạnh nhau). Cấp 3 trở đi luôn hiển thị <b>dọc</b>.
        </p>
        {[0, 1, 2].map((lvl) => {
          const hue = getLevelHue(lvl);
          const count = flat.filter((n) => n.level === lvl).length;
          return (
            <div
              key={lvl}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', borderRadius: 8, marginBottom: 8,
                background: isDark ? '#253348' : '#F8FAFC',
                border: `1px solid ${borderColor}`,
                cursor: 'pointer',
              }}
              onClick={() => toggleLevel(lvl)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: hue, flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: textPrimary }}>Cấp {lvl}</span>
                {count > 0 && (
                  <span style={{ fontSize: 12, color: textSecondary }}>({count} đơn vị)</span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: textSecondary }}>
                  {horizontalLevels.has(lvl) ? '⟷ Ngang' : '↕ Dọc'}
                </span>
                <Checkbox checked={horizontalLevels.has(lvl)} onChange={() => toggleLevel(lvl)} />
              </div>
            </div>
          );
        })}
        {maxLevel > 2 && (
          <div style={{
            padding: '8px 14px', borderRadius: 8,
            background: isDark ? bgContainer : '#F1F5F9',
            border: `1px dashed ${borderColor}`,
            fontSize: 12, color: textSecondary, fontStyle: 'italic',
          }}>
            Cấp 3 trở đi ({flat.filter((n) => (n.level ?? 0) > 2).length} đơn vị) — luôn hiển thị dọc
          </div>
        )}
      </div>
    </Modal>
  );
}
