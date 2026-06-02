import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PERMISSIONS } from '../permissions/permissions.constants';
import { PaginationDto } from '../common/dto/pagination.dto';
import { LeaveStatus, Role } from '../generated/prisma';
import type { JwtUser } from '../common/types/jwt-user.type';
import { Audited } from '../common/interceptors/audit-log.interceptor';
import { LeavesService } from './leaves.service';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { ApproveLeaveDto } from './dto/approve-leave.dto';
import { CreateLeaveTypeDto, UpdateLeaveTypeDto } from './dto/leave-type.dto';

@ApiTags('leaves')
@ApiBearerAuth()
@Controller('api/v1/leaves')
export class LeavesController {
  constructor(private readonly service: LeavesService) {}

  // /balance, /types, /form-schema phải đứng trước /:id để NestJS không parse là UUID

  @Get('form-schema')
  @Throttle({ default: { ttl: 60_000, limit: 100 } })
  @ApiOperation({ summary: 'Cấu trúc form tạo đơn nghỉ phép' })
  getFormSchema() {
    return {
      fields: [
        { name: 'startDate', label: 'Ngày bắt đầu', type: 'date', required: true },
        { name: 'endDate', label: 'Ngày kết thúc', type: 'date', required: true },
        { name: 'days', label: 'Số ngày', type: 'number', required: true, min: 0.5, max: 30 },
        { name: 'reason', label: 'Lý do', type: 'textarea', required: false },
      ],
    };
  }

  @Get('types')
  @Throttle({ default: { ttl: 60_000, limit: 100 } })
  @RequirePermission(PERMISSIONS.EMPLOYEES_READ)
  @ApiOperation({ summary: 'Danh sách loại nghỉ phép' })
  listTypes(@Query('includeInactive') includeInactive?: string) {
    return this.service.listTypes(includeInactive === 'true');
  }

  @Post('types')
  @RequirePermission(PERMISSIONS.ADMIN_ORG)
  @ApiOperation({ summary: 'Tạo loại nghỉ phép' })
  createType(@Body() dto: CreateLeaveTypeDto) {
    return this.service.createType(dto);
  }

  @Patch('types/:id')
  @RequirePermission(PERMISSIONS.ADMIN_ORG)
  @ApiOperation({ summary: 'Cập nhật loại nghỉ phép' })
  updateType(@Param('id') id: string, @Body() dto: UpdateLeaveTypeDto) {
    return this.service.updateType(id, dto);
  }

  @Delete('types/:id')
  @RequirePermission(PERMISSIONS.ADMIN_ORG)
  @ApiOperation({ summary: 'Vô hiệu hóa loại nghỉ phép' })
  removeType(@Param('id') id: string) {
    return this.service.removeType(id);
  }

  @Get('balance/:employeeId')
  @Throttle({ default: { ttl: 60_000, limit: 100 } })
  @RequirePermission(PERMISSIONS.EMPLOYEES_READ)
  @ApiOperation({ summary: 'Số ngày nghỉ còn lại của nhân viên theo năm' })
  getBalance(
    @Param('employeeId') employeeId: string,
    @Query('year') year?: string,
  ) {
    return this.service.getBalance(employeeId, year ? parseInt(year, 10) : undefined);
  }

