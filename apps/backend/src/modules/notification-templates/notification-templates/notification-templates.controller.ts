import { Controller, Get, Put, Delete, Body, Param, Req } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../generated/prisma';
import { NotificationTemplatesService } from './notification-templates.service';
import { UpsertNotifTemplateDto } from './dto/upsert-template.dto';

@Controller('api/v1/admin/notification-templates')
@Roles(Role.ADMIN)
export class NotificationTemplatesController {
  constructor(private readonly svc: NotificationTemplatesService) {}

  @Get()
  listAll(@Req() req: any) {
    return this.svc.listAll(req.user?.tenantId ?? null);
  }

  @Get(':key')
  getOne(@Param('key') key: string, @Req() req: any) {
    return this.svc.getOne(key, req.user?.tenantId ?? null);
  }

  @Put(':key')
  upsert(@Param('key') key: string, @Body() dto: UpsertNotifTemplateDto, @Req() req: any) {
    return this.svc.upsert(key, dto, req.user?.tenantId ?? null);
  }

  @Delete(':key/reset')
  reset(@Param('key') key: string, @Req() req: any) {
    return this.svc.reset(key, req.user?.tenantId ?? null);
  }
}
