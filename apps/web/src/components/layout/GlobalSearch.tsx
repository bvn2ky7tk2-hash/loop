import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SearchOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { MODULES, ROUTE_PERMISSION_MAP } from '../../config/modules.config';
import { useThemeStore } from '../../store/theme.store';
import { useModuleStore } from '../../store/module.store';
import { useAuthStore } from '../../store/auth.store';

interface SearchItem {
  moduleId: string;
  moduleLabel: string;
  moduleColor: string;
  label: string;
  route: string;
}

function normalize(str: string): string {
  return str.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

const ALL_ITEMS: SearchItem[] = MODULES.flatMap((mod) => [
  ...mod.topItems.map((item) => ({
    moduleId: mod.id, moduleLabel: mod.label, moduleColor: mod.color,
    label: item.label, route: item.key,
  })),
  ...mod.groups.flatMap((g) =>
    g.items.map((item) => ({
      moduleId: mod.id, moduleLabel: mod.label, moduleColor: mod.color,
      label: item.label, route: item.key,
    })),
  ),
]).filter((item, idx, arr) =>
  arr.findIndex((x) => x.moduleId === item.moduleId && x.route === item.route) === idx,
);

export function GlobalSearch() {
  const { mode } = useThemeStore();
  const { setActiveModule } = useModuleStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const isDark = mode === 'dark';

  const [query, setQuery]         = useState('');
  const [focused, setFocused]     = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef     = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const isAdmin = user?.role === 'ADMIN';

  const accessibleItems = useMemo(() => {
    if (isAdmin) return ALL_ITEMS;
    return ALL_ITEMS.filter((item) => {
      const mod = MODULES.find((m) => m.id === item.moduleId);
      if (mod?.gatePermission && !user?.permissions.includes(mod.gatePermission)) return false;
      const routePerm = ROUTE_PERMISSION_MAP[item.route];
      if (!routePerm) return true;
      return user?.permissions.includes(routePerm) ?? false;
    });
  }, [isAdmin, user?.permissions]);

  const results = useMemo(() => {
    if (!query.trim()) return accessibleItems.slice(0, 7);
    const q = normalize(query);
    return accessibleItems
      .filter((i) => normalize(i.label).includes(q) || normalize(i.moduleLabel).includes(q))
      .slice(0, 7);
  }, [query, accessibleItems]);

  useEffect(() => { setActiveIdx(0); }, [results]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node))
        setFocused(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const handleSelect = useCallback((item: SearchItem) => {
    setActiveModule(item.moduleId);
    navigate(item.route);
    setQuery('');
    setFocused(false);
    inputRef.current?.blur();
  }, [setActiveModule, navigate]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const len = results.length;
    if (!len) return;
    if      (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, len - 1)); }
    else if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && results[activeIdx]) { handleSelect(results[activeIdx]); }
    else if (e.key === 'Escape')    { setFocused(false); setQuery(''); inputRef.current?.blur(); }
  };

  const showDropdown = focused && results.length > 0;

  // ── Design tokens ──────────────────────────────────────────────────
  const dropBg       = isDark ? '#18243A' : '#ffffff';
  const dropBorder   = isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.09)';
  const textPrimary  = isDark ? '#F1F5F9' : '#0F172A';
  const textMuted    = isDark ? 'rgba(255,255,255,0.38)' : '#94A3B8';
  const dividerColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>

      {/* ── CSS animation ── */}
      <style>{`
        @keyframes gs-drop-in {
          from { opacity: 0; transform: translateY(-6px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
        .gs-item { transition: background 0.12s; }
        .gs-input::placeholder { color: rgba(255,255,255,0.38); }
      `}</style>

      {/* ── Input ── */}
      <div
        onClick={() => inputRef.current?.focus()}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          height: 34,
          padding: '0 10px 0 12px',
          background: focused ? 'rgba(255,255,255,0.17)' : 'rgba(255,255,255,0.10)',
          border: `1.5px solid ${focused ? 'rgba(255,255,255,0.42)' : 'rgba(255,255,255,0.15)'}`,
          borderRadius: 9,
          cursor: 'text',
          transition: 'background 0.18s, border-color 0.18s, box-shadow 0.18s',
          boxShadow: focused ? '0 0 0 3px rgba(255,255,255,0.07)' : 'none',
        }}
      >
        <SearchOutlined style={{
          color: focused ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.38)',
          fontSize: 13, flexShrink: 0,
          transition: 'color 0.18s',
        }} />

        <input
          ref={inputRef}
          className="gs-input"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setActiveIdx(0); }}
          onFocus={() => setFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder="Tìm chức năng..."
          style={{
            flex: 1, minWidth: 0,
            border: 'none', outline: 'none',
            background: 'transparent',
            fontSize: 13, fontWeight: 400,
            color: 'rgba(255,255,255,0.92)',
            caretColor: 'rgba(255,255,255,0.7)',
          }}
        />

        {/* ⌘K hint — ẩn khi đang gõ */}
        {!focused && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
            {['⌘', 'K'].map((k) => (
              <kbd key={k} style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                minWidth: 18, height: 18, padding: '0 4px',
                background: 'rgba(255,255,255,0.09)',
                border: '1px solid rgba(255,255,255,0.16)',
                borderBottom: '2px solid rgba(255,255,255,0.22)',
                borderRadius: 4, fontSize: 10, fontFamily: 'monospace',
                color: 'rgba(255,255,255,0.38)',
                lineHeight: 1,
              }}>{k}</kbd>
            ))}
          </div>
        )}
      </div>

      {/* ── Dropdown ── */}
      {showDropdown && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          left: -12, right: -12,
          background: dropBg,
          border: `1px solid ${dropBorder}`,
          borderRadius: 12,
          boxShadow: isDark
            ? '0 20px 50px rgba(0,0,0,0.55), 0 4px 12px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)'
            : '0 20px 50px rgba(0,0,0,0.13), 0 4px 12px rgba(0,0,0,0.06)',
          zIndex: 9999,
          overflow: 'hidden',
          animation: 'gs-drop-in 0.15s cubic-bezier(0.16,1,0.3,1)',
        }}>

          {/* Section header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '9px 14px 6px',
            borderBottom: `1px solid ${dividerColor}`,
          }}>
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.07em',
              textTransform: 'uppercase', color: textMuted,
            }}>
              {query.trim() ? 'Kết quả' : 'Gợi ý'}
            </span>
            <span style={{ fontSize: 10, color: textMuted, display: 'flex', gap: 8 }}>
              <span>↑↓ điều hướng</span>
              <span>↵ mở</span>
              <span>Esc đóng</span>
            </span>
          </div>

          {/* Result items */}
          <div style={{ padding: '5px 6px 6px' }}>
            {results.map((item, idx) => {
              const isActive = idx === activeIdx;
              return (
                <div
                  key={`${item.moduleId}-${item.route}`}
                  className="gs-item"
                  onMouseDown={(e) => { e.preventDefault(); handleSelect(item); }}
                  onMouseEnter={() => setActiveIdx(idx)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '7px 10px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    marginBottom: 2,
                    background: isActive
                      ? (isDark ? `${item.moduleColor}1A` : `${item.moduleColor}0D`)
                      : 'transparent',
                    borderLeft: `3px solid ${isActive ? item.moduleColor : 'transparent'}`,
                  }}
                >
                  {/* Module icon square */}
                  <div style={{
                    width: 28, height: 28,
                    borderRadius: 7,
                    background: isActive ? item.moduleColor : `${item.moduleColor}99`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 800,
                    color: '#fff',
                    flexShrink: 0,
                    transition: 'background 0.15s',
                    letterSpacing: 0,
                  }}>
                    {item.moduleLabel[0].toUpperCase()}
                  </div>

                  {/* Feature label */}
                  <span style={{
                    flex: 1, minWidth: 0,
                    fontSize: 13,
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? (isDark ? '#FFFFFF' : '#0F172A') : textPrimary,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    transition: 'color 0.12s',
                  }}>
                    {item.label}
                  </span>

                  {/* Module badge */}
                  <span style={{
                    fontSize: 10, fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: 99,
                    background: isActive
                      ? `${item.moduleColor}28`
                      : (isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)'),
                    color: isActive ? item.moduleColor : textMuted,
                    border: `1px solid ${isActive ? `${item.moduleColor}50` : 'transparent'}`,
                    whiteSpace: 'nowrap', flexShrink: 0,
                    transition: 'all 0.15s',
                  }}>
                    {item.moduleLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
