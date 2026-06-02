import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../generated/prisma';
import { QueuesService } from './queues.service';

@ApiTags('admin-queues')
@ApiBearerAuth()
@Controller('api/v1/admin/queues')
@Roles(Role.ADMIN)
export class QueuesController {
  constructor(private readonly service: QueuesService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách tất cả queues với counts' })
  listQueues() {
    return this.service.listQueues();
  }

  @Get(':name/jobs')
  @ApiOperation({ summary: 'Danh sách jobs theo trạng thái trong queue' })
  @ApiQuery({ name: 'status', required: false, description: 'waiting|active|completed|failed|delayed', example: 'failed' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  getJobs(
    @Param('name') name: string,
    @Query('status') status = 'failed',
    @Query('page') page = '1',
    @Query('limit') limit = '50',
  ) {
    return this.service.getJobs(name, status, parseInt(page, 10), parseInt(limit, 10));
  }

  @Post(':name/jobs/:id/retry')
  @ApiOperation({ summary: 'Retry job failed trong queue' })
  retryJob(@Param('name') name: string, @Param('id') id: string) {
    return this.service.retryJob(name, id);
  }
}
