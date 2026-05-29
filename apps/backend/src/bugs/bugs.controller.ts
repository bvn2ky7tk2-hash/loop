import {
  Controller, Get, Post, Put, Patch, Delete,
  Body, Param, Query, Req, UseInterceptors, HttpCode, HttpStatus,
  UploadedFile,
} from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PERMISSIONS } from '../permissions/permissions.constants';
import type { JwtUser } from '../common/types/jwt-user.type';
import { Audited } from '../common/interceptors/audit-log.interceptor';
import { BugsService } from './bugs.service';
import { BugAttachmentService } from './bug-attachment.service';
import { BugStatsService } from './bug-stats.service';
import { BugCommentService } from './bug-comment.service';
import { CreateBugDto } from './dto/create-bug.dto';
import { UpdateBugDto } from './dto/update-bug.dto';
import { TransitionBugDto } from './dto/transition-bug.dto';
import { AssignBugDto } from './dto/assign-bug.dto';
import { FilterBugDto } from './dto/filter-bug.dto';
import { ApproveBugDto } from './dto/approve-bug.dto';

@ApiTags('bugs')
@ApiBearerAuth()
@Controller('api/v1/bugs')
export class BugsController {
  constructor(
    private readonly service: BugsService,
    private readonly attachmentService: BugAttachmentService,
    private readonly statsService: BugStatsService,
    private readonly commentService: BugCommentService,
  ) {}

  @Post()
  @RequirePermission(PERMISSIONS.BUGS_CREATE)
  @ApiOperation({ summary: 'Tạo bug mới' })
  create(
    @Body() dto: CreateBugDto,
    @CurrentUser() user: JwtUser,
    @Req() req: { orgUnitIds: string[] | null },
  ) {
    return this.service.create(dto, user.id, req.orgUnitIds);
  }

  // /stats và /my phải đứng trước /:id để NestJS không parse là UUID
  @Get('stats')
  @RequirePermission(PERMISSIONS.BUGS_READ)
  @ApiOperation({ summary: 'Thống kê bug (5 charts)' })
  getStats(
    @Query('projectId') projectId: string | undefined,
    @Req() req: { orgUnitIds: string[] | null },
  ) {
    return this.statsService.getStats({ projectId, orgUnitIds: req.orgUnitIds });
  }

  @Get('my/count')
  @RequirePermission(PERMISSIONS.BUGS_READ)
  @ApiOperation({ summary: 'Đếm bug chưa xử lý được giao cho tôi' })
  countMine(@CurrentUser() user: JwtUser) {
    return this.service.countMine(user.id);
  }

  @Get('my')
  @RequirePermission(PERMISSIONS.BUGS_READ)
  @ApiOperation({ summary: 'Bug được giao cho tôi' })
  findMine(@CurrentUser() user: JwtUser) {
    return this.service.findMine(user.id);
  }

