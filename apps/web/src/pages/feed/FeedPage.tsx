import { useState, useCallback } from 'react';
import {
  Row, Col, Card, Typography, Tag, Space, Button, Divider,
  Form, Input, Select, Tooltip, App, Popconfirm, Spin, Empty, InputNumber,
  Tabs, Carousel,
} from 'antd';
import {
  TeamOutlined, PushpinOutlined, CalendarOutlined,
  DeleteOutlined, TrophyOutlined, GiftOutlined, StarOutlined,
  NotificationOutlined, FileTextOutlined, ThunderboltOutlined,
  BulbOutlined, QuestionCircleOutlined, ClockCircleOutlined,
  BookOutlined, PhoneOutlined, FilterOutlined, EnvironmentOutlined,
  UserAddOutlined, PauseCircleOutlined, FormOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';
import { useNavigate } from 'react-router-dom';
import { useThemePalette } from '../../hooks/useThemePalette';
import { StatCard } from '../../components/ui/StatCard';
import { CenteredModal } from '../../components/ui/CenteredModal';
import { PageHeader } from '../../components/ui/PageHeader';
import { useAuthStore } from '../../store/auth.store';
import { usePermissions } from '../../hooks/usePermissions';
import { dashboardV3Api, type TodayEvents } from '../../api/dashboard-v3';
import {
  useGetFeedPosts, useCreateFeedPost,
  useDeleteFeedPost, useReactFeedPost,
  type FeedPost, type FeedPostType,
} from '../../api/feed';

dayjs.extend(relativeTime);
dayjs.locale('vi');

const { Text, Paragraph, Title } = Typography;

// ─── Config ──────────────────────────────────────────────────────────────────

const POST_TYPE_CONFIG: Record<FeedPostType, {
  label: string;
  color: string;
  icon: React.ReactNode;
  gradient?: string;
}> = {
  ANNOUNCEMENT: { label: 'Thông báo',  color: '#3B82F6', icon: <NotificationOutlined /> },
  KUDOS:        { label: 'Thành tích', color: '#10B981', icon: <StarOutlined /> },
  BIRTHDAY:     { label: 'Sinh nhật',  color: '#F59E0B', icon: <GiftOutlined />,   gradient: 'linear-gradient(135deg, #F59E0B 0%, #EC4899 100%)' },
  DOCUMENT:     { label: 'Tin tức',    color: '#8B5CF6', icon: <FileTextOutlined /> },
  ANNIVERSARY:  { label: 'Sự kiện',   color: '#EA580C', icon: <TrophyOutlined />, gradient: 'linear-gradient(135deg, #F59E0B 0%, #EA580C 100%)' },
};

const EMOJIS = ['👍', '❤️', '🎉', '👏'];

const BANNER_SLIDES_STATIC = [
  {
    bg: 'linear-gradient(135deg, #0EA5E9 0%, #6366F1 100%)',
    title: 'Kết nối & Cộng tác',
    sub: 'Chia sẻ thông tin, vinh danh đồng nghiệp mỗi ngày',
    icon: '🤝',
  },
  {
    bg: 'linear-gradient(135deg, #10B981 0%, #0EA5E9 100%)',
    title: 'Văn hoá doanh nghiệp',
    sub: 'Ghi nhận thành tích và nuôi dưỡng văn hoá gắn kết',
    icon: '🏆',
  },
];

const QUICK_ACCESS = [
  { icon: <ThunderboltOutlined />, label: 'Quy trình',    path: '/bpm/processes',   color: '#6366F1' },
  { icon: <FileTextOutlined />,    label: 'Biểu mẫu',    path: '/bpm/tasks',        color: '#3B82F6' },
  { icon: <BookOutlined />,        label: 'Tài liệu',    path: '/knowledge-base',   color: '#8B5CF6' },
  { icon: <PhoneOutlined />,       label: 'Danh bạ',     path: '/personnel',        color: '#0EA5E9' },
  { icon: <ClockCircleOutlined />, label: 'Chấm công',   path: '/timesheet',        color: '#10B981' },
  { icon: <CalendarOutlined />,    label: 'Đăng ký nghỉ', path: '/timesheet/me',   color: '#F59E0B' },
  { icon: <QuestionCircleOutlined />, label: 'IT Support', path: '/bugs',           color: '#EF4444' },
  { icon: <BulbOutlined />,        label: 'Góp ý ẩn danh', path: '/feed',           color: '#F97316' },
];

function getInitials(name: string) {
  return name.split(' ').slice(-2).map((w) => w[0]).join('').toUpperCase();
}

function getAvatarColor(name: string) {
  const colors = ['#6366F1', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
  return colors[name.charCodeAt(0) % colors.length];
}

// ─── SpecialHeader ────────────────────────────────────────────────────────────

function SpecialHeader({ post }: { post: FeedPost }) {
  const conf = POST_TYPE_CONFIG[post.type];
  if (!conf.gradient) return null;

  if (post.type === 'ANNIVERSARY') {
    return (
      <div style={{
        background: conf.gradient,
        borderRadius: '10px 10px 0 0',
        padding: '18px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        margin: '-16px -20px 14px',
      }}>
        <Space size={12}>
          <TrophyOutlined style={{ fontSize: 30, color: 'rgba(255,255,255,0.9)' }} />
          <div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)', letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 600 }}>
              Tri ân thâm niên
            </div>
            {post.targetName && (
              <div style={{ fontSize: 17, fontWeight: 700, color: '#FFF', lineHeight: 1.3 }}>
                {post.targetName}
              </div>
            )}
          </div>
        </Space>
        {post.targetYears && (
          <div style={{ background: 'rgba(255,255,255,0.22)', borderRadius: 10, padding: '8px 16px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.3)' }}>
            <div style={{ fontSize: 30, fontWeight: 900, color: '#FFF', lineHeight: 1 }}>{post.targetYears}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.85)', letterSpacing: 1.5, fontWeight: 600 }}>NĂM</div>
          </div>
        )}
      </div>
    );
  }

  if (post.type === 'BIRTHDAY') {
    return (
      <div style={{
        background: conf.gradient,
        borderRadius: '10px 10px 0 0',
        padding: '12px 20px',
        display: 'flex', alignItems: 'center', gap: 10,
        margin: '-16px -20px 14px',
      }}>
        <span style={{ fontSize: 22 }}>🎂</span>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#FFF' }}>
          Chúc mừng sinh nhật{post.targetName && <span style={{ fontWeight: 800 }}> {post.targetName}</span>}
        </div>
      </div>
    );
  }

  return null;
}

