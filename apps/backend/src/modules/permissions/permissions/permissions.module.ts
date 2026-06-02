import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PermissionsAdminService } from './permissions-admin.service';
import { PermissionsController } from './permissions.controller';

@Module({
  imports: [PrismaModule],
  providers: [PermissionsAdminService],
  controllers: [PermissionsController],
})
export class PermissionsModule {}
