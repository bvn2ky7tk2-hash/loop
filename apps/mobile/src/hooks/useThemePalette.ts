import { useColorScheme } from 'react-native';
import { getPalette, type PaletteTokens, type ThemePreset } from '@loop/shared';
import { useThemeStore } from '../store/theme';

export type MobilePalette = PaletteTokens & { preset: ThemePreset };

/**
 * Hook trả palette chuẩn hệ thống cho mobile — DÙNG CHUNG bảng giá trị với web qua @loop/shared.
 * Khác web: phải resolve mode 'system' qua useColorScheme() trước khi tính isDark.
 *
 * @example
 * const { isDark, textPrimary, textMuted, bgCard, borderColor, linkColor } = useThemePalette();
 */
export function useThemePalette(): MobilePalette {
  const systemScheme = useColorScheme();
  const { mode, preset } = useThemeStore();
  const isDark = mode === 'system' ? systemScheme === 'dark' : mode === 'dark';
  return { ...getPalette(preset, isDark), preset };
}
