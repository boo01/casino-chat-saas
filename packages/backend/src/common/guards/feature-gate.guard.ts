import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';

export const FEATURE_KEY = 'requiredFeature';

export enum FeatureKey {
  RAIN_EVENTS = 'rain',
  TRIVIA = 'trivia',
  TIPPING = 'tipping',
  PREMIUM = 'premium',
  STREAMER = 'streamer',
  LEADERBOARD = 'leaderboard',
  PROMOS = 'promos',
  ANALYTICS = 'analytics',
}

import { SetMetadata } from '@nestjs/common';
export const RequireFeature = (...features: FeatureKey[]) =>
  SetMetadata(FEATURE_KEY, features);

// Tier feature mapping
const TIER_FEATURES: Record<string, FeatureKey[]> = {
  BASIC: [],
  SOCIAL: [],
  ENGAGE: [FeatureKey.RAIN_EVENTS, FeatureKey.TRIVIA, FeatureKey.LEADERBOARD, FeatureKey.PROMOS, FeatureKey.ANALYTICS],
  MONETIZE: [FeatureKey.RAIN_EVENTS, FeatureKey.TRIVIA, FeatureKey.LEADERBOARD, FeatureKey.PROMOS, FeatureKey.ANALYTICS, FeatureKey.TIPPING, FeatureKey.PREMIUM, FeatureKey.STREAMER],
};

@Injectable()
export class FeatureGateGuard implements CanActivate {
  private readonly logger = new Logger(FeatureGateGuard.name);

  constructor(
    private reflector: Reflector,
    private prismaService: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredFeatures = this.reflector.getAllAndOverride<FeatureKey[]>(
      FEATURE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredFeatures || requiredFeatures.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Super admins bypass feature gates
    if (user?.isSuperAdmin) return true;

    const tenantId = user?.tenantId || request.params?.tenantId;
    if (!tenantId) {
      throw new ForbiddenException('Tenant context required');
    }

    const tenant = await this.prismaService.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new ForbiddenException('Tenant not found');
    }

    const tierFeatures = TIER_FEATURES[tenant.tier] || [];
    const hasFeature = requiredFeatures.every((f) => tierFeatures.includes(f));

    if (!hasFeature) {
      this.logger.warn(`Tenant ${tenant.name} (${tenant.tier}) lacks features: ${requiredFeatures.join(', ')}`);
      throw new ForbiddenException(`This feature requires a higher tier plan. Current: ${tenant.tier}`);
    }

    return true;
  }
}
