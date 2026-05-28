import { useState, useEffect, useMemo, useCallback } from 'react';
import { Layout, Menu, Tooltip, Badge } from 'antd';
import type { MenuProps } from 'antd';
import { AppstoreOutlined, DownOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/auth.store';
import { useThemeStore } from '../../store/theme.store';
import { useMenuStore } from '../../store/menu.store';
import { useModuleStore } from '../../store/module.store';
import { MODULE_MAP, ICON_MAP, ROUTE_PERMISSION_MAP } from '../../config/modules.config';
import { tasksApi } from '../../api/tasks';
import { processesApi } from '../../api/processes.api';
import { useGetBugStats, useGetMyBugsCount } from '../../api/bugs.api';
import { ModuleSwitcherModal } from './ModuleSwitcherModal';

const { Sider } = Layout;

interface AppSidebarProps {
  collapsed: boolean;
}

function BadgeLabel({ label, count }: { label: string; count?: number }) {
  if (!count) return <>{label}</>;
  return (
    <span style={{ display: 'flex', alignItems: 'center', width: '100%', minWidth: 0 }}>
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
        {label}
      </span>
      <Badge
        count={count}
        size="small"
        overflowCount={999}
        style={{ marginLeft: 4, backgroundColor: '#faad14', flexShrink: 0 }}
      />
    </span>
  );
}

export function AppSidebar({ collapsed }: AppSidebarProps) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user }  = useAuthStore();
  const { mode, preset } = useThemeStore();
  const { getModuleConfig } = useMenuStore();
  const { activeModuleId } = useModuleStore();

  const activeModule = MODULE_MAP[activeModuleId];
  const config   = useMemo(() => getModuleConfig(activeModuleId), [activeModuleId]);
  const topItems = config.topItems;
  const groups   = config.groups;

  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [openMenuKeys, setOpenMenuKeys] = useState<string[]>(() =>
    groups.filter(g => g.visible).map(g => g.key)
  );

  const sidebarBg    = mode === 'dark' ? '#0F172A' : preset.navBg;
  const dividerColor = mode === 'dark' ? '#1E293B' : 'rgba(255,255,255,0.18)';
  const moduleColor  = activeModule?.color ?? '#2563EB';

  // ── data queries ────────────────────────────────────────────────────────────
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

  // ── badge per route key ──────────────────────────────────────────────────────
  const getBadgeCount = useCallback((key: string): number | undefined => ({
    '/tasks':           incompleteTasks,
    '/my-bugs':         openBugs,
    '/bugs':            openBugsTotal,
    '/processes/inbox': pendingProcessTasks,
  } as Record<string, number | undefined>)[key], [incompleteTasks, openBugs, openBugsTotal, pendingProcessTasks]);

  // ── permission check ─────────────────────────────────────────────────────────
  const canAccess = useCallback((key: string): boolean => {
    if (!user) return false;
    if (user.role === 'ADMIN') return true;
    const required = ROUTE_PERMISSION_MAP[key];
    if (!required) return true;
    return user.permissions.includes(required);
  }, [user]);

  // ── sync open keys khi đổi module ────────────────────────────────────────────
  useEffect(() => {
    setOpenMenuKeys(groups.filter(g => g.visible).map(g => g.key));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeModuleId]);

  // ── build menu items ─────────────────────────────────────────────────────────
  const menuItems = useMemo((): MenuProps['items'] => {
    const items: MenuProps['items'] = [];

    for (const t of topItems.filter(i => i.visible && canAccess(i.key))) {
      items.push({ key: t.key, icon: ICON_MAP[t.key], label: t.label });
    }

    for (const g of groups.filter(g => g.visible)) {
      const visItems = g.items.filter(i => i.visible && canAccess(i.key));
      if (!visItems.length) continue;
      items.push({
        key:      g.key,
        icon:     ICON_MAP[g.items[0]?.key] ?? <AppstoreOutlined />,
        label:    g.label,
        children: visItems.map(item => {
          const count = getBadgeCount(item.key);
          return {
            key:   item.key,
            icon:  ICON_MAP[item.key],
            label: collapsed ? item.label : (count ? <BadgeLabel label={item.label} count={count} /> : item.label),
            title: item.label,
          };
        }),
      });
    }

    return items;
  }, [topItems, groups, collapsed, getBadgeCount, canAccess]);

  return (
    <Sider
      width={240}
      collapsedWidth={56}
      collapsed={collapsed}
      style={{
        height: '100vh',
        position: 'fixed',
        left: 0, top: 0, bottom: 0,
        zIndex: 100,
        background: sidebarBg,
        boxShadow: '2px 0 8px rgba(0,0,0,0.12)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

        {/* ── Logo ── */}
        <Tooltip title={collapsed ? 'Loop' : ''} placement="right">
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
            <img src="/logo-icon.svg" alt="Loop" style={{ width: 30, height: 30, flexShrink: 0 }} />
            {!collapsed && (
              <span style={{ fontWeight: 700, fontSize: 17, color: '#F1F5F9', letterSpacing: -0.3, whiteSpace: 'nowrap' }}>
                Loop
              </span>
            )}
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
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            {/* Colored module icon */}
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
                <span
                  style={{
                    flex: 1,
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#F1F5F9',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {activeModule?.label ?? 'Module'}
                </span>
                <DownOutlined style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', flexShrink: 0 }} />
              </>
            )}
          </div>
        </Tooltip>

        {/* ── Navigation ── */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          <Menu
            theme="dark"
            mode="inline"
            inlineCollapsed={collapsed}
            openKeys={openMenuKeys}
            onOpenChange={setOpenMenuKeys}
            selectedKeys={[location.pathname]}
            items={menuItems}
            onClick={({ key }) => navigate(key)}
            style={{ borderRight: 0, background: 'transparent', paddingTop: 4 }}
            inlineIndent={22}
          />
        </div>

        {/* ── Role badge ── */}
        {!collapsed && (
          <div style={{
            flexShrink: 0,
            padding: '10px 16px',
            borderTop: `1px solid ${dividerColor}`,
            color: 'rgba(255,255,255,0.35)',
            fontSize: 10,
            letterSpacing: 0.5,
            textTransform: 'uppercase',
            fontWeight: 600,
          }}>
            {user?.name ?? ''} · {user?.role ?? 'MEMBER'}
          </div>
        )}
      </div>

      <ModuleSwitcherModal open={switcherOpen} onClose={() => setSwitcherOpen(false)} />
    </Sider>
  );
}
