import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CommonModule } from '../../common/common.module';
import { PermissionAuditController } from './permission-audit.controller';
import { PermissionAuditService } from './permission-audit.service';

@Module({
  imports: [PrismaModule, CommonModule],
  controllers: [PermissionAuditController],
  providers: [PermissionAuditService],
})
export class PermissionAuditModule {}
