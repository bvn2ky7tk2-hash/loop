import { SetMetadata } from '@nestjs/common';
import type { PermissionCode } from '../../permissions/permissions.constants';

export const PERMISSION_KEY = 'requiredPermission';
// Accepts one or more codes — user needs at least ONE (OR logic)
export const RequirePermission = (...codes: PermissionCode[]) => SetMetadata(PERMISSION_KEY, codes);
