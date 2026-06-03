import { useState, useMemo } from 'react';
import {
  Button, Space, Checkbox, Tooltip, Badge, Segmented,
} from 'antd';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { permissionsApi } from '../../../api/permissions';
import { useThemePalette } from '../../../hooks/useThemePalette';
import { buildScreens, type PermScreen } from '../helpers';

// ─── ScreenPermMatrix — bảng tích chọn màn hình × chức năng ─────────────────

export function ScreenPermMatrix({
  selected,
  onChange,
  isDark,
}: {
  selected: string[];
  onChange: (codes: string[]) => void;
  isDark: boolean;
}) {
  const [activeModule, setActiveModule] = useState('all');
  const sel = new Set(selected);

  const { data: allPermsData = [] } = useQuery({
    queryKey: ['permissions', 'all'],
    queryFn: permissionsApi.listAll,
    staleTime: 5 * 60_000,
  });

  const { screens, moduleGroups } = useMemo(() => buildScreens(allPermsData), [allPermsData]);

  const visibleScreens = useMemo(() => {
    const group = moduleGroups.find(g => g.key === activeModule);
    return screens.filter(s => group?.domains.includes(s.key));
  }, [activeModule, screens, moduleGroups]);

  const visiblePerms = visibleScreens.flatMap(s => s.funcs.map(f => f.perm));
  const allVisibleChecked = visiblePerms.length > 0 && visiblePerms.every(p => sel.has(p));
  const someVisibleChecked = visiblePerms.some(p => sel.has(p));

  const toggleSelectAll = () => {
    const next = new Set(sel);
    if (allVisibleChecked) {
      visiblePerms.forEach(p => next.delete(p));
    } else {
      visiblePerms.forEach(p => next.add(p));
    }
    onChange(Array.from(next));
  };

  const toggle = (perm: string) => {
    const next = new Set(sel);
    next.has(perm) ? next.delete(perm) : next.add(perm);
    onChange(Array.from(next));
  };

  const toggleScreen = (screen: PermScreen) => {
    const allPerms = screen.funcs.map(f => f.perm);
    const allChecked = allPerms.every(p => sel.has(p));
    const next = new Set(sel);
    allPerms.forEach(p => allChecked ? next.delete(p) : next.add(p));
    onChange(Array.from(next));
  };

  const { borderColor: border, bgSubPanel: hdrBg, bgContainer: cellBg, bgCard: hoverBg, textSecondary } = useThemePalette();

  return (
    <div>
      {/* Toolbar: filter module + select all/deselect all */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px', borderBottom: `1px solid ${border}`,
        flexWrap: 'wrap', gap: 8,
      }}>
        <Segmented
          size="small"
          value={activeModule}
          onChange={v => setActiveModule(v as string)}
          options={moduleGroups.map(g => ({ label: g.label, value: g.key }))}
        />
        <Space size={6}>
          <Button
            size="small"
            type={allVisibleChecked ? 'default' : 'primary'}
            ghost={!allVisibleChecked}
            onClick={toggleSelectAll}
            disabled={visiblePerms.length === 0}
          >
            {allVisibleChecked ? 'Bỏ tất cả' : 'Chọn tất cả'}
          </Button>
          {someVisibleChecked && !allVisibleChecked && (
            <Button size="small" danger onClick={() => {
              const next = new Set(sel);
              visiblePerms.forEach(p => next.delete(p));
              onChange(Array.from(next));
            }}>
              Bỏ chọn nhóm này
            </Button>
          )}
        </Space>
      </div>

      {/* Bảng */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: hdrBg }}>
              <th style={{ padding: '8px 14px', textAlign: 'left', borderBottom: `2px solid ${border}`, width: 160, fontWeight: 700 }}>
                Màn hình
              </th>
              <th style={{ padding: '8px 12px', textAlign: 'center', borderBottom: `2px solid ${border}`, width: 70, fontWeight: 700, color: textSecondary }}>
                Tất cả
              </th>
              <th style={{ padding: '8px 14px', textAlign: 'left', borderBottom: `2px solid ${border}`, fontWeight: 700, color: textSecondary }}>
                Chức năng
              </th>
            </tr>
          </thead>
          <tbody>
            {visibleScreens.map((screen, idx) => {
              const allPerms   = screen.funcs.map(f => f.perm);
              const checked    = allPerms.filter(p => sel.has(p)).length;
              const allChecked = checked === allPerms.length;
              const partial    = checked > 0 && !allChecked;

              return (
                <tr
                  key={screen.key}
                  style={{ background: idx % 2 === 0 ? cellBg : hdrBg, transition: 'background 0.1s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = hoverBg)}
                  onMouseLeave={e => (e.currentTarget.style.background = idx % 2 === 0 ? cellBg : hdrBg)}
                >
                  <td style={{ padding: '8px 14px', borderBottom: `1px solid ${border}`, whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: screen.color, flexShrink: 0 }} />
                      <span style={{ fontWeight: 600 }}>{screen.label}</span>
                      {checked > 0 && (
                        <Badge count={`${checked}/${allPerms.length}`} style={{ backgroundColor: screen.color, fontSize: 10 }} />
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '8px 12px', borderBottom: `1px solid ${border}`, textAlign: 'center' }}>
                    <Checkbox checked={allChecked} indeterminate={partial} onChange={() => toggleScreen(screen)} />
                  </td>
                  <td style={{ padding: '8px 14px', borderBottom: `1px solid ${border}` }}>
                    <Space wrap size={[6, 6]}>
                      {screen.funcs.map(func => (
                        <Tooltip key={func.perm} title={func.perm}>
                          <div
                            onClick={() => toggle(func.perm)}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 5,
                              padding: '2px 10px', borderRadius: 5, cursor: 'pointer',
                              border: `1px solid ${sel.has(func.perm) ? screen.color : border}`,
                              background: sel.has(func.perm)
                                ? (isDark ? `${screen.color}30` : `${screen.color}12`)
                                : 'transparent',
                              fontSize: 12, transition: 'all 0.12s', userSelect: 'none',
                            }}
                          >
                            {sel.has(func.perm)
                              ? <CheckOutlined style={{ color: screen.color, fontSize: 11 }} />
                              : <CloseOutlined style={{ color: textSecondary, fontSize: 10 }} />
                            }
                            <span style={{ color: sel.has(func.perm) ? (isDark ? '#F1F5F9' : screen.color) : undefined }}>
                              {func.label}
                            </span>
                          </div>
                        </Tooltip>
                      ))}
                    </Space>
                  </td>
                </tr>
              );
            })}
            {visibleScreens.length === 0 && (
              <tr>
                <td colSpan={3} style={{ padding: '24px', textAlign: 'center', color: isDark ? 'rgba(255,255,255,0.3)' : '#CBD5E1' }}>
                  Không có màn hình nào
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
