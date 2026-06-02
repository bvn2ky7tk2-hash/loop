import { Controller, Get, Post, Patch, Body, Query, Param } from '@nestjs/common';
import { TrainingService } from './training.service';
import { CreateTrainingProgramDto, CreateTrainingRecordDto, FilterTrainingDto } from './dto/training.dto';
import { RequirePermission } from '../common/decorators/require-permission.decorator';

@Controller('api/v1/hr/training')
export class TrainingController {
  constructor(private readonly svc: TrainingService) {}

  @Get('programs')
  @RequirePermission('employees:read')
  listPrograms() { return this.svc.listPrograms(); }

  @Post('programs')
  @RequirePermission('employees:create')
  createProgram(@Body() dto: CreateTrainingProgramDto) { return this.svc.createProgram(dto); }

  @Get('records')
  @RequirePermission('employees:read')
  listRecords(@Query() dto: FilterTrainingDto) { return this.svc.listRecords(dto); }

  @Post('records')
  @RequirePermission('employees:create')
  createRecord(@Body() dto: CreateTrainingRecordDto) { return this.svc.createRecord(dto); }

  @Patch('records/:id')
  @RequirePermission('employees:update')
  updateRecord(@Param('id') id: string, @Body() dto: Partial<CreateTrainingRecordDto>) {
    return this.svc.updateRecord(id, dto);
  }

  @Get('stats')
  @RequirePermission('employees:read')
  getStats() { return this.svc.getStats(); }
}
