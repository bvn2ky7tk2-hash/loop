import { Controller, Get, Put, Post, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { User } from '../generated/prisma';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('api/v1/notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách thông báo' })
  @ApiQuery({ name: 'unread', required: false })
  getAll(
    @CurrentUser() user: User,
    @Query('unread') unread?: string,
  ) {
    return this.service.getForUser(user.id, unread === 'true');
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Số thông báo chưa đọc' })
  async getUnreadCount(@CurrentUser() user: User) {
    const count = await this.service.getUnreadCount(user.id);
    return { count };
  }

  @Put(':id/read')
  @ApiOperation({ summary: 'Đánh dấu đã đọc' })
  markRead(@Param('id') id: string, @CurrentUser() user: User) {
    return this.service.markRead(id, user.id);
  }

  @Put('read-all')
  @ApiOperation({ summary: 'Đánh dấu tất cả đã đọc' })
  markAllRead(@CurrentUser() user: User) {
    return this.service.markAllRead(user.id);
  }

  @Post('push-token')
  @ApiOperation({ summary: 'Đăng ký push token' })
  registerToken(
    @CurrentUser() user: User,
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
}
