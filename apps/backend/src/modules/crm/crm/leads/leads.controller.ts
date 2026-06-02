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
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { LeadStatus } from '../../generated/prisma';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { ConvertLeadDto } from './dto/convert-lead.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PERMISSIONS } from '../../permissions/permissions.constants';
import { Audited } from '../../common/interceptors/audit-log.interceptor';

class LeadsQueryDto extends PaginationDto {
  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;

  @IsOptional()
  @IsString()
  assigneeId?: string;
}

@ApiTags('CRM — Leads')
@ApiBearerAuth()
@Controller('api/v1/crm/leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get()
  @Throttle({ default: { ttl: 60_000, limit: 100 } })
  @RequirePermission(PERMISSIONS.CRM_READ)
  @ApiOperation({ summary: 'Danh sách leads' })
  @ApiQuery({ name: 'status', required: false, enum: LeadStatus })
  @ApiQuery({ name: 'assigneeId', required: false })
  findAll(@Query() query: LeadsQueryDto) {
    return this.leadsService.findAll(
      query.status,
      query.assigneeId,
      query.page,
      query.limit,
    );
  }

  @Get(':id')
  @Throttle({ default: { ttl: 60_000, limit: 100 } })
  @RequirePermission(PERMISSIONS.CRM_READ)
  @ApiOperation({ summary: 'Chi tiết lead' })
  findOne(@Param('id') id: string) {
    return this.leadsService.findOne(id);
  }

  @Post()
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @RequirePermission(PERMISSIONS.CRM_MANAGE)
  @ApiOperation({ summary: 'Tạo lead' })
  create(@Body() dto: CreateLeadDto) {
    return this.leadsService.create(dto);
  }

  @Patch(':id')
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @RequirePermission(PERMISSIONS.CRM_MANAGE)
  @ApiOperation({ summary: 'Cập nhật lead' })
  update(@Param('id') id: string, @Body() dto: UpdateLeadDto) {
    return this.leadsService.update(id, dto);
  }

  @Post(':id/convert')
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @RequirePermission(PERMISSIONS.CRM_MANAGE)
  @Audited('CONVERT', 'Lead')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Chuyển lead thành deal' })
  convertToDeal(@Param('id') id: string, @Body() dto: ConvertLeadDto) {
    return this.leadsService.convertToDeal(id, dto);
  }

  @Delete(':id')
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @RequirePermission(PERMISSIONS.CRM_MANAGE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xoá lead' })
  remove(@Param('id') id: string) {
    return this.leadsService.remove(id);
  }
}
