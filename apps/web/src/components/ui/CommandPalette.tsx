import { useEffect, useRef, useState, type ReactNode, useCallback } from 'react';
import { Modal, Input, List, Typography } from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  WalletOutlined,
  DashboardOutlined,
  ProjectOutlined,
  AppstoreOutlined,
  CheckSquareOutlined,
  ScheduleOutlined,
  DollarOutlined,
  BugOutlined,
  BugFilled,
  FundOutlined,
  BookOutlined,
  InboxOutlined,
  UnorderedListOutlined,
  RiseOutlined,
  AuditOutlined,
  LineChartOutlined,
  BarChartOutlined,
  TeamOutlined,
  ApartmentOutlined,
  CreditCardOutlined,
  SettingOutlined,
  PieChartOutlined,
  FileTextOutlined,
  BankOutlined,
  FunnelPlotOutlined,
  TrophyOutlined,
  ContactsOutlined,
  ShopOutlined,
  PhoneOutlined,
  GlobalOutlined,
  UserOutlined,
  BellOutlined,
  SafetyCertificateOutlined,
  ApiOutlined,
  UploadOutlined,
  MailOutlined,
  ThunderboltOutlined,
  AppstoreAddOutlined,
  UsergroupAddOutlined,
  SolutionOutlined,
  LaptopOutlined,
  SwapOutlined,
  ToolOutlined,
  ReadOutlined,
  AimOutlined,
  KeyOutlined,
  PartitionOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useCommandPaletteStore } from '../../store/commandPalette.store';
import { useThemePalette } from '../../hooks/useThemePalette';
import { SCREEN_REGISTRY, MODULE_LABELS } from '../../config/screens.registry';

const { Text } = Typography;

// ─── Icon map ────────────────────────────────────────────────────────────────
const ICON_MAP: Record<string, ReactNode> = {
  DashboardOutlined:         <DashboardOutlined />,
  ProjectOutlined:           <ProjectOutlined />,
  AppstoreOutlined:          <AppstoreOutlined />,
  CheckSquareOutlined:       <CheckSquareOutlined />,
  ScheduleOutlined:          <ScheduleOutlined />,
  DollarOutlined:            <DollarOutlined />,
  BugOutlined:               <BugOutlined />,
  BugFilled:                 <BugFilled />,
  FundOutlined:              <FundOutlined />,
  BookOutlined:              <BookOutlined />,
  InboxOutlined:             <InboxOutlined />,
  UnorderedListOutlined:     <UnorderedListOutlined />,
  RiseOutlined:              <RiseOutlined />,
  ClockCircleOutlined:       <ClockCircleOutlined />,
  AuditOutlined:             <AuditOutlined />,
  LineChartOutlined:         <LineChartOutlined />,
  BarChartOutlined:          <BarChartOutlined />,
  TeamOutlined:              <TeamOutlined />,
  ApartmentOutlined:         <ApartmentOutlined />,
  CalendarOutlined:          <CalendarOutlined />,
  CreditCardOutlined:        <CreditCardOutlined />,
  SettingOutlined:           <SettingOutlined />,
  PieChartOutlined:          <PieChartOutlined />,
  FileTextOutlined:          <FileTextOutlined />,
  BankOutlined:              <BankOutlined />,
  WalletOutlined:            <WalletOutlined />,
  FunnelPlotOutlined:        <FunnelPlotOutlined />,
  TrophyOutlined:            <TrophyOutlined />,
  ContactsOutlined:          <ContactsOutlined />,
  ShopOutlined:              <ShopOutlined />,
  PhoneOutlined:             <PhoneOutlined />,
  GlobalOutlined:            <GlobalOutlined />,
  UserOutlined:              <UserOutlined />,
  BellOutlined:              <BellOutlined />,
  SafetyCertificateOutlined: <SafetyCertificateOutlined />,
  ApiOutlined:               <ApiOutlined />,
  UploadOutlined:            <UploadOutlined />,
  MailOutlined:              <MailOutlined />,
  ThunderboltOutlined:       <ThunderboltOutlined />,
  AppstoreAddOutlined:       <AppstoreAddOutlined />,
  UsergroupAddOutlined:      <UsergroupAddOutlined />,
  SolutionOutlined:          <SolutionOutlined />,
  LaptopOutlined:            <LaptopOutlined />,
  SwapOutlined:              <SwapOutlined />,
  ToolOutlined:              <ToolOutlined />,
  ReadOutlined:              <ReadOutlined />,
  AimOutlined:               <AimOutlined />,
  KeyOutlined:               <KeyOutlined />,
  PartitionOutlined:         <PartitionOutlined />,
  PlusOutlined:              <PlusOutlined />,
};

function getIconComponent(iconName: string): ReactNode {
  return ICON_MAP[iconName] ?? <AppstoreOutlined />;
}

// ─── Recent pages localStorage helpers ───────────────────────────────────────
const LS_KEY   = 'loop_recent_pages';
const MAX_RECENT = 5;

