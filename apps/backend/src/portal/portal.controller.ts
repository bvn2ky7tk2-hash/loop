import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtUser } from '../common/types/jwt-user.type';
import { PortalService } from './portal.service';
import { CreatePortalDto, UpdatePortalDto, SubmitTicketDto, RespondTicketDto, LinkTicketToIssueDto } from './dto/portal.dto';

// ─── Admin endpoints (require JWT) ───────────────────────────────────────────
@ApiTags('Customer Portal — Admin')
@ApiBearerAuth()
@Controller('api/v1/crm/portals')
export class PortalAdminController {
  constructor(private readonly svc: PortalService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách portals' })
  @ApiQuery({ name: 'customerId', required: false })
  list(@Query('customerId') customerId?: string) {
    return this.svc.listPortals(customerId);
  }

  @Get('tickets')
  @ApiOperation({ summary: 'Tất cả tickets từ mọi portal' })
  @ApiQuery({ name: 'portalId', required: false })
  @ApiQuery({ name: 'status',   required: false })
  allTickets(@Query('portalId') portalId?: string, @Query('status') status?: string) {
    return this.svc.listTickets(portalId, status);
  }

  @Get(':id')
  getPortal(@Param('id') id: string) { return this.svc.getPortal(id); }

  @Post()
  createPortal(@Body() dto: CreatePortalDto) { return this.svc.createPortal(dto); }

  @Put(':id')
  updatePortal(@Param('id') id: string, @Body() dto: UpdatePortalDto) {
    return this.svc.updatePortal(id, dto);
  }

  @Delete(':id')
  deletePortal(@Param('id') id: string) { return this.svc.deletePortal(id); }

  @Put('tickets/:id/respond')
  @ApiOperation({ summary: 'Respond / đổi status ticket' })
  respondTicket(@Param('id') id: string, @Body() dto: RespondTicketDto) {
    return this.svc.respondTicket(id, dto);
  }

  @Post('tickets/:id/link-to-issue')
  @ApiOperation({ summary: 'Chuyển ticket thành Internal Issue (Bug type=ISSUE)' })
  linkToIssue(@Param('id') id: string, @Body() dto: LinkTicketToIssueDto) {
    return this.svc.linkToIssue(id, dto);
  }
}

// ─── E22.1: Ticket → Issue endpoint (alias route /crm/portal) ────────────────
@ApiTags('Customer Portal — Tickets')
@ApiBearerAuth()
@Controller('api/v1/crm/portal')
export class PortalTicketController {
  constructor(private readonly svc: PortalService) {}

  @Post('tickets/:id/link-issue')
  @ApiOperation({ summary: 'Chuyển CustomerTicket thành Internal Issue (Bug type=ISSUE)' })
  linkTicketToIssue(
    @Param('id') id: string,
    @Body() dto: LinkTicketToIssueDto,
    @CurrentUser() user: JwtUser,
  ) {
    // Gán reporterId từ JWT nếu body không truyền (backward compat)
    const enriched = { ...dto, reporterId: dto.reporterId ?? user?.id };
    return this.svc.linkToIssue(id, enriched);
  }
}

// ─── Public endpoints (no JWT — customer access via token) ───────────────────
@ApiTags('Customer Portal — Public')
@Controller('public/portal')
export class PortalPublicController {
  constructor(private readonly svc: PortalService) {}

  @Get(':token')
  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  @ApiOperation({ summary: 'Lấy toàn bộ dữ liệu portal' })
  getData(@Param('token') token: string) {
    return this.svc.getPortalData(token);
  }

  @Post(':token/tickets')
  @Public()
  @Throttle({ auth: { ttl: 60_000, limit: 10 } })
  @ApiOperation({ summary: 'Khách hàng submit ticket' })
  submitTicket(@Param('token') token: string, @Body() dto: SubmitTicketDto) {
    return this.svc.submitTicket(token, dto);
  }
}
