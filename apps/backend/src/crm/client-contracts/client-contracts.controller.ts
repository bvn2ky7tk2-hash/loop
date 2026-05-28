import {
  Controller, Get, Post, Put, Patch, Delete,
  Param, Body, Query, ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { ClientContractsService } from './client-contracts.service';
import {
  CreateClientContractDto, UpdateClientContractDto,
  CreateMilestoneDto, UpdateMilestoneDto,
} from './dto/client-contract.dto';

@Controller('crm/client-contracts')
@Roles('ADMIN', 'PM', 'MEMBER')
export class ClientContractsController {
  constructor(private readonly svc: ClientContractsService) {}

  @Get('stats')
  stats() {
    return this.svc.stats();
  }

  @Get()
  findAll(
    @Query('customerId') customerId?: string,
    @Query('status') status?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit = 20,
  ) {
    return this.svc.findAll(customerId, status, page, limit);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateClientContractDto) {
    return this.svc.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateClientContractDto) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'PM')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }

  // ── Milestones ──────────────────────────────────────────────────────────────

  @Post(':id/milestones')
  addMilestone(@Param('id') id: string, @Body() dto: CreateMilestoneDto) {
    return this.svc.addMilestone(id, dto);
  }

  @Patch(':id/milestones/:milestoneId')
  updateMilestone(
    @Param('id') id: string,
    @Param('milestoneId') milestoneId: string,
    @Body() dto: UpdateMilestoneDto,
  ) {
    return this.svc.updateMilestone(id, milestoneId, dto);
  }

  @Delete(':id/milestones/:milestoneId')
  deleteMilestone(
    @Param('id') id: string,
    @Param('milestoneId') milestoneId: string,
  ) {
    return this.svc.deleteMilestone(id, milestoneId);
  }
}
