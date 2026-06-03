import type { Role } from '../../generated/prisma';

export interface JwtUser {
  id: string;
  sub: string;
  email: string;
  name: string;
  role: Role;
  orgUnitId: string | null;
  tenantId: string | null;
  isActive: boolean;
  isPlatformAdmin?: boolean;
}
