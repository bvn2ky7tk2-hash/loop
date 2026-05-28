import { ConfigProvider, theme, App as AntApp } from 'antd';
import vi_VN from 'antd/locale/vi_VN';
import 'dayjs/locale/vi';
import dayjs from 'dayjs';
import { RouterProvider } from 'react-router-dom';
import { useEffect } from 'react';

dayjs.locale('vi');
import { QueryClientProvider } from '@tanstack/react-query';
import { createQueryClient, registerLogoutHandler } from '@loop/shared';
import { useThemeStore } from './store/theme.store';
import { useAuthStore } from './store/auth.store';
import { router } from './router';

const queryClient = createQueryClient();

registerLogoutHandler(() => {
  useAuthStore.getState().logout();
  router.navigate('/login');
});

/* ─── Static CSS — uses var(--color-primary) so it never needs re-injection ─── */
const STATIC_CSS = `
  /* Sidebar — vertical menu active state */
  .ant-menu-dark .ant-menu-item-selected {
    background: linear-gradient(
      to right,
      var(--color-primary-20, #4F46E533),
      var(--color-primary-08, #4F46E514)
    ) !important;
    box-shadow: inset 3px 0 0 var(--color-primary, #4F46E5) !important;
    border-radius: 0 !important;
  }
  .ant-menu-dark .ant-menu-item-selected .ant-menu-title-content {
    color: #ffffff !important;
    font-weight: 700 !important;
  }
  .ant-menu-dark .ant-menu-item {
    border-radius: 0 !important;
    margin: 0 !important;
    width: 100% !important;
    transition: background 0.15s, box-shadow 0.15s !important;
  }
  .ant-menu-dark .ant-menu-item:not(.ant-menu-item-selected):hover {
    box-shadow: inset 3px 0 0 var(--color-primary-40, #4F46E566) !important;
  }
  .ant-menu-item-group-title {
    color: #475569 !important;
    font-size: 10px !important;
    letter-spacing: 0.08em !important;
    padding-left: 22px !important;
  }

  /* Topbar bottom border */
  .ant-layout-header {
    border-bottom-color: var(--color-primary-20, #4F46E533) !important;
  }

  /* Tabs */
  .ant-tabs-tab.ant-tabs-tab-active .ant-tabs-tab-btn {
    color: var(--color-primary) !important;
    font-weight: 600 !important;
  }
  .ant-tabs-ink-bar { background: var(--color-primary) !important; }
  .ant-tabs-tab:hover .ant-tabs-tab-btn {
    color: var(--color-primary-hover) !important;
  }

  /* Focus ring */
  *:focus-visible {
    outline: 2px solid var(--color-primary) !important;
    outline-offset: 2px !important;
  }

  /* Primary button glow */
  .ant-btn-primary:not(:disabled):hover {
    box-shadow: 0 4px 14px var(--color-primary-40, #4F46E566) !important;
  }

  /* Table headers */
  .ant-table-thead > tr > th,
  .ant-table-thead > tr > td {
    font-weight: 600 !important;
    font-size: 13px !important;
    letter-spacing: 0.03em !important;
  }

  /* Menu / Sidebar font */
  .ant-menu,
  .ant-menu-item,
  .ant-menu-submenu-title,
  .ant-menu-item-group-title,
  .ant-layout-sider .ant-menu {
    font-family: "Mulish", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
    font-weight: 600 !important;
    letter-spacing: 0.02em !important;
  }

  /* Card hover lift */
  .ant-card { transition: box-shadow 0.2s, transform 0.15s; }

  /* ─── Cố định top modal — không nhảy khi content thay đổi chiều cao ──── */
  /* Dùng top cố định thay vì flexbox centered để tránh re-layout khi tab switch */
  .ant-modal-wrap .ant-modal {
    top: 8vh !important;
    padding-bottom: 0 !important;
  }
  /* Drawer as centered modal — rounded corners, centered position */
  .ant-drawer .ant-drawer-content-wrapper {
    border-radius: 12px !important;
    box-shadow: 0 24px 48px rgba(0,0,0,0.18), 0 8px 16px rgba(0,0,0,0.08) !important;
  }
  .ant-drawer .ant-drawer-content {
    border-radius: 12px !important;
  }

  /* Page layout helpers */
  .page-wrapper { padding: 24px 28px; }
  .page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
  }
  .page-title {
    font-size: 18px !important;
    font-weight: 700 !important;
    letter-spacing: -0.3px;
    margin: 0 !important;
    line-height: 1.3 !important;
  }

  /* Status pill CSS vars */
  :root {
    --pill-todo-bg: #F1F5F9; --pill-todo-text: #475569;
    --pill-in-progress-bg: #EEF2FF; --pill-in-progress-text: #4338CA;
    --pill-done-bg: #ECFDF5; --pill-done-text: #065F46;
    --pill-pending-bg: #FFFBEB; --pill-pending-text: #92400E;
    --pill-returned-bg: #FEF2F2; --pill-returned-text: #991B1B;
    --pill-cancelled-bg: #F9FAFB; --pill-cancelled-text: #374151;
  }
`;