// ─── PostCard ─────────────────────────────────────────────────────────────────

function PostCard({ post, currentId, isAdmin }: { post: FeedPost; currentId?: string; isAdmin: boolean }) {
  const { message } = App.useApp();
  const { textPrimary, textMuted, bgCard, borderColor, isDark } = useThemePalette();
  const deleteMut = useDeleteFeedPost();
  const reactMut  = useReactFeedPost();

  const typeConf  = POST_TYPE_CONFIG[post.type];
  const isSpecial = post.type === 'ANNIVERSARY' || post.type === 'BIRTHDAY';

  const reactionMap: Record<string, number> = {};
  const myReactions = new Set<string>();
  for (const r of post.reactions) {
    reactionMap[r.emoji] = (reactionMap[r.emoji] ?? 0) + 1;
    if (r.user.id === currentId) myReactions.add(r.emoji);
  }

  const handleReact = async (emoji: string) => {
    try { await reactMut.mutateAsync({ id: post.id, emoji }); }
    catch { message.error('Không thể reaction'); }
  };

  const handleDelete = async () => {
    try { await deleteMut.mutateAsync(post.id); }
    catch { message.error('Xóa thất bại'); }
  };

  const canDelete = isAdmin || post.authorId === currentId;

  return (
    <Card
      style={{
        background: bgCard,
        border: `1px solid ${post.isPinned ? '#6366F1' : isSpecial ? `${typeConf.color}40` : borderColor}`,
        borderRadius: 12,
        marginBottom: 16,
        overflow: 'hidden',
        boxShadow: post.isPinned ? '0 0 0 2px rgba(99,102,241,0.15)' : isSpecial ? `0 4px 20px ${typeConf.color}25` : undefined,
      }}
      styles={{ body: { padding: '16px 20px' } }}
    >
      <SpecialHeader post={post} />

      {post.imageUrl && !isSpecial && (
        <div style={{ margin: '-16px -20px 14px', overflow: 'hidden' }}>
          <img src={post.imageUrl} alt="cover"
            style={{ width: '100%', height: 200, objectFit: 'cover', display: 'block' }}
            onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }}
          />
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <Space size={10} align="start">
          <div style={{
            width: 38, height: 38, borderRadius: '50%',
            background: getAvatarColor(post.author.name),
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0,
          }}>
            {getInitials(post.author.name)}
          </div>
          <div>
            <Space size={6} wrap>
              <Text strong style={{ fontSize: 14, color: textPrimary }}>{post.author.name}</Text>
              <Tag
                style={isDark ? { background: `${typeConf.color}20`, color: typeConf.color, borderColor: `${typeConf.color}40` } : undefined}
                color={isDark ? undefined : typeConf.color.replace('#', '')}
              >
                {typeConf.label}
              </Tag>
              {post.isPinned && (
                <Tooltip title="Đang ghim">
                  <PushpinOutlined style={{ color: '#6366F1', fontSize: 14 }} />
                </Tooltip>
              )}
            </Space>
            <div>
              <Text style={{ fontSize: 11, color: textMuted }}>{dayjs(post.createdAt).fromNow()}</Text>
            </div>
          </div>
        </Space>

        {canDelete && (
          <Popconfirm title="Xóa bài đăng này?" onConfirm={handleDelete} okText="Xóa" cancelText="Huỷ" okButtonProps={{ danger: true }}>
            <Button type="text" size="small" icon={<DeleteOutlined />} danger style={{ opacity: 0.6 }} />
          </Popconfirm>
        )}
      </div>

      {post.title && (
        <Text strong style={{ fontSize: 15, color: textPrimary, display: 'block', marginBottom: 6 }}>
          {post.title}
        </Text>
      )}
      <Paragraph
        style={{ color: textPrimary, marginBottom: 12, whiteSpace: 'pre-wrap' }}
        ellipsis={{ rows: 4, expandable: true, symbol: 'Xem thêm' }}
      >
        {post.content}
      </Paragraph>

      <Space size={6} wrap>
        {EMOJIS.map((emoji) => {
          const count  = reactionMap[emoji] ?? 0;
          const active = myReactions.has(emoji);
          return (
            <Button key={emoji} size="small"
              type={active ? 'primary' : 'default'} ghost={active}
              onClick={() => handleReact(emoji)} loading={reactMut.isPending}
              style={{ borderRadius: 20, fontSize: 13, padding: '0 10px' }}
            >
              {emoji}{count > 0 && <span style={{ marginLeft: 4 }}>{count}</span>}
            </Button>
          );
        })}
      </Space>
    </Card>
  );
}

