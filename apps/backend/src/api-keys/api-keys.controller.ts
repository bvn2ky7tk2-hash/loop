import { Controller, Get, Post, Delete, Body, Param, Query, Req } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../generated/prisma';
import { ApiKeysService } from './api-keys.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { Throttle } from '@nestjs/throttler';

@Controller('api/v1/admin/api-keys')
@Roles(Role.ADMIN)
export class ApiKeysController {
  constructor(private readonly svc: ApiKeysService) {}

  @Get()
  list(@Query() q: PaginationDto, @Req() req: any) {
    const tenantId = req.user?.tenantId;
    return this.svc.list(tenantId, q.page, q.limit);
  }

  @Post()
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  create(@Body() dto: CreateApiKeyDto, @Req() req: any) {
    const userId   = req.user?.sub ?? req.user?.id;
    const tenantId = req.user?.tenantId;
    return this.svc.create(dto, userId, tenantId);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Req() req: any) {
    const tenantId = req.user?.tenantId;
    return this.svc.delete(id, tenantId);
  }
}