export default function App() {
  const { mode, preset } = useThemeStore();
  const isDark = mode === 'dark';

  /* ── Set CSS custom properties on :root via JS — most reliable propagation ── */
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--color-primary',        preset.primary);
    root.style.setProperty('--color-primary-hover',  preset.hover);
    root.style.setProperty('--color-primary-active', preset.active);
    /* Pre-computed alpha variants (8-digit hex) */
    root.style.setProperty('--color-primary-08',  `${preset.primary}14`); // ~8%
    root.style.setProperty('--color-primary-12',  `${preset.primary}1f`); // ~12%
    root.style.setProperty('--color-primary-20',  `${preset.primary}33`); // ~20%
    root.style.setProperty('--color-primary-40',  `${preset.primary}66`); // ~40%
  }, [preset.primary, preset.hover, preset.active]);

  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider
        locale={vi_VN}
        theme={{
          algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
          token: {
            colorPrimary:       preset.primary,
            colorPrimaryHover:  preset.hover,
            colorPrimaryActive: preset.active,
            borderRadius:    8,
            borderRadiusSM:  4,
            borderRadiusLG: 12,
            colorBgBase:        isDark ? '#0F172A' : '#ffffff',
            colorBgLayout:      isDark ? '#0F172A' : '#F8FAFC',
            colorBgContainer:   isDark ? '#1E293B' : '#ffffff',
            colorBorder:        isDark ? '#334155' : '#E2E8F0',
            colorText:          isDark ? '#F1F5F9' : '#0F172A',
            colorTextSecondary: isDark ? '#94A3B8' : '#475569',
            colorTextDisabled:  isDark ? '#475569' : '#94A3B8',
            fontSize: 13,
            fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            boxShadowSecondary: '0 4px 12px rgba(0,0,0,0.12)',
          },
          components: {
            Layout: {
              siderBg: '#0F172A',
              triggerBg: '#1E293B',
              headerBg: isDark ? '#1E293B' : '#ffffff',
              bodyBg:   isDark ? '#0F172A' : '#F8FAFC',
              headerHeight: 56,
            },
            Menu: {
              darkItemBg:           'transparent',
              darkSubMenuItemBg:    'transparent',
              darkItemSelectedBg:   'transparent',
              darkItemHoverBg:      'rgba(255,255,255,0.12)',
              darkItemColor:        'rgba(255,255,255,0.8)',
              darkItemSelectedColor:'#ffffff',
              darkItemHoverColor:   '#ffffff',
            },
            Table: {
              headerBg:          isDark ? '#2D3F56' : '#F1F5F9',
              headerColor:       isDark ? '#F1F5F9' : '#1E293B',
              headerSortActiveBg:isDark ? '#3D5068' : '#E2E8F0',
              headerSortHoverBg: isDark ? '#3D5068' : '#E9EFF5',
              headerSplitColor:  isDark ? '#3D5068' : '#CBD5E1',
              rowHoverBg:        isDark ? '#253347' : '#F8FAFC',
              bodySortBg:        isDark ? '#263345' : '#F8FAFC',
            },
            Card: {
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              borderRadiusLG: 12,
            },
            Button:  { borderRadius: 8 },
            Input:   { borderRadius: 8 },
            Select:  { borderRadius: 8 },
          },
        }}
      >
        {/* Static CSS that references CSS custom properties */}
        <style>{STATIC_CSS}</style>

        {/* Dynamic CSS for things that truly need JS values */}
        <style>{`
          html, body {
            background-color: ${isDark ? '#0F172A' : '#F8FAFC'};
            transition: background-color 0.2s;
            font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          }
          /* Scrollbar — WebKit (Chrome/Safari/Edge) */
          ::-webkit-scrollbar { width: 8px; height: 8px; }
          ::-webkit-scrollbar-track {
            background: ${isDark ? '#0F172A' : '#F1F5F9'};
            border-radius: 4px;
          }
          ::-webkit-scrollbar-thumb {
            background: ${isDark ? '#475569' : '#CBD5E1'};
            border-radius: 4px;
            border: 2px solid ${isDark ? '#0F172A' : '#F1F5F9'};
          }
          ::-webkit-scrollbar-thumb:hover {
            background: ${isDark ? '#64748B' : '#94A3B8'};
          }
          ::-webkit-scrollbar-corner {
            background: ${isDark ? '#0F172A' : '#F1F5F9'};
          }
          /* Scrollbar — Firefox */
          * {
            scrollbar-width: thin;
            scrollbar-color: ${isDark ? '#475569 #0F172A' : '#CBD5E1 #F1F5F9'};
          }
          ${isDark ? `
          .ant-table-wrapper .ant-table-tbody > tr > td { background: #243044 !important; }
          .ant-table-wrapper .ant-table-tbody > tr:hover > td { background: #2D3D56 !important; }
          .ant-table-wrapper .ant-table-tbody > tr.ant-table-row-selected > td { background: #2A3F64 !important; }
          ` : ''}
          .ts-row-absent > td { background: ${isDark ? '#2d0a0a' : '#FEF2F2'} !important; }
          .ts-row-short  > td { background: ${isDark ? '#291500' : '#FFFBEB'} !important; }
        `}</style>

        <AntApp>
          <RouterProvider router={router} />
        </AntApp>
      </ConfigProvider>
    </QueryClientProvider>
  );
}
