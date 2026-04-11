import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './common/prisma/prisma.module';
import { RedisModule } from './common/redis/redis.module';
import { AuthModule } from './modules/auth/auth.module';
import { TenantModule } from './modules/tenant/tenant.module';
import { ChannelModule } from './modules/channel/channel.module';
import { PlayerModule } from './modules/player/player.module';
import { ChatModule } from './modules/chat/chat.module';
import { ModerationModule } from './modules/moderation/moderation.module';
import { WebhookModule } from './modules/webhook/webhook.module';
import { SelfTestModule } from './modules/self-test/self-test.module';
import { SuperAdminModule } from './modules/super-admin/super-admin.module';
import { PromoModule } from './modules/promo/promo.module';
import { TriviaModule } from './modules/trivia/trivia.module';
import { RainModule } from './modules/rain/rain.module';
import { LeaderboardModule } from './modules/leaderboard/leaderboard.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { GatewayModule } from './gateway/gateway.module';
import { CurrencyModule } from './modules/currency/currency.module';
import { HealthModule } from './common/health/health.module';
import { configuration } from './config/configuration';
import { configValidationSchema } from './config/validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: configValidationSchema,
      validationOptions: {
        abortEarly: false,
      },
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisUrl = new URL(
          configService.get<string>('redis.url', 'redis://localhost:6379'),
        );
        return {
          redis: {
            host: redisUrl.hostname,
            port: parseInt(redisUrl.port || '6379', 10),
          },
        };
      },
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    RedisModule,
    AuthModule,
    TenantModule,
    ChannelModule,
    PlayerModule,
    ChatModule,
    ModerationModule,
    WebhookModule,
    SelfTestModule,
    SuperAdminModule,
    PromoModule,
    TriviaModule,
    RainModule,
    LeaderboardModule,
    AnalyticsModule,
    CurrencyModule,
    GatewayModule,
    HealthModule,
  ],
})
export class AppModule {}
