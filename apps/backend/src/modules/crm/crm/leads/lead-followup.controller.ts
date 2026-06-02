import {
  Controller, Get, Post, Patch, Param, Body, Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { LeadFollowUpService, CreateFollowUpDto } from './lead-followup.service';
import { FollowUpStatus } from '../../generated/prisma';

@ApiTags('CRM — Lead Follow-Ups')
@ApiBearerAuth()
@Controller('api/v1/crm/leads')
export class LeadFollowUpController {
  constructor(private readonly svc: LeadFollowUpService) {}

  @Get('follow-ups')
  @ApiOperation({ summary: 'E22.5 — Danh sách follow-up schedules (filter leadId/dealId/status)' })
  @ApiQuery({ name: 'leadId',  required: false })
  @ApiQuery({ name: 'dealId',  required: false })
  @ApiQuery({ name: 'status',  required: false })
  @ApiQuery({ name: 'page',    required: false })
  @ApiQuery({ name: 'limit',   required: false })
  list(
    @Query('leadId')  leadId?: string,
    @Query('dealId')  dealId?: string,
    @Query('status')  status?: string,
    @Query('page')    page = '1',
    @Query('limit')   limit = '20',
  ) {
    return this.svc.list(leadId, dealId, status as FollowUpStatus | undefined, +page, +limit);
  }

  @Post(':id/follow-ups')
  @ApiOperation({ summary: 'E22.5 — Tạo follow-up schedule cho lead/deal' })
  create(@Param('id') leadId: string, @Body() dto: CreateFollowUpDto) {
    return this.svc.create({ ...dto, leadId });
  }

  @Patch('follow-ups/:followUpId/done')
  @ApiOperation({ summary: 'E22.5 — Đánh dấu follow-up hoàn thành (DONE)' })
  markDone(@Param('followUpId') id: string) {
    return this.svc.markDone(id);
  }

  @Patch('follow-ups/:followUpId/skip')
  @ApiOperation({ summary: 'E22.5 — Bỏ qua follow-up (SKIPPED)' })
  markSkipped(@Param('followUpId') id: string) {
    return this.svc.markSkipped(id);
  }
}
