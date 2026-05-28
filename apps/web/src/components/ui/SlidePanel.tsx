import { useEffect, useRef, type ReactNode, type CSSProperties } from 'react';
import { Button, Spin } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import { useThemeStore } from '../../store/theme.store';

interface SlidePanelProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  subtitle?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  width?: number;
  loading?: boolean;
  style?: CSSProperties;
}

export function SlidePanel({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = 480,
  loading = false,
  style,
}: SlidePanelProps) {
  const panelRef   = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<Element | null>(null);
  const { mode }   = useThemeStore();
  const isDark     = mode === 'dark';

  const panelBg      = isDark ? '#1E293B' : '#ffffff';
  const headerBorder = isDark ? '#334155' : '#E2E8F0';
  const titleColor   = isDark ? '#F1F5F9' : '#0F172A';
  const subColor     = isDark ? 'rgba(255,255,255,0.45)' : '#6B7280';
  const footerBg     = isDark ? '#1A2744' : '#F8FAFC';

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      triggerRef.current = document.activeElement;
      setTimeout(() => panelRef.current?.focus(), 50);
    } else {
      (triggerRef.current as HTMLElement | null)?.focus?.();
    }
  }, [open]);

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.45)',
          zIndex: 199,
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 220ms ease',
        }}
      />

      {/* Panel — centered dialog */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : 'Panel'}
        tabIndex={-1}
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          width,
          maxWidth: 'calc(100vw - 48px)',
          maxHeight: '85vh',
          background: panelBg,
          borderRadius: 12,
          boxShadow: isDark
            ? '0 24px 48px rgba(0,0,0,0.6), 0 8px 16px rgba(0,0,0,0.4)'
            : '0 24px 48px rgba(0,0,0,0.18), 0 8px 16px rgba(0,0,0,0.08)',
          zIndex: 200,
          display: 'flex',
          flexDirection: 'column',
          transform: open ? 'translate(-50%, -50%) scale(1)' : 'translate(-50%, -48%) scale(0.97)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'transform 250ms cubic-bezier(0.32,0.72,0,1), opacity 200ms ease',
          outline: 'none',
          ...style,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: `1px solid ${headerBorder}`,
            flexShrink: 0,
            gap: 12,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            {title && (
              <div style={{ fontSize: 15, fontWeight: 600, color: titleColor, lineHeight: 1.4 }}>
                {title}
              </div>
            )}
            {subtitle && (
              <div style={{ fontSize: 12, color: subColor, marginTop: 2 }}>{subtitle}</div>
            )}
          </div>
          <Button
            type="text"
            icon={<CloseOutlined />}
            onClick={onClose}
            aria-label="Đóng panel"
            size="small"
            style={{ flexShrink: 0, color: subColor }}
          />
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 48 }}>
              <Spin size="large" />
            </div>
          ) : children}
        </div>

        {/* Footer */}
        {footer && (
          <div
            style={{
              padding: '12px 20px',
              borderTop: `1px solid ${headerBorder}`,
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 8,
              flexShrink: 0,
              background: footerBg,
              borderRadius: '0 0 12px 12px',
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </>
  );
}
