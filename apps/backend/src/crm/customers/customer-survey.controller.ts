import {
  Controller, Get, Post, Patch, Param, Body, Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { CustomerSurveyService, CreateSurveyScheduleDto } from './customer-survey.service';

@ApiTags('CRM — Customer Survey Schedules')
@ApiBearerAuth()
@Controller('api/v1/crm/customers')
export class CustomerSurveyController {
  constructor(private readonly svc: CustomerSurveyService) {}

  @Get('survey-schedules')
  @ApiOperation({ summary: 'E22.6 — Danh sách lịch khảo sát khách hàng' })
  @ApiQuery({ name: 'customerId', required: false })
  @ApiQuery({ name: 'page',       required: false })
  @ApiQuery({ name: 'limit',      required: false })
  list(
    @Query('customerId') customerId?: string,
    @Query('page')  page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.svc.list(customerId, +page, +limit);
  }

  @Post('survey-schedules')
  @ApiOperation({ summary: 'E22.6 — Tạo lịch khảo sát định kỳ cho khách hàng' })
  create(@Body() dto: CreateSurveyScheduleDto) {
    return this.svc.create(dto);
  }

  @Patch('survey-schedules/:id/deactivate')
  @ApiOperation({ summary: 'E22.6 — Tắt lịch khảo sát (isActive=false)' })
  deactivate(@Param('id') id: string) {
    return this.svc.deactivate(id);
  }
}
