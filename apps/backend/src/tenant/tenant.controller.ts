import { Controller, Get, Post, Patch, Put, Delete, Body, Param, Query, HttpCode, HttpStatus, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { TenantService } from './tenant.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { ProvisionTenantDto } from './dto/provision-tenant.dto';
import { SetModuleDto } from './dto/set-module.dto';
import { PlatformAdminGuard } from '../common/guards/platform-admin.guard';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../generated/prisma';
import type { JwtUser } from '../common/types/jwt-user.type';

@ApiTags('tenants')
@ApiBearerAuth()
@Controller('api/v1/tenants')
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
  @ApiOperation({ summary: 'Danh sách tenant (platform admin: mọi tenant; ADMIN: chỉ tenant của mình)' })
  findAll(@CurrentUser() user: JwtUser) {
    return this.tenantService.findAll(user ?? null);
  }

  @Get(':id/usage')
  @Roles(Role.ADMIN)
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  @ApiOperation({ summary: 'Mức sử dụng vs quota của tenant (số user/project/employee/storage)' })
  getUsage(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.tenantService.getUsage(id, user ?? null);
  }

  @Get(':id/modules')
  @Roles(Role.ADMIN)
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  @ApiOperation({ summary: 'Danh sách module + trạng thái của một tenant cụ thể' })
  getModules(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.tenantService.getModules(id, user ?? null);
  }

  @Put(':id/modules/:moduleId')
  @Roles(Role.ADMIN)
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  @ApiOperation({ summary: 'Bật/tắt một module cho một tenant cụ thể (core không tắt được)' })
  setModule(
    @Param('id') id: string,
    @Param('moduleId') moduleId: string,
    @Body() dto: SetModuleDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.tenantService.setModule(id, moduleId, dto.isEnabled, user ?? null);
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  @ApiOperation({ summary: 'Chi tiết tenant (platform admin: mọi tenant; ADMIN: chỉ tenant của mình)' })
  findOne(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.tenantService.findOne(id, user ?? null);
  }

  // Provision tenant đầy đủ: tạo tenant + bật/tắt module + cấp admin tenant.
  // Chỉ PLATFORM ADMIN (tạo tenant là thao tác cấp nền tảng).
  @Post('provision')
  @UseGuards(PlatformAdminGuard)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @ApiOperation({ summary: 'Provision tenant mới (platform admin): tenant + module config + admin' })
  provision(@Body() dto: ProvisionTenantDto) {
    return this.tenantService.provision(dto);
  }

  @Post()
  @UseGuards(PlatformAdminGuard)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @ApiOperation({ summary: 'Tạo tenant trống (platform admin)' })
  create(@Body() dto: CreateTenantDto) {
    return this.tenantService.create(dto);
  }

  // ⚠️ Route TĨNH phải đứng TRƯỚC route param ':id' (nếu không 'config'/'logo' bị
  // match vào :id). Cập nhật config tenant hiện hành (ADMIN — chỉ tenant của mình).
  @Patch('config')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Cập nhật config tenant hiện hành (ADMIN — chỉ tenant của mình)' })
  async updateConfig(@Body() dto: UpdateTenantDto, @CurrentUser() user: JwtUser) {
    const tenant = await this.tenantService.getDefault();
    return this.tenantService.update(tenant.id, dto, user ?? null);
  }

  // Upload logo công ty (Onboarding bước 1)
  @Post('logo')
  @Roles(Role.ADMIN)
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 2 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const ok = /^image\//.test(file.mimetype);
        cb(ok ? null : new BadRequestException('Chỉ chấp nhận file ảnh'), ok);
      },
    }),
  )
  @ApiOperation({ summary: 'Upload logo công ty (ADMIN)' })
  uploadLogo(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: JwtUser) {
    if (!file) throw new BadRequestException('Thiếu file ảnh');
    return this.tenantService.uploadLogo(file, user ?? null);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @ApiOperation({ summary: 'Cập nhật tenant (platform admin: mọi tenant; ADMIN: chỉ tenant của mình)' })
  update(@Param('id') id: string, @Body() dto: UpdateTenantDto, @CurrentUser() user: JwtUser) {
    return this.tenantService.update(id, dto, user ?? null);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @ApiOperation({ summary: 'Vô hiệu hoá tenant (soft deactivate; platform admin: mọi tenant; ADMIN: chỉ tenant của mình)' })
  remove(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.tenantService.deactivate(id, user ?? null);
  }

}
