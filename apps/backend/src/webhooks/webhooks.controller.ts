import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Put,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../generated/prisma';
import { WebhooksService } from './webhooks.service';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { UpdateWebhookDto } from './dto/update-webhook.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@Controller('api/v1/webhooks')
@Roles(Role.ADMIN)
export class WebhooksController {
  constructor(private readonly svc: WebhooksService) {}

  @Get()
  listEndpoints(@Query() q: PaginationDto) {
    return this.svc.listEndpoints(q.page, q.limit);
  }

  @Post()
  createEndpoint(@Body() dto: CreateWebhookDto) {
    return this.svc.createEndpoint(dto);
  }

  @Patch(':id')
  updateEndpoint(@Param('id') id: string, @Body() dto: UpdateWebhookDto) {
    return this.svc.updateEndpoint(id, dto);
  }

  @Delete(':id')
  deleteEndpoint(@Param('id') id: string) {
    return this.svc.deleteEndpoint(id);
  }

  @Put(':id/toggle')
  toggleEndpoint(@Param('id') id: string, @Body() body: { isActive: boolean }) {
    return this.svc.toggleEndpoint(id, body.isActive);
  }

  @Get(':id/logs')
  listLogs(@Param('id') id: string, @Query() q: PaginationDto) {
    return this.svc.listLogs(id, q.page, q.limit);
  }

  @Post('test/:id')
  sendTest(@Param('id') id: string) {
    return this.svc.sendTestPayload(id);
  }
}
