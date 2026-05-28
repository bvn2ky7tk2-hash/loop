import { useAuthStore } from '../store/auth.store';

/**
 * Returns helpers to check if the current user has a given permission.
 *
 * Usage:
 *   const { can, hasRole } = usePermissions();
 *   if (can('tasks:approve')) { ... }
 *   if (hasRole('ADMIN')) { ... }
 */
export function usePermissions() {
  const user = useAuthStore((s) => s.user);
  const permissions = user?.permissions ?? [];
  const moduleRoles = user?.moduleRoles ?? [];
  const role = user?.role ?? '';

  const can = (code: string): boolean => permissions.includes(code);

  const canAny = (...codes: string[]): boolean => codes.some((c) => permissions.includes(c));

  const canAll = (...codes: string[]): boolean => codes.every((c) => permissions.includes(c));

  const hasRole = (r: string): boolean => role === r;

  const hasModuleRole = (code: string): boolean => moduleRoles.includes(code);

  return { can, canAny, canAll, hasRole, hasModuleRole, permissions, moduleRoles, role };
}
