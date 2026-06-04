import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../decorators/roles.decorator';
import { Role } from '../../generated/prisma';
import { DeadLetterService } from './dead-letter.service';

@ApiTags('dead-letter')
@ApiBearerAuth()
@Controller('api/v1/admin/dead-letter')
@Roles(Role.ADMIN)
export class DeadLetterController {
  constructor(private readonly deadLetter: DeadLetterService) {}

  @Get()
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  @ApiOperation({ summary: 'Danh sách job thất bại vĩnh viễn (dead-letter) của tenant' })
  list(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.deadLetter.list(page ? parseInt(page, 10) : 1, limit ? parseInt(limit, 10) : 50);
  }

  @Post(':id/replay')
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @ApiOperation({ summary: 'Replay (re-enqueue) một dead-letter job về queue gốc' })
  replay(@Param('id') id: string) {
    return this.deadLetter.replay(id);
  }
}
