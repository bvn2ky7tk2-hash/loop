import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ConflictException,
  UnprocessableEntityException,
  Inject,
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, DealStage, ProjectType, ProjectStatus } from '../../generated/prisma';
import { paginate, PaginatedResult } from '../../common/dto/pagination.dto';
import { CreateDealDto } from './dto/create-deal.dto';
import { UpdateDealDto } from './dto/update-deal.dto';
import { WonDealDto } from './dto/won-deal.dto';
import { LostDealDto } from './dto/lost-deal.dto';

// Stage transitions được phép
const VALID_TRANSITIONS: Record<DealStage, DealStage[]> = {
  [DealStage.QUALIFICATION]: [DealStage.PROPOSAL, DealStage.LOST],
  [DealStage.PROPOSAL]:      [DealStage.QUALIFICATION, DealStage.NEGOTIATION, DealStage.LOST],
  [DealStage.NEGOTIATION]:   [DealStage.PROPOSAL, DealStage.WON, DealStage.LOST],
  [DealStage.WON]:           [],
  [DealStage.LOST]:          [],
};

@Injectable()
export class DealsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REQUEST) private readonly request: any,
  ) {}

  private getTenantId(): string | undefined {
    return this.request?.user?.tenantId ?? this.request?.__tenantId ?? process.env.DEFAULT_TENANT_ID;
  }

  async findAll(
    stage?: DealStage,
    customerId?: string,
    assigneeId?: string,
    page = 1,
    limit = 50,
  ): Promise<PaginatedResult<any>> {
    const tenantId = this.getTenantId();
    const where: any = { deletedAt: null };
    if (stage) where.stage = stage;
    if (customerId) where.customerId = customerId;
    if (assigneeId) where.assigneeId = assigneeId;
    if (tenantId) where.tenantId = tenantId;

    const skip = (page - 1) * limit;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.deal.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true, code: true } },
        },
      }),
      this.prisma.deal.count({ where }),
    ]);
    return paginate(data, total, page, limit);
  }

  async findOne(id: string) {
    // Dùng findFirst để lọc cả deletedAt — không trả về deal đã xóa mềm
    const deal = await this.prisma.deal.findFirst({
      where: { id, deletedAt: null },
      include: {
        customer: true,
      },
    });
    if (!deal) {
      throw new NotFoundException(`Không tìm thấy deal #${id}`);
    }
    return deal;
  }

  async create(dto: CreateDealDto) {
    try {
      return await this.prisma.deal.create({ data: dto });
    } catch (err: any) {
      if (err?.code === 'P2002') {
        throw new ConflictException(`Mã deal "${dto.code}" đã tồn tại`);
      }
      throw err;
    }
  }

  async update(id: string, dto: UpdateDealDto) {
    await this.findOne(id);
    return this.prisma.deal.update({ where: { id }, data: dto });
  }

  async changeStage(id: string, stage: DealStage) {
    const deal = await this.findOne(id);
    const allowed = VALID_TRANSITIONS[deal.stage as DealStage] ?? [];
    if (!allowed.includes(stage)) {
      throw new BadRequestException(
        `Không thể chuyển deal từ ${deal.stage} sang ${stage}`,
      );
    }
    return this.prisma.deal.update({ where: { id }, data: { stage } });
  }

  async markWon(id: string, dto: WonDealDto) {
    const deal = await this.findOne(id);
    if (deal.stage === DealStage.WON || deal.stage === DealStage.LOST) {
      throw new UnprocessableEntityException(
        `Deal đã ở trạng thái ${deal.stage}, không thể đổi`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // Lấy orgUnitId của assignee
      const assigneeUser = await tx.user.findUnique({
        where: { id: deal.assigneeId },
        select: { orgUnitId: true },
      });

      const orgUnitId = assigneeUser?.orgUnitId;
      if (!orgUnitId) {
        throw new UnprocessableEntityException(
          'Assignee chưa thuộc đơn vị tổ chức nào, không thể tạo project',
        );
      }

      const project = await tx.project.create({
        data: {
          code:       deal.code,
          name:       dto.projectName ?? deal.title,
          type:       dto.projectType ?? ProjectType.OSDC,
          customerId: deal.customerId,
          status:     ProjectStatus.PLANNING,
          pmId:       deal.assigneeId,
          orgUnitId,
          startDate:  new Date(),
          endDate:    new Date(Date.now() + 365 * 24 * 3600 * 1000),
        },
      });

      const updatedDeal = await tx.deal.update({
        where: { id },
        data: {
          stage:     DealStage.WON,
          wonAt:     new Date(),
          projectId: project.id,
        },
      });

      return updatedDeal;
    });
  }

  async markLost(id: string, dto: LostDealDto) {
    const deal = await this.findOne(id);
    if (deal.stage === DealStage.WON || deal.stage === DealStage.LOST) {
      throw new UnprocessableEntityException(
        `Deal đã ở trạng thái ${deal.stage}, không thể đổi`,
      );
    }
    return this.prisma.deal.update({
      where: { id },
      data: {
        stage:      DealStage.LOST,
        lostAt:     new Date(),
        lostReason: dto.lostReason,
      },
    });
  }

  async remove(id: string) {
    const deal = await this.findOne(id);
    if (
      deal.stage !== DealStage.QUALIFICATION &&
      deal.stage !== DealStage.LOST
    ) {
      throw new BadRequestException(
        'Chỉ có thể xoá deal ở giai đoạn QUALIFICATION hoặc LOST',
      );
    }
    return this.prisma.deal.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async restore(id: string) {
    // restore cần tìm cả record đã bị xóa mềm nên không lọc deletedAt
    const deal = await this.prisma.deal.findUnique({ where: { id } });
    if (!deal) throw new NotFoundException(`Không tìm thấy deal #${id}`);
    return this.prisma.deal.update({ where: { id }, data: { deletedAt: null } });
  }

  // ── L-01: CRM Analytics ───────────────────────────────────────────────────

  async getAnalyticsByStage() {
    const result = await this.prisma.deal.groupBy({
      by: ['stage'],
      _count: { id: true },
      _sum: { value: true },
      where: { deletedAt: null },
    });
    return result.map((r) => ({
      stage: r.stage,
      count: r._count.id,
      totalValue: Number(r._sum.value ?? 0),
    }));
  }

  async getWinRate(period?: string) {
    const where: Prisma.DealWhereInput = { deletedAt: null };
    if (period) {
      const [year, month] = period.split('-').map(Number);
      where.createdAt = {
        gte: new Date(year, month - 1, 1),
        lt:  new Date(year, month, 1),
      };
    }
    const [won, lost] = await Promise.all([
      this.prisma.deal.count({ where: { ...where, stage: DealStage.WON } }),
      this.prisma.deal.count({ where: { ...where, stage: DealStage.LOST } }),
    ]);
    const total = won + lost;
    return {
      won,
      lost,
      total,
      winRate: total > 0 ? Math.round((won / total) * 100) : 0,
    };
  }

  async getAging() {
    const deals = await this.prisma.deal.findMany({
      where: {
        deletedAt: null,
        stage: { notIn: [DealStage.WON, DealStage.LOST] },
      },
      select: { id: true, title: true, stage: true, createdAt: true },
      take: 100,
    });
    return deals.map((d) => ({
      ...d,
      ageDays: Math.floor((Date.now() - d.createdAt.getTime()) / 86400000),
    }));
  }
}
