import { Module, forwardRef } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { ChatModule } from 'src/modules/chat/chat.module';
import { PlayerModule } from 'src/modules/player/player.module';
import { ModerationModule } from 'src/modules/moderation/moderation.module';
import { ChannelModule } from 'src/modules/channel/channel.module';
import { RedisModule } from 'src/common/redis/redis.module';
import { AuthModule } from 'src/modules/auth/auth.module';
import { PrismaModule } from 'src/common/prisma/prisma.module';
import { WebhookModule } from 'src/modules/webhook/webhook.module';

@Module({
  imports: [forwardRef(() => ChatModule), PlayerModule, ModerationModule, ChannelModule, RedisModule, AuthModule, PrismaModule, WebhookModule],
  providers: [ChatGateway],
  exports: [ChatGateway],
})
export class GatewayModule {}
