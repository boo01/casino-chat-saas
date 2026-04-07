import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TenantPermission, AdminRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PERMISSION_KEY } from '../decorators/require-permission.decorator';

@Injectable()
export class PermissionGuard implements CanActivate {
  private readonly logger = new Logger(PermissionGuard.name);

  constructor(
    private reflector: Reflector,
    private prismaService: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<TenantPermission[]>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.id) {
      throw new ForbiddenException('Authentication required');
    }

    // Super admins bypass permission checks
    if (user.isSuperAdmin) {
      return true;
    }

    const admin = await this.prismaService.tenantAdmin.findUnique({
      where: { id: user.id },
    });

    if (!admin || !admin.isActive) {
      throw new ForbiddenException('Admin account inactive');
    }

    // OWNER bypasses all permission checks
    if (admin.role === AdminRole.OWNER) {
      return true;
    }

    const hasPermission = requiredPermissions.every(
      (perm) => admin.permissions.includes(perm),
    );

    if (!hasPermission) {
      this.logger.warn(
        `Admin ${admin.email} lacks permissions: ${requiredPermissions.join(', ')}`,
      );
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
