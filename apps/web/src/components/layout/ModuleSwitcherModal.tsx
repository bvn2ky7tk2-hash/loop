import { Modal } from 'antd';
import { CheckOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useModuleStore } from '../../store/module.store';
import { useThemePalette } from '../../hooks/useThemePalette';
import { useAuthStore } from '../../store/auth.store';
import { useEnabledModules } from '../../hooks/useEnabledModules';
import { MODULES } from '../../config/modules.config';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ModuleSwitcherModal({ open, onClose }: Props) {
  const { activeModuleId, setActiveModule } = useModuleStore();
  const { isDark, bgCard, bgContainer, borderColor, textPrimary } = useThemePalette();
  const { user } = useAuthStore();
  const { isModuleEnabled } = useEnabledModules();
  const navigate = useNavigate();

  const isAdmin = user?.role === 'ADMIN';
  const canAccessModule = (mod: typeof MODULES[number]) => {
    // Module bị tắt cho tenant → ẩn với MỌI vai trò (kể cả admin).
    if (!isModuleEnabled(mod.id)) return false;
    if (isAdmin) return true;
    if (!mod.gatePermission) return true;
    const gates = Array.isArray(mod.gatePermission) ? mod.gatePermission : [mod.gatePermission];
    return gates.some(p => user?.permissions.includes(p) ?? false);
  };

  const accessibleModules = MODULES.filter(canAccessModule);

  const handleSelect = (id: string) => {
    setActiveModule(id);
    const mod = MODULES.find(m => m.id === id);
    // Ưu tiên topItems, fallback về item đầu tiên của group đầu tiên (cho module không có dashboard)
    const dashboardRoute =
      mod?.topItems?.[0]?.key ??
      mod?.groups?.find(g => g.visible && g.items.length > 0)?.items?.[0]?.key ??
      '/';
    navigate(dashboardRoute);
    onClose();
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={640}
      title={
        <span style={{ color: textPrimary, fontWeight: 700, fontSize: 16 }}>
          Chọn module
        </span>
      }
      styles={{
        container: { background: bgContainer, borderRadius: 14, padding: 0 },
        header:  { background: bgContainer, borderBottom: `1px solid ${borderColor}`, padding: '16px 20px 14px', marginBottom: 0, borderRadius: '14px 14px 0 0' },
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
                  : bgCard,
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
                  e.currentTarget.style.background   = bgCard;
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
                      : (isActive ? mod.color : textPrimary),
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
