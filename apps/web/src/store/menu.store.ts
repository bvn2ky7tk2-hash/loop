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
        const defaults = getDefaultModuleConfig(moduleId);
        const overrides = get().moduleConfigs[moduleId];
        if (!overrides) return defaults;
        // Merge: dùng defaults làm gốc, áp visibility từ stored nếu key khớp
        const topVisibility = new Map(overrides.topItems.map(i => [i.key, i.visible]));
        const groupVisibility = new Map(overrides.groups.map(g => [g.key, g.visible]));
        const itemVisibility = new Map(
          overrides.groups.flatMap(g => g.items.map(i => [`${g.key}:${i.key}`, i.visible]))
        );
        return {
          topItems: defaults.topItems.map(i => ({
            ...i,
            visible: topVisibility.has(i.key) ? topVisibility.get(i.key)! : i.visible,
          })),
          groups: defaults.groups.map(g => ({
            ...g,
            visible: groupVisibility.has(g.key) ? groupVisibility.get(g.key)! : g.visible,
            items: g.items.map(i => ({
              ...i,
              visible: itemVisibility.has(`${g.key}:${i.key}`) ? itemVisibility.get(`${g.key}:${i.key}`)! : i.visible,
            })),
          })),
        };
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
