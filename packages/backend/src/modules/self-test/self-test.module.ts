import { Module } from '@nestjs/common';
import { SelfTestService } from './self-test.service';
import { SelfTestController } from './self-test.controller';
import { PrismaModule } from 'src/common/prisma/prisma.module';
import { RedisModule } from 'src/common/redis/redis.module';
import { AuthModule } from 'src/modules/auth/auth.module';

@Module({
  imports: [PrismaModule, RedisModule, AuthModule],
  controllers: [SelfTestController],
  providers: [SelfTestService],
})
export class SelfTestModule {}
