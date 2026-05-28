import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePortalDto, UpdatePortalDto, SubmitTicketDto, RespondTicketDto } from './dto/portal.dto';

@Injectable()
export class PortalService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Admin: manage portals ────────────────────────────────────────────────

  listPortals(customerId?: string) {
    return this.prisma.customerPortal.findMany({
      where: customerId ? { customerId } : undefined,
      include: {
        customer: { select: { id: true, name: true, code: true } },
        _count: { select: { tickets: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPortal(id: string) {
    const p = await this.prisma.customerPortal.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true, code: true } },
        tickets: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
    if (!p) throw new NotFoundException('Portal không tồn tại');
    return p;
  }

  createPortal(dto: CreatePortalDto) {
    return this.prisma.customerPortal.create({
      data: {
        name:               dto.name,
        customerId:         dto.customerId,
        allowedContractIds: dto.allowedContractIds ?? [],
        isActive:           dto.isActive ?? true,
        expiresAt:          dto.expiresAt ? new Date(dto.expiresAt) : null,
        welcomeMessage:     dto.welcomeMessage,
      },
      include: { customer: { select: { id: true, name: true } } },
    });
  }

  updatePortal(id: string, dto: UpdatePortalDto) {
    return this.prisma.customerPortal.update({
      where: { id },
      data: {
        ...dto,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      },
      include: { customer: { select: { id: true, name: true } } },
    });
  }

  deletePortal(id: string) {
    return this.prisma.customerPortal.delete({ where: { id } });
  }

  listTickets(portalId?: string, status?: string) {
    return this.prisma.customerTicket.findMany({
      where: {
        ...(portalId ? { portalId } : {}),
        ...(status ? { status: status as any } : {}),
      },
      include: {
        portal: { select: { id: true, name: true, customer: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async respondTicket(id: string, dto: RespondTicketDto) {
    const ticket = await this.prisma.customerTicket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket không tồn tại');

    const data: any = {};
    if (dto.status) data.status = dto.status;
    if (dto.response !== undefined) data.response = dto.response;
    if (dto.status === 'RESOLVED') data.resolvedAt = new Date();

    return this.prisma.customerTicket.update({ where: { id }, data });
  }

  // ─── Public: portal access ────────────────────────────────────────────────

  async resolvePortal(token: string) {
    const portal = await this.prisma.customerPortal.findUnique({
      where: { token },
      include: { customer: { select: { id: true, name: true, code: true, industry: true } } },
    });
    if (!portal) throw new NotFoundException('Portal không hợp lệ');
    if (!portal.isActive) throw new ForbiddenException('Portal đã bị vô hiệu');
    if (portal.expiresAt && new Date() > portal.expiresAt) throw new ForbiddenException('Portal đã hết hạn');
    return portal;
  }

  async getPortalData(token: string) {
    const portal = await this.resolvePortal(token);

    const [contracts, deals, tickets] = await Promise.all([
      portal.allowedContractIds.length
        ? this.prisma.clientContract.findMany({
            where: { id: { in: portal.allowedContractIds } },
            include: { milestones: { orderBy: { dueDate: 'asc' } } },
            orderBy: { startDate: 'desc' },
          })
        : this.prisma.clientContract.findMany({
            where: { customerId: portal.customerId },
            include: { milestones: { orderBy: { dueDate: 'asc' } } },
            orderBy: { startDate: 'desc' },
          }),
      this.prisma.deal.findMany({
        where: { customerId: portal.customerId },
        select: { id: true, title: true, stage: true, value: true, expectedCloseDate: true },
        orderBy: { updatedAt: 'desc' },
        take: 5,
      }),
      this.prisma.customerTicket.findMany({
        where: { portalId: portal.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);

    return {
      portal: {
        id: portal.id,
        name: portal.name,
        welcomeMessage: portal.welcomeMessage,
        customer: portal.customer,
      },
      contracts,
      deals,
      tickets,
    };
  }

  async submitTicket(token: string, dto: SubmitTicketDto) {
    const portal = await this.resolvePortal(token);
    return this.prisma.customerTicket.create({
      data: {
        portalId:    portal.id,
        title:       dto.title,
        description: dto.description,
        priority:    (dto.priority ?? 'MEDIUM') as any,
        submittedBy: dto.submittedBy,
      },
    });
  }
}
