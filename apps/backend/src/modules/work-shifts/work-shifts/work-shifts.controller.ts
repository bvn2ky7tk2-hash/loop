import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { WorkShiftsService } from './work-shifts.service';
import {
  CreateWorkShiftDto,
  UpdateWorkShiftDto,
  CreateShiftAssignmentDto,
  ListShiftAssignmentDto,
  CreateWorkScheduleTemplateDto,
  EnrollEmployeesDto,
  ListScheduleTemplateDto,
  SwapShiftDto,
  RecalculateDto,
} from './dto/work-shift.dto';
import { Role } from '../generated/prisma';
import { Roles } from '../common/decorators/roles.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';

@Controller('api/v1/work-shifts')
export class WorkShiftsController {
  constructor(private readonly svc: WorkShiftsService) {}

  // GET /api/v1/work-shifts — Danh sách ca làm việc
  @Get()
  @RequirePermission('attendance:read')
  findAll() {
    return this.svc.findAllShifts();
  }

  // POST /api/v1/work-shifts — Tạo ca làm việc
  @Post()
  @RequirePermission('attendance:write')
  @Roles(Role.ADMIN, Role.LEADERSHIP)
  create(@Body() dto: CreateWorkShiftDto) {
    return this.svc.createShift(dto);
  }

  // PATCH /api/v1/work-shifts/:id — Cập nhật ca làm việc
  @Patch(':id')
  @RequirePermission('attendance:write')
  update(@Param('id') id: string, @Body() dto: UpdateWorkShiftDto) {
    return this.svc.updateShift(id, dto);
  }

  // DELETE /api/v1/work-shifts/:id — Xóa ca làm việc
  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.svc.deleteShift(id);
  }

  // GET /api/v1/work-shifts/assignments — Danh sách phân công ca
  @Get('assignments')
  @RequirePermission('attendance:read')
  listAssignments(@Query() query: ListShiftAssignmentDto) {
    return this.svc.listAssignments(query);
  }

  // POST /api/v1/work-shifts/assignments — Tạo phân công ca
  @Post('assignments')
  @RequirePermission('attendance:write')
  createAssignment(@Body() dto: CreateShiftAssignmentDto) {
    return this.svc.createAssignment(dto);
  }

  // DELETE /api/v1/work-shifts/assignments/:id — Xóa phân công ca
  @Delete('assignments/:id')
  @RequirePermission('attendance:write')
  removeAssignment(@Param('id') id: string) {
    return this.svc.deleteAssignment(id);
  }

  // ── Lịch làm việc xoay ca (template + enrollment) ───────────────────────────

  // POST /api/v1/work-shifts/schedules — Tạo template lịch xoay ca
  @Post('schedules')
  @RequirePermission('attendance:write')
  createSchedule(@Body() dto: CreateWorkScheduleTemplateDto) {
    return this.svc.createScheduleTemplate(dto);
  }

  // GET /api/v1/work-shifts/schedules — Danh sách template
  @Get('schedules')
  @RequirePermission('attendance:read')
  listSchedules(@Query() query: ListScheduleTemplateDto) {
    return this.svc.listScheduleTemplates(query);
  }

  // DELETE /api/v1/work-shifts/schedules/:id — Xóa template
  @Delete('schedules/:id')
  @RequirePermission('attendance:write')
  deleteSchedule(@Param('id') id: string) {
    return this.svc.deleteScheduleTemplate(id);
  }

  // POST /api/v1/work-shifts/schedules/:id/enroll — Gán nhân sự vào lịch
  @Post('schedules/:id/enroll')
  @RequirePermission('attendance:write')
  enrollEmployees(@Param('id') id: string, @Body() dto: EnrollEmployeesDto) {
    return this.svc.enrollEmployees(id, dto);
  }

  // GET /api/v1/work-shifts/schedules/:id/enrollments — Danh sách nhân sự trong lịch
  @Get('schedules/:id/enrollments')
  @RequirePermission('attendance:read')
  listEnrollments(@Param('id') id: string) {
    return this.svc.listEnrollments(id);
  }

  // DELETE /api/v1/work-shifts/enrollments/:id — Xóa 1 enrollment
  @Delete('enrollments/:id')
  @RequirePermission('attendance:write')
  removeEnrollment(@Param('id') id: string) {
    return this.svc.removeEnrollment(id);
  }

  // POST /api/v1/work-shifts/swap-shift — Đổi ca nhanh cho nhân viên
  @Post('swap-shift')
  @RequirePermission('attendance:write')
  swapShift(@Body() dto: SwapShiftDto) {
    return this.svc.swapShift(dto);
  }

  // POST /api/v1/work-shifts/recalculate — Tính lại chấm công theo tháng
  @Post('recalculate')
  @RequirePermission('attendance:write')
  recalculate(@Body() dto: RecalculateDto) {
    return this.svc.recalculateAttendance(dto);
  }
}
