import { CheckOutlined, MoonOutlined, SunOutlined } from '@ant-design/icons';
import { useThemeStore, THEME_PRESETS } from '../../store/theme.store';
import { useThemePalette } from '../../hooks/useThemePalette';

export function ThemePanel() {
  const { mode, toggle, presetId, setPreset, preset } = useThemeStore();
  const { isDark, textPrimary, textSecondary, textMuted, bgPage, bgContainer, bgSubPanel } = useThemePalette();

  return (
    <div style={{ width: 260, padding: '4px 0' }}>
      {/* Chế độ sáng / tối */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: textMuted, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>
          Chế độ
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['light', 'dark'] as const).map((m) => {
            const active = mode === m;
            return (
              <button
                key={m}
                onClick={() => { if (!active) toggle(); }}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: '7px 0',
                  border: `2px solid ${active ? preset.primary : 'transparent'}`,
                  borderRadius: 8,
                  background: active ? `${preset.primary}18` : (isDark ? bgContainer : bgPage),
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: active ? 600 : 400,
                  color: active ? preset.primary : textSecondary,
                  transition: 'all 0.15s',
                }}
              >
                {m === 'light' ? <SunOutlined /> : <MoonOutlined />}
                {m === 'light' ? 'Sáng' : 'Tối'}
              </button>
            );
          })}
        </div>
      </div>

      {/* Theme cards */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: textMuted, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>
          Giao diện
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {THEME_PRESETS.map((p) => {
            const selected = presetId === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setPreset(p.id)}
                title={p.name}
                style={{
                  padding: 0,
                  border: `2px solid ${selected ? p.primary : 'transparent'}`,
                  borderRadius: 10,
                  cursor: 'pointer',
                  overflow: 'hidden',
                  outline: selected ? `2px solid ${textPrimary}` : 'none',
                  outlineOffset: 2,
                  position: 'relative',
                  background: 'none',
                  transform: selected ? 'scale(1.04)' : 'scale(1)',
                  transition: 'transform 0.15s, border-color 0.15s',
                  boxShadow: selected ? `0 4px 12px ${p.primary}44` : 'none',
                }}
              >
                {/* Nav color preview */}
                <div style={{
                  width: '100%',
                  height: 40,
                  background: p.navBg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 3,
                  position: 'relative',
                  boxShadow: p.navTheme === 'light' ? 'inset 0 -1px 0 #E2E8F0' : 'none',
                }}>
                  {/* Simulate mini menu items */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-start' }}>
                    {p.navTheme === 'light' ? <>
                      <div style={{ width: 22, height: 3, background: 'rgba(23,43,77,0.65)', borderRadius: 2 }} />
                      <div style={{ width: 16, height: 3, background: 'rgba(23,43,77,0.35)', borderRadius: 2 }} />
                      <div style={{ width: 19, height: 3, background: 'rgba(23,43,77,0.35)', borderRadius: 2 }} />
                    </> : <>
                      <div style={{ width: 22, height: 3, background: 'rgba(255,255,255,0.7)', borderRadius: 2 }} />
                      <div style={{ width: 16, height: 3, background: 'rgba(255,255,255,0.45)', borderRadius: 2 }} />
                      <div style={{ width: 19, height: 3, background: 'rgba(255,255,255,0.45)', borderRadius: 2 }} />
                    </>}
                  </div>

                  {selected && (
                    <div style={{
                      position: 'absolute',
                      top: 4, right: 4,
                      width: 14, height: 14,
                      borderRadius: '50%',
                      background: p.navTheme === 'light' ? p.primary : '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <CheckOutlined style={{ color: p.navTheme === 'light' ? '#fff' : p.primary, fontSize: 9, fontWeight: 700 }} />
                    </div>
                  )}
                </div>

                {/* Primary color + name */}
                <div style={{
                  background: isDark ? bgContainer : bgSubPanel,
                  padding: '5px 4px 5px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5,
                }}>
                  <div style={{
                    width: 8, height: 8,
                    borderRadius: '50%',
                    background: p.primary,
                    flexShrink: 0,
                    boxShadow: `0 0 0 2px ${p.primary}33`,
                  }} />
                  <span style={{
                    fontSize: 11,
                    fontWeight: selected ? 700 : 500,
                    color: selected ? textPrimary : textMuted,
                  }}>
                    {p.name}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