interface RecentPage {
  route: string;
  label: string;
  icon:  string;
}

function getRecentPages(): RecentPage[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function addRecentPage(page: RecentPage): void {
  const pages = getRecentPages().filter((p) => p.route !== page.route);
  pages.unshift(page);
  localStorage.setItem(LS_KEY, JSON.stringify(pages.slice(0, MAX_RECENT)));
}

// ─── Types ───────────────────────────────────────────────────────────────────
type ItemKind = 'nav' | 'action' | 'recent';

interface PaletteItem {
  id:     string;
  label:  string;
  icon:   ReactNode;
  hint?:  string;
  kind:   ItemKind;
  route?: string;
  action?: () => void;
}

// ─── CommandPalette ───────────────────────────────────────────────────────────
export function CommandPalette() {
  const { isOpen, close } = useCommandPaletteStore();
  const navigate          = useNavigate();
  const { isDark, textPrimary, textMuted, bgContainer, borderColor, linkColor } = useThemePalette();

  const [query,       setQuery]       = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef  = useRef<HTMLInputElement | null>(null);
  const listRef   = useRef<HTMLDivElement | null>(null);

  // ─── Quick actions ────────────────────────────────────────────────────────
  const QUICK_ACTIONS: PaletteItem[] = [
    {
      id: 'new-task',
      label: 'Tạo task mới',
      icon: <PlusOutlined />,
      kind: 'action',
      action: () => { navigate('/tasks?action=new'); close(); },
    },
    {
      id: 'new-leave',
      label: 'Xin nghỉ phép',
      icon: <CalendarOutlined />,
      kind: 'action',
      action: () => { navigate('/leaves?action=new'); close(); },
    },
    {
      id: 'log-time',
      label: 'Ghi giờ làm việc',
      icon: <ClockCircleOutlined />,
      kind: 'action',
      action: () => { navigate('/timesheet?action=log'); close(); },
    },
    {
      id: 'new-expense',
      label: 'Khai báo chi phí',
      icon: <WalletOutlined />,
      kind: 'action',
      action: () => { navigate('/expenses?action=new'); close(); },
    },
  ];

  // ─── Nav items from SCREEN_REGISTRY ──────────────────────────────────────
  const NAV_ITEMS: PaletteItem[] = SCREEN_REGISTRY.map((s) => ({
    id:    `nav-${s.route}`,
    label: s.label,
    icon:  getIconComponent(s.icon),
    hint:  `${MODULE_LABELS[s.module] ?? s.module} · ${s.route}`,
    kind:  'nav' as const,
    route: s.route,
    action: () => {
      addRecentPage({ route: s.route, label: s.label, icon: s.icon });
      navigate(s.route);
      close();
    },
  }));

  // ─── Derived: filtered items grouped ─────────────────────────────────────
  const recentPages = getRecentPages();

  const recentItems: PaletteItem[] = recentPages.map((p) => ({
    id:     `recent-${p.route}`,
    label:  p.label,
    icon:   getIconComponent(p.icon),
    kind:   'recent',
    route:  p.route,
    action: () => {
      addRecentPage(p);
      navigate(p.route);
      close();
    },
  }));

  const q = query.trim().toLowerCase();

  // When no query: show recent + quick actions + first 10 nav items
  // When query: filter all nav + actions
  const filteredNav = q
    ? NAV_ITEMS.filter((i) =>
        i.label.toLowerCase().includes(q) ||
        (i.route ?? '').toLowerCase().includes(q) ||
        (i.hint ?? '').toLowerCase().includes(q),
      )
    : NAV_ITEMS.slice(0, 10);

  const filteredActions = q
    ? QUICK_ACTIONS.filter((i) => i.label.toLowerCase().includes(q))
    : QUICK_ACTIONS;

  interface Group {
    title: string;
    items: PaletteItem[];
  }

  const groups: Group[] = [];

  if (!q && recentItems.length > 0) {
    groups.push({ title: 'Gần đây', items: recentItems });
  }
  if (filteredNav.length > 0) {
    groups.push({ title: 'Điều hướng', items: filteredNav });
  }
  if (filteredActions.length > 0) {
    groups.push({ title: 'Hành động nhanh', items: filteredActions });
  }

  const allItems: PaletteItem[] = groups.flatMap((g) => g.items);

  // ─── Reset on open ────────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [isOpen]);

  // ─── Keyboard navigation ──────────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, allItems.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        allItems[activeIndex]?.action?.();
      } else if (e.key === 'Escape') {
        close();
      }
    },
    [allItems, activeIndex, close],
  );

  // ─── Scroll active item into view ─────────────────────────────────────────
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${activeIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  // ─── Reset active index on query change ───────────────────────────────────
  useEffect(() => { setActiveIndex(0); }, [query]);

  // ─── Styles ───────────────────────────────────────────────────────────────
  const selectedBg = isDark ? 'rgba(255,255,255,0.08)' : '#F0F0F0';

  let itemCounter = 0;

  return (
    <Modal
      open={isOpen}
      onCancel={close}
      footer={null}
      width={600}
      centered
      closable={false}
      styles={{
        body:    { padding: 0, overflow: 'hidden', borderRadius: 12 },
        container: {
          padding: 0,
          background: bgContainer,
          border: `1px solid ${borderColor}`,
          borderRadius: 12,
          boxShadow: isDark
            ? '0 24px 64px rgba(0,0,0,0.5)'
            : '0 24px 64px rgba(0,0,0,0.16)',
          overflow: 'hidden',
        },
      }}
      maskStyle={{ backdropFilter: 'blur(2px)' }}
    >
      {/* Search input */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: `1px solid ${borderColor}`,
          background: bgContainer,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <Input
          ref={(el) => { inputRef.current = el?.input ?? null; }}
          prefix={<SearchOutlined style={{ color: textMuted, fontSize: 16 }} />}
          suffix={
            <span
              style={{
                fontSize: 11,
                color: linkColor,
                background: isDark ? 'rgba(255,255,255,0.06)' : '#F5F5F5',
                border: `1px solid ${borderColor}`,
                borderRadius: 4,
                padding: '1px 5px',
                userSelect: 'none',
              }}
            >
              Esc
            </span>
          }
          placeholder="Tìm kiếm trang, hành động..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          bordered={false}
          style={{ color: textPrimary, fontSize: 15, background: 'transparent' }}
          autoComplete="off"
        />
      </div>

      {/* Result list */}
      <div
        ref={listRef}
        style={{
          maxHeight: 420,
          overflowY: 'auto',
          padding: '6px 0 8px',
          background: bgContainer,
        }}
      >
        {allItems.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px 0', color: textMuted }}>
            Không tìm thấy kết quả
          </div>
        )}

        {groups.map((group) => (
          <div key={group.title}>
            {/* Group header */}
            <div
              style={{
                color: textMuted,
                fontSize: 11,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                padding: '8px 16px 4px',
              }}
            >
              {group.title}
            </div>

            <List
              dataSource={group.items}
              renderItem={(item) => {
                const idx = itemCounter++;
                const isActive = idx === activeIndex;
                return (
                  <List.Item
                    data-idx={idx}
                    key={item.id}
                    onClick={() => item.action?.()}
                    onMouseEnter={() => setActiveIndex(idx)}
                    style={{
                      padding: '7px 16px',
                      cursor: 'pointer',
                      borderRadius: 6,
                      margin: '1px 8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      background: isActive ? selectedBg : 'transparent',
                      border: 'none',
                      transition: 'background 0.1s',
                    }}
                  >
                    {/* Icon */}
                    <span
                      style={{
                        fontSize: 15,
                        color: isActive ? linkColor : textMuted,
                        width: 20,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        transition: 'color 0.1s',
                      }}
                    >
                      {item.icon}
                    </span>

                    {/* Label + hint */}
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <Text
                        style={{
                          color: textPrimary,
                          fontSize: 14,
                          display: 'block',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {item.label}
                      </Text>
                      {item.hint && (
                        <Text
                          style={{
                            color: textMuted,
                            fontSize: 11,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: 'block',
                          }}
                        >
                          {item.hint}
                        </Text>
                      )}
                    </div>

                    {/* Kind badge */}
                    {item.kind === 'action' && (
                      <span
                        style={{
                          fontSize: 10,
                          color: linkColor,
                          background: isDark ? 'rgba(147,197,253,0.12)' : 'rgba(99,102,241,0.08)',
                          border: `1px solid ${isDark ? 'rgba(147,197,253,0.25)' : 'rgba(99,102,241,0.2)'}`,
                          borderRadius: 4,
                          padding: '1px 6px',
                          flexShrink: 0,
                          fontWeight: 500,
                        }}
                      >
                        Hành động
                      </span>
                    )}
                  </List.Item>
                );
              }}
            />
          </div>
        ))}
      </div>

      {/* Footer hint */}
      <div
        style={{
          padding: '6px 16px',
          borderTop: `1px solid ${borderColor}`,
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          background: isDark ? 'rgba(255,255,255,0.02)' : '#FAFAFA',
        }}
      >
        {(
          [
            ['↑↓', 'Di chuyển'],
            ['↵', 'Chọn'],
            ['Esc', 'Đóng'],
          ] as [string, string][]
        ).map(([key, desc]) => (
          <span key={key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <kbd
              style={{
                fontSize: 10,
                color: linkColor,
                background: isDark ? 'rgba(255,255,255,0.06)' : '#F5F5F5',
                border: `1px solid ${borderColor}`,
                borderRadius: 4,
                padding: '1px 5px',
                fontFamily: 'inherit',
              }}
            >
              {key}
            </kbd>
            <span style={{ fontSize: 11, color: textMuted }}>{desc}</span>
          </span>
        ))}
      </div>
    </Modal>
  );
}
