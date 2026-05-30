import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { BugSeverity, BugItemType, BugStatus, NotificationType, Role } from '../generated/prisma';
import { CreatePortalDto, UpdatePortalDto, SubmitTicketDto, RespondTicketDto, LinkTicketToIssueDto } from './dto/portal.dto';

// Priority mapping: TicketPriority → BugSeverity
const PRIORITY_TO_SEVERITY: Record<string, BugSeverity> = {
  LOW:    BugSeverity.LOW,
  MEDIUM: BugSeverity.MEDIUM,
  HIGH:   BugSeverity.HIGH,
  URGENT: BugSeverity.CRITICAL,
};

@Injectable()
export class PortalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // ─── Admin: manage portals ────────────────────────────────────────────────

  async listPortals(customerId?: string, page = 1, limit = 50) {
    const where = customerId ? { customerId } : undefined;
    const skip = (page - 1) * limit;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.customerPortal.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, code: true } },
          _count: { select: { tickets: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.customerPortal.count({ where }),
    ]);
    return { data, total, page, limit };
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

  async listTickets(portalId?: string, status?: string, page = 1, limit = 50) {
    const where = {
      ...(portalId ? { portalId } : {}),
      ...(status ? { status: status as any } : {}),
    };
    const skip = (page - 1) * limit;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.customerTicket.findMany({
        where,
        include: {
          portal: { select: { id: true, name: true, customer: { select: { name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.customerTicket.count({ where }),
    ]);
    return { data, total, page, limit };
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
            // Giới hạn an toàn — portal khách hàng hiển thị tối đa 200 hợp đồng
            take: 200,
          })
        : this.prisma.clientContract.findMany({
            where: { customerId: portal.customerId },
            include: { milestones: { orderBy: { dueDate: 'asc' } } },
            orderBy: { startDate: 'desc' },
            // Giới hạn an toàn — portal khách hàng hiển thị tối đa 200 hợp đồng
            take: 200,
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

  // ─── Admin: link ticket to internal Issue ────────────────────────────────────

  async linkToIssue(ticketId: string, dto: LinkTicketToIssueDto) {
    const ticket = await this.prisma.customerTicket.findUnique({
      where: { id: ticketId },
      include: {
        portal: {
          select: {
            id: true,
            customerId: true,
            customer: { select: { name: true } },
          },
        },
      },
    });
    if (!ticket) throw new NotFoundException('Ticket không tồn tại');
    if (ticket.issueId) throw new BadRequestException('Ticket đã được liên kết với issue');

    // Resolve projectId: ưu tiên dto.projectId, sau đó lấy project của customer
    let projectId = dto.projectId;
    if (!projectId) {
      const project = await this.prisma.project.findFirst({
        where: { customerId: ticket.portal.customerId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      });
      if (!project) throw new BadRequestException('Không tìm thấy project nào của khách hàng để gắn issue — vui lòng truyền projectId');
      projectId = project.id;
    }

    const severity = PRIORITY_TO_SEVERITY[dto.priority ?? ticket.priority] ?? BugSeverity.MEDIUM;

    const issue = await this.prisma.$transaction(async (tx) => {
      const bug = await tx.bug.create({
        data: {
          projectId,
          reporterId:     dto.reporterId,
          title:          dto.issueTitle,
          description:    dto.issueDescription,
          severity,
          itemType:       BugItemType.ISSUE,
          status:         BugStatus.OPEN,
          requesterName:  ticket.submittedBy ?? undefined,
        },
      });

      await tx.customerTicket.update({
        where: { id: ticketId },
        data:  { issueId: bug.id },
      });

      return bug;
    });

    // Notify Customer Success team (ADMIN + PM roles)
    const csTeam = await this.prisma.user.findMany({
      where: {
        role: { in: [Role.ADMIN, Role.PM] },
        isActive: true,
      },
      select: { id: true },
      take: 50,
    });

    await Promise.all(
      csTeam.map((u) =>
        this.notifications.createInApp(u.id, {
          type:       NotificationType.ISSUE_ASSIGNED,
          title:      'Issue mới từ khách hàng',
          body:       `Ticket "${ticket.title}" (${ticket.portal.customer?.name}) đã được chuyển thành Issue #${issue.id.slice(0, 8)}`,
          link:       `/bugs/${issue.id}`,
          entityType: 'Bug',
          entityId:   issue.id,
        }),
      ),
    );

    return { issue, ticketId, issueId: issue.id };
  }
}
