import { Controller, Get, Patch, Body, Param } from '@nestjs/common';
import { HrProfileService } from './hr-profile.service';
import { UpdatePersonalInfoDto } from './dto/hr-profile.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { Role } from '../generated/prisma';

@Controller('api/v1/hr-profile')
export class HrProfileController {
  constructor(private readonly svc: HrProfileService) {}

  @Get(':employeeId')
  @RequirePermission('employees:read')
  getProfile360(@Param('employeeId') employeeId: string) {
    return this.svc.getProfile360(employeeId);
  }

  @Patch(':employeeId/personal')
  @Roles(Role.ADMIN, Role.LEADERSHIP)
  @RequirePermission('employees:update')
  updatePersonalInfo(
    @Param('employeeId') employeeId: string,
    @Body() dto: UpdatePersonalInfoDto,
  ) {
    return this.svc.updatePersonalInfo(employeeId, dto);
  }

  @Get(':employeeId/dependents')
  @RequirePermission('employees:read')
  listDependents(@Param('employeeId') employeeId: string) {
    return this.svc.listDependents(employeeId);
  }
}
