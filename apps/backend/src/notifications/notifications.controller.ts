import { Controller, Get, Post, Put, Delete, Param, Body, Query, Patch } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, Max, Min, IsString, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtUser } from '../common/types/jwt-user.type';
import { NotificationsService } from './notifications.service';

class UpsertPreferenceDto {
  @IsString()
  @IsIn(['EMAIL', 'IN_APP', 'BOTH'])
  channel: 'EMAIL' | 'IN_APP' | 'BOTH';
}

class NotifQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  unreadOnly?: boolean = false;
}

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('api/v1/notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách thông báo (paginated)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'unreadOnly', required: false })
  getAll(
    @CurrentUser() user: JwtUser,
    @Query() query: NotifQueryDto,
  ) {
    return this.service.getForUser(user.id, query.page, query.limit, query.unreadOnly);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Số thông báo chưa đọc' })
  async getUnreadCount(@CurrentUser() user: JwtUser) {
    const count = await this.service.getUnreadCount(user.id);
    return { count };
  }

  @Post(':id/read')
  @ApiOperation({ summary: 'Đánh dấu đã đọc (1 notification)' })
  markRead(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.service.markRead(id, user.id);
  }

  @Post('read-all')
  @ApiOperation({ summary: 'Đánh dấu tất cả đã đọc' })
  markAllRead(@CurrentUser() user: JwtUser) {
    return this.service.markAllRead(user.id);
  }

  // Giữ lại backward-compat PUT endpoints
  @Put(':id/read')
  @ApiOperation({ summary: 'Đánh dấu đã đọc (PUT - backward compat)' })
  markReadPut(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.service.markRead(id, user.id);
  }

  @Put('read-all')
  @ApiOperation({ summary: 'Đánh dấu tất cả đã đọc (PUT - backward compat)' })
  markAllReadPut(@CurrentUser() user: JwtUser) {
    return this.service.markAllRead(user.id);
  }

  @Post('push-token')
  @ApiOperation({ summary: 'Đăng ký push token' })
  registerToken(
    @CurrentUser() user: JwtUser,
    @Body('token') token: string,
    @Body('platform') platform: string,
  ) {
    return this.service.registerPushToken(user.id, token, platform);
  }

  @Delete('push-token/:token')
  @ApiOperation({ summary: 'Xoá push token' })
  removeToken(@Param('token') token: string) {
    return this.service.removePushToken(token);
  }

  // ─── E23.4 Notification Preferences ────────────────────────────────────────

  @Get('preferences')
  @ApiOperation({ summary: 'Lấy tùy chọn thông báo của user hiện tại' })
  getPreferences(@CurrentUser() user: JwtUser) {
    return this.service.getPreferences(user.id);
  }

  @Patch('preferences/:moduleType')
  @ApiOperation({ summary: 'Cập nhật kênh thông báo cho một module' })
  upsertPreference(
    @CurrentUser() user: JwtUser,
    @Param('moduleType') moduleType: string,
    @Body() dto: UpsertPreferenceDto,
  ) {
    return this.service.upsertPreference(user.id, moduleType, dto.channel);
  }
}
