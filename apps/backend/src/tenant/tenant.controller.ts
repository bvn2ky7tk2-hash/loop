import { Controller, Get, Post, Patch, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { TenantService } from './tenant.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../generated/prisma';
import type { JwtUser } from '../common/types/jwt-user.type';

@ApiTags('tenants')
@ApiBearerAuth()
@Controller('tenants')
export class TenantController {
  constructor(private tenantService: TenantService) {}

  // ── Public: frontend load branding từ đầu ──────────────────────────────────
  @Get('current')
  @Public()
  @Throttle({ global: { ttl: 60_000, limit: 100 } })
  @ApiOperation({ summary: 'Lấy thông tin tenant hiện tại (public, dùng để load branding)' })
  async getCurrent(@Query('slug') slug?: string) {
    if (slug) return this.tenantService.getBySlug(slug);
    return this.tenantService.getDefault();
  }

  // Backward-compat alias — giữ route cũ /tenant/config hoạt động
  @Get('config')
  @Public()
  @Throttle({ global: { ttl: 60_000, limit: 100 } })
  @ApiOperation({ summary: 'Alias /tenant/config (backward compat)' })
  async getConfig(@Query('slug') slug?: string) {
    return this.getCurrent(slug);
  }

  // ── Admin CRUD ─────────────────────────────────────────────────────────────

  @Get()
  @Roles(Role.ADMIN)
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  @ApiOperation({ summary: 'Danh sách tenant hiện hành (ADMIN — chỉ tenant của mình)' })
  findAll(@CurrentUser() user: JwtUser) {
    return this.tenantService.findAll(user?.tenantId ?? null);
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  @ApiOperation({ summary: 'Chi tiết tenant (ADMIN — chỉ tenant của mình)' })
  findOne(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.tenantService.findOne(id, user?.tenantId ?? null);
  }

  @Post()
  @Roles(Role.ADMIN)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @ApiOperation({ summary: 'Tạo tenant mới (ADMIN)' })
  create(@Body() dto: CreateTenantDto) {
    return this.tenantService.create(dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @ApiOperation({ summary: 'Cập nhật tenant (ADMIN — chỉ tenant của mình)' })
  update(@Param('id') id: string, @Body() dto: UpdateTenantDto, @CurrentUser() user: JwtUser) {
    return this.tenantService.update(id, dto, user?.tenantId ?? null);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @ApiOperation({ summary: 'Vô hiệu hoá tenant (soft deactivate, ADMIN — chỉ tenant của mình)' })
  remove(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.tenantService.deactivate(id, user?.tenantId ?? null);
  }

  // Cập nhật config tenant mặc định (backward compat)
  @Patch('config')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Cập nhật config tenant hiện hành (ADMIN — chỉ tenant của mình)' })
  async updateConfig(@Body() dto: UpdateTenantDto, @CurrentUser() user: JwtUser) {
    const tenant = await this.tenantService.getDefault();
    return this.tenantService.update(tenant.id, dto, user?.tenantId ?? null);
  }
}
