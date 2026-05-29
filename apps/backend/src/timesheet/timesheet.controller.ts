import {
  Controller, Get, Post, Patch, Body, Param, Query, Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role, type User } from '../generated/prisma';
import { PERMISSIONS } from '../permissions/permissions.constants';
import { TimesheetService } from './timesheet.service';
import { CheckInDto, CheckOutDto } from './dto/checkin.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { GeneratePeriodDto, RejectTimesheetDto } from './dto/generate-period.dto';

@ApiTags('timesheet')
@ApiBearerAuth()
@Controller('api/v1/timesheets')
export class TimesheetController {
  constructor(private readonly service: TimesheetService) {}

  // ── Attendance ──────────────────────────────────────────────────────────────

  @Post('checkin')
  @RequirePermission(PERMISSIONS.TIMELOGS_CREATE)
  @ApiOperation({ summary: 'Chấm công vào' })
  checkIn(@Body() dto: CheckInDto, @CurrentUser() user: User) {
    return this.service.checkIn(user.id, dto);
  }

  @Post('checkout')
  @RequirePermission(PERMISSIONS.TIMELOGS_UPDATE)
  @ApiOperation({ summary: 'Chấm công ra' })
  checkOut(@Body() dto: CheckOutDto, @CurrentUser() user: User) {
    return this.service.checkOut(user.id, dto);
  }

  @Get('me/today')
  @RequirePermission(PERMISSIONS.TIMESHEETS_READ)
  @ApiOperation({ summary: 'Tóm tắt chấm công hôm nay của tôi' })
  getTodaySummary(@CurrentUser() user: User) {
    return this.service.getTodaySummary(user.id);
  }

  // ── Quick Status ────────────────────────────────────────────────────────────

  @Post('status')
  @RequirePermission(PERMISSIONS.TIMELOGS_CREATE)
  @ApiOperation({ summary: 'Cập nhật trạng thái làm việc (1-tap)' })
  updateStatus(@Body() dto: UpdateStatusDto, @CurrentUser() user: User) {
    return this.service.setStatus(user.id, dto);
  }

  @Get('team-status')
  @Roles(Role.PM, Role.LEADERSHIP, Role.ADMIN)
  @RequirePermission(PERMISSIONS.TIMESHEETS_READ)
  @ApiOperation({ summary: 'Trạng thái real-time của team (Manager/Leadership)' })
  getTeamStatus(@Req() req: { orgUnitIds: string[] | null }) {
    return this.service.getTeamStatus(req.orgUnitIds);
  }

  // ── Period & Timesheet ──────────────────────────────────────────────────────

  @Post('period/generate')
  @Roles(Role.ADMIN, Role.PM, Role.LEADERSHIP, Role.MEMBER)
  @RequirePermission(PERMISSIONS.TIMESHEETS_READ)
  @ApiOperation({ summary: 'Tạo/tính lại bảng công theo kỳ' })
  generatePeriod(
    @Body() dto: GeneratePeriodDto,
    @CurrentUser() user: User,
  ) {
    return this.service.generatePeriod(user.id, user.role, dto);
  }

  @Get('period')
  @RequirePermission(PERMISSIONS.TIMESHEETS_READ)
  @ApiOperation({ summary: 'Chi tiết bảng công theo kỳ' })
  getPeriodDetail(
    @CurrentUser() user: User,
    @Query('start') start: string,
    @Query('end') end: string,
    @Query('userId') userId?: string,
  ) {
    const targetId = userId ?? user.id;
    return this.service.getPeriodDetail(targetId, start, end);
  }

  @Post(':id/submit')
  @RequirePermission(PERMISSIONS.TIMESHEETS_READ)
  @ApiOperation({ summary: 'Nộp bảng công để duyệt' })
  submit(@Param('id') id: string, @CurrentUser() user: User) {
    return this.service.submit(id, user.id);
  }

  @Post(':id/approve')
  @Roles(Role.PM, Role.ADMIN, Role.LEADERSHIP)
  @RequirePermission(PERMISSIONS.TIMESHEETS_APPROVE)
  @ApiOperation({ summary: 'Duyệt bảng công' })
  approve(@Param('id') id: string, @CurrentUser() user: User) {
    return this.service.approve(id, user.id);
  }

  @Post(':id/reject')
  @Roles(Role.PM, Role.ADMIN, Role.LEADERSHIP)
  @RequirePermission(PERMISSIONS.TIMESHEETS_APPROVE)
  @ApiOperation({ summary: 'Từ chối bảng công' })
  reject(
    @Param('id') id: string,
    @Body() dto: RejectTimesheetDto,
    @CurrentUser() user: User,
  ) {
    return this.service.reject(id, user.id, dto);
  }

  @Get('pending-approval')
  @Roles(Role.PM, Role.ADMIN, Role.LEADERSHIP)
  @RequirePermission(PERMISSIONS.TIMESHEETS_APPROVE)
  @ApiOperation({ summary: 'Danh sách bảng công chờ duyệt (có cờ quá hạn 48h)' })
  getPendingApproval(@Req() req: { orgUnitIds: string[] | null }) {
    return this.service.getPendingApproval(req.orgUnitIds);
  }

  @Patch('day')
  @RequirePermission(PERMISSIONS.TIMELOGS_CREATE)
  @ApiOperation({ summary: 'Nhập thủ công giờ công cho một ngày' })
  manualDayEntry(
    @Body() body: { date: string; hours: number },
    @CurrentUser() user: User,
  ) {
    return this.service.manualDayEntry(user.id, body.date, body.hours);
  }

  @Get('project-summary')
  @RequirePermission(PERMISSIONS.TIMESHEETS_READ)
  @ApiOperation({ summary: 'Tổng hợp giờ hoàn thành task theo dự án và tháng' })
  getProjectSummary(
    @Query('projectId') projectId: string,
    @Query('year') year: string,
    @Query('month') month: string,
    @CurrentUser() user: User,
  ) {
    return this.service.getProjectSummary(projectId, parseInt(year), parseInt(month), user);
  }
}
