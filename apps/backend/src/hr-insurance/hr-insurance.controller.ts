import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Query,
  Param,
} from '@nestjs/common';
import { HrInsuranceService } from './hr-insurance.service';
import {
  CreateEnrollmentDto,
  CreateInsuranceEventDto,
  CreateSocialInsuranceBookDto,
  D02ExportDto,
  InsuranceQueryDto,
  UpdateSocialInsuranceBookDto,
} from './dto/insurance.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { Role } from '../generated/prisma';
import { Throttle } from '@nestjs/throttler';

@Controller('api/v1/hr-insurance')
export class HrInsuranceController {
  constructor(private readonly svc: HrInsuranceService) {}

  // ── Enrollments ─────────────────────────────────────────────────────────────

  @Get('enrollments')
  @RequirePermission('insurance:read')
  listEnrollments(@Query() query: InsuranceQueryDto) {
    return this.svc.listEnrollments(query);
  }

  @Post('enrollments')
  @Roles(Role.ADMIN, Role.LEADERSHIP)
  @RequirePermission('insurance:write')
  enroll(@Body() dto: CreateEnrollmentDto) {
    return this.svc.enroll(dto);
  }

  // QUAN TRỌNG: Route cụ thể phải đặt TRƯỚC route tham số :id
  @Get('enrollments/employee/:employeeId')
  @RequirePermission('insurance:read')
  getEnrollmentByEmployee(@Param('employeeId') employeeId: string) {
    return this.svc.getEnrollmentByEmployee(employeeId);
  }

  @Patch('enrollments/:id')
  @Roles(Role.ADMIN, Role.LEADERSHIP)
  @RequirePermission('insurance:write')
  updateEnrollment(
    @Param('id') id: string,
    @Body() dto: { insuranceSalary?: number; status?: string; endDate?: string },
  ) {
    return this.svc.updateEnrollment(id, dto);
  }

  // ── Events ───────────────────────────────────────────────────────────────────

  @Post('events')
  @Roles(Role.ADMIN, Role.LEADERSHIP)
  @RequirePermission('insurance:write')
  createEvent(@Body() dto: CreateInsuranceEventDto) {
    return this.svc.createEvent(dto);
  }

  // ── Dashboard ────────────────────────────────────────────────────────────────

  @Get('dashboard')
  @RequirePermission('insurance:read')
  getDashboard() {
    return this.svc.getDashboard();
  }

  // ── Social Insurance Books ───────────────────────────────────────────────────

  @Post('books')
  @Roles(Role.ADMIN, Role.LEADERSHIP)
  @RequirePermission('insurance:write')
  upsertSocialInsuranceBook(@Body() dto: CreateSocialInsuranceBookDto) {
    return this.svc.upsertSocialInsuranceBook(dto);
  }

  @Patch('books/:id')
  @Roles(Role.ADMIN, Role.LEADERSHIP)
  @RequirePermission('insurance:write')
  updateSocialInsuranceBook(
    @Param('id') id: string,
    @Body() dto: UpdateSocialInsuranceBookDto,
  ) {
    return this.svc.updateSocialInsuranceBook(id, dto);
  }

  // ── Export D02-LT ────────────────────────────────────────────────────────────

  @Get('export/d02')
  @RequirePermission('insurance:read')
  exportD02(@Query() dto: D02ExportDto) {
    return this.svc.exportD02(dto.year, dto.month);
  }
}
