import {
  Controller, Get, Post, Delete,
  Body, Param, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../generated/prisma';
import { FeedService } from './feed.service';
import { CreateFeedPostDto } from './dto/create-feed-post.dto';
import { ReactFeedPostDto } from './dto/react-feed-post.dto';
import { ListFeedDto } from './dto/list-feed.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { User } from '../generated/prisma';

@ApiTags('feed')
@ApiBearerAuth()
@Controller('api/v1/feed')
export class FeedController {
  constructor(private readonly service: FeedService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Thống kê bài đăng' })
  getStats() {
    return this.service.getStats();
  }

  @Get()
  @ApiOperation({ summary: 'Danh sách bài đăng' })
  list(@Query() dto: ListFeedDto) {
    return this.service.listPosts(dto.page, dto.limit);
  }

  @Post()
  @Roles(Role.ADMIN, Role.LEADERSHIP)
  @ApiOperation({ summary: 'Tạo bài đăng mới (ADMIN/LEADERSHIP)' })
  create(
    @Body() dto: CreateFeedPostDto,
    @CurrentUser() user: User,
  ) {
    return this.service.createPost(dto, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xóa bài đăng' })
  remove(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    const isAdmin = user.role === Role.ADMIN || user.role === Role.LEADERSHIP;
    return this.service.deletePost(id, user.id, isAdmin);
  }

  @Post(':id/react')
  @ApiOperation({ summary: 'Toggle reaction trên bài đăng' })
  react(
    @Param('id') id: string,
    @Body() dto: ReactFeedPostDto,
    @CurrentUser() user: User,
  ) {
    return this.service.reactToPost(id, user.id, dto.emoji);
  }
}
