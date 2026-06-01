import { useState, useMemo, useCallback, useEffect } from 'react';
import { Tooltip, Badge } from 'antd';
import { AppstoreOutlined, DownOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/auth.store';
import { useThemePalette } from '../../hooks/useThemePalette';
import { useMenuStore } from '../../store/menu.store';
import { useModuleStore } from '../../store/module.store';
import { MODULE_MAP, ICON_MAP, ROUTE_PERMISSION_MAP } from '../../config/modules.config';
import { SCREEN_REGISTRY } from '../../config/screens.registry';
import { tasksApi } from '../../api/tasks';
import { processesApi } from '../../api/processes.api';
import { useGetBugStats, useGetMyBugsCount } from '../../api/bugs.api';
import { ModuleSwitcherModal } from './ModuleSwitcherModal';
import { useTenantStore } from '../../store/tenant.store';

interface AppSidebarProps {
  collapsed: boolean;
}

interface NavItemProps {
  label: string;
  icon?: React.ReactNode;
  active: boolean;
  collapsed: boolean;
  badge?: number;
  primaryColor: string;
  isDark: boolean;
  isNavLight: boolean;
  onClick: () => void;
}

function NavItem({
  label, icon, active, collapsed, badge,
  primaryColor, isDark, isNavLight, onClick,
}: NavItemProps) {
  const [hovered, setHovered] = useState(false);

  const activeBg   = isDark ? `${primaryColor}22` : isNavLight ? `${primaryColor}14` : `${primaryColor}22`;
  const hoverBg    = isDark ? 'rgba(255,255,255,0.06)' : isNavLight ? 'rgba(23,43,77,0.05)' : 'rgba(255,255,255,0.08)';
  const activeText = isDark ? '#F1F5F9' : isNavLight ? primaryColor : '#F1F5F9';
  const defaultText = isDark ? 'rgba(241,245,249,0.72)' : isNavLight ? 'rgba(23,43,77,0.72)' : 'rgba(241,245,249,0.72)';

  const item = (
    <div
      role="menuitem"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'flex-start',
        gap: collapsed ? 0 : 9,
        height: 36,
        padding: collapsed ? 0 : '0 14px 0 16px',
        margin: '1px 6px',
        borderRadius: 8,
        cursor: 'pointer',
        transition: 'background 0.12s',
        background: active ? activeBg : hovered ? hoverBg : 'transparent',
        borderLeft: active && !collapsed ? `3px solid ${primaryColor}` : '3px solid transparent',
        color: active ? activeText : defaultText,
        fontSize: 13.5,
        fontWeight: active ? 600 : 400,
        userSelect: 'none',
        outline: 'none',
      }}
    >
      <span style={{
        fontSize: 15,
        lineHeight: 1,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        opacity: active ? 1 : 0.8,
      }}>
        {icon ?? <AppstoreOutlined />}
      </span>

      {!collapsed && (
        <span style={{
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          minWidth: 0,
        }}>
          {label}
        </span>
      )}

      {!collapsed && !!badge && (
        <Badge
          count={badge}
          size="small"
          overflowCount={999}
          style={{ backgroundColor: '#faad14', flexShrink: 0 }}
        />
      )}
    </div>
  );

  if (collapsed) {
    return (
      <Tooltip title={badge ? <>{label} <Badge count={badge} size="small" style={{ backgroundColor: '#faad14' }} /></> : label} placement="right">
        {item}
      </Tooltip>
    );
  }
  return item;
}

interface SectionHeaderProps {
  label: string;
  collapsed: boolean;
  navTextMuted: string;
}

function SectionHeader({ label, collapsed, navTextMuted }: SectionHeaderProps) {
  if (collapsed) {
    return <div style={{ height: 8 }} />;
  }
  return (
    <div style={{
      padding: '10px 20px 4px',
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: '0.8px',
      textTransform: 'uppercase',
      color: navTextMuted,
      userSelect: 'none',
    }}>
      {label}
    </div>
  );
}

