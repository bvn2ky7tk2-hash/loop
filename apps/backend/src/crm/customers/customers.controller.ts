import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PERMISSIONS } from '../../permissions/permissions.constants';

@ApiTags('CRM — Customers')
@ApiBearerAuth()
@Controller('api/v1/crm/customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @Throttle({ default: { ttl: 60_000, limit: 100 } })
  @RequirePermission('crm_customers:read', PERMISSIONS.CRM_READ)
  @ApiOperation({ summary: 'Danh sách khách hàng' })
  findAll(@Query() query: PaginationDto) {
    return this.customersService.findAll(query.page, query.limit);
  }

  @Get(':id')
  @Throttle({ default: { ttl: 60_000, limit: 100 } })
  @RequirePermission('crm_customers:read', PERMISSIONS.CRM_READ)
  @ApiOperation({ summary: 'Chi tiết khách hàng' })
  findOne(@Param('id') id: string) {
    return this.customersService.findOne(id);
  }

  @Post()
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @RequirePermission('crm_customers:create', PERMISSIONS.CRM_MANAGE)
  @ApiOperation({ summary: 'Tạo khách hàng' })
  create(@Body() dto: CreateCustomerDto) {
    return this.customersService.create(dto);
  }

  @Patch(':id')
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @RequirePermission('crm_customers:create', PERMISSIONS.CRM_MANAGE)
  @ApiOperation({ summary: 'Cập nhật khách hàng' })
  update(@Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return this.customersService.update(id, dto);
  }

  @Delete(':id')
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @RequirePermission('crm_customers:create', PERMISSIONS.CRM_MANAGE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xoá mềm khách hàng' })
  remove(@Param('id') id: string) {
    return this.customersService.remove(id);
  }

  @Patch(':id/restore')
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @RequirePermission('crm_customers:create', PERMISSIONS.CRM_MANAGE)
  @ApiOperation({ summary: 'Khôi phục khách hàng đã xoá mềm' })
  restore(@Param('id') id: string) {
    return this.customersService.restore(id);
  }

  // ── L-02: Customer Revenue & Projects ─────────────────────────────────────

  @Get(':id/revenue')
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  @RequirePermission('crm_customers:read', PERMISSIONS.CRM_READ)
  @ApiOperation({ summary: 'Doanh thu từ khách hàng (invoices + tổng đã thanh toán)' })
  getRevenue(@Param('id') id: string) {
    return this.customersService.getRevenue(id);
  }

  @Get(':id/projects')
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  @RequirePermission('crm_customers:read', PERMISSIONS.CRM_READ)
  @ApiOperation({ summary: 'Danh sách dự án của khách hàng' })
  getProjects(@Param('id') id: string) {
    return this.customersService.getProjects(id);
  }
}
