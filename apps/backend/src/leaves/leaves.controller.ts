import {
  Controller, Get, Post, Patch,
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
import type { User } from '../generated/prisma';
import { Audited } from '../common/interceptors/audit-log.interceptor';
import { LeavesService } from './leaves.service';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { ApproveLeaveDto } from './dto/approve-leave.dto';

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
  @ApiOperation({ summary: 'Danh sách loại nghỉ phép đang hoạt động' })
  listTypes() {
    return this.service.listTypes();
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

  @Get()
  @Throttle({ default: { ttl: 60_000, limit: 100 } })
  @RequirePermission(PERMISSIONS.EMPLOYEES_READ)
  @ApiOperation({ summary: 'Danh sách yêu cầu nghỉ phép (phân trang, lọc)' })
  findAll(
    @Query('employeeId') employeeId: string | undefined,
    @Query('status') status: LeaveStatus | undefined,
    @Query() pagination: PaginationDto,
  ) {
    return this.service.listRequests(employeeId, status, pagination.page, pagination.limit);
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
  create(@Body() dto: CreateLeaveRequestDto, @CurrentUser() user: User) {
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
    @CurrentUser() user: User,
  ) {
    return this.service.approveReject(id, dto, user.id);
  }
}