// ─── ComposerBox ──────────────────────────────────────────────────────────────

function ComposerBox({ userName, onOpen }: { userName: string; onOpen: (type?: FeedPostType) => void }) {
  const { textMuted, bgCard, borderColor, isDark } = useThemePalette();

  return (
    <Card style={{ background: bgCard, borderColor, borderRadius: 12, marginBottom: 20 }} styles={{ body: { padding: '12px 16px' } }}>
      <Space style={{ width: '100%', marginBottom: 10 }} size={10}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: getAvatarColor(userName),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0,
        }}>
          {getInitials(userName)}
        </div>
        <div role="button" tabIndex={0}
          onClick={() => onOpen()} onKeyDown={(e) => e.key === 'Enter' && onOpen()}
          style={{
            flex: 1, height: 36, minWidth: 200,
            background: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9',
            borderRadius: 20, cursor: 'text',
            display: 'flex', alignItems: 'center',
            paddingLeft: 16, paddingRight: 16,
            color: textMuted, fontSize: 14,
            border: `1px solid ${borderColor}`,
            userSelect: 'none',
          }}
        >
          Đăng thông báo, vinh danh nhân viên...
        </div>
      </Space>

      <Divider style={{ margin: '0 0 8px' }} />

      <Space wrap>
        {([
          { type: 'ANNOUNCEMENT' as FeedPostType, icon: <NotificationOutlined style={{ color: '#3B82F6' }} />, label: 'Thông báo' },
          { type: 'KUDOS'        as FeedPostType, icon: <StarOutlined        style={{ color: '#10B981' }} />, label: 'Thành tích' },
          { type: 'ANNIVERSARY'  as FeedPostType, icon: <TrophyOutlined      style={{ color: '#F59E0B' }} />, label: 'Sự kiện' },
          { type: 'DOCUMENT'     as FeedPostType, icon: <FileTextOutlined    style={{ color: '#8B5CF6' }} />, label: 'Tin tức' },
        ]).map(({ type, icon, label }) => (
          <Button key={type} type="text" size="small" icon={icon} onClick={() => onOpen(type)} style={{ color: textMuted }}>
            {label}
          </Button>
        ))}
      </Space>
    </Card>
  );
}

