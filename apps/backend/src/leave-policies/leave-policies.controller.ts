import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { LeavePoliciesService } from './leave-policies.service';
import { CreateLeavePolicyDto, UpdateLeavePolicyDto, AssignPolicyDto } from './dto/leave-policy.dto';
import { Role } from '../generated/prisma';
import { Roles } from '../common/decorators/roles.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';

@Controller('api/v1/leave-policies')
export class LeavePoliciesController {
  constructor(private readonly svc: LeavePoliciesService) {}

  // GET /api/v1/leave-policies
  @Get()
  @RequirePermission('leave_policy:read')
  list(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.svc.list(page, limit);
  }

  // GET /api/v1/leave-policies/entitlement/:employeeId
  // (khai báo trước /:id để tránh xung đột route)
  @Get('entitlement/:employeeId')
  @RequirePermission('leave_policy:read')
  computeEntitlement(
    @Param('employeeId') employeeId: string,
    @Query('year', new DefaultValuePipe(new Date().getFullYear()), ParseIntPipe) year: number,
  ) {
    return this.svc.computeEntitlement(employeeId, year);
  }

  // GET /api/v1/leave-policies/:id
  @Get(':id')
  @RequirePermission('leave_policy:read')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  // POST /api/v1/leave-policies
  @Post()
  @Roles(Role.ADMIN, Role.LEADERSHIP)
  create(@Body() dto: CreateLeavePolicyDto) {
    return this.svc.create(dto);
  }

  // PATCH /api/v1/leave-policies/:id
  @Patch(':id')
  @Roles(Role.ADMIN, Role.LEADERSHIP)
  update(@Param('id') id: string, @Body() dto: UpdateLeavePolicyDto) {
    return this.svc.update(id, dto);
  }

  // POST /api/v1/leave-policies/assign
  @Post('assign')
  @Roles(Role.ADMIN, Role.LEADERSHIP)
  assign(@Body() dto: AssignPolicyDto) {
    return this.svc.assignToEmployee(dto);
  }
}
