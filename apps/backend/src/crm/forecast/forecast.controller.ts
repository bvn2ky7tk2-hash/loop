import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query, ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ForecastService } from './forecast.service';
import { CreateRevenueTargetDto, UpdateRevenueTargetDto } from './dto/forecast.dto';

@ApiTags('CRM Forecast')
@ApiBearerAuth()
@Controller('crm/forecast')
export class ForecastController {
  constructor(private readonly svc: ForecastService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Tổng quan pipeline & revenue' })
  stats() {
    return this.svc.stats();
  }

  @Get('pipeline')
  @ApiOperation({ summary: 'Funnel deals theo stage' })
  pipeline() {
    return this.svc.pipelineFunnel();
  }

  @Get('monthly')
  @ApiOperation({ summary: 'Phân tích doanh thu theo tháng' })
  @ApiQuery({ name: 'year', required: false, type: Number })
  monthly(@Query('year', new DefaultValuePipe(new Date().getFullYear()), ParseIntPipe) year: number) {
    return this.svc.monthlyBreakdown(year);
  }

  @Get('quarterly')
  @ApiOperation({ summary: 'Phân tích doanh thu theo quý' })
  @ApiQuery({ name: 'year', required: false, type: Number })
  quarterly(@Query('year', new DefaultValuePipe(new Date().getFullYear()), ParseIntPipe) year: number) {
    return this.svc.quarterlyBreakdown(year);
  }

  @Get('deals')
  @ApiOperation({ summary: 'Danh sách deals với forecast contribution' })
  @ApiQuery({ name: 'stage',  required: false })
  @ApiQuery({ name: 'month',  required: false })
  @ApiQuery({ name: 'page',   required: false, type: Number })
  @ApiQuery({ name: 'limit',  required: false, type: Number })
  deals(
    @Query('stage') stage?: string,
    @Query('month') month?: string,
    @Query('page',  new DefaultValuePipe(1),  ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number = 50,
  ) {
    return this.svc.listDeals({ stage, month, page, limit });
  }

  @Get('targets')
  @ApiOperation({ summary: 'Danh sách revenue targets' })
  @ApiQuery({ name: 'periodType', required: false })
  listTargets(@Query('periodType') periodType?: string) {
    return this.svc.listTargets(periodType);
  }

  @Post('targets')
  @ApiOperation({ summary: 'Tạo / cập nhật revenue target (upsert)' })
  upsertTarget(@Body() dto: CreateRevenueTargetDto) {
    return this.svc.upsertTarget(dto);
  }

  @Put('targets/:id')
  @ApiOperation({ summary: 'Cập nhật revenue target' })
  updateTarget(@Param('id') id: string, @Body() dto: UpdateRevenueTargetDto) {
    return this.svc.updateTarget(id, dto);
  }

  @Delete('targets/:id')
  @ApiOperation({ summary: 'Xóa revenue target' })
  deleteTarget(@Param('id') id: string) {
    return this.svc.deleteTarget(id);
  }
}
