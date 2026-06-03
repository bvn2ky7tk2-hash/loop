import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { THEME_PRESETS, DEFAULT_PRESET_ID, findPreset, type ThemePreset } from '@loop/shared';

// Nguồn preset/palette đã chuyển về @loop/shared (dùng chung web + mobile).
// Re-export để ThemePanel/useThemePalette không phải đổi import.
export { THEME_PRESETS };
export type { ThemePreset };

type ThemeMode = 'light' | 'dark';

interface ThemeState {
  mode: ThemeMode;
  presetId: string;
  preset: ThemePreset;
  toggle: () => void;
  setPreset: (id: string) => void;
}

const getSystemPreference = (): ThemeMode =>
  window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode:     getSystemPreference(),
      presetId: DEFAULT_PRESET_ID,
      preset:   findPreset(DEFAULT_PRESET_ID),
      toggle:   () => set((s) => ({ mode: s.mode === 'dark' ? 'light' : 'dark' })),
      setPreset: (id: string) => set({ presetId: id, preset: findPreset(id) }),
    }),
    {
      name: 'loop-theme',
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.preset = findPreset(state.presetId ?? DEFAULT_PRESET_ID);
      },
    },
  ),
);
