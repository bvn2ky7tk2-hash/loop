import { create } from 'zustand';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { THEME_PRESETS, DEFAULT_PRESET_ID, findPreset, type ThemePreset } from '@loop/shared';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  mode: ThemeMode;
  presetId: string;
  preset: ThemePreset;
  setMode: (mode: ThemeMode) => Promise<void>;
  setPreset: (id: string) => Promise<void>;
  loadTheme: () => Promise<void>;
}

const KEY_MODE = 'themeMode';
const KEY_PRESET = 'themePreset';

async function persist(key: string, value: string) {
  if (Platform.OS !== 'web') {
    await SecureStore.setItemAsync(key, value);
  } else {
    try { localStorage.setItem(key, value); } catch {}
  }
}

async function read(key: string): Promise<string | null> {
  try {
    if (Platform.OS !== 'web') return await SecureStore.getItemAsync(key);
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export const useThemeStore = create<ThemeState>((set) => ({
  mode: 'system',
  presetId: DEFAULT_PRESET_ID,
  preset: findPreset(DEFAULT_PRESET_ID),

  setMode: async (mode) => {
    set({ mode });
    await persist(KEY_MODE, mode);
  },

  setPreset: async (id) => {
    set({ presetId: id, preset: findPreset(id) });
    await persist(KEY_PRESET, id);
  },

  loadTheme: async () => {
    const storedMode = await read(KEY_MODE);
    if (storedMode === 'light' || storedMode === 'dark' || storedMode === 'system') {
      set({ mode: storedMode });
    }
    const storedPreset = await read(KEY_PRESET);
    if (storedPreset && THEME_PRESETS.some((p) => p.id === storedPreset)) {
      set({ presetId: storedPreset, preset: findPreset(storedPreset) });
    }
  },
}));
