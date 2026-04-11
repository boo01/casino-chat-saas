import { Module } from '@nestjs/common';
import { SuperAdminController } from './super-admin.controller';
import { SuperAdminService } from './super-admin.service';
import { PrismaModule } from 'src/common/prisma/prisma.module';
import { AuthModule } from 'src/modules/auth/auth.module';
import { TenantModule } from 'src/modules/tenant/tenant.module';

@Module({
  imports: [PrismaModule, AuthModule, TenantModule],
  controllers: [SuperAdminController],
  providers: [SuperAdminService],
  exports: [SuperAdminService],
})
export class SuperAdminModule {}
