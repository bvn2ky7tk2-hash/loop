import type { ReactNode } from 'react';
import { usePermissions } from '../../hooks/usePermissions';

interface CanDoProps {
  /** Single permission code required */
  permission?: string;
  /** Any one of these codes is sufficient */
  anyOf?: string[];
  /** All of these codes are required */
  allOf?: string[];
  /** Show this instead of nothing when access denied */
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * Gate component — renders children only if the user has the required permission(s).
 *
 * Usage:
 *   <CanDo permission="tasks:approve">
 *     <Button>Duyệt task</Button>
 *   </CanDo>
 *
 *   <CanDo anyOf={['admin:users', 'admin:permissions']}>
 *     <AdminMenu />
 *   </CanDo>
 */
export function CanDo({ permission, anyOf, allOf, fallback = null, children }: CanDoProps) {
  const { can, canAny, canAll } = usePermissions();

  let allowed = true;
  if (permission) allowed = can(permission);
  else if (anyOf) allowed = canAny(...anyOf);
  else if (allOf) allowed = canAll(...allOf);

  return <>{allowed ? children : fallback}</>;
}
