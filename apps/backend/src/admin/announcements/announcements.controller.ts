import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../generated/prisma';
import type { JwtUser } from '../../common/types/jwt-user.type';
import { AnnouncementsService } from './announcements.service';
import { CreateAnnouncementDto, UpdateAnnouncementDto } from './dto/announcement.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('announcements')
@ApiBearerAuth()
@Controller('api/v1')
export class AnnouncementsController {
  constructor(private readonly service: AnnouncementsService) {}

  // ── Bất kỳ user đã đăng nhập đều có thể xem announcements active ─────────────

  @Get('announcements/active')
  @ApiOperation({ summary: 'Lấy announcements đang active (mọi user đăng nhập)' })
  getActive(@CurrentUser() user: JwtUser) {
    return this.service.getActive(user.tenantId);
  }

  // ── Admin CRUD ────────────────────────────────────────────────────────────────

  @Get('admin/announcements')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Danh sách tất cả announcements (ADMIN)' })
  list(@CurrentUser() user: JwtUser, @Query() pagination: PaginationDto) {
    return this.service.list(user.tenantId, pagination);
  }

  @Post('admin/announcements')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Tạo announcement mới (ADMIN)' })
  create(@Body() dto: CreateAnnouncementDto, @CurrentUser() user: JwtUser) {
    return this.service.create(dto, user.tenantId, user.id);
  }

  @Patch('admin/announcements/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Cập nhật announcement (ADMIN)' })
  update(@Param('id') id: string, @Body() dto: UpdateAnnouncementDto) {
    return this.service.update(id, dto);
  }

  @Delete('admin/announcements/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Xóa announcement (ADMIN)' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
