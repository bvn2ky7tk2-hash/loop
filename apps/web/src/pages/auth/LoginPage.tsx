import { useState } from 'react';
import axios from 'axios';
import { Form, Input, Button, Typography, Alert, Tooltip } from 'antd';
import { SunOutlined, MoonOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../api/auth';
import { useAuthStore } from '../../store/auth.store';
import { useThemeStore } from '../../store/theme.store';

const { Title, Text } = Typography;

const FEATURES = [
  'Quản lý dự án với Kanban & Gantt trực quan',
  'Tự động hoá quy trình làm việc với BPMN',
  'Theo dõi chi phí, thời gian & báo cáo thực tế',
];

export default function LoginPage() {
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);
  const mode = useThemeStore((s) => s.mode);
  const toggleTheme = useThemeStore((s) => s.toggle);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const isDark = mode === 'dark';

  const onFinish = async ({ email, password }: { email: string; password: string }) => {
    setError('');
    setLoading(true);
    try {
      const profile = await authApi.login(email, password);
      setUser(profile);
      navigate('/', { replace: true });
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        if (status === 401) {
          setError('Email hoặc mật khẩu không đúng');
        } else if (status === 429) {
          setError('Quá nhiều lần thử. Vui lòng chờ 1 phút rồi thử lại.');
        } else if (!err.response) {
          setError('Không thể kết nối đến server. Kiểm tra backend đã chạy chưa.');
        } else {
          setError(`Lỗi server (${status ?? 'unknown'}). Vui lòng thử lại.`);
        }
      } else {
        setError('Đã xảy ra lỗi không xác định.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex' }}>

      {/* ── Left visual panel ── */}
      <div
        style={{
          flex: '0 0 55%',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '48px 56px',
          background: isDark
            ? 'linear-gradient(145deg, #0d1117 0%, #13103a 55%, #0c1a2e 100%)'
            : 'linear-gradient(145deg, #4F46E5 0%, #7C3AED 45%, #0891B2 100%)',
        }}
      >
        {/* Dark mode: network SVG overlay */}
        {isDark && (
          <img
            src="/login-background.svg"
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              pointerEvents: 'none',
            }}
          />
        )}

        {/* Light mode: dot-grid pattern + glow blobs */}
        {!isDark && (
          <>
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.22) 1px, transparent 1px)',
              backgroundSize: '28px 28px',
              pointerEvents: 'none',
            }} />
            <div style={{
              position: 'absolute', top: -100, right: -100,
              width: 380, height: 380, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,255,255,0.18) 0%, transparent 65%)',
              pointerEvents: 'none',
            }} />
            <div style={{
              position: 'absolute', bottom: -80, left: -80,
              width: 340, height: 340, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,255,255,0.13) 0%, transparent 65%)',
              pointerEvents: 'none',
            }} />
            <div style={{
              position: 'absolute', top: '35%', left: '25%',
              width: 460, height: 460, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,255,255,0.07) 0%, transparent 60%)',
              pointerEvents: 'none',
            }} />
          </>
        )}

        {/* Top: wordmark */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img
              src="/logo-icon.svg"
              alt="Loop"
              style={{ width: 36, height: 36, filter: 'brightness(0) invert(1)' }}
            />
            <span style={{ fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: '-0.3px' }}>
              Loop
            </span>
          </div>
        </div>

        {/* Center: headline + features */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1 style={{
            fontSize: 42,
            fontWeight: 800,
            color: '#fff',
            lineHeight: 1.15,
            margin: '0 0 20px',
            letterSpacing: '-1.5px',
          }}>
            Quản lý dự án<br />
            <span style={{
              background: 'linear-gradient(90deg, #A5F3FC 0%, #C4B5FD 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              & quy trình làm việc
            </span>
          </h1>

          <p style={{
            fontSize: 15,
            color: 'rgba(255,255,255,0.70)',
            maxWidth: 380,
            lineHeight: 1.75,
            margin: '0 0 40px',
          }}>
            Một nền tảng duy nhất để quản lý dự án, tự động hoá quy trình và theo dõi hiệu suất toàn đội nhóm.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {FEATURES.map((f) => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                  background: 'rgba(255,255,255,0.12)',
                  border: '1px solid rgba(255,255,255,0.28)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#A5F3FC' }} />
                </div>
                <span style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.82)' }}>{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom: copyright */}
        <div style={{ position: 'relative', zIndex: 1, fontSize: 12, color: 'rgba(255,255,255,0.30)' }}>
          © 2026 Loop.vn · All rights reserved
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 48px',
        background: isDark ? '#161b22' : '#ffffff',
        position: 'relative',
      }}>
        {/* Subtle top accent line */}
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: 3,
          background: 'linear-gradient(90deg, #4F46E5, #7C3AED, #0891B2)',
        }} />

        {/* Theme toggle */}
        <Tooltip title={isDark ? 'Chuyển sang Light mode' : 'Chuyển sang Dark mode'} placement="left">
          <button
            onClick={toggleTheme}
            style={{
              position: 'absolute',
              top: 20,
              right: 20,
              width: 36,
              height: 36,
              borderRadius: '50%',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)'}`,
              background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
              color: isDark ? '#8b949e' : '#6b7280',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
              transition: 'all 0.2s',
            }}
          >
            {isDark ? <SunOutlined /> : <MoonOutlined />}
          </button>
        </Tooltip>

        <div style={{ width: '100%', maxWidth: 380 }}>
          {/* Header */}
          <div style={{ marginBottom: 36 }}>
            <Title level={3} style={{
              margin: '0 0 6px',
              fontSize: 24,
              fontWeight: 700,
              color: isDark ? '#e6edf3' : '#111827',
            }}>
              Chào mừng trở lại
            </Title>
            <Text style={{ color: isDark ? '#8b949e' : '#6b7280', fontSize: 14 }}>
              Đăng nhập để tiếp tục vào Loop
            </Text>
          </div>

          {error && (
            <Alert message={error} type="error" showIcon style={{ marginBottom: 20 }} />
          )}

          <Form
            layout="vertical"
            autoComplete="off"
            initialValues={{ email: 'admin@loop.vn', password: 'admin' }}
            onFinish={onFinish}
          >
            <Form.Item
              label="Email"
              name="email"
              rules={[
                { required: true, message: 'Vui lòng nhập email' },
                { type: 'email', message: 'Email không hợp lệ' },
              ]}
            >
              <Input size="large" placeholder="email@company.com" />
            </Form.Item>

            <Form.Item
              label="Mật khẩu"
              name="password"
              rules={[{ required: true, message: 'Vui lòng nhập mật khẩu' }]}
              style={{ marginBottom: 28 }}
            >
              <Input.Password size="large" placeholder="••••••••" />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0 }}>
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                block
                loading={loading}
                style={{
                  height: 48,
                  fontSize: 15,
                  fontWeight: 600,
                  border: 'none',
                  background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
                  boxShadow: '0 4px 20px rgba(79,70,229,0.35)',
                }}
              >
                Đăng nhập
              </Button>
            </Form.Item>
          </Form>

          {/* Footer note */}
          <div style={{
            marginTop: 32,
            paddingTop: 24,
            borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'}`,
            textAlign: 'center',
            fontSize: 12,
            color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.35)',
          }}>
            Quản lý dự án & quy trình · Loop.vn
          </div>
        </div>
      </div>
    </div>
  );
}
