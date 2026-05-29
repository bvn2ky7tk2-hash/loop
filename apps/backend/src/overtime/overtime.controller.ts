import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../generated/prisma';
import type { JwtUser } from '../common/types/jwt-user.type';
import { OvertimeService } from './overtime.service';
import {
  CreateOvertimeRequestDto,
  ListOtQueryDto,
  RejectOtDto,
} from './dto/overtime-request.dto';

@ApiTags('overtime')
@ApiBearerAuth()
@Controller('api/v1/overtime')
export class OvertimeController {
  constructor(private readonly service: OvertimeService) {}

  // /form-schema phải đứng trước /:id để NestJS không nhầm là UUID
  @Get('form-schema')
  @Throttle({ default: { ttl: 60_000, limit: 100 } })
  @ApiOperation({ summary: 'Cấu trúc form tạo đơn tăng ca' })
  getFormSchema() {
    return {
      fields: [
        { name: 'date', label: 'Ngày làm thêm', type: 'date', required: true },
        { name: 'fromTime', label: 'Từ giờ', type: 'time', required: true },
        { name: 'toTime', label: 'Đến giờ', type: 'time', required: true },
        { name: 'hours', label: 'Số giờ OT', type: 'number', required: true, min: 0.5, max: 12 },
        { name: 'reason', label: 'Lý do', type: 'textarea', required: false },
      ],
    };
  }

  @Get()
  @Throttle({ default: { ttl: 60_000, limit: 100 } })
  @ApiOperation({ summary: 'Danh sách đơn tăng ca (phân trang, lọc)' })
  list(@Query() query: ListOtQueryDto) {
    return this.service.list(query);
  }

  @Post()
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @ApiOperation({ summary: 'Tạo đơn tăng ca' })
  create(@Body() dto: CreateOvertimeRequestDto, @CurrentUser() user: JwtUser) {
    return this.service.create(dto, user.id);
  }

  @Get(':id')
  @Throttle({ default: { ttl: 60_000, limit: 100 } })
  @ApiOperation({ summary: 'Chi tiết đơn tăng ca' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id/cancel')
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @ApiOperation({ summary: 'Huỷ đơn tăng ca (chỉ PENDING)' })
  cancel(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.service.cancel(id, user.id);
  }

  @Patch(':id/approve')
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @Roles(Role.ADMIN, Role.LEADERSHIP, Role.PM)
  @ApiOperation({ summary: 'Duyệt trực tiếp đơn tăng ca (fallback khi không có BPM)' })
  approveDirectly(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.service.approveDirectly(id, user.id);
  }

  @Patch(':id/reject')
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @Roles(Role.ADMIN, Role.LEADERSHIP, Role.PM)
  @ApiOperation({ summary: 'Từ chối đơn tăng ca' })
  reject(
    @Param('id') id: string,
    @Body() dto: RejectOtDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.reject(id, dto, user.id);
  }
}