  @Get()
  @RequirePermission(PERMISSIONS.BUGS_READ)
  @ApiOperation({ summary: 'Danh sách bug (filter + phân trang)' })
  findAll(
    @Query() filters: FilterBugDto,
    @Req() req: { orgUnitIds: string[] | null },
  ) {
    return this.service.findAll(filters, req.orgUnitIds);
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.BUGS_READ)
  @ApiOperation({ summary: 'Chi tiết bug' })
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: JwtUser,
    @Req() req: { orgUnitIds: string[] | null },
  ) {
    return this.service.findOne(id, req.orgUnitIds, user.id);
  }

  @Put(':id')
  @RequirePermission(PERMISSIONS.BUGS_UPDATE)
  @ApiOperation({ summary: 'Cập nhật bug' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateBugDto,
    @Req() req: { orgUnitIds: string[] | null },
  ) {
    return this.service.update(id, dto, req.orgUnitIds);
  }

  @Patch(':id/transition')
  @RequirePermission(PERMISSIONS.BUGS_UPDATE)
  @Audited('RESOLVE', 'Bug')
  @ApiOperation({ summary: 'Chuyển trạng thái bug' })
  transition(
    @Param('id') id: string,
    @Body() dto: TransitionBugDto,
    @Req() req: { orgUnitIds: string[] | null },
  ) {
    return this.service.transition(id, dto, req.orgUnitIds);
  }

  @Patch(':id/assign')
  @RequirePermission(PERMISSIONS.BUGS_ASSIGN)
  @Audited('ASSIGN', 'Bug')
  @ApiOperation({ summary: 'Gán assignee cho bug' })
  assign(
    @Param('id') id: string,
    @Body() dto: AssignBugDto,
    @Req() req: { orgUnitIds: string[] | null },
  ) {
    return this.service.assign(id, dto, req.orgUnitIds);
  }

  @Patch(':id/approve')
  @RequirePermission(PERMISSIONS.BUGS_CLOSE)
  @ApiOperation({ summary: 'PM phê duyệt / từ chối CR' })
  approve(
    @Param('id') id: string,
    @Body() dto: ApproveBugDto,
    @CurrentUser() user: JwtUser,
    @Req() req: { orgUnitIds: string[] | null },
  ) {
    return this.service.approve(id, dto, req.orgUnitIds, user.role);
  }

  @Delete(':id')
  @RequirePermission(PERMISSIONS.BUGS_UPDATE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xoá bug' })
  remove(
    @Param('id') id: string,
    @Req() req: { orgUnitIds: string[] | null },
  ) {
    return this.service.remove(id, req.orgUnitIds);
  }

  // ── Attachments ─────────────────────────────────────────────────────────────

  @Post(':id/attachments')
  @RequirePermission(PERMISSIONS.BUGS_UPDATE)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  @ApiOperation({ summary: 'Upload ảnh đính kèm cho bug' })
  uploadAttachment(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: JwtUser,
  ) {
    return this.attachmentService.uploadFile(id, user.id, file);
  }

  @Get(':id/attachments/:attId/url')
  @RequirePermission(PERMISSIONS.BUGS_READ)
  @ApiOperation({ summary: 'Lấy presigned URL để tải attachment' })
  getAttachmentUrl(@Param('attId') attId: string) {
    return this.attachmentService.getPresignedUrl(attId).then((url) => ({ url }));
  }

  @Delete(':id/attachments/:attId')
  @RequirePermission(PERMISSIONS.BUGS_UPDATE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xoá attachment' })
  deleteAttachment(@Param('attId') attId: string) {
    return this.attachmentService.deleteFile(attId);
  }

  // ── Comments ─────────────────────────────────────────────────────────────────

  @Get(':id/comments')
  @RequirePermission(PERMISSIONS.BUGS_READ)
  @ApiOperation({ summary: 'Lịch sử comment của bug' })
  listComments(@Param('id') id: string) {
    return this.commentService.list(id);
  }

  @Post(':id/comments')
  @RequirePermission(PERMISSIONS.BUGS_UPDATE)
  @ApiOperation({ summary: 'Thêm comment cho bug' })
  addComment(
    @Param('id') id: string,
    @Body('content') content: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.commentService.create(id, user.id, content);
  }

  @Put(':id/comments/:commentId')
  @RequirePermission(PERMISSIONS.BUGS_UPDATE)
  @ApiOperation({ summary: 'Sửa comment' })
  updateComment(
    @Param('commentId') commentId: string,
    @Body('content') content: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.commentService.update(commentId, user.id, content);
  }

  @Delete(':id/comments/:commentId')
  @RequirePermission(PERMISSIONS.BUGS_UPDATE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xoá comment' })
  deleteComment(
    @Param('commentId') commentId: string,
    @CurrentUser() user: JwtUser,
    @Req() req: any,
  ) {
    const isAdmin = ['ADMIN', 'PM'].includes(user.role);
    return this.commentService.remove(commentId, user.id, isAdmin);
  }
}
