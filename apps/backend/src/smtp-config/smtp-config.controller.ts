import { Controller, Get, Put, Post, Body, Req } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../generated/prisma';
import { SmtpConfigService } from './smtp-config.service';
import { UpsertSmtpConfigDto, TestSmtpDto } from './dto/upsert-smtp-config.dto';
import { Throttle } from '@nestjs/throttler';

@Controller('api/v1/admin/smtp-config')
@Roles(Role.ADMIN)
export class SmtpConfigController {
  constructor(private readonly svc: SmtpConfigService) {}

  @Get()
  getConfig(@Req() req: any) {
    const tenantId = req.user?.tenantId ?? 'default';
    return this.svc.getConfig(tenantId);
  }

  @Put()
  upsertConfig(@Req() req: any, @Body() dto: UpsertSmtpConfigDto) {
    const tenantId = req.user?.tenantId ?? 'default';
    return this.svc.upsertConfig(tenantId, dto);
  }

  @Post('test')
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  testConfig(@Req() req: any, @Body() dto: TestSmtpDto) {
    const tenantId = req.user?.tenantId ?? 'default';
    return this.svc.testConfig(tenantId, dto.to);
  }
}
