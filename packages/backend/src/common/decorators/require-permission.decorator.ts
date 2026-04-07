import { SetMetadata } from '@nestjs/common';
import { TenantPermission } from '@prisma/client';

export const PERMISSION_KEY = 'requiredPermission';
export const RequirePermission = (...permissions: TenantPermission[]) =>
  SetMetadata(PERMISSION_KEY, permissions);