  @Get('balance-all')
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @Roles(Role.ADMIN, Role.LEADERSHIP)
  @RequirePermission(PERMISSIONS.EMPLOYEES_READ)
  @ApiOperation({ summary: 'Phép tồn toàn bộ nhân viên (HR view)' })
  getAllBalance(
    @Query('year') year?: string,
    @Query('orgUnitId') orgUnitId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getAllBalance(
      year ? parseInt(year, 10) : undefined,
      orgUnitId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  @Post('init-balances')
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Roles(Role.ADMIN, Role.LEADERSHIP)
  @RequirePermission(PERMISSIONS.EMPLOYEES_READ)
  @ApiOperation({ summary: 'Khởi tạo LeaveBalance cho toàn nhân sự × toàn loại phép (idempotent)' })
  initBalances(
    @Query('year') year?: string,
    @Query('orgUnitId') orgUnitId?: string,
  ) {
    return this.service.initBalances(
      year ? parseInt(year, 10) : new Date().getFullYear(),
      orgUnitId,
    );
  }

  @Get('monthly-stats')
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @Roles(Role.ADMIN, Role.LEADERSHIP)
  @RequirePermission(PERMISSIONS.EMPLOYEES_READ)
  @ApiOperation({ summary: 'Thống kê phép giảm hàng tháng (HR view)' })
  getMonthlyStats(
    @Query('year') year?: string,
    @Query('orgUnitId') orgUnitId?: string,
  ) {
    return this.service.getMonthlyStats(
      year ? parseInt(year, 10) : new Date().getFullYear(),
      orgUnitId,
    );
  }

  @Get('export')
  @Throttle({ default: { ttl: 60_000, limit: 100 } })
  @Roles(Role.ADMIN, Role.LEADERSHIP)
  @RequirePermission(PERMISSIONS.EMPLOYEES_READ)
  @ApiOperation({ summary: 'Export danh sách nghỉ phép ra Excel' })
  async exportExcel(@Res() res: Response) {
    const buf = await this.service.exportExcel();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="leaves.xlsx"');
    res.end(buf);
  }

  @Get('my')
  @Throttle({ default: { ttl: 60_000, limit: 100 } })
  @RequirePermission(PERMISSIONS.EMPLOYEES_READ)
  @ApiOperation({ summary: 'Đơn nghỉ phép của tôi (theo user hiện tại)' })
  findMy(
    @CurrentUser() user: JwtUser,
    @Query('status') status: LeaveStatus | undefined,
    @Query() pagination: PaginationDto,
  ) {
    return this.service.listMyRequests(user.id, status, pagination.page, pagination.limit);
  }

  @Get()
  @Throttle({ default: { ttl: 60_000, limit: 100 } })
  @RequirePermission(PERMISSIONS.EMPLOYEES_READ)
  @ApiOperation({ summary: 'Danh sách yêu cầu nghỉ phép (phân trang, lọc)' })
  findAll(
    @Query('employeeId') employeeId: string | undefined,
    @Query('status') status: LeaveStatus | undefined,
    @Query('orgUnitId') orgUnitId: string | undefined,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('limit') limit?: string,
  ) {
    const p = page ? parseInt(page, 10) : 1;
    const l = limit ? parseInt(limit, 10) : (pageSize ? parseInt(pageSize, 10) : 20);
    return this.service.listRequests(employeeId, status, orgUnitId, p, l);
  }

  @Get(':id')
  @Throttle({ default: { ttl: 60_000, limit: 100 } })
  @RequirePermission(PERMISSIONS.EMPLOYEES_READ)
  @ApiOperation({ summary: 'Chi tiết yêu cầu nghỉ phép' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @RequirePermission(PERMISSIONS.EMPLOYEES_READ)
  @ApiOperation({ summary: 'Tạo yêu cầu nghỉ phép' })
  create(@Body() dto: CreateLeaveRequestDto, @CurrentUser() user: JwtUser) {
    return this.service.createRequest(dto, user.id);
  }

  @Patch(':id/approve')
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @RequirePermission(PERMISSIONS.TIMESHEETS_APPROVE)
  @Audited('APPROVE', 'LeaveRequest')
  @ApiOperation({ summary: 'Phê duyệt hoặc từ chối yêu cầu nghỉ phép' })
  approve(
    @Param('id') id: string,
    @Body() dto: ApproveLeaveDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.approveReject(id, dto, user.id);
  }

  @Patch(':id/cancel')
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @RequirePermission(PERMISSIONS.EMPLOYEES_READ)
  @ApiOperation({ summary: 'Hủy đơn nghỉ phép — hoàn lại số ngày nếu đã duyệt' })
  cancel(
    @Param('id') id: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.cancelLeave(id, user.id);
  }
}
