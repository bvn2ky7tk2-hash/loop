import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { paginate } from '../common/dto/pagination.dto';
import { ProcessInstancesService } from '../processes/instances/process-instances.service';
import { ProcessEventBus, ProcessCompletedPayload } from '../processes/process-event-bus.service';
import {
  CreateObjectiveDto, UpdateObjectiveDto,
  CreateKeyResultDto, UpdateKeyResultDto,
  CreateKpiMetricDto, UpdateKpiMetricDto, CreateKpiRecordDto,
} from './dto/okr.dto';

const OBJ_INCLUDE = {
  owner: { select: { id: true, name: true, email: true } },
  keyResults: { orderBy: { createdAt: 'asc' as const } },
} as const;

const OKR_REVIEW_PROCESS_KEY = 'okr-review';

@Injectable()
export class OkrService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly processInstances: ProcessInstancesService,
    private readonly eventBus: ProcessEventBus,
  ) {}

  onModuleInit() {
    this.eventBus.onCompleted(this.handleProcessCompleted.bind(this));
  }

  private async handleProcessCompleted(payload: ProcessCompletedPayload) {
    const obj = await this.prisma.okrObjective.findFirst({
      where: { processInstanceId: payload.instanceId },
    });
    if (!obj) return;
    const decision = payload.variables['decision'] as string | undefined;
    await this.prisma.okrObjective.update({
      where: { id: obj.id },
      data: {
        status: decision === 'APPROVED' ? 'COMPLETED' : 'ACTIVE',
        processInstanceId: null,
      },
    });
  }

  async startObjectiveReview(objectiveId: string, requestUserId: string) {
    const obj = await this.getObjective(objectiveId);

    const definition = await this.prisma.processDefinition.findFirst({
      where: { key: OKR_REVIEW_PROCESS_KEY, status: 'ACTIVE' },
    });
    if (!definition) throw new NotFoundException('Process definition "okr-review" chưa được tạo hoặc chưa ACTIVE');

    const result = await this.processInstances.start(
      {
        definitionId: definition.id,
        variables: {
          objectiveId: obj.id,
          objectiveTitle: obj.title,
          ownerId: obj.ownerId,
          cycle: obj.cycle,
          year: obj.year,
        },
      },
      requestUserId,
    );

    const instanceId = result.data?.id;
    if (!instanceId) throw new NotFoundException('Không thể khởi động BPM process instance');

    await this.prisma.okrObjective.update({
      where: { id: objectiveId },
      data: { processInstanceId: instanceId, status: 'ACTIVE' },
    });

    return { processInstanceId: instanceId, status: 'ACTIVE' };
  }

  // ── Objectives ─────────────────────────────────────────────────────────────
  async listObjectives(ownerId?: string, cycle?: string, year?: number, status?: string, page = 1, limit = 20) {
    const where: any = {};
    if (ownerId) where.ownerId = ownerId;
    if (cycle)  where.cycle = cycle;
    if (year)   where.year = year;
    if (status) where.status = status;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.okrObjective.findMany({
        where, include: OBJ_INCLUDE,
        orderBy: [{ year: 'desc' }, { cycle: 'asc' }],
        skip: (page - 1) * limit, take: limit,
      }),
      this.prisma.okrObjective.count({ where }),
    ]);
    return paginate(data, total, page, limit);
  }

  async getObjective(id: string) {
    const obj = await this.prisma.okrObjective.findUnique({ where: { id }, include: OBJ_INCLUDE });
    if (!obj) throw new NotFoundException('Không tìm thấy OKR Objective');
    return obj;
  }

  async createObjective(dto: CreateObjectiveDto) {
    return this.prisma.okrObjective.create({
      data: {
        title: dto.title, description: dto.description,
        cycle: dto.cycle as any, year: dto.year,
        ownerId: dto.ownerId, orgUnitId: dto.orgUnitId,
        status: dto.status as any ?? 'DRAFT',
      },
      include: OBJ_INCLUDE,
    });
  }

  async updateObjective(id: string, dto: UpdateObjectiveDto) {
    await this.getObjective(id);
    return this.prisma.okrObjective.update({
      where: { id },
      data: {
        ...dto,
        cycle: dto.cycle as any,
        status: dto.status as any,
      },
      include: OBJ_INCLUDE,
    });
  }

  async deleteObjective(id: string) {
    await this.getObjective(id);
    return this.prisma.okrObjective.delete({ where: { id } });
  }

  // ── Key Results ────────────────────────────────────────────────────────────
  async addKeyResult(objectiveId: string, dto: CreateKeyResultDto) {
    await this.getObjective(objectiveId);
    return this.prisma.okrKeyResult.create({
      data: {
        objectiveId,
        title: dto.title, unit: dto.unit ?? '',
        startValue: dto.startValue ?? 0,
        targetValue: dto.targetValue,
        currentValue: dto.currentValue ?? 0,
      },
    });
  }

  async updateKeyResult(id: string, dto: UpdateKeyResultDto) {
    const kr = await this.prisma.okrKeyResult.findUnique({ where: { id } });
    if (!kr) throw new NotFoundException('Không tìm thấy Key Result');
    return this.prisma.okrKeyResult.update({ where: { id }, data: { ...dto } });
  }

  async deleteKeyResult(id: string) {
    const kr = await this.prisma.okrKeyResult.findUnique({ where: { id } });
    if (!kr) throw new NotFoundException('Không tìm thấy Key Result');
    return this.prisma.okrKeyResult.delete({ where: { id } });
  }

  // ── KPI Metrics ────────────────────────────────────────────────────────────
  async listMetrics(orgUnitId?: string) {
    return this.prisma.kpiMetric.findMany({
      where: {
        isActive: true,
        ...(orgUnitId ? { orgUnitId } : {}),
      },
      include: { records: { orderBy: { period: 'desc' }, take: 12 } },
      orderBy: { name: 'asc' },
    });
  }

  async createMetric(dto: CreateKpiMetricDto) {
    return this.prisma.kpiMetric.create({
      data: {
        name: dto.name, description: dto.description,
        unit: dto.unit ?? '', targetValue: dto.targetValue,
        frequency: dto.frequency as any ?? 'MONTHLY',
        orgUnitId: dto.orgUnitId,
      },
    });
  }

  async updateMetric(id: string, dto: UpdateKpiMetricDto) {
    return this.prisma.kpiMetric.update({ where: { id }, data: { ...dto, frequency: dto.frequency as any } });
  }

  async deleteMetric(id: string) {
    return this.prisma.kpiMetric.delete({ where: { id } });
  }

  async addKpiRecord(metricId: string, dto: CreateKpiRecordDto) {
    return this.prisma.kpiRecord.upsert({
      where: { metricId_period: { metricId, period: dto.period } },
      update: { value: dto.value, notes: dto.notes },
      create: { metricId, period: dto.period, value: dto.value, notes: dto.notes },
    });
  }

  // ── Stats ──────────────────────────────────────────────────────────────────
  async stats() {
    const [totalObj, totalKr, activeObj, kpiCount] = await this.prisma.$transaction([
      this.prisma.okrObjective.count(),
      this.prisma.okrKeyResult.count(),
      this.prisma.okrObjective.count({ where: { status: 'ACTIVE' } }),
      this.prisma.kpiMetric.count({ where: { isActive: true } }),
    ]);

    const krs = await this.prisma.okrKeyResult.findMany({ select: { startValue: true, targetValue: true, currentValue: true } });
    const avgProgress = krs.length === 0 ? 0 : krs.reduce((sum, kr) => {
      const range = Number(kr.targetValue) - Number(kr.startValue);
      const pct = range === 0 ? 0 : Math.min(100, Math.round(((Number(kr.currentValue) - Number(kr.startValue)) / range) * 100));
      return sum + pct;
    }, 0) / krs.length;

    return { totalObj, totalKr, activeObj, kpiCount, avgProgress: Math.round(avgProgress) };
  }
}
