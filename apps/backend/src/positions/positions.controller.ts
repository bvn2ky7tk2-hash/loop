import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Roles } from '../common/decorators/roles.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { Role } from '../generated/prisma';
import { PERMISSIONS } from '../permissions/permissions.constants';
import { PositionsService } from './positions.service';
import { CreatePositionDto, UpdatePositionDto, PositionQueryDto } from './dto/position.dto';

@ApiTags('positions')
@ApiBearerAuth()
@Throttle({ default: { ttl: 60_000, limit: 100 } })
@Controller('api/v1/positions')
export class PositionsController {
  constructor(private readonly service: PositionsService) {}

  @Get()
  @RequirePermission(PERMISSIONS.EMPLOYEES_READ)
  @ApiOperation({ summary: 'Danh sách vị trí biên chế (có phân trang, filter)' })
  list(@Query() query: PositionQueryDto) {
    return this.service.list(query);
  }

  @Post()
  @Roles(Role.ADMIN, Role.LEADERSHIP)
  @RequirePermission(PERMISSIONS.EMPLOYEES_CREATE)
  @ApiOperation({ summary: 'Tạo vị trí biên chế mới' })
  create(@Body() dto: CreatePositionDto) {
    return this.service.create(dto);
  }

  // Đặt trước /:id để tránh bị nhầm route
  @Get('vacant')
  @RequirePermission(PERMISSIONS.EMPLOYEES_READ)
  @ApiOperation({ summary: 'Danh sách vị trí còn trống (VACANT) hoặc vượt biên chế (OVER_CAPACITY)' })
  @ApiQuery({ name: 'orgUnitId', required: false, type: String })
  getVacant(@Query('orgUnitId') orgUnitId?: string) {
    return this.service.getVacant(orgUnitId);
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.EMPLOYEES_READ)
  @ApiOperation({ summary: 'Chi tiết vị trí biên chế' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.LEADERSHIP)
  @RequirePermission(PERMISSIONS.EMPLOYEES_UPDATE)
  @ApiOperation({ summary: 'Cập nhật vị trí biên chế' })
  update(@Param('id') id: string, @Body() dto: UpdatePositionDto) {
    return this.service.update(id, dto);
  }
}
