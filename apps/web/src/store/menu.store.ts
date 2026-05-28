import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { MODULES } from '../config/modules.config';

export interface MenuItemCfg {
  key: string;
  label: string;
  visible: boolean;
}

export interface MenuGroupCfg {
  key: string;
  label: string;
  visible: boolean;
  items: MenuItemCfg[];
}

export interface MenuTopItemCfg {
  key: string;
  label: string;
  visible: boolean;
}

export interface ModuleMenuConfig {
  topItems: MenuTopItemCfg[];
  groups: MenuGroupCfg[];
}

// Lấy config mặc định của module từ modules.config
export function getDefaultModuleConfig(moduleId: string): ModuleMenuConfig {
  const mod = MODULES.find(m => m.id === moduleId);
  if (!mod) return { topItems: [], groups: [] };
  return {
    topItems: mod.topItems.map(i => ({ ...i })),
    groups:   mod.groups.map(g => ({ ...g, items: g.items.map(i => ({ ...i })) })),
  };
}

// Giữ lại DEFAULT_* để MenuConfigDrawer/MenuConfigPanel không bị lỗi import
export const DEFAULT_TOP_ITEMS: MenuTopItemCfg[] = [];
export const DEFAULT_GROUPS: MenuGroupCfg[] = [];

interface MenuConfigState {
  moduleConfigs: Record<string, ModuleMenuConfig>;
  getModuleConfig: (moduleId: string) => ModuleMenuConfig;
  setModuleConfig: (moduleId: string, topItems: MenuTopItemCfg[], groups: MenuGroupCfg[]) => void;
  resetModuleConfig: (moduleId: string) => void;

  // Legacy — giữ để không break MenuConfigDrawer cũ (sẽ unused sau khi migrate)
  topItems: MenuTopItemCfg[];
  groups: MenuGroupCfg[];
  setConfig: (topItems: MenuTopItemCfg[], groups: MenuGroupCfg[]) => void;
  reset: () => void;
}

export const useMenuStore = create<MenuConfigState>()(
  persist(
    (set, get) => ({
      moduleConfigs: {},

      getModuleConfig: (moduleId) => {
        const overrides = get().moduleConfigs[moduleId];
        return overrides ?? getDefaultModuleConfig(moduleId);
      },

      setModuleConfig: (moduleId, topItems, groups) =>
        set((state) => ({
          moduleConfigs: { ...state.moduleConfigs, [moduleId]: { topItems, groups } },
        })),

      resetModuleConfig: (moduleId) =>
        set((state) => {
          const { [moduleId]: _removed, ...rest } = state.moduleConfigs;
          return { moduleConfigs: rest };
        }),

      // Legacy stubs — không dùng nữa nhưng giữ signature để không crash
      topItems: [],
      groups: [],
      setConfig: (topItems, groups) => set({ topItems, groups }),
      reset: () => set({ topItems: [], groups: [] }),
    }),
    {
      name: 'loop-menu-config',
      // Chỉ persist moduleConfigs, bỏ legacy topItems/groups
      partialize: (state) => ({ moduleConfigs: state.moduleConfigs }),
    },
  ),
);