// ─── LeftNav ──────────────────────────────────────────────────────────────────

// ─── RightSidebar ─────────────────────────────────────────────────────────────

function PersonRow({ name, sub, emoji, color }: { name: string; sub?: string; emoji: string; color?: string }) {
  const { textPrimary, textMuted, borderColor } = useThemePalette();
  const bg = color ?? getAvatarColor(name);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: `1px solid ${borderColor}` }}>
      <div style={{
        width: 30, height: 30, borderRadius: '50%', background: bg, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 700, color: '#fff',
      }}>
        {getInitials(name)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 12, fontWeight: 600, color: textPrimary, display: 'block' }} ellipsis>
          {name}
        </Text>
        {sub && <Text style={{ fontSize: 11, color: textMuted }}>{sub}</Text>}
      </div>
      <span style={{ fontSize: 15 }}>{emoji}</span>
    </div>
  );
}

function SidebarCard({
  title, icon, iconBg, children, empty,
}: {
  title: string;
  icon: React.ReactNode;
  iconBg: string;
  children?: React.ReactNode;
  empty?: string;
}) {
  const { textPrimary, textMuted, bgCard, borderColor } = useThemePalette();
  return (
    <Card
      title={
        <Space size={8}>
          <span style={{
            width: 22, height: 22, borderRadius: 6, background: iconBg,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, color: '#fff',
          }}>
            {icon}
          </span>
          <Text style={{ fontSize: 13, fontWeight: 700, color: textPrimary }}>{title}</Text>
        </Space>
      }
      style={{ background: bgCard, borderColor, borderRadius: 12 }}
      styles={{ body: { padding: '4px 16px 10px' }, header: { borderColor, padding: '10px 16px', minHeight: 0 } }}
    >
      {children ?? <Text style={{ fontSize: 12, color: textMuted }}>{empty ?? 'Không có dữ liệu'}</Text>}
    </Card>
  );
}

