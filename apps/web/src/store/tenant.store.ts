import { create } from 'zustand';
import type { TenantConfig } from '../api/tenant';

interface TenantState {
  config: TenantConfig | null;
  setConfig: (c: TenantConfig) => void;
}

export const useTenantStore = create<TenantState>((set) => ({
  config: null,
  setConfig: (config) => set({ config }),
}));
