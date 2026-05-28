import {
  Controller, Get, Post, Put, Body, Param, Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PaginationDto } from '../common/dto/pagination.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../generated/prisma';
import { PERMISSIONS } from '../permissions/permissions.constants';
import type { User } from '../generated/prisma';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { TaskStatus } from '../generated/prisma';

@ApiTags('tasks')
@ApiBearerAuth()
@Controller('api/v1')
export class TasksController {
  constructor(private readonly service: TasksService) {}

  @Post('projects/:projectId/tasks')
  @RequirePermission(PERMISSIONS.TASKS_CREATE)
  @ApiOperation({ summary: 'Tạo task mới' })
  create(
    @Param('projectId') projectId: string,
    @Body() dto: CreateTaskDto,
    @CurrentUser() user: User,
  ) {
    return this.service.create(projectId, dto, user);
  }

  @Get('projects/:projectId/tasks')
  @RequirePermission(PERMISSIONS.TASKS_READ)
  @ApiOperation({ summary: 'Cây task của dự án' })
  getTree(@Param('projectId') projectId: string) {
    return this.service.getProjectTaskTree(projectId);
  }

  @Get('tasks/pending-approval')
  @Roles(Role.ADMIN, Role.PM)
  @RequirePermission(PERMISSIONS.TASKS_APPROVE)
  @ApiOperation({ summary: 'Danh sách task chờ phê duyệt (tất cả dự án)' })
  getPendingApprovalTasks(@Query() { page, limit }: PaginationDto) {
    return this.service.getPendingApprovalTasks(page, limit);
  }

  @Get('tasks/mine/count')
  @RequirePermission(PERMISSIONS.TASKS_READ)
  @ApiOperation({ summary: 'Đếm task chưa hoàn thành của tôi' })
  getMyTasksCount(@CurrentUser() user: User) {
    return this.service.getMyTasksCount(user.id, user.role);
  }

  @Get('tasks/mine')
  @RequirePermission(PERMISSIONS.TASKS_READ)
  @ApiOperation({ summary: 'Task board — cá nhân hoặc team (PM/ADMIN/LEADERSHIP)' })
  getMyTasks(
    @CurrentUser() user: User,
    @Query('projectId') projectId?: string,
    @Query('employeeId') employeeId?: string,
    @Query() { page, limit }: PaginationDto = {} as PaginationDto,
  ) {
    return this.service.getMyTasks(user.id, user.role, projectId, employeeId, page, limit);
  }

  @Get('tasks/:id')
  @RequirePermission(PERMISSIONS.TASKS_READ)
  @ApiOperation({ summary: 'Chi tiết task' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Put('tasks/:id')
  @RequirePermission(PERMISSIONS.TASKS_UPDATE)
  @ApiOperation({ summary: 'Cập nhật task' })
  update(@Param('id') id: string, @Body() dto: Partial<CreateTaskDto>) {
    return this.service.update(id, dto);
  }

  @Post('tasks/:id/approve')
  @Roles(Role.ADMIN, Role.PM)
  @RequirePermission(PERMISSIONS.TASKS_APPROVE)
  @ApiOperation({ summary: 'Duyệt task' })
  approve(@Param('id') id: string, @CurrentUser() user: User) {
    return this.service.approve(id, user.id);
  }

  @Post('tasks/:id/return')
  @Roles(Role.ADMIN, Role.PM)
  @RequirePermission(PERMISSIONS.TASKS_APPROVE)
  @ApiOperation({ summary: 'Trả lại task' })
  returnTask(@Param('id') id: string, @Body('reason') reason: string) {
    return this.service.returnTask(id, reason);
  }

  @Post('tasks/:id/resubmit')
  @RequirePermission(PERMISSIONS.TASKS_UPDATE)
  @ApiOperation({ summary: 'Nộp lại task' })
  resubmit(@Param('id') id: string) {
    return this.service.resubmit(id);
  }

  @Post('tasks/:id/cancel')
  @Roles(Role.ADMIN, Role.PM)
  @RequirePermission(PERMISSIONS.TASKS_APPROVE)
  @ApiOperation({ summary: 'Huỷ task' })
  cancel(@Param('id') id: string) {
    return this.service.cancel(id);
  }

  @Put('tasks/:id/progress')
  @RequirePermission(PERMISSIONS.TASKS_UPDATE)
  @ApiOperation({ summary: 'Cập nhật tiến độ task' })
  updateProgress(
    @Param('id') id: string,
    @Body('progressPct') progressPct: number,
  ) {
    return this.service.updateProgress(id, progressPct);
  }

  @Put('tasks/:id/status')
  @RequirePermission(PERMISSIONS.TASKS_UPDATE)
  @ApiOperation({ summary: 'Di chuyển task sang trạng thái mới (Kanban)' })
  moveStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @Body('dueDate') dueDate?: string,
  ) {
    return this.service.moveStatus(id, status as TaskStatus, dueDate);
  }

  @Post('tasks/:id/log-effort')
  @RequirePermission(PERMISSIONS.TIMELOGS_CREATE)
  @ApiOperation({ summary: 'Ghi nhận giờ thực tế' })
  logEffort(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body('hours') hours: number,
    @Body('logDate') logDate: string,
    @Body('note') note?: string,
  ) {
    return this.service.logEffort(id, user.id, hours, logDate, note);
  }
}
