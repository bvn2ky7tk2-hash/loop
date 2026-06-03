import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { api } from '../api/client';

// On web: auth relies on httpOnly cookies — no token management needed.
// On native: token stored in SecureStore and sent as Bearer header.
const tokenStore = {
  get: (key: string) =>
    Platform.OS === 'web' ? Promise.resolve(null) : SecureStore.getItemAsync(key),
  set: (key: string, value: string) =>
    Platform.OS === 'web' ? Promise.resolve() : SecureStore.setItemAsync(key, value),
  delete: (key: string) =>
    Platform.OS === 'web' ? Promise.resolve() : SecureStore.deleteItemAsync(key),
};

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthState {
  user: UserProfile | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,

  login: async (email: string, password: string) => {
    // Backend returns { data: { id, email, name, role, orgUnitId } } + sets httpOnly cookies
    const res = await api.post<{ data: UserProfile; access_token?: string }>(
      '/auth/login',
      { email, password },
    );
    if (res.access_token) await tokenStore.set('access_token', res.access_token);
    set({ user: res.data });
  },

  logout: async () => {
    await api.post('/auth/logout');
    await tokenStore.delete('access_token');
    set({ user: null });
  },

  loadUser: async () => {
    try {
      // On web: cookie is sent automatically, no token check needed.
      // On native: check for stored token first.
      if (Platform.OS !== 'web') {
        const token = await tokenStore.get('access_token');
        if (!token) { set({ isLoading: false }); return; }
      }
      const res = await api.get<{ id: string; email: string; name: string; role: string }>('/auth/me');
      set({ user: res, isLoading: false });
    } catch {
      await tokenStore.delete('access_token');
      set({ user: null, isLoading: false });
    }
  },
}));
