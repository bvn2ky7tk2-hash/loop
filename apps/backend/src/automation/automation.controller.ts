import { Controller, Get, Put, Post, Param, Body } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../generated/prisma';
import { AutomationService } from './automation.service';

@Controller('api/v1/automation')
@Roles(Role.ADMIN)
export class AutomationController {
  constructor(private readonly svc: AutomationService) {}

  @Get('stats')
  stats() { return this.svc.getStats(); }

  @Get('rules')
  listRules() { return this.svc.listRules(); }

  @Put('rules/:key/toggle')
  toggleRule(@Param('key') key: string, @Body() body: { isActive: boolean }) {
    return this.svc.toggleRule(key, body.isActive);
  }

  @Post('trigger/:key')
  triggerRule(@Param('key') key: string) {
    return this.svc.runRule(key);
  }
}
