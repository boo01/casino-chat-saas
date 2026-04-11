import { Module } from '@nestjs/common';
import { CurrencyAdminController, CurrencyPublicController, TenantCurrencyController } from './currency.controller';
import { CurrencyService } from './currency.service';
import { PrismaModule } from 'src/common/prisma/prisma.module';
import { AuthModule } from 'src/modules/auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [CurrencyAdminController, CurrencyPublicController, TenantCurrencyController],
  providers: [CurrencyService],
  exports: [CurrencyService],
})
export class CurrencyModule {}
