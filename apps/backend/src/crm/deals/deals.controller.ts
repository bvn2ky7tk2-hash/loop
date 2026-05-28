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
import { DealStage } from '../../generated/prisma';
import { DealsService } from './deals.service';
import { CreateDealDto } from './dto/create-deal.dto';
import { UpdateDealDto } from './dto/update-deal.dto';
import { WonDealDto } from './dto/won-deal.dto';
import { LostDealDto } from './dto/lost-deal.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PERMISSIONS } from '../../permissions/permissions.constants';
import { ApiProperty } from '@nestjs/swagger';

class ChangeStageDto {
  @ApiProperty({ enum: DealStage })
  @IsEnum(DealStage)
  stage: DealStage;
}

class DealsQueryDto extends PaginationDto {
  @IsOptional()
  @IsEnum(DealStage)
  stage?: DealStage;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  assigneeId?: string;
}

@ApiTags('CRM — Deals')
@ApiBearerAuth()
@Controller('api/v1/crm/deals')
export class DealsController {
  constructor(private readonly dealsService: DealsService) {}

  @Get()
  @Throttle({ default: { ttl: 60_000, limit: 100 } })
  @RequirePermission(PERMISSIONS.CRM_READ)
  @ApiOperation({ summary: 'Danh sách deals' })
  @ApiQuery({ name: 'stage', required: false, enum: DealStage })
  @ApiQuery({ name: 'customerId', required: false })
  @ApiQuery({ name: 'assigneeId', required: false })
  findAll(@Query() query: DealsQueryDto) {
    return this.dealsService.findAll(
      query.stage,
      query.customerId,
      query.assigneeId,
      query.page,
      query.limit,
    );
  }

  @Get(':id')
  @Throttle({ default: { ttl: 60_000, limit: 100 } })
  @RequirePermission(PERMISSIONS.CRM_READ)
  @ApiOperation({ summary: 'Chi tiết deal' })
  findOne(@Param('id') id: string) {
    return this.dealsService.findOne(id);
  }

  @Post()
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @RequirePermission(PERMISSIONS.CRM_MANAGE)
  @ApiOperation({ summary: 'Tạo deal' })
  create(@Body() dto: CreateDealDto) {
    return this.dealsService.create(dto);
  }

  @Patch(':id')
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @RequirePermission(PERMISSIONS.CRM_MANAGE)
  @ApiOperation({ summary: 'Cập nhật thông tin deal (không đổi stage)' })
  update(@Param('id') id: string, @Body() dto: UpdateDealDto) {
    return this.dealsService.update(id, dto);
  }

  @Patch(':id/stage')
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @RequirePermission(PERMISSIONS.CRM_MANAGE)
  @ApiOperation({ summary: 'Đổi stage deal' })
  changeStage(@Param('id') id: string, @Body() dto: ChangeStageDto) {
    return this.dealsService.changeStage(id, dto.stage);
  }

  @Post(':id/won')
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @RequirePermission(PERMISSIONS.CRM_MANAGE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đánh dấu deal thắng (Won) và tạo project' })
  markWon(@Param('id') id: string, @Body() dto: WonDealDto) {
    return this.dealsService.markWon(id, dto);
  }

  @Post(':id/lost')
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @RequirePermission(PERMISSIONS.CRM_MANAGE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đánh dấu deal thua (Lost)' })
  markLost(@Param('id') id: string, @Body() dto: LostDealDto) {
    return this.dealsService.markLost(id, dto);
  }

  @Delete(':id')
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @RequirePermission(PERMISSIONS.CRM_MANAGE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xoá deal (chỉ QUALIFICATION hoặc LOST)' })
  remove(@Param('id') id: string) {
    return this.dealsService.remove(id);
  }
}
