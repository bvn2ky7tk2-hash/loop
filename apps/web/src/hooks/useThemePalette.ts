import { useThemeStore } from '../store/theme.store';
import { getPalette, type ThemePreset } from '@loop/shared';

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
  // Bảng giá trị token nằm ở @loop/shared (getPalette) — dùng chung với mobile.
  return { ...getPalette(preset, mode === 'dark'), preset };
}
