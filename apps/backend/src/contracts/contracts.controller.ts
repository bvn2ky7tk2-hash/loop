import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { PERMISSIONS } from '../permissions/permissions.constants';
import { PaginationDto } from '../common/dto/pagination.dto';
import { ContractsService } from './contracts.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';

@ApiTags('contracts')
@ApiBearerAuth()
@Controller('api/v1/contracts')
export class ContractsController {
  constructor(private readonly service: ContractsService) {}

  @Get()
  @Throttle({ default: { ttl: 60_000, limit: 100 } })
  @RequirePermission(PERMISSIONS.EMPLOYEES_READ)
  @ApiOperation({ summary: 'Danh sách hợp đồng (phân trang, lọc theo nhân viên)' })
  findAll(
    @Query('employeeId') employeeId: string | undefined,
    @Query() pagination: PaginationDto,
  ) {
    return this.service.findAll(employeeId, pagination.page, pagination.limit);
  }

  @Get(':id')
  @Throttle({ default: { ttl: 60_000, limit: 100 } })
  @RequirePermission(PERMISSIONS.EMPLOYEES_READ)
  @ApiOperation({ summary: 'Chi tiết hợp đồng' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @RequirePermission(PERMISSIONS.EMPLOYEES_UPDATE)
  @ApiOperation({ summary: 'Tạo hợp đồng mới' })
  create(@Body() dto: CreateContractDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @RequirePermission(PERMISSIONS.EMPLOYEES_UPDATE)
  @ApiOperation({ summary: 'Cập nhật hợp đồng' })
  update(@Param('id') id: string, @Body() dto: UpdateContractDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @RequirePermission(PERMISSIONS.EMPLOYEES_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xoá mềm hợp đồng' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Patch(':id/restore')
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @RequirePermission(PERMISSIONS.EMPLOYEES_UPDATE)
  @ApiOperation({ summary: 'Khôi phục hợp đồng đã xoá mềm' })
  restore(@Param('id') id: string) {
    return this.service.restore(id);
  }
}
