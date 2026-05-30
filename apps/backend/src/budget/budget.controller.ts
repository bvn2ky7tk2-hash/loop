import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  Req,
  Scope,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { Throttle } from '@nestjs/throttler';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../generated/prisma';
import { BudgetService } from './budget.service';
import { CreateBudgetPlanDto } from './dto/create-budget-plan.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('budget-plans')
@ApiBearerAuth()
@Controller({ path: 'api/v1/budget-plans', scope: Scope.REQUEST })
export class BudgetController {
  constructor(private readonly service: BudgetService) {}

  // ── Danh sách kế hoạch ngân sách ──────────────────────────────────────────
  @Get()
  @ApiOperation({ summary: 'Danh sách kế hoạch ngân sách' })
  @ApiQuery({ name: 'fiscalYear', required: false, type: Number })
  @ApiQuery({ name: 'orgUnitId',  required: false, type: String })
  @ApiQuery({ name: 'status',     required: false, type: String })
  @ApiQuery({ name: 'page',       required: false, type: Number })
  @ApiQuery({ name: 'limit',      required: false, type: Number })
  findAll(
    @Query('fiscalYear') fiscalYear?: string,
    @Query('orgUnitId')  orgUnitId?: string,
    @Query('status')     status?: string,
    @Query()             pagination?: PaginationDto,
  ) {
    return this.service.findAll({
      fiscalYear: fiscalYear ? parseInt(fiscalYear, 10) : undefined,
      orgUnitId,
      status,
      page: pagination?.page,
      limit: pagination?.limit,
    });
  }

  // ── Tạo kế hoạch ngân sách mới ────────────────────────────────────────────
  @Post()
  @Roles(Role.ADMIN, Role.LEADERSHIP)
  @Throttle({ global: { ttl: 60_000, limit: 30 } })
  @ApiOperation({ summary: 'Tạo kế hoạch ngân sách mới (FINANCE/ADMIN)' })
  create(
    @Body() dto: CreateBudgetPlanDto,
    @Req() req: { user: { id: string } },
  ) {
    return this.service.create(dto, req.user.id);
  }

  // ── Chi tiết kế hoạch ngân sách ───────────────────────────────────────────
  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết kế hoạch ngân sách' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  // ── Tóm tắt ngân sách (summary) ───────────────────────────────────────────
  @Get(':id/summary')
  @ApiOperation({ summary: 'Tóm tắt tình hình sử dụng ngân sách' })
  getSummary(@Param('id') id: string) {
    return this.service.getSummary(id);
  }

  // ── Nộp phê duyệt ─────────────────────────────────────────────────────────
  @Post(':id/submit')
  @ApiOperation({ summary: 'Nộp kế hoạch ngân sách lên phê duyệt' })
  submit(@Param('id') id: string) {
    return this.service.submit(id);
  }

  // ── Phê duyệt ─────────────────────────────────────────────────────────────
  @Post(':id/approve')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Phê duyệt kế hoạch ngân sách (ADMIN)' })
  approve(
    @Param('id') id: string,
    @Req() req: { user: { id: string } },
  ) {
    return this.service.approve(id, req.user.id);
  }

  // ── Từ chối ────────────────────────────────────────────────────────────────
  @Post(':id/reject')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Từ chối kế hoạch ngân sách (ADMIN)' })
  reject(
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    return this.service.reject(id, reason);
  }
}
