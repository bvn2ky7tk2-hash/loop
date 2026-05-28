import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_MODULE_ID } from '../config/modules.config';

interface ModuleState {
  activeModuleId: string;
  setActiveModule: (id: string) => void;
}

export const useModuleStore = create<ModuleState>()(
  persist(
    (set) => ({
      activeModuleId: DEFAULT_MODULE_ID,
      setActiveModule: (id) => set({ activeModuleId: id }),
    }),
    { name: 'loop-active-module' },
  ),
);
