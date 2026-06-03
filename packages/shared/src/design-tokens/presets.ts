// Design preset — nguồn sự thật DUY NHẤT cho cả web (AntD) lẫn mobile (react-native-paper).
// THUẦN TypeScript, KHÔNG phụ thuộc React — để build tsc→dist chạy được cả Vite và Metro.

export interface ThemePreset {
  id: string;
  name: string;
  primary: string;
  hover: string;
  active: string;
  navBg: string;        // nền sidebar + topbar (web). Gradient CSS — mobile bỏ qua.
  navText: string;      // màu chữ trên nền navBg
  navTheme?: 'dark' | 'light'; // light = sidebar trắng, dùng text tối
}

export const THEME_PRESETS: ThemePreset[] = [
  { id: 'loop',     name: 'Loop',     primary: '#0052CC', hover: '#2684FF', active: '#003E99', navBg: '#0052CC', navText: '#fff' },
  { id: 'minimal',  name: 'Minimal',  primary: '#0052CC', hover: '#2684FF', active: '#003E99', navBg: '#ffffff', navText: '#172B4D', navTheme: 'light' },
  { id: 'navy',     name: 'Navy',     primary: '#2563EB', hover: '#3B82F6', active: '#1D4ED8', navBg: '#1E3A5F', navText: '#fff' },
  { id: 'slate',    name: 'Slate',    primary: '#475569', hover: '#64748B', active: '#334155', navBg: '#475569', navText: '#fff' },
  { id: 'indigo',   name: 'Indigo',   primary: '#4F46E5', hover: '#4338CA', active: '#3730A3', navBg: 'linear-gradient(135deg, #3730A3 0%, #4F46E5 100%)', navText: '#fff' },
  { id: 'ocean',    name: 'Ocean',    primary: '#0EA5E9', hover: '#0284C7', active: '#0369A1', navBg: 'linear-gradient(135deg, #075985 0%, #0EA5E9 100%)', navText: '#fff' },
  { id: 'teal',     name: 'Teal',     primary: '#14B8A6', hover: '#0D9488', active: '#0F766E', navBg: 'linear-gradient(135deg, #0F766E 0%, #14B8A6 100%)', navText: '#fff' },
  { id: 'emerald',  name: 'Emerald',  primary: '#10B981', hover: '#059669', active: '#047857', navBg: 'linear-gradient(135deg, #047857 0%, #10B981 100%)', navText: '#fff' },
  { id: 'rose',     name: 'Rose',     primary: '#F43F5E', hover: '#E11D48', active: '#BE123C', navBg: 'linear-gradient(135deg, #9F1239 0%, #E11D48 100%)', navText: '#fff' },
  { id: 'violet',   name: 'Violet',   primary: '#7C3AED', hover: '#6D28D9', active: '#5B21B6', navBg: 'linear-gradient(135deg, #4C1D95 0%, #7C3AED 100%)', navText: '#fff' },
  { id: 'amber',    name: 'Amber',    primary: '#F59E0B', hover: '#D97706', active: '#B45309', navBg: 'linear-gradient(135deg, #78350F 0%, #B45309 100%)', navText: '#fff' },
  { id: 'midnight', name: 'Midnight', primary: '#38BDF8', hover: '#0284C7', active: '#0369A1', navBg: '#0F172A', navText: 'rgba(255,255,255,0.85)' },
];

export const DEFAULT_PRESET_ID = 'loop';

export const findPreset = (id: string): ThemePreset =>
  THEME_PRESETS.find((p) => p.id === id) ?? THEME_PRESETS[0];