function RightSidebar({ todayEvents, announcementPosts }: {
  todayEvents: TodayEvents | undefined;
  announcementPosts: FeedPost[];
}) {
  const navigate = useNavigate();
  const { textPrimary, textMuted, bgCard, borderColor, isDark } = useThemePalette();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Quick Access */}
      <Card
        title={<Text style={{ fontSize: 13, fontWeight: 700, color: textPrimary }}>Truy cập nhanh</Text>}
        style={{ background: bgCard, borderColor, borderRadius: 12 }}
        styles={{ body: { padding: '12px 16px' }, header: { borderColor, padding: '10px 16px', minHeight: 0 } }}
      >
        <Row gutter={[8, 8]}>
          {QUICK_ACCESS.map((item) => (
            <Col span={6} key={item.label}>
              <div
                onClick={() => navigate(item.path)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  gap: 4, padding: '10px 4px', borderRadius: 10, cursor: 'pointer',
                  background: isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC',
                  border: `1px solid ${borderColor}`, textAlign: 'center',
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: 18, color: item.color }}>{item.icon}</span>
                <Text style={{ fontSize: 10, color: textMuted, lineHeight: 1.2 }}>{item.label}</Text>
              </div>
            </Col>
          ))}
        </Row>
      </Card>

      {/* Sinh nhật trong ngày */}
      <SidebarCard title="Sinh nhật hôm nay" icon="🎂" iconBg="#F59E0B" empty="Không có sinh nhật hôm nay">
        {todayEvents?.birthdays.length ? todayEvents.birthdays.map((p) => (
          <PersonRow key={p.id} name={p.name} sub={p.dept} emoji="🎉" />
        )) : undefined}
      </SidebarCard>

      {/* Onboard trong ngày */}
      <SidebarCard title="Nhân viên mới hôm nay" icon={<UserAddOutlined />} iconBg="#10B981" empty="Không có nhân viên mới hôm nay">
        {todayEvents?.newHires.length ? todayEvents.newHires.map((p) => (
          <PersonRow key={p.id} name={p.name} sub={p.dept} emoji="👋" color="#10B981" />
        )) : undefined}
      </SidebarCard>

      {/* Thâm niên trong ngày */}
      <SidebarCard title="Kỷ niệm thâm niên" icon={<TrophyOutlined />} iconBg="#8B5CF6" empty="Không có kỷ niệm thâm niên hôm nay">
        {todayEvents?.anniversaries.length ? todayEvents.anniversaries.map((p) => (
          <PersonRow key={p.id} name={p.name} sub={`${p.years} năm gắn bó · ${p.dept}`} emoji="🏆" color="#8B5CF6" />
        )) : undefined}
      </SidebarCard>

      {/* Sự kiện sắp tới */}
      <SidebarCard title="Sự kiện sắp tới" icon={<CalendarOutlined />} iconBg="#3B82F6" empty="Chưa có sự kiện nào">
        {announcementPosts.length ? announcementPosts.slice(0, 4).map((post) => (
          <div key={post.id} style={{ display: 'flex', gap: 10, padding: '7px 0', borderBottom: `1px solid ${borderColor}` }}>
            <div style={{
              minWidth: 38, height: 38, borderRadius: 8,
              background: 'linear-gradient(135deg, #3B82F6, #6366F1)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{ fontSize: 13, fontWeight: 800, color: '#FFF', lineHeight: 1 }}>
                {dayjs(post.createdAt).format('DD')}
              </Text>
              <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.85)', lineHeight: 1.2 }}>
                {dayjs(post.createdAt).format('MMM').toUpperCase()}
              </Text>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: 12, fontWeight: 600, color: textPrimary, display: 'block' }} ellipsis>
                {post.title || post.content.slice(0, 40)}
              </Text>
              <Space size={4}>
                <EnvironmentOutlined style={{ fontSize: 10, color: textMuted }} />
                <Text style={{ fontSize: 11, color: textMuted }}>Loop HQ</Text>
              </Space>
            </div>
          </div>
        )) : undefined}
      </SidebarCard>

      {/* Survey — placeholder */}
      <Card
        style={{ background: bgCard, borderColor, borderRadius: 12, overflow: 'hidden' }}
        styles={{ body: { padding: 0 } }}
      >
        <div style={{
          background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
          padding: '14px 16px',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <FormOutlined style={{ fontSize: 18, color: '#fff' }} />
          <div>
            <Text style={{ fontSize: 13, fontWeight: 700, color: '#fff', display: 'block' }}>Khảo sát nội bộ</Text>
            <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>Sắp ra mắt</Text>
          </div>
        </div>
        <div style={{ padding: '10px 16px' }}>
          <Text style={{ fontSize: 12, color: textMuted }}>
            Tính năng khảo sát nhân viên đang được phát triển. Sẽ sớm có mặt trên Loop 360.
          </Text>
        </div>
      </Card>
    </div>
  );
}

// ─── FeedPage ─────────────────────────────────────────────────────────────────

