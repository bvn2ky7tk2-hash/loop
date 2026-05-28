import {
  Controller, Get, Post, Delete,
  Body, Param, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { User } from '../generated/prisma';
import { Role } from '../generated/prisma';

@ApiTags('comments')
@ApiBearerAuth()
@Controller('api/v1/comments')
export class CommentsController {
  constructor(private readonly service: CommentsService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách comment theo entity' })
  list(
    @Query('entityType') entityType: string,
    @Query('entityId')   entityId: string,
  ) {
    return this.service.listComments(entityType, entityId);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo comment mới' })
  create(
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: User,
  ) {
    return this.service.createComment(dto, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xóa comment' })
  remove(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    const isAdmin = user.role === Role.ADMIN || user.role === Role.PM;
    return this.service.deleteComment(id, user.id, isAdmin);
  }
}
