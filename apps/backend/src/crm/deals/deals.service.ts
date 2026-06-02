import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ConflictException,
  UnprocessableEntityException,
  Inject,
} from '@nestjs/common';
import { Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, DealStage, ProjectType, ProjectStatus } from '../../generated/prisma';
import { paginate, PaginatedResult } from '../../common/dto/pagination.dto';
import { CreateDealDto } from './dto/create-deal.dto';
import { UpdateDealDto } from './dto/update-deal.dto';
import { WonDealDto } from './dto/won-deal.dto';
import { LostDealDto } from './dto/lost-deal.dto';
import { KickoffWizardDto } from './dto/kickoff-wizard.dto';
import { TenantAwareService } from '../../common/services/tenant-aware.service';
import { ProcessInstancesService } from '../../processes/instances/process-instances.service';

// Kanban: kéo-thả tự do giữa các stage mở (QUALIFICATION/PROPOSAL/NEGOTIATION) + LOST.
// WON đạt được qua luồng /won (tạo project) — không set trực tiếp bằng changeStage.
const VALID_TRANSITIONS: Record<DealStage, DealStage[]> = {
  [DealStage.QUALIFICATION]: [DealStage.PROPOSAL, DealStage.NEGOTIATION, DealStage.LOST],
  [DealStage.PROPOSAL]:      [DealStage.QUALIFICATION, DealStage.NEGOTIATION, DealStage.LOST],
  [DealStage.NEGOTIATION]:   [DealStage.QUALIFICATION, DealStage.PROPOSAL, DealStage.WON, DealStage.LOST],
  [DealStage.WON]:           [],
  [DealStage.LOST]:          [DealStage.QUALIFICATION, DealStage.PROPOSAL, DealStage.NEGOTIATION],
};

@Injectable({ scope: Scope.REQUEST })
export class DealsService extends TenantAwareService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly processInstancesService: ProcessInstancesService,
    @Inject(REQUEST) req: any,
  ) {
    super(req);
  }

  async findAll(
    stage?: DealStage,
    customerId?: string,
    assigneeId?: string,
    page = 1,
    limit = 50,
  ): Promise<PaginatedResult<any>> {
    const extra: any = { deletedAt: null };
    if (stage) extra.stage = stage;
    if (customerId) extra.customerId = customerId;
    if (assigneeId) extra.assigneeId = assigneeId;
    const where = this.tenantWhere(extra);

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
      return await this.prisma.deal.create({ data: { ...dto, tenantId: this.getTenantId() ?? null } });
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

    const updatedDeal = await this.prisma.$transaction(async (tx) => {
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

      return tx.deal.update({
        where: { id },
        data: {
          stage:     DealStage.WON,
          wonAt:     new Date(),
          projectId: project.id,
        },
      });
    });

    // E20.3: Khởi động BPM 'deal-to-project-kickoff-v1' sau khi tạo project
    // Không block markWon nếu BPM không khởi động được
    try {
      const definition = await this.prisma.processDefinition.findFirst({
        where: { key: 'deal-to-project-kickoff-v1', status: 'ACTIVE' },
        select: { id: true },
      });
      if (definition && updatedDeal.projectId) {
        await this.processInstancesService.start(
          {
            definitionId: definition.id,
            projectId:    updatedDeal.projectId,
            variables: {
              dealId:     id,
              projectId:  updatedDeal.projectId,
              customerId: updatedDeal.customerId ?? undefined,
              dealValue:  Number(deal.value ?? 0),
            },
          },
          'system',
        );
      }
    } catch (_) {
      // BPM không bắt buộc — chỉ ghi log, không fail
    }

    return updatedDeal;
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

  // ── E20.3: Deal Won Kickoff Wizard ────────────────────────────────────────

  async kickoffWizard(dealId: string, dto: KickoffWizardDto, requestUserId: string) {
    const deal = await this.findOne(dealId);

    // Lấy orgUnitId của PM được chỉ định
    const pmUser = await this.prisma.user.findUnique({
      where: { id: dto.pmUserId },
      select: { id: true, orgUnitId: true },
    });
    if (!pmUser) {
      throw new NotFoundException(`Không tìm thấy user PM #${dto.pmUserId}`);
    }
    if (!pmUser.orgUnitId) {
      throw new UnprocessableEntityException(
        'PM chưa thuộc đơn vị tổ chức nào, không thể tạo project',
      );
    }

    const startDate = new Date(dto.startDate);

    const project = await this.prisma.project.create({
      data: {
        code:       deal.code,
        name:       deal.title,
        type:       ProjectType.OSDC,
        customerId: deal.customerId,
        status:     ProjectStatus.PLANNING,
        pmId:       dto.pmUserId,
        orgUnitId:  pmUser.orgUnitId,
        startDate,
        endDate:    new Date(startDate.getTime() + 365 * 24 * 3600_000),
        tenantId:   this.getTenantId() ?? null,
      },
    });

    // Cập nhật deal: gán projectId + wonAt
    await this.prisma.deal.update({
      where: { id: dealId },
      data: {
        projectId: project.id,
        wonAt:     new Date(),
        stage:     DealStage.WON,
      },
    });

    // Khởi động BPM 'deal-to-project-kickoff-v1' nếu definition tồn tại
    let processInstanceId: string | null = null;
    const bpmKey = dto.templateName ?? 'deal-to-project-kickoff-v1';
    const definition = await this.prisma.processDefinition.findFirst({
      where: { key: bpmKey, status: 'ACTIVE' },
      select: { id: true },
    });

    if (definition) {
      const result = await this.processInstancesService.start(
        {
          definitionId: definition.id,
          projectId:    project.id,
          variables: {
            dealId,
            projectId: project.id,
            pmUserId:  dto.pmUserId,
            startDate: dto.startDate,
            ...(dto.portalEmail ? { portalEmail: dto.portalEmail } : {}),
          },
        },
        requestUserId,
      );
      processInstanceId = result.data?.id ?? null;

      // Ghi lại processInstanceId trên deal
      await this.prisma.deal.update({
        where: { id: dealId },
        data: { processInstanceId },
      });
    }

    return { projectId: project.id, processInstanceId };
  }
}
