import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { SalaryRecordsService } from './salary-records.service';
import { CreateSalaryRecordDto } from './dto/salary-record.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../generated/prisma';
import type { User } from '../generated/prisma';

@Controller('salary-records')
export class SalaryRecordsController {
  constructor(private readonly service: SalaryRecordsService) {}

  // Đặt route tĩnh trước route param để NestJS không nhầm
  @Get('employee/:employeeId/latest')
  @RequirePermission('hr_decisions:read')
  getLatest(@Param('employeeId', ParseUUIDPipe) employeeId: string) {
    return this.service.getLatest(employeeId);
  }

  @Get('employee/:employeeId')
  @RequirePermission('hr_decisions:read')
  findByEmployee(@Param('employeeId', ParseUUIDPipe) employeeId: string) {
    return this.service.findByEmployee(employeeId);
  }

  @Post()
  @Roles(Role.ADMIN, Role.LEADERSHIP)
  create(@Body() dto: CreateSalaryRecordDto, @CurrentUser() user: User) {
    return this.service.create(dto, user.id);
  }
}
