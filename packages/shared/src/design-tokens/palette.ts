import type { ThemePreset } from './presets';

// Palette token — bảng giá trị DUY NHẤT, trùng khít useThemePalette web hiện tại.
// Layering nền: bgPage < bgContainer < bgCard < bgSubPanel
export interface PaletteTokens {
  isDark: boolean;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  bgPage: string;
  bgContainer: string;   // modal, drawer body
  bgCard: string;        // card bên trong modal
  bgSubPanel: string;    // footer, sub-section
  borderColor: string;
  linkColor: string;     // blue-300 trên dark, preset.primary trên light
  primary: string;
}

export function getPalette(preset: ThemePreset, isDark: boolean): PaletteTokens {
  return {
    isDark,
    textPrimary:   isDark ? '#F1F5F9'                : '#0F172A',
    textSecondary: isDark ? 'rgba(255,255,255,0.5)'  : '#475569',
    textMuted:     isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)',
    bgPage:        isDark ? '#0F172A'                : '#F1F5F9',
    bgContainer:   isDark ? '#1E293B'                : '#ffffff',
    bgCard:        isDark ? '#2D3F56'                : '#FAFAFA',
    bgSubPanel:    isDark ? '#1A2744'                : '#F8FAFC',
    borderColor:   isDark ? '#334155'                : '#E2E8F0',
    linkColor:     isDark ? '#93C5FD'                : preset.primary,
    primary:       preset.primary,
  };
}
