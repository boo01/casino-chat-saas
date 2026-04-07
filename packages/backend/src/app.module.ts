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
import { ChatGateway } from './gateway/chat.gateway';
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
      useFactory: (configService: ConfigService) => ({
        defaultOptions: {
          settings: {
            lockDuration: 30000,
            lockRenewTime: 15000,
            maxStalledCount: 2,
            maxStalledInterval: 5000,
            maxRepeatedErrors: 5,
            retryProcessDelay: 5000,
            stalledInterval: 5000,
            stalledRenewTime: 30000,
            guardInterval: 5000,
          },
        },
        url: configService.get<string>(
          'redis.url',
          'redis://localhost:6379',
        ),
      }),
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
  ],
  providers: [ChatGateway],
})
export class AppModule {}
