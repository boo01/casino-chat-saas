import { Module } from '@nestjs/common';
import { ModerationService } from './moderation.service';
import { ModerationController } from './moderation.controller';
import { PrismaModule } from 'src/common/prisma/prisma.module';
import { RedisModule } from 'src/common/redis/redis.module';
import { AuthModule } from 'src/modules/auth/auth.module';

@Module({
  imports: [PrismaModule, RedisModule, AuthModule],
  controllers: [ModerationController],
  providers: [ModerationService],
  exports: [ModerationService],
})
export class ModerationModule {}
