import { Layout, Spin } from 'antd';
import { Outlet, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { AppSidebar } from './AppSidebar';
import { AppTopbar } from './AppTopbar';
import { useAuthStore } from '../../store/auth.store';
import { authApi } from '../../api/auth';
import { CommandPalette } from '../ui/CommandPalette';
import { useCommandPaletteStore } from '../../store/commandPalette.store';

const { Content } = Layout;

const BREAKPOINT_SIDEBAR = 992;
const BREAKPOINT_MOBILE  = 576;

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(window.innerWidth < BREAKPOINT_SIDEBAR);
  const [isMobile,  setIsMobile]  = useState(window.innerWidth < BREAKPOINT_MOBILE);
  const { user, isLoading, setUser, setLoading } = useAuthStore();
  const openPalette = useCommandPaletteStore((s) => s.open);

  useEffect(() => {
    authApi.me()
      .then((profile) => setUser(profile))
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    const onResize = () => {
      setCollapsed(window.innerWidth < BREAKPOINT_SIDEBAR);
      setIsMobile(window.innerWidth < BREAKPOINT_MOBILE);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Cmd+K / Ctrl+K → mở Command Palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        openPalette();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openPalette]);

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (isMobile) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center', fontSize: 16 }}>
        Vui lòng dùng ứng dụng Loop 360 trên điện thoại
      </div>
    );
  }

  const sidebarWidth = collapsed ? 56 : 240;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <a
        href="#main-content"
        style={{ position: 'absolute', left: -9999, top: 'auto', width: 1, height: 1, overflow: 'hidden' }}
        onFocus={(e) => { e.currentTarget.style.left = '0'; e.currentTarget.style.width = 'auto'; e.currentTarget.style.height = 'auto'; }}
        onBlur={(e)  => { e.currentTarget.style.left = '-9999px'; e.currentTarget.style.width = '1px'; e.currentTarget.style.height = '1px'; }}
      >
        Bỏ qua điều hướng
      </a>

      <AppSidebar collapsed={collapsed} />

      <Layout style={{ marginLeft: sidebarWidth, transition: 'margin-left 0.2s' }}>
        <AppTopbar sidebarWidth={sidebarWidth} onToggle={() => setCollapsed((c) => !c)} />

        <Content
          id="main-content"
          style={{ marginTop: 56, padding: 0, minHeight: 'calc(100vh - 56px)' }}
          tabIndex={-1}
        >
          <Outlet />
        </Content>
      </Layout>

      <CommandPalette />
    </Layout>
  );
}
