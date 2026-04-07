import { Module } from '@nestjs/common';
import { RainController } from './rain.controller';
import { RainService } from './rain.service';
import { PrismaModule } from 'src/common/prisma/prisma.module';
import { RedisModule } from 'src/common/redis/redis.module';
import { AuthModule } from 'src/modules/auth/auth.module';

@Module({
  imports: [PrismaModule, RedisModule, AuthModule],
  controllers: [RainController],
  providers: [RainService],
  exports: [RainService],
})
export class RainModule {}
