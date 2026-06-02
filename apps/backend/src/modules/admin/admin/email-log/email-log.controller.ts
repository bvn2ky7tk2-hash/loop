import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../generated/prisma';
import type { JwtUser } from '../../common/types/jwt-user.type';
import { EmailLogService } from './email-log.service';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('admin-email-logs')
@ApiBearerAuth()
@Controller('api/v1/admin/email-logs')
@Roles(Role.ADMIN)
export class EmailLogController {
  constructor(private readonly service: EmailLogService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách email log (paginated)' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'module', required: false })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  list(
    @CurrentUser() user: JwtUser,
    @Query() pagination: PaginationDto,
    @Query('status') status?: string,
    @Query('module') module?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.service.list(user.tenantId, { status, module, fromDate, toDate }, pagination);
  }

  @Post(':id/retry')
  @ApiOperation({ summary: 'Retry gửi lại email FAILED' })
  retry(@Param('id') id: string) {
    return this.service.retry(id);
  }
}
