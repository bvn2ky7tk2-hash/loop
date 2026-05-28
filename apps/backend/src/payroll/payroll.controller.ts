import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../generated/prisma';
import { PayrollService } from './payroll.service';
import { CreatePayrollPeriodDto } from './dto/create-payroll-period.dto';
import { UpdatePayrollRecordDto } from './dto/update-payroll-record.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('payroll')
@ApiBearerAuth()
@Controller('api/v1/payroll')
export class PayrollController {
  constructor(private readonly service: PayrollService) {}

  // ── Danh sách kỳ lương ─────────────────────────────────────────────────────
  @Get('periods')
  @ApiOperation({ summary: 'Danh sách kỳ lương' })
  listPeriods(@Query() query: PaginationDto) {
    return this.service.listPeriods(query.page, query.limit);
  }

  // ── Tạo kỳ lương mới ───────────────────────────────────────────────────────
  @Post('periods')
  @Roles(Role.ADMIN, Role.LEADERSHIP)
  @ApiOperation({ summary: 'Tạo kỳ lương mới' })
  createPeriod(@Body() dto: CreatePayrollPeriodDto) {
    return this.service.createPeriod(dto);
  }

  // ── Tính lương cho kỳ ──────────────────────────────────────────────────────
  @Post('periods/:id/generate')
  @Roles(Role.ADMIN, Role.LEADERSHIP)
  @ApiOperation({ summary: 'Tính lương cho toàn bộ nhân viên trong kỳ' })
  generatePayroll(@Param('id') id: string) {
    return this.service.generatePayroll(id);
  }

  // ── Danh sách bản ghi lương theo kỳ ───────────────────────────────────────
  @Get('periods/:id/records')
  @ApiOperation({ summary: 'Danh sách bản ghi lương theo kỳ' })
  getPeriodRecords(@Param('id') id: string, @Query() query: PaginationDto) {
    return this.service.getPeriodRecords(id, query.page, query.limit);
  }

  // ── Cập nhật bản ghi lương ─────────────────────────────────────────────────
  @Patch('records/:recordId')
  @Roles(Role.ADMIN, Role.LEADERSHIP)
  @ApiOperation({ summary: 'Cập nhật bonus/deductions/note của bản ghi lương' })
  updateRecord(
    @Param('recordId') recordId: string,
    @Body() dto: UpdatePayrollRecordDto,
  ) {
    return this.service.updateRecord(recordId, dto);
  }

  // ── Chuyển kỳ lương sang REVIEWED ─────────────────────────────────────────
  @Post('periods/:id/review')
  @Roles(Role.ADMIN, Role.LEADERSHIP)
  @ApiOperation({ summary: 'Gửi kỳ lương để kiểm duyệt (PROCESSING → REVIEWED)' })
  reviewPeriod(@Param('id') id: string) {
    return this.service.reviewPeriod(id);
  }

  // ── Chạy lại kỳ lương (REVIEWED → DRAFT → PROCESSING) ────────────────────
  @Post('periods/:id/rerun')
  @Roles(Role.ADMIN, Role.LEADERSHIP)
  @ApiOperation({ summary: 'Chạy lại tính lương sau khi đã review' })
  rerunPeriod(@Param('id') id: string) {
    return this.service.rerunPeriod(id);
  }

  // ── Phê duyệt kỳ lương ─────────────────────────────────────────────────────
  @Post('periods/:id/approve')
  @Roles(Role.ADMIN, Role.LEADERSHIP)
  @ApiOperation({ summary: 'Phê duyệt kỳ lương (REVIEWED → APPROVED)' })
  approvePeriod(@Param('id') id: string, @Req() req: { user: { id: string } }) {
    return this.service.approvePeriod(id, req.user.id);
  }

  // ── Đánh dấu đã thanh toán ─────────────────────────────────────────────────
  @Post('periods/:id/pay')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Đánh dấu kỳ lương đã thanh toán' })
  markPaid(@Param('id') id: string) {
    return this.service.markPaid(id);
  }
}
