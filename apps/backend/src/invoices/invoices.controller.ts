import {
  Controller, Get, Post, Put, Patch, Delete,
  Param, Body, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { FilterInvoiceDto } from './dto/filter-invoice.dto';
import { ChangeInvoiceStatusDto } from './dto/change-status.dto';
import { Audited } from '../common/interceptors/audit-log.interceptor';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { PERMISSIONS } from '../permissions/permissions.constants';

@ApiTags('invoices')
@ApiBearerAuth()
@Controller('api/v1/invoices')
export class InvoicesController {
  constructor(private readonly svc: InvoicesService) {}

  @Get('summary')
  @RequirePermission(PERMISSIONS.FINANCE_READ)
  summary() {
    return this.svc.getSummary();
  }

  // ── L-04: Hóa đơn quá hạn — đặt TRƯỚC :id để tránh route conflict ────────
  @Get('overdue')
  @RequirePermission(PERMISSIONS.FINANCE_READ)
  getOverdue() {
    return this.svc.getOverdue();
  }

  @Get()
  @RequirePermission(PERMISSIONS.FINANCE_READ)
  findAll(@Query() dto: FilterInvoiceDto) {
    return this.svc.findAll(dto);
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.FINANCE_READ)
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Post()
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @RequirePermission(PERMISSIONS.FINANCE_MANAGE)
  @Audited('CREATE', 'Invoice')
  create(@Body() dto: CreateInvoiceDto, @CurrentUser('id') userId: string) {
    return this.svc.create(dto, userId);
  }

  @Put(':id')
  @RequirePermission(PERMISSIONS.FINANCE_MANAGE)
  update(@Param('id') id: string, @Body() dto: UpdateInvoiceDto) {
    return this.svc.update(id, dto);
  }

  @Patch(':id/status')
  @RequirePermission(PERMISSIONS.FINANCE_MANAGE)
  @Audited('STATUS_CHANGE', 'Invoice')
  changeStatus(@Param('id') id: string, @Body() dto: ChangeInvoiceStatusDto) {
    return this.svc.changeStatus(id, dto.status);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission(PERMISSIONS.FINANCE_EXPORT)
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }

}
