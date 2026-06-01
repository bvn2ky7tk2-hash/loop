import { useState } from 'react';
import axios from 'axios';
import { Form, Input, Button, Typography, Alert, Checkbox } from 'antd';
import { SunOutlined, MoonOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../api/auth';
import { useAuthStore } from '../../store/auth.store';
import { useThemeStore } from '../../store/theme.store';
import { useThemePalette } from '../../hooks/useThemePalette';

const { Title, Text } = Typography;

// ─── Feature items ────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="#fff"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>,
    title: 'Quản lý tập trung',
    desc: 'Kết nối mọi phòng ban\ntrên một nền tảng duy nhất',
  },
  {
    icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="#fff"><path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/></svg>,
    title: 'Dữ liệu minh bạch',
    desc: 'Báo cáo trực quan,\nra quyết định nhanh chóng',
  },
  {
    icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="#fff"><path d="M7 2v11h3v9l7-12h-4l4-8z"/></svg>,
    title: 'Tự động hóa thông minh',
    desc: 'Tối ưu quy trình,\ntăng hiệu suất vận hành',
  },
];

// ─── Donut + App mockup ───────────────────────────────────────────────────────
function AppMockup() {
  // Donut chart (62% hoàn thành)
  const r = 28, cx = 36, cy = 36;
  const C = 2 * Math.PI * r; // ≈ 175.9
  const segs = [
    { pct: 0.62, color: '#3B82F6', label: 'Hoàn thành' },
    { pct: 0.20, color: '#F59E0B', label: 'Đang làm' },
    { pct: 0.10, color: '#CBD5E1', label: 'Chờ duyệt' },
    { pct: 0.08, color: '#EF4444', label: 'Quá hạn' },
  ];
  let cum = 0;
  const arcs = segs.map((s) => {
    const a = { ...s, dashLen: s.pct * C, offset: -(cum * C) };
    cum += s.pct;
    return a;
  });

  // Sparkline chart
  const cW = 178, cH = 44;
  const pts = [20, 48, 32, 65, 44, 80, 36, 90, 58, 82, 70, 78];
  const maxV = Math.max(...pts), minV = Math.min(...pts), rng = maxV - minV || 1;
  const polyPts = pts
    .map((v, i) => `${(i / (pts.length - 1)) * cW},${cH - ((v - minV) / rng) * (cH - 5)}`)
    .join(' ');
  const areaPts = `0,${cH} ${polyPts} ${cW},${cH}`;
  const tipX = (4 / (pts.length - 1)) * cW;
  const tipY = cH - ((pts[4] - minV) / rng) * (cH - 5);

  const menu = [
    { label: 'Tổng quan',        active: true },
    { label: 'Công việc',        active: false },
    { label: 'Dự án',            active: false },
    { label: 'Nhân sự',          active: false },
    { label: 'Khách hàng (CRM)', active: false },
    { label: 'Tài chính',        active: false },
    { label: 'Báo cáo',          active: false },
    { label: 'Cài đặt',          active: false },
  ];

  const tasks = [
    { name: 'Thiết kế giao diện Dashboard', status: 'Đang làm',  color: '#F59E0B' },
    { name: 'Tối ưu hiệu năng hệ thống',    status: 'Đang làm',  color: '#F59E0B' },
    { name: 'Xây dựng tính năng báo cáo',   status: 'Chờ duyệt', color: '#6366F1' },
    { name: 'Kiểm thử & Fix bug',           status: 'Hoàn thành',color: '#10B981' },
  ];

  return (
    /* wrapper: padding-bottom/left nhường chỗ cho floating card */
    <div style={{ position: 'relative', paddingBottom: 44, paddingLeft: 24 }}>

      {/* ── Browser frame ── */}
      <div style={{
        borderRadius: 14, overflow: 'hidden',
        boxShadow: '0 28px 72px rgba(0,0,0,0.52)',
        border: '1px solid rgba(255,255,255,0.13)',
        display: 'flex', height: 342,
      }}>
        {/* Sidebar */}
        <div style={{
          width: 136, background: '#1E3A8A', flexShrink: 0,
          display: 'flex', flexDirection: 'column', padding: '12px 0',
        }}>
          <div style={{ padding: '0 12px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <img src="/logo-icon.svg" alt="" style={{ width: 18, height: 18, filter: 'brightness(0) invert(1)' }}/>
            <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>Loop</span>
          </div>
          {menu.map(({ label, active }) => (
            <div key={label} style={{
              padding: '6px 14px', fontSize: 9,
              color: active ? '#fff' : 'rgba(255,255,255,0.60)',
              fontWeight: active ? 600 : 400,
              background: active ? 'rgba(255,255,255,0.14)' : 'transparent',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <div style={{
                width: 10, height: 10, borderRadius: 2, flexShrink: 0,
                background: active ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.18)',
              }}/>
              {label}
            </div>
          ))}
        </div>

        {/* Content area */}
        <div style={{ flex: 1, background: '#EEF2FF', padding: '10px', overflow: 'hidden' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#111827', marginBottom: 9 }}>Tổng quan</div>

          {/* Stat cards */}
          <div style={{ display: 'flex', gap: 7, marginBottom: 9 }}>
            {[
              { label: 'Tổng công việc', val: '1.248', delta: '↑ 12.5% so với tuần trước' },
              { label: 'Dự án đang triển khai', val: '36', delta: '↑ 8.3% so với tuần trước' },
            ].map((c) => (
              <div key={c.label} style={{
                flex: 1, background: '#fff', borderRadius: 7, padding: '7px 9px',
                boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
              }}>
                <div style={{ fontSize: 7, color: '#94A3B8' }}>{c.label}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#111827', lineHeight: 1.2 }}>{c.val}</div>
                <div style={{ fontSize: 7, color: '#10B981', marginTop: 2 }}>{c.delta}</div>
              </div>
            ))}
          </div>

          {/* Sparkline */}
          <div style={{
            background: '#fff', borderRadius: 7, padding: '7px 9px',
            marginBottom: 9, boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          }}>
            <div style={{ fontSize: 7, color: '#94A3B8', marginBottom: 4 }}>Biểu đồ công việc</div>
            <svg viewBox={`0 0 ${cW} ${cH}`} style={{ width: '100%', height: 40 }}>
              <defs>
                <linearGradient id="lg1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.22"/>
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity="0"/>
                </linearGradient>
              </defs>
              <polygon points={areaPts} fill="url(#lg1)"/>
              <polyline points={polyPts} fill="none" stroke="#3B82F6" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx={tipX} cy={tipY} r="3.2" fill="#3B82F6"/>
              <rect x={tipX - 21} y={tipY - 16} width="43" height="13" rx="3" fill="#1E3A8A"/>
              <text x={tipX + 1} y={tipY - 7} textAnchor="middle" fill="#fff" fontSize="5.5" fontWeight="600">T5: 328 cv</text>
            </svg>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
              {['T2','T3','T4','T5','T6','T7','CN'].map((d) => (
                <span key={d} style={{ fontSize: 6.5, color: '#94A3B8' }}>{d}</span>
              ))}
            </div>
          </div>

          {/* Task list */}
          <div style={{
            background: '#fff', borderRadius: 7, padding: '7px 9px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          }}>
            <div style={{ fontSize: 8, fontWeight: 600, color: '#94A3B8', marginBottom: 5 }}>Bảng công việc</div>
            <div style={{ display: 'flex', borderBottom: '1px solid #F1F5F9', paddingBottom: 3, marginBottom: 3 }}>
              <span style={{ flex: 1, fontSize: 7, color: '#94A3B8' }}>Tên công việc</span>
              <span style={{ width: 52, fontSize: 7, color: '#94A3B8' }}>Người phụ trách</span>
            </div>
            {tasks.map((t) => (
              <div key={t.name} style={{
                display: 'flex', alignItems: 'center',
                padding: '3px 0', borderBottom: '1px solid #F8FAFC',
              }}>
                <span style={{
                  flex: 1, fontSize: 7.5, color: '#111827',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{t.name}</span>
                <span style={{
                  fontSize: 6.5, padding: '1.5px 6px', borderRadius: 4, flexShrink: 0,
                  background: t.color + '22', color: t.color, fontWeight: 600,
                }}>{t.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Floating donut card ── */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0,
        background: '#fff', borderRadius: 14,
        padding: '12px 14px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
        width: 158,
      }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: '#111827', marginBottom: 8 }}>
          Tỷ lệ công việc
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="72" height="72" viewBox="0 0 72 72">
            {arcs.map((arc, i) => (
              <circle key={i}
                cx={cx} cy={cy} r={r}
                fill="none"
                stroke={arc.color}
                strokeWidth="10"
                strokeDasharray={`${arc.dashLen} ${C}`}
                strokeDashoffset={arc.offset}
                transform="rotate(-90 36 36)"
                strokeLinecap="butt"
              />
            ))}
            <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle"
              fontSize="11" fontWeight="700" fill="#111827">62%</text>
          </svg>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {arcs.map((a) => (
              <div key={a.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: a.color, flexShrink: 0 }}/>
                <span style={{ fontSize: 7, color: '#94A3B8' }}>{a.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Login page ───────────────────────────────────────────────────────────────
export default function LoginPage() {
  const navigate    = useNavigate();
  const setUser     = useAuthStore((s) => s.setUser);
  const toggleTheme = useThemeStore((s) => s.toggle);
  const { isDark, textPrimary, textMuted: textSecondary, borderColor, linkColor, preset } = useThemePalette();
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const bgRight = isDark ? '#161b22' : '#ffffff';
  const rememberedEmail = typeof window !== 'undefined' ? localStorage.getItem('loop_remembered_email') : null;

  const onFinish = async ({ email, password, remember }: { email: string; password: string; remember?: boolean }) => {
    setError('');
    setLoading(true);
    try {
      const profile = await authApi.login(email, password);
      if (remember) localStorage.setItem('loop_remembered_email', email);
      else localStorage.removeItem('loop_remembered_email');
      setUser(profile);
      navigate('/', { replace: true });
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        if (status === 401)      setError('Email hoặc mật khẩu không đúng');
        else if (status === 429) setError('Quá nhiều lần thử. Vui lòng chờ 1 phút rồi thử lại.');
        else if (!err.response)  setError('Không thể kết nối đến server. Kiểm tra backend đã chạy chưa.');
        else                     setError(`Lỗi server (${status ?? 'unknown'}). Vui lòng thử lại.`);
      } else {
        setError('Đã xảy ra lỗi không xác định.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @media (max-width: 1024px) { .login-left { display: none !important; } }
      `}</style>

      <div style={{ minHeight: '100vh', display: 'flex', overflow: 'hidden' }}>

        {/* ══ LEFT PANEL ═══════════════════════════════════════════════════ */}
        <div
          className="login-left"
          style={{
            flex: '0 0 58%',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            padding: '40px 48px',
            background: 'linear-gradient(150deg, #0B1D58 0%, #1B3A9A 48%, #0D2070 100%)',
          }}
        >
          {/* Glow orbs */}
          <div style={{
            position: 'absolute', top: -140, right: -80, width: 420, height: 420,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(100,130,255,0.22) 0%, transparent 65%)',
            pointerEvents: 'none',
          }}/>
          <div style={{
            position: 'absolute', bottom: -80, left: -60, width: 360, height: 360,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(59,130,246,0.18) 0%, transparent 65%)',
            pointerEvents: 'none',
          }}/>

          {/* Logo */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <img src="/logo-full.svg" alt="Loop" style={{ height: 56, filter: 'brightness(0) invert(1)' }}/>
          </div>

          {/* Body: text-left + mockup-right */}
          <div style={{
            position: 'relative', zIndex: 1,
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 32,
            marginTop: 24,
          }}>
            {/* Text column */}
            <div style={{ flex: '0 0 41%', paddingBottom: 44 }}>
              <h1 style={{
                fontSize: 29, fontWeight: 800, color: '#fff',
                margin: '0 0 12px', lineHeight: 1.25, letterSpacing: '-0.3px',
              }}>
                Kết nối công việc, nhân sự và vận hành
              </h1>
              <p style={{
                fontSize: 12.5, color: 'rgba(255,255,255,0.68)',
                margin: '0 0 30px', lineHeight: 1.8,
              }}>
                Nền tảng quản trị doanh nghiệp toàn diện giúp bạn vận hành hiệu quả hơn mỗi ngày.
              </p>

              {FEATURES.map((f) => (
                <div key={f.title} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 18 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 11, flexShrink: 0,
                    background: 'rgba(255,255,255,0.11)',
                    border: '1px solid rgba(255,255,255,0.18)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {f.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: '#fff', marginBottom: 2 }}>
                      {f.title}
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.62)', lineHeight: 1.55 }}>
                      {f.desc.split('\n').map((line, i, arr) => (
                        <span key={i}>{line}{i < arr.length - 1 && <br/>}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Mockup column */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
              <AppMockup/>
            </div>
          </div>
        </div>

        {/* ══ RIGHT PANEL ══════════════════════════════════════════════════ */}
        <div style={{
          flex: 1,
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          background: bgRight,
        }}>
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            style={{
              position: 'absolute', top: 20, right: 20,
              width: 36, height: 36, borderRadius: 8,
              border: `1px solid ${borderColor}`,
              background: 'transparent',
              color: textSecondary, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
            }}
          >
            {isDark ? <SunOutlined/> : <MoonOutlined/>}
          </button>

          {/* Centered form */}
          <div style={{
            flex: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '60px 48px 40px',
          }}>
            <div style={{ width: '100%', maxWidth: 380 }}>

              {/* Logo */}
              <div style={{ textAlign: 'center', marginBottom: 28 }}>
                <img
                  src="/logo-full.svg"
                  alt="Loop"
                  style={{ height: 46, filter: isDark ? 'brightness(0) invert(1)' : 'none' }}
                />
              </div>

              {/* Heading */}
              <div style={{ textAlign: 'center', marginBottom: 28 }}>
                <Title level={3} style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 700, color: textPrimary }}>
                  Chào mừng trở lại!
                </Title>
                <Text style={{ color: textSecondary, fontSize: 14 }}>
                  Đăng nhập để tiếp tục sử dụng Loop
                </Text>
              </div>

              {error && (
                <Alert type="error" showIcon description={error}
                  style={{ marginBottom: 16, borderRadius: 8 }}/>
              )}

              <Form
                layout="vertical"
                autoComplete="off"
                initialValues={{ email: rememberedEmail ?? 'admin@loop.vn', password: 'admin', remember: true }}
                onFinish={onFinish}
              >
                <Form.Item
                  label={<span style={{ fontSize: 13, fontWeight: 500, color: textPrimary }}>Email</span>}
                  name="email"
                  rules={[
                    { required: true, message: 'Vui lòng nhập email' },
                    { type: 'email', message: 'Email không hợp lệ' },
                  ]}
                  style={{ marginBottom: 16 }}
                >
                  <Input size="large" placeholder="Nhập email của bạn" style={{ borderRadius: 10, height: 46 }}/>
                </Form.Item>

                {/* Password + forgot link */}
                <Form.Item style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: textPrimary }}>Mật khẩu</span>
                    <a style={{ fontSize: 12, color: linkColor, fontWeight: 500 }}>Quên mật khẩu?</a>
                  </div>
                  <Form.Item name="password" noStyle rules={[{ required: true, message: 'Vui lòng nhập mật khẩu' }]}>
                    <Input.Password size="large" placeholder="Nhập mật khẩu" style={{ borderRadius: 10, height: 46 }}/>
                  </Form.Item>
                </Form.Item>

                <Form.Item name="remember" valuePropName="checked" style={{ marginBottom: 24 }}>
                  <Checkbox style={{ fontSize: 13, color: textSecondary }}>Ghi nhớ đăng nhập</Checkbox>
                </Form.Item>

                <Form.Item style={{ marginBottom: 0 }}>
                  <Button
                    type="primary" htmlType="submit" size="large" block loading={loading}
                    style={{
                      height: 48, fontSize: 15, fontWeight: 600,
                      border: 'none', borderRadius: 10,
                      background: preset.primary,
                      boxShadow: `0 4px 20px ${preset.primary}44`,
                    }}
                  >
                    Đăng nhập
                  </Button>
                </Form.Item>
              </Form>
            </div>
          </div>

          {/* Footer */}
          <div style={{
            padding: '14px', textAlign: 'center',
            fontSize: 11, color: isDark ? 'rgba(255,255,255,0.2)' : '#CBD5E1',
          }}>
            © 2024 Loop. All rights reserved.
          </div>
        </div>
      </div>
    </>
  );
}
