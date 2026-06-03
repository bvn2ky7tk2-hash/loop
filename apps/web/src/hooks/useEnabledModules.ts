import { useQuery } from '@tanstack/react-query';
import { moduleConfigApi } from '../api/module-config';
import { useAuthStore } from '../store/auth.store';

/**
 * Trạng thái bật/tắt module của TENANT hiện tại (theo ModuleConfig).
 * Dùng để ẩn module bị tắt khỏi menu/switcher/route.
 * Fail-open: chưa tải xong hoặc module không có cấu hình → coi như BẬT (tránh ẩn nhầm).
 */
export function useEnabledModules() {
  const { user } = useAuthStore();
  const { data } = useQuery({
    queryKey: ['module-config', 'enabled'],
    queryFn: moduleConfigApi.listEnabled,
    enabled: !!user,
    staleTime: 60_000,
  });

  const enabledSet = data ? new Set(data.filter((m) => m.isEnabled).map((m) => m.moduleId)) : null;

  // Chưa load → true (fail-open). Đã load mà module không có trong config → true.
  const isModuleEnabled = (moduleId: string): boolean => {
    if (!enabledSet) return true;
    if (!data!.some((m) => m.moduleId === moduleId)) return true;
    return enabledSet.has(moduleId);
  };

  return { isModuleEnabled, loaded: !!data };
}
