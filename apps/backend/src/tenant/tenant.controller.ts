import { Controller, Get, Patch, Body, Query } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../generated/prisma';
import { Throttle } from '@nestjs/throttler';

@Controller('tenant')
export class TenantController {
  constructor(private tenantService: TenantService) {}

  // Public: frontend cần lấy config để hiển thị branding ngay từ đầu
  @Get('config')
  @Public()
  @Throttle({ global: { ttl: 60_000, limit: 100 } })
  async getConfig(@Query('slug') slug?: string) {
    if (slug) return this.tenantService.getBySlug(slug);
    return this.tenantService.getDefault();
  }

  @Patch('config')
  @Roles(Role.ADMIN)
  async update(@Body() dto: UpdateTenantDto) {
    const tenant = await this.tenantService.getDefault();
    return this.tenantService.update(tenant.id, dto);
  }
}