export default function FeedPage() {
  const { message } = App.useApp();
  const { user } = useAuthStore();

  const [activeTab, setActiveTab]   = useState<string>('all');
  const [page, setPage]             = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [form]                      = Form.useForm();
  const [previewType, setPreviewType] = useState<FeedPostType>('ANNOUNCEMENT');
  const [imgPreview, setImgPreview]   = useState('');

  const feedType = activeTab === 'all' ? undefined : (activeTab as FeedPostType);

  const { data: feed, isLoading }  = useGetFeedPosts(page, 20, feedType);
  const { data: announcementFeed } = useGetFeedPosts(1, 10, 'ANNOUNCEMENT');
  const createMut                  = useCreateFeedPost();

  const { data: peopleData }    = useQuery({ queryKey: ['dashboard-people'],     queryFn: dashboardV3Api.getPeople,      refetchInterval: 60_000 });
  const { data: todayEvents }   = useQuery({ queryKey: ['dashboard-today-events'], queryFn: dashboardV3Api.getTodayEvents, refetchInterval: 300_000 });

  const { can } = usePermissions();
  const canPost = can('feed:create');

  const openCreate = useCallback((type: FeedPostType = 'ANNOUNCEMENT') => {
    form.setFieldValue('type', type);
    setPreviewType(type);
    setCreateOpen(true);
  }, [form]);

  const closeCreate = () => {
    setCreateOpen(false);
    form.resetFields();
    setImgPreview('');
    setPreviewType('ANNOUNCEMENT');
  };

  const handleCreate = async (values: {
    type: FeedPostType; title?: string; content: string;
    isPinned?: boolean; imageUrl?: string; targetName?: string; targetYears?: number;
  }) => {
    try {
      await createMut.mutateAsync({
        type: values.type, title: values.title, content: values.content,
        isPinned: values.isPinned ?? false, imageUrl: values.imageUrl || undefined,
        targetName: values.targetName || undefined, targetYears: values.targetYears,
      });
      message.success('Đã đăng bài');
      closeCreate();
    } catch {
      message.error('Đăng bài thất bại');
    }
  };

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    setPage(1);
  };

  const needsTargetFields = previewType === 'ANNIVERSARY' || previewType === 'BIRTHDAY';
  const isAdmin = ['ADMIN', 'LEADERSHIP'].includes(user?.role ?? '');

  const { textMuted, bgCard, borderColor } = useThemePalette();
  const navigate = useNavigate();

  return (
    <div style={{ padding: '16px 24px', maxWidth: 1400, margin: '0 auto' }}>
      <PageHeader title="Bảng tin" icon={<TeamOutlined />} iconColor="#6366F1" />

      {/* HR Stat Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={6}>
          <StatCard label="Tổng nhân sự" value={peopleData?.headcount ?? 0} color="#8B5CF6" icon={<TeamOutlined />} onClick={() => navigate('/personnel')} />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard label="Vị trí đang tuyển" value={peopleData?.openPositions ?? 0} color="#3B82F6" icon={<UserAddOutlined />} onClick={() => navigate('/recruit/jobs')} />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard label="Nghỉ phép chờ duyệt" value={peopleData?.pendingLeaves ?? 0} color="#F59E0B" icon={<PauseCircleOutlined />} />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard label="HĐ sắp hết hạn" value={peopleData?.expiringContracts ?? 0} color="#EF4444" icon={<FileTextOutlined />} onClick={() => navigate('/contracts')} />
        </Col>
      </Row>

      {/* 2-column layout */}
      <Row gutter={20} align="top">
        {/* Main Feed */}
        <Col xs={24} xl={17} style={{ minWidth: 0 }}>
          {/* Banner Carousel */}
          <div style={{ borderRadius: 12, overflow: 'hidden', marginBottom: 20 }}>
            <Carousel autoplay autoplaySpeed={4000} dots={{ className: 'feed-carousel-dots' }}>
              {/* Slide chào mừng cá nhân hoá */}
              <div>
                <div style={{
                  background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)', height: 140,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0 32px',
                }}>
                  <div>
                    <Title level={4} style={{ color: '#FFF', margin: 0, fontSize: 20 }}>
                      Chào mừng, {user?.name?.split(' ').pop() ?? user?.name ?? 'bạn'}! 👋
                    </Title>
                    <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>
                      Nền tảng quản trị 360° cho doanh nghiệp hiện đại
                    </Text>
                  </div>
                  <span style={{ fontSize: 52 }}>🚀</span>
                </div>
              </div>
              {BANNER_SLIDES_STATIC.map((slide, i) => (
                <div key={i}>
                  <div style={{
                    background: slide.bg, height: 140,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0 32px',
                  }}>
                    <div>
                      <Title level={4} style={{ color: '#FFF', margin: 0, fontSize: 20 }}>{slide.title}</Title>
                      <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>{slide.sub}</Text>
                    </div>
                    <span style={{ fontSize: 52 }}>{slide.icon}</span>
                  </div>
                </div>
              ))}
            </Carousel>
          </div>

          {/* Composer */}
          {canPost && <ComposerBox userName={user?.name ?? ''} onOpen={openCreate} />}

          {/* Tabs + Filter */}
          <div style={{
            background: bgCard, borderRadius: 12, marginBottom: 16,
            border: `1px solid ${borderColor}`, overflow: 'hidden',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px' }}>
              <Tabs
                activeKey={activeTab}
                onChange={handleTabChange}
                size="small"
                style={{ flex: 1 }}
                items={[
                  { key: 'all',          label: 'Tất cả' },
                  { key: 'ANNOUNCEMENT', label: 'Thông báo' },
                  { key: 'DOCUMENT',     label: 'Tin tức' },
                  { key: 'ANNIVERSARY',  label: 'Sự kiện' },
                  { key: 'KUDOS',        label: 'Thành tích' },
                  { key: 'BIRTHDAY',     label: 'Sinh nhật' },
                ]}
              />
              <Button size="small" icon={<FilterOutlined />} style={{ flexShrink: 0 }}>
                Bộ lọc
              </Button>
            </div>
          </div>

          {/* Feed List */}
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Spin size="large" />
            </div>
          ) : !feed?.data?.length ? (
            <Empty description="Chưa có bài đăng nào" style={{ padding: '40px 0' }} />
          ) : (
            feed.data.map((post) => (
              <PostCard key={post.id} post={post} currentId={user?.id} isAdmin={isAdmin} />
            ))
          )}

          {/* Pagination */}
          {(feed?.totalPages ?? 0) > 1 && (
            <div style={{ textAlign: 'center', paddingBottom: 24 }}>
              <Space>
                <Button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Trước</Button>
                <Text style={{ color: textMuted }}>Trang {page} / {feed?.totalPages}</Text>
                <Button disabled={page >= (feed?.totalPages ?? 1)} onClick={() => setPage((p) => p + 1)}>Sau</Button>
              </Space>
            </div>
          )}
        </Col>

        {/* Right Sidebar */}
        <Col xs={24} xl={6} style={{ minWidth: 0 }}>
          <RightSidebar
            todayEvents={todayEvents}
            announcementPosts={announcementFeed?.data ?? []}
          />
        </Col>
      </Row>

      {/* Modal tạo bài */}
      <CenteredModal
        open={createOpen}
        title="Đăng bài mới"
        width={560}
        onClose={closeCreate}
        footer={
          <Space style={{ justifyContent: 'flex-end', width: '100%' }}>
            <Button onClick={closeCreate}>Huỷ</Button>
            <Button type="primary" loading={createMut.isPending} onClick={() => form.submit()}>
              Đăng bài
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}
          onValuesChange={(changed) => {
            if (changed.type) setPreviewType(changed.type);
            if ('imageUrl' in changed) setImgPreview(changed.imageUrl ?? '');
          }}
        >
          <Form.Item name="type" label="Loại bài đăng"
            rules={[{ required: true, message: 'Chọn loại bài đăng' }]}
            initialValue="ANNOUNCEMENT"
          >
            <Select
              options={Object.entries(POST_TYPE_CONFIG).map(([value, conf]) => ({
                value,
                label: <Space size={6}>{conf.icon}<span>{conf.label}</span></Space>,
              }))}
            />
          </Form.Item>

          {needsTargetFields && (
            <Form.Item name="targetName" label="Tên nhân viên được vinh danh">
              <Input placeholder="Nguyễn Văn A" maxLength={200} />
            </Form.Item>
          )}

          {previewType === 'ANNIVERSARY' && (
            <Form.Item name="targetYears" label="Số năm thâm niên">
              <InputNumber min={1} max={50} placeholder="5" style={{ width: '100%' }} suffix="năm" />
            </Form.Item>
          )}

          <Form.Item name="title" label="Tiêu đề">
            <Input placeholder="Tiêu đề bài đăng (không bắt buộc)" maxLength={300} />
          </Form.Item>

          <Form.Item name="content" label="Nội dung" rules={[{ required: true, message: 'Nhập nội dung' }]}>
            <Input.TextArea rows={4} placeholder="Nội dung bài đăng..." showCount maxLength={2000} />
          </Form.Item>

          <Form.Item name="imageUrl" label="Ảnh bìa (URL)">
            <Input placeholder="https://images.unsplash.com/..." maxLength={500} />
          </Form.Item>

          {imgPreview && (
            <div style={{ marginBottom: 16, borderRadius: 8, overflow: 'hidden', maxHeight: 160 }}>
              <img src={imgPreview} alt="preview"
                style={{ width: '100%', maxHeight: 160, objectFit: 'cover', display: 'block' }}
                onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }}
              />
            </div>
          )}

          <Form.Item name="isPinned" label="Ghim bài đăng?" initialValue={false}>
            <Select
              options={[
                { value: false, label: 'Không ghim' },
                { value: true,  label: '📌 Ghim lên đầu' },
              ]}
            />
          </Form.Item>
        </Form>
      </CenteredModal>
    </div>
  );
}
