import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  Req,
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { CrmActivitiesService } from './crm-activities.service';
import { CreateActivityDto, UpdateActivityDto } from './dto/crm-activity.dto';

@Controller('api/v1/crm/activities')
@Roles('ADMIN', 'PM', 'MEMBER')
export class CrmActivitiesController {
  constructor(private readonly svc: CrmActivitiesService) {}

  @Get('stats')
  stats() {
    return this.svc.stats();
  }

  @Get()
  findAll(
    @Query('customerId') customerId?: string,
    @Query('dealId') dealId?: string,
    @Query('leadId') leadId?: string,
    @Query('type') type?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit = 20,
  ) {
    return this.svc.findAll(customerId, dealId, leadId, type, page, limit);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateActivityDto, @Req() req: any) {
    return this.svc.create(dto, req.user?.sub ?? req.user?.id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateActivityDto) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
