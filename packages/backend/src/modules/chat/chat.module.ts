import { Module, forwardRef } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { ChatSearchController } from './chat-search.controller';
import { PrismaModule } from 'src/common/prisma/prisma.module';
import { RedisModule } from 'src/common/redis/redis.module';
import { AuthModule } from 'src/modules/auth/auth.module';
import { GatewayModule } from 'src/gateway/gateway.module';

@Module({
  imports: [PrismaModule, RedisModule, AuthModule, forwardRef(() => GatewayModule)],
  controllers: [ChatController, ChatSearchController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
