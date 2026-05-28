import { Controller, Get, Post, Patch, Body, Query, Param } from '@nestjs/common';
import { PerformanceService } from './performance.service';
import { CreatePerformanceReviewDto, UpdatePerformanceReviewDto, FilterPerformanceDto } from './dto/performance.dto';
import { RequirePermission } from '../common/decorators/require-permission.decorator';

@Controller('api/v1/hr/performance')
export class PerformanceController {
  constructor(private readonly svc: PerformanceService) {}

  @Get()
  @RequirePermission('employees:read')
  list(@Query() dto: FilterPerformanceDto) { return this.svc.list(dto); }

  @Get('stats')
  @RequirePermission('employees:read')
  getStats(@Query('period') period?: string) { return this.svc.getStats(period); }

  @Get(':id')
  @RequirePermission('employees:read')
  findOne(@Param('id') id: string) { return this.svc.findOne(id); }

  @Post()
  @RequirePermission('employees:create')
  create(@Body() dto: CreatePerformanceReviewDto) { return this.svc.create(dto); }

  @Patch(':id')
  @RequirePermission('employees:update')
  update(@Param('id') id: string, @Body() dto: UpdatePerformanceReviewDto) {
    return this.svc.update(id, dto);
  }
}
