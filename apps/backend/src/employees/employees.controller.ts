import { Controller, Get, Post, Put, Patch, Body, Param, Req, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../generated/prisma';
import { PERMISSIONS } from '../permissions/permissions.constants';
import type { JwtUser } from '../common/types/jwt-user.type';
import { Audited } from '../common/interceptors/audit-log.interceptor';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { CreateRateDto } from './dto/create-rate.dto';

@ApiTags('employees')
@ApiBearerAuth()
@Controller('api/v1/employees')
export class EmployeesController {
  constructor(private readonly service: EmployeesService) {}

  @Post()
  @Roles(Role.ADMIN)
  @RequirePermission(PERMISSIONS.EMPLOYEES_CREATE)
  @ApiOperation({ summary: 'Tạo hồ sơ nhân sự' })
  create(@Body() dto: CreateEmployeeDto) {
    return this.service.create(dto);
  }

  @Get('offboarding')
  @RequirePermission(PERMISSIONS.EMPLOYEES_READ)
  @ApiOperation({ summary: 'Danh sách nhân viên đã nghỉ việc (Offboarding)' })
  findOffboarding(@Req() req: { orgUnitIds: string[] | null }) {
    return this.service.findOffboarding(req.orgUnitIds);
  }

  @Get('export')
  @Roles(Role.ADMIN)
  @RequirePermission(PERMISSIONS.EMPLOYEES_READ)
  @ApiOperation({ summary: 'Export danh sách nhân viên ra Excel' })
  async export(@Res() res: Response) {
    const buf = await this.service.exportExcel();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="employees.xlsx"');
    res.end(buf);
  }

  @Get('me')
  @ApiOperation({ summary: 'Hồ sơ nhân sự của bản thân' })
  findMe(@CurrentUser() user: JwtUser) {
    return this.service.findMe(user.id);
  }

  @Get()
  @RequirePermission(PERMISSIONS.EMPLOYEES_READ)
  @ApiOperation({ summary: 'Danh sách nhân sự (org scoped)' })
  findAll(@Req() req: { orgUnitIds: string[] | null }, @CurrentUser() user: JwtUser) {
    return this.service.findAll(req.orgUnitIds, user.role);
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.EMPLOYEES_READ)
  @ApiOperation({ summary: 'Chi tiết nhân sự' })
  findOne(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.service.findOne(id, user.role);
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  @RequirePermission(PERMISSIONS.EMPLOYEES_UPDATE)
  @Audited('UPDATE', 'Employee')
  @ApiOperation({ summary: 'Cập nhật hồ sơ nhân sự' })
  update(@Param('id') id: string, @Body() dto: UpdateEmployeeDto) {
    return this.service.update(id, dto);
  }

  @Post(':id/rates')
  @Roles(Role.ADMIN)
  @RequirePermission(PERMISSIONS.EMPLOYEES_UPDATE)
  @ApiOperation({ summary: 'Thêm rate mới (append-only)' })
  addRate(@Param('id') id: string, @Body() dto: CreateRateDto) {
    return this.service.addRate(id, dto);
  }

  @Get(':id/rates')
  @RequirePermission(PERMISSIONS.EMPLOYEES_READ)
  @ApiOperation({ summary: 'Lịch sử rate nhân sự' })
  getRates(@Param('id') id: string) {
    return this.service.getRates(id);
  }

  @Get(':id/project-history')
  @RequirePermission(PERMISSIONS.EMPLOYEES_READ)
  @ApiOperation({ summary: 'Lịch sử dự án nhân sự' })
  getProjectHistory(@Param('id') id: string) {
    return this.service.getProjectHistory(id);
  }

  @Patch(':id/restore')
  @Roles(Role.ADMIN)
  @RequirePermission(PERMISSIONS.EMPLOYEES_UPDATE)
  @ApiOperation({ summary: 'Khôi phục nhân sự đã xoá mềm' })
  restore(@Param('id') id: string) {
    return this.service.restore(id);
  }

  // ── L-03: Employee History ─────────────────────────────────────────────────

  @Get(':id/work-history')
  @RequirePermission(PERMISSIONS.EMPLOYEES_READ)
  @ApiOperation({ summary: 'Lịch sử làm việc (WorkHistory events) của nhân sự' })
  getWorkHistory(@Param('id') id: string) {
    return this.service.getWorkHistory(id);
  }

  @Get(':id/position-history')
  @RequirePermission(PERMISSIONS.EMPLOYEES_READ)
  @ApiOperation({ summary: 'Lịch sử vị trí (PositionHistory) của nhân sự' })
  getPositionHistory(@Param('id') id: string) {
    return this.service.getPositionHistory(id);
  }

  @Get(':id/leave-summary')
  @RequirePermission(PERMISSIONS.EMPLOYEES_READ)
  @ApiOperation({ summary: 'Tóm tắt số ngày phép (LeaveBalance) của nhân sự' })
  getLeaveSummary(@Param('id') id: string) {
    return this.service.getLeaveSummary(id);
  }
}