export function AppSidebar({ collapsed }: AppSidebarProps) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user }  = useAuthStore();
  const { isDark, preset } = useThemePalette();
  const tenantConfig = useTenantStore(s => s.config);
  const { getModuleConfig } = useMenuStore();
  const { activeModuleId, setActiveModule } = useModuleStore();

  // Auto-sync activeModuleId khi URL thay đổi
  useEffect(() => {
    const pathname = location.pathname;
    const exact = SCREEN_REGISTRY.find(s => s.route === pathname);
    const derived = exact
      ?? SCREEN_REGISTRY
           .filter(s => s.route !== '/' && pathname.startsWith(s.route))
           .sort((a, b) => b.route.length - a.route.length)[0];
    if (derived && derived.module !== activeModuleId) {
      setActiveModule(derived.module);
    }
  }, [location.pathname]);

  const activeModule = MODULE_MAP[activeModuleId] ?? MODULE_MAP['workspace'];
  const config   = useMemo(() => getModuleConfig(activeModuleId), [activeModuleId]);
  const topItems = config.topItems;
  const groups   = config.groups;

  const [switcherOpen, setSwitcherOpen] = useState(false);

  const isNavLight  = !isDark && preset.navTheme === 'light';
  const sidebarBg   = isDark ? '#0F172A' : preset.navBg;
  const dividerColor = isDark ? '#1E293B' : isNavLight ? '#E2E8F0' : 'rgba(255,255,255,0.12)';
  const navTextColor = isNavLight ? preset.navText : '#F1F5F9';
  const navTextMuted = isDark ? 'rgba(255,255,255,0.28)' : isNavLight ? 'rgba(23,43,77,0.35)' : 'rgba(255,255,255,0.28)';
  const navHoverBg   = isDark ? 'rgba(255,255,255,0.06)' : isNavLight ? 'rgba(23,43,77,0.05)' : 'rgba(255,255,255,0.08)';
  const moduleColor  = activeModule?.color ?? '#2563EB';
  const primaryColor = preset.primary;

  // ── data queries ──────────────────────────────────────────────────────────
  const { data: myTasksCountData } = useQuery({
    queryKey: ['tasks', 'mine', 'count', 'sidebar'],
    queryFn: () => tasksApi.myTasksCount(),
    staleTime: 60_000,
  });
  const incompleteTasks = myTasksCountData?.total || undefined;

  const { data: myBugsCountData } = useGetMyBugsCount();
  const openBugs = myBugsCountData?.total || undefined;

  const { data: processCountData } = useQuery({
    queryKey: ['user-tasks', 'count', 'sidebar'],
    queryFn: () => processesApi.countUserTasks(),
    staleTime: 60_000,
  });
  const pendingProcessTasks = processCountData?.total || undefined;

  const { data: bugStatsData } = useGetBugStats();
  const openBugsTotal = bugStatsData
    ? (
        bugStatsData.byStatus.open +
        bugStatsData.byStatus.pending +
        bugStatsData.byStatus.pendingReview +
        bugStatsData.byStatus.approved +
        bugStatsData.byStatus.inProgress
      ) || undefined
    : undefined;

  const getBadgeCount = useCallback((key: string): number | undefined => ({
    '/tasks':           incompleteTasks,
    '/my-bugs':         openBugs,
    '/bugs':            openBugsTotal,
    '/processes/inbox': pendingProcessTasks,
  } as Record<string, number | undefined>)[key], [incompleteTasks, openBugs, openBugsTotal, pendingProcessTasks]);

  const canAccess = useCallback((key: string): boolean => {
    if (!user) return false;
    if (user.role === 'ADMIN') return true;
    const required = ROUTE_PERMISSION_MAP[key];
    if (!required) return true;
    return user.permissions.includes(required);
  }, [user]);

  // isActive: khớp exact hoặc prefix (trừ dashboard '/')
  const isActive = useCallback((key: string): boolean => {
    if (key === '/') return location.pathname === '/';
    return location.pathname === key || location.pathname.startsWith(key + '/');
  }, [location.pathname]);

  return (
    <div
      style={{
        width: collapsed ? 56 : 240,
        height: '100vh',
        position: 'fixed',
        left: 0, top: 0, bottom: 0,
        zIndex: 100,
        background: sidebarBg,
        borderRight: isNavLight ? `1px solid ${dividerColor}` : 'none',
        boxShadow: isNavLight ? '2px 0 12px rgba(0,0,0,0.08)' : '2px 0 8px rgba(0,0,0,0.12)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.2s',
        overflow: 'hidden',
      }}
    >
      {/* ── Logo ── */}
      <Tooltip title={collapsed ? (tenantConfig?.name ?? 'Loop 360') : ''} placement="right">
        <div
          onClick={() => navigate('/')}
          style={{
            height: 56,
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: collapsed ? 0 : '0 18px',
            gap: 10,
            flexShrink: 0,
            overflow: 'hidden',
            borderBottom: `1px solid ${dividerColor}`,
            cursor: 'pointer',
          }}
        >
          {collapsed
            ? (tenantConfig?.logoUrl
                ? <img src={tenantConfig.logoUrl} alt={tenantConfig.name} style={{ width: 34, height: 34, flexShrink: 0, objectFit: 'contain' }} />
                : <img src="/logo-icon.svg" alt="Loop 360" style={{ width: 34, height: 34, flexShrink: 0, filter: isNavLight ? 'none' : 'brightness(0) invert(1)' }} />
              )
            : (tenantConfig?.logoUrl
                ? <img src={tenantConfig.logoUrl} alt={tenantConfig.name} style={{ height: 28, maxWidth: 190, flexShrink: 0, objectFit: 'contain' }} />
                : <img src="/logo-full.svg" alt="Loop 360" style={{ height: 40, maxWidth: 190, flexShrink: 0, filter: isNavLight ? 'none' : 'brightness(0) invert(1)' }} />
              )
          }
        </div>
      </Tooltip>

      {/* ── Module Switcher ── */}
      <Tooltip title={collapsed ? (activeModule?.label ?? 'Module') : ''} placement="right">
        <div
          onClick={() => setSwitcherOpen(true)}
          style={{
            height: 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: collapsed ? 0 : '0 14px',
            gap: 9,
            flexShrink: 0,
            borderBottom: `1px solid ${dividerColor}`,
            cursor: 'pointer',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = navHoverBg)}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              background: moduleColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 13,
              color: '#fff',
              flexShrink: 0,
            }}
          >
            {activeModule?.icon}
          </div>

          {!collapsed && (
            <>
              <span style={{
                flex: 1,
                fontSize: 13,
                fontWeight: 600,
                color: navTextColor,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {activeModule?.label ?? 'Module'}
              </span>
              <DownOutlined style={{ fontSize: 10, color: navTextMuted, flexShrink: 0 }} />
            </>
          )}
        </div>
      </Tooltip>

      {/* ── Navigation ── */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingBottom: 8 }}>

        {/* Top items (Dashboard, etc.) */}
        {topItems.filter(i => i.visible && canAccess(i.key)).map(item => (
          <div key={item.key} style={{ paddingTop: 6 }}>
            <NavItem
              label={item.label}
              icon={ICON_MAP[item.key]}
              active={isActive(item.key)}
              collapsed={collapsed}
              badge={getBadgeCount(item.key)}
              primaryColor={primaryColor}
              isDark={isDark}
              isNavLight={isNavLight}
              onClick={() => navigate(item.key)}
            />
          </div>
        ))}

        {/* Groups — flat sections với section header */}
        {groups.filter(g => g.visible).map(group => {
          const visItems = group.items.filter(i => i.visible && canAccess(i.key));
          if (!visItems.length) return null;
          return (
            <div key={group.key}>
              <SectionHeader
                label={group.label}
                collapsed={collapsed}
                navTextMuted={navTextMuted}
              />
              {visItems.map(item => (
                <NavItem
                  key={item.key}
                  label={item.label}
                  icon={ICON_MAP[item.key]}
                  active={isActive(item.key)}
                  collapsed={collapsed}
                  badge={getBadgeCount(item.key)}
                  primaryColor={primaryColor}
                  isDark={isDark}
                  isNavLight={isNavLight}
                  onClick={() => navigate(item.key)}
                />
              ))}
            </div>
          );
        })}
      </div>

      {/* ── User info ── */}
      {!collapsed && (
        <div style={{
          flexShrink: 0,
          padding: '10px 16px',
          borderTop: `1px solid ${dividerColor}`,
          color: navTextMuted,
          fontSize: 10,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
          fontWeight: 600,
        }}>
          {user?.name ?? ''} · {user?.role ?? 'MEMBER'}
        </div>
      )}

      <ModuleSwitcherModal open={switcherOpen} onClose={() => setSwitcherOpen(false)} />
    </div>
  );
}
