import { Controller, Get, Post, Put, Body, Param, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../generated/prisma';
import { PERMISSIONS } from '../permissions/permissions.constants';
import type { User } from '../generated/prisma';
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

  @Get('me')
  @ApiOperation({ summary: 'Hồ sơ nhân sự của bản thân' })
  findMe(@CurrentUser() user: User) {
    return this.service.findMe(user.id);
  }

  @Get()
  @RequirePermission(PERMISSIONS.EMPLOYEES_READ)
  @ApiOperation({ summary: 'Danh sách nhân sự (org scoped)' })
  findAll(@Req() req: { orgUnitIds: string[] | null }, @CurrentUser() user: User) {
    return this.service.findAll(req.orgUnitIds, user.role);
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.EMPLOYEES_READ)
  @ApiOperation({ summary: 'Chi tiết nhân sự' })
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.service.findOne(id, user.role);
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  @RequirePermission(PERMISSIONS.EMPLOYEES_UPDATE)
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
}
