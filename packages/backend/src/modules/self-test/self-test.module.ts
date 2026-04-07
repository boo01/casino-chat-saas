import { Module } from '@nestjs/common';
import { SelfTestService } from './self-test.service';
import { SelfTestController } from './self-test.controller';
import { PrismaModule } from 'src/common/prisma/prisma.module';
import { RedisModule } from 'src/common/redis/redis.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [PrismaModule, RedisModule, JwtModule, ConfigModule],
  controllers: [SelfTestController],
  providers: [SelfTestService],
})
export class SelfTestModule {}
