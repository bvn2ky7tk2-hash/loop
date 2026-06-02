import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { HrDecisionsService } from './hr-decisions.service';
import {
  CreateHrDecisionDto,
  UpdateHrDecisionDto,
  HrDecisionQueryDto,
  RejectHrDecisionDto,
} from './dto/hr-decision.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../generated/prisma';
import type { JwtUser } from '../common/types/jwt-user.type';

@Controller('api/v1/hr-decisions')
export class HrDecisionsController {
  constructor(private readonly service: HrDecisionsService) {}

  // Đặt route tĩnh trước route param để NestJS không nhầm
  @Get('by-employee/:employeeId')
  @RequirePermission('hr_decisions:read')
  findByEmployee(@Param('employeeId', ParseUUIDPipe) employeeId: string) {
    return this.service.findByEmployee(employeeId);
  }

  @Get()
  @RequirePermission('hr_decisions:read')
  list(@Query() query: HrDecisionQueryDto) {
    return this.service.list(query);
  }

  @Post()
  @Roles(Role.ADMIN, Role.LEADERSHIP)
  create(@Body() dto: CreateHrDecisionDto, @CurrentUser() user: JwtUser) {
    return this.service.create(dto, user.id);
  }

  @Get(':id')
  @RequirePermission('hr_decisions:read')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.LEADERSHIP)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateHrDecisionDto) {
    return this.service.update(id, dto);
  }

  @Post(':id/submit')
  @Roles(Role.ADMIN, Role.LEADERSHIP)
  submit(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtUser) {
    return this.service.submit(id, user.id, user.role as Role);
  }

  @Post(':id/approve')
  @Roles(Role.ADMIN)
  approve(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.approve(id);
  }

  @Post(':id/reject')
  @Roles(Role.ADMIN)
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: RejectHrDecisionDto,
  ) {
    return this.service.reject(id, body.reason);
  }
}
