import {
  Controller, Get, Post, Put, Patch, Delete,
  Param, Body, Query, ParseIntPipe, DefaultValuePipe, Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { OkrService } from './okr.service';
import {
  CreateObjectiveDto, UpdateObjectiveDto,
  CreateKeyResultDto, UpdateKeyResultDto,
  CreateKpiMetricDto, UpdateKpiMetricDto, CreateKpiRecordDto,
} from './dto/okr.dto';

@ApiTags('okr')
@ApiBearerAuth()
@Controller('api/v1/okr')
@Roles('ADMIN', 'PM', 'MEMBER')
export class OkrController {
  constructor(private readonly svc: OkrService) {}

  @Get('stats')
  stats() { return this.svc.stats(); }

  // ── Objectives ─────────────────────────────────────────────────────────────
  @Get('objectives')
  listObjectives(
    @Query('ownerId') ownerId?: string,
    @Query('cycle') cycle?: string,
    @Query('year', new DefaultValuePipe(0), ParseIntPipe) year = 0,
    @Query('status') status?: string,
    @Query('orgUnitId') orgUnitId?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit = 20,
  ) {
    return this.svc.listObjectives(ownerId, cycle, year || undefined, status, orgUnitId, page, limit);
  }

  @Get('objectives/:id')
  getObjective(@Param('id') id: string) { return this.svc.getObjective(id); }

  @Post('objectives')
  createObjective(@Body() dto: CreateObjectiveDto) { return this.svc.createObjective(dto); }

  @Put('objectives/:id')
  updateObjective(@Param('id') id: string, @Body() dto: UpdateObjectiveDto) {
    return this.svc.updateObjective(id, dto);
  }

  @Delete('objectives/:id')
  @Roles('ADMIN', 'PM')
  deleteObjective(@Param('id') id: string) { return this.svc.deleteObjective(id); }

  @Post('objectives/:id/start-review')
  @Roles('ADMIN', 'PM')
  @ApiOperation({ summary: 'Khởi tạo quy trình review OKR qua BPM' })
  startReview(@Param('id') id: string, @Req() req: { user: { id: string } }) {
    return this.svc.startObjectiveReview(id, req.user.id);
  }

  // ── Key Results ────────────────────────────────────────────────────────────
  @Post('objectives/:id/key-results')
  addKeyResult(@Param('id') id: string, @Body() dto: CreateKeyResultDto) {
    return this.svc.addKeyResult(id, dto);
  }

  @Patch('key-results/:id')
  updateKeyResult(@Param('id') id: string, @Body() dto: UpdateKeyResultDto) {
    return this.svc.updateKeyResult(id, dto);
  }

  @Delete('key-results/:id')
  deleteKeyResult(@Param('id') id: string) { return this.svc.deleteKeyResult(id); }

  // ── KPI Metrics ────────────────────────────────────────────────────────────
  @Get('kpi-metrics')
  listMetrics(@Query('orgUnitId') orgUnitId?: string) { return this.svc.listMetrics(orgUnitId); }

  @Post('kpi-metrics')
  @Roles('ADMIN', 'PM')
  createMetric(@Body() dto: CreateKpiMetricDto) { return this.svc.createMetric(dto); }

  @Put('kpi-metrics/:id')
  @Roles('ADMIN', 'PM')
  updateMetric(@Param('id') id: string, @Body() dto: UpdateKpiMetricDto) {
    return this.svc.updateMetric(id, dto);
  }

  @Delete('kpi-metrics/:id')
  @Roles('ADMIN')
  deleteMetric(@Param('id') id: string) { return this.svc.deleteMetric(id); }

  @Post('kpi-metrics/:id/records')
  addKpiRecord(@Param('id') id: string, @Body() dto: CreateKpiRecordDto) {
    return this.svc.addKpiRecord(id, dto);
  }
}
