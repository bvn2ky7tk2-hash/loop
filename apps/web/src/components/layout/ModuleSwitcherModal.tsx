import { Modal } from 'antd';
import { CheckOutlined } from '@ant-design/icons';
import { useModuleStore } from '../../store/module.store';
import { useThemeStore } from '../../store/theme.store';
import { useAuthStore } from '../../store/auth.store';
import { MODULES } from '../../config/modules.config';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ModuleSwitcherModal({ open, onClose }: Props) {
  const { activeModuleId, setActiveModule } = useModuleStore();
  const { mode } = useThemeStore();
  const { user } = useAuthStore();
  const isDark = mode === 'dark';

  const isAdmin = user?.role === 'ADMIN';
  const canAccessModule = (mod: typeof MODULES[number]) => {
    if (isAdmin) return true;
    if (!mod.gatePermission) return true;
    return user?.permissions.includes(mod.gatePermission) ?? false;
  };

  const accessibleModules = MODULES.filter(canAccessModule);

  const cardBg = isDark ? '#2D3F56' : '#F8FAFC';

  const handleSelect = (id: string) => {
    setActiveModule(id);
    onClose();
  };

  const modalBg = isDark ? '#1E293B' : '#ffffff';
  const titleColor = isDark ? '#F1F5F9' : '#0F172A';

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={640}
      title={
        <span style={{ color: titleColor, fontWeight: 700, fontSize: 16 }}>
          Chọn module
        </span>
      }
      styles={{
        content: { background: modalBg, borderRadius: 14, padding: 0 },
        header:  { background: modalBg, borderBottom: `1px solid ${isDark ? '#334155' : '#E2E8F0'}`, padding: '16px 20px 14px', marginBottom: 0, borderRadius: '14px 14px 0 0' },
        body:    { padding: '12px 16px 16px', maxHeight: 'calc(80vh - 70px)', overflowY: 'auto' },
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 8,
        }}
      >
        {accessibleModules.map((mod) => {
          const isActive = mod.id === activeModuleId;
          return (
            <div
              key={mod.id}
              onClick={() => handleSelect(mod.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '11px 14px',
                borderRadius: 10,
                cursor: 'pointer',
                border: `2px solid ${isActive ? mod.color : (isDark ? '#3D4F65' : '#E2E8F0')}`,
                background: isActive
                  ? (isDark ? `${mod.color}30` : `${mod.color}0F`)
                  : cardBg,
                transition: 'border-color 0.15s, background 0.15s',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.borderColor = mod.color;
                  e.currentTarget.style.background   = isDark ? `${mod.color}20` : `${mod.color}0A`;
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.borderColor = isDark ? '#3D4F65' : '#E2E8F0';
                  e.currentTarget.style.background   = cardBg;
                }
              }}
            >
              {/* Module icon */}
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 9,
                  background: mod.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                  color: '#fff',
                  flexShrink: 0,
                  opacity: isActive ? 1 : 0.85,
                }}
              >
                {mod.icon}
              </div>

              {/* Text — luôn dùng màu sáng trong dark mode */}
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: 14,
                    // Dark: luôn text sáng (#F1F5F9), light: active dùng màu module
                    color: isDark
                      ? (isActive ? '#FFFFFF' : '#E2E8F0')
                      : (isActive ? mod.color : '#1E293B'),
                    marginBottom: 3,
                  }}
                >
                  {mod.label}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    // Dark: rgba white để luôn đọc được, light: gray nhẹ
                    color: isDark ? 'rgba(255,255,255,0.5)' : '#94A3B8',
                    lineHeight: '1.4',
                  }}
                >
                  {mod.description}
                </div>
              </div>

              {/* Active checkmark */}
              {isActive && (
                <CheckOutlined
                  style={{
                    marginLeft: 'auto',
                    fontSize: 14,
                    color: mod.color,
                    flexShrink: 0,
                    filter: isDark ? 'brightness(1.4)' : 'none',
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
