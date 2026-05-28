import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { Roles } from '../common/decorators/roles.decorator';
import { Role, ExpenseStatus } from '../generated/prisma';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { ApproveExpenseDto } from './dto/approve-expense.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('expenses')
@ApiBearerAuth()
@Controller('api/v1/expenses')
export class ExpensesController {
  constructor(private readonly service: ExpensesService) {}

  // ── Danh sách phiếu chi ────────────────────────────────────────────────────
  @Get()
  @ApiOperation({ summary: 'Danh sách phiếu chi' })
  @ApiQuery({ name: 'status',    required: false, enum: ExpenseStatus })
  @ApiQuery({ name: 'projectId', required: false, type: String })
  @ApiQuery({ name: 'page',      required: false, type: Number })
  @ApiQuery({ name: 'limit',     required: false, type: Number })
  findAll(
    @Query('status')    status?: ExpenseStatus,
    @Query('projectId') projectId?: string,
    @Query()            query?: PaginationDto,
  ) {
    return this.service.findAll(
      undefined,
      status,
      projectId,
      query?.page,
      query?.limit,
    );
  }

  // ── Chi tiết phiếu chi ─────────────────────────────────────────────────────
  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết phiếu chi' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  // ── Tạo phiếu chi mới ──────────────────────────────────────────────────────
  @Post()
  @ApiOperation({ summary: 'Tạo phiếu chi mới' })
  create(
    @Body() dto: CreateExpenseDto,
    @Req() req: { user: { id: string } },
  ) {
    return this.service.create(dto, req.user.id);
  }

  // ── Phê duyệt / Từ chối phiếu chi ─────────────────────────────────────────
  @Patch(':id/approve')
  @Roles(Role.ADMIN, Role.LEADERSHIP, Role.PM)
  @ApiOperation({ summary: 'Phê duyệt hoặc từ chối phiếu chi' })
  approve(
    @Param('id') id: string,
    @Body() dto: ApproveExpenseDto,
    @Req() req: { user: { id: string } },
  ) {
    return this.service.approve(id, dto, req.user.id);
  }

  // ── Xóa phiếu chi ──────────────────────────────────────────────────────────
  @Delete(':id')
  @ApiOperation({ summary: 'Xóa phiếu chi (chỉ khi PENDING)' })
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
