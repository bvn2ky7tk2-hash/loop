import { useThemeStore } from '../store/theme.store';
import type { ThemePreset } from '../store/theme.store';

export interface ThemePalette {
  isDark: boolean;
  // Text
  textPrimary:   string;
  textSecondary: string;
  textMuted:     string;
  // Background — layering: bgPage < bgContainer < bgCard < bgSubPanel
  bgPage:        string;
  bgContainer:   string;   // modal, drawer body
  bgCard:        string;   // card bên trong modal
  bgSubPanel:    string;   // footer, sub-section
  // Border
  borderColor:   string;
  // Link / accent text (blue-300 on dark, preset.primary on light)
  linkColor:     string;
  // Preset shortcuts
  primary:       string;
  preset:        ThemePreset;
}

/**
 * Hook trả toàn bộ palette chuẩn hệ thống.
 * Dùng thay vì khai báo `isDark`, `textPrimary`, `bgCard`... trong từng component.
 *
 * @example
 * const { isDark, textPrimary, textMuted, bgCard, borderColor, linkColor } = useThemePalette();
 */
export function useThemePalette(): ThemePalette {
  const { mode, preset } = useThemeStore();
  const isDark = mode === 'dark';

  return {
    isDark,
    textPrimary:   isDark ? '#F1F5F9'               : '#0F172A',
    textSecondary: isDark ? 'rgba(255,255,255,0.5)'  : '#475569',
    textMuted:     isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)',
    bgPage:        isDark ? '#0F172A'                : '#F1F5F9',
    bgContainer:   isDark ? '#1E293B'                : '#ffffff',
    bgCard:        isDark ? '#2D3F56'                : '#FAFAFA',
    bgSubPanel:    isDark ? '#1A2744'                : '#F8FAFC',
    borderColor:   isDark ? '#334155'                : '#E2E8F0',
    linkColor:     isDark ? '#93C5FD'                : preset.primary,
    primary:       preset.primary,
    preset,
  };
}
