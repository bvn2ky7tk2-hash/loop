import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_MODULE_ID, MODULES } from '../config/modules.config';

const VALID_IDS = new Set(MODULES.map(m => m.id));

interface ModuleState {
  activeModuleId: string;
  setActiveModule: (id: string) => void;
}

export const useModuleStore = create<ModuleState>()(
  persist(
    (set) => ({
      activeModuleId: DEFAULT_MODULE_ID,
      setActiveModule: (id) => {
        if (VALID_IDS.has(id)) set({ activeModuleId: id });
      },
    }),
    {
      name: 'loop-active-module',
      onRehydrateStorage: () => (state) => {
        // Reset nếu module cũ không còn tồn tại (vd: 'pm' → đã xóa)
        if (state && !VALID_IDS.has(state.activeModuleId)) {
          state.activeModuleId = DEFAULT_MODULE_ID;
        }
      },
    },
  ),
);
