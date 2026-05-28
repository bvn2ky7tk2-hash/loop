import { SetMetadata } from '@nestjs/common';
import type { PermissionCode } from '../../permissions/permissions.constants';

export const PERMISSION_KEY = 'requiredPermission';
export const RequirePermission = (code: PermissionCode) => SetMetadata(PERMISSION_KEY, code);
