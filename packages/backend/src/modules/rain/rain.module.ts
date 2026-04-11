import { Module, forwardRef } from '@nestjs/common';
import { RainController } from './rain.controller';
import { RainService } from './rain.service';
import { PrismaModule } from 'src/common/prisma/prisma.module';
import { RedisModule } from 'src/common/redis/redis.module';
import { AuthModule } from 'src/modules/auth/auth.module';
import { ChatModule } from 'src/modules/chat/chat.module';
import { GatewayModule } from 'src/gateway/gateway.module';

@Module({
  imports: [PrismaModule, RedisModule, AuthModule, forwardRef(() => ChatModule), forwardRef(() => GatewayModule)],
  controllers: [RainController],
  providers: [RainService],
  exports: [RainService],
})
export class RainModule {}
