import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Req,
  ParseIntPipe,
  DefaultValuePipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtUser } from '../../common/types/jwt-user.type';
import { ProcessInstancesService } from './process-instances.service';
import { StartInstanceDto } from './dto/start-instance.dto';

@ApiTags('processes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/processes/instances')
export class ProcessInstancesController {
  constructor(private readonly service: ProcessInstancesService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách process instances' })
  findAll(
    @Req() req: { orgUnitIds: string[] | null },
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
    @Query('definitionId') definitionId?: string,
    @Query('status') status?: string,
  ) {
    return this.service.findAll(req.orgUnitIds, page, pageSize, definitionId, status as never);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết process instance' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Khởi động process instance mới' })
  start(@Body() dto: StartInstanceDto, @CurrentUser() user: JwtUser) {
    return this.service.start(dto, user.id);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Huỷ process instance — chỉ startedBy hoặc ADMIN' })
  cancel(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.service.cancel(id, user.id, user.role);
  }

  @Get(':id/activity-log')
  @ApiOperation({ summary: 'Activity log của process instance' })
  getActivityLog(@Param('id') id: string) {
    return this.service.getActivityLog(id);
  }
}
