import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisService } from './services/redis.service';
import { OrgScopeService } from './services/org-scope.service';
import { OrgScopeInterceptor } from './guards/org-scope.interceptor';
import { PermissionsService } from '../permissions/permissions.service';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [RedisService, OrgScopeService, OrgScopeInterceptor, PermissionsService],
  exports: [RedisService, OrgScopeService, OrgScopeInterceptor, PermissionsService],
})
export class CommonModule {}
