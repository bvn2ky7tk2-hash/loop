import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { HrAttendanceService } from './hr-attendance.service';
import { AttendanceExplanationService } from './attendance-explanation.service';
import {
  AttendanceQueryDto,
  CalendarQueryDto,
  CreateAttendanceDto,
  LockMonthDto,
  MonthlyAttendanceQueryDto,
  SummarizeMonthDto,
} from './dto/attendance.dto';
import {
  CreateExplanationDto,
  ExplanationQueryDto,
  ReviewExplanationDto,
} from './dto/attendance-explanation.dto';
import { Role } from '../generated/prisma';
import { Roles } from '../common/decorators/roles.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('api/v1/hr-attendance')
export class HrAttendanceController {
  constructor(
    private readonly svc: HrAttendanceService,
    private readonly explanationSvc: AttendanceExplanationService,
  ) {}

  // GET /api/v1/hr-attendance
  @Get()
  @RequirePermission('attendance:read')
  list(@Query() query: AttendanceQueryDto) {
    return this.svc.list(query);
  }

  // GET /api/v1/hr-attendance/monthly
  @Get('monthly')
  @RequirePermission('attendance:read')
  getMonthlyReport(@Query() query: MonthlyAttendanceQueryDto) {
    return this.svc.getMonthlyReport(query);
  }

  // GET /api/v1/hr-attendance/calendar/:employeeId
  @Get('calendar/:employeeId')
  @RequirePermission('attendance:read')
  getCalendarView(
    @Param('employeeId') employeeId: string,
    @Query('year', new DefaultValuePipe(new Date().getFullYear()), ParseIntPipe) year: number,
    @Query('month', new DefaultValuePipe(new Date().getMonth() + 1), ParseIntPipe) month: number,
  ) {
    return this.svc.getCalendarView(employeeId, year, month);
  }

  // POST /api/v1/hr-attendance/upsert
  @Post('upsert')
  @Roles(Role.ADMIN, Role.LEADERSHIP)
  upsert(@Body() dto: CreateAttendanceDto, @CurrentUser() user: any) {
    return this.svc.upsert(dto, user.sub);
  }

  // POST /api/v1/hr-attendance/summarize
  @Post('summarize')
  @Roles(Role.ADMIN)
  summarize(@Body() dto: SummarizeMonthDto) {
    return this.svc.summarizeMonth(dto);
  }

  // POST /api/v1/hr-attendance/lock
  @Post('lock')
  @Roles(Role.ADMIN)
  lock(@Body() dto: LockMonthDto, @CurrentUser() user: any) {
    return this.svc.lockMonth(dto, user.sub);
  }

  // ─── E16F.8 — Attendance Explanation ─────────────────────────────────────────

  // POST /api/v1/hr-attendance/explanations
  @Post('explanations')
  @RequirePermission('attendance:write')
  createExplanation(
    @Body() dto: CreateExplanationDto,
    @CurrentUser() user: any,
  ) {
    return this.explanationSvc.create(dto, user?.sub);
  }

  // GET /api/v1/hr-attendance/explanations
  @Get('explanations')
  @RequirePermission('attendance:read')
  listExplanations(@Query() query: ExplanationQueryDto) {
    return this.explanationSvc.list(query);
  }

  // POST /api/v1/hr-attendance/explanations/:id/approve
  @Post('explanations/:id/approve')
  @Roles(Role.ADMIN, Role.LEADERSHIP)
  approveExplanation(
    @Param('id') id: string,
    @Body() dto: ReviewExplanationDto,
    @CurrentUser() user: any,
  ) {
    return this.explanationSvc.approve(id, user.sub, dto);
  }

  // POST /api/v1/hr-attendance/explanations/:id/reject
  @Post('explanations/:id/reject')
  @Roles(Role.ADMIN, Role.LEADERSHIP)
  rejectExplanation(
    @Param('id') id: string,
    @Body() dto: ReviewExplanationDto,
    @CurrentUser() user: any,
  ) {
    return this.explanationSvc.reject(id, user.sub, dto);
  }
}
