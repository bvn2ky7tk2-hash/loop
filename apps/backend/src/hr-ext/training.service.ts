import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { paginate } from '../common/dto/pagination.dto';
import { CreateTrainingProgramDto, CreateTrainingRecordDto, FilterTrainingDto } from './dto/training.dto';
import { TrainingStatus } from '../generated/prisma';
import { TenantAwareService } from '../common/services/tenant-aware.service';
import { getEmployeeIdsInOrgSubtree } from '../common/utils/org-subtree';

@Injectable({ scope: Scope.REQUEST })
export class TrainingService extends TenantAwareService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REQUEST) req?: any,
  ) {
    super(req);
  }

  // ── Programs ────────────────────────────────────────────────────────────────

  async listPrograms() {
    return this.prisma.trainingProgram.findMany({ orderBy: { title: 'asc' } });
  }

  async createProgram(dto: CreateTrainingProgramDto) {
    return this.prisma.trainingProgram.create({ data: dto });
  }

  // ── Records ─────────────────────────────────────────────────────────────────

  async listRecords(dto: FilterTrainingDto) {
    const { page = 1, limit = 50, employeeId, orgUnitId, programId, status } = dto;
    // TrainingRecord chưa có tenantId (v6 task)
    const where: any = {
      ...(employeeId ? { employeeId } : {}),
      ...(programId  ? { programId  } : {}),
      ...(status     ? { status: status as TrainingStatus } : {}),
    };
    if (orgUnitId) {
      const empIds = await getEmployeeIdsInOrgSubtree(this.prisma, orgUnitId);
      where.employeeId = { in: empIds };
    }
    const [data, total] = await this.prisma.$transaction([
      this.prisma.trainingRecord.findMany({
        where, skip: (page - 1) * limit, take: limit,
        include: {
          program:  { select: { id: true, title: true, type: true } },
          employee: {
            select: {
              id: true, fullName: true, code: true, userId: true,
              orgUnit:  { select: { id: true, name: true, code: true } },
              position: { include: { jobTitle: { select: { id: true, name: true } } } },
            },
          },
        },
        orderBy: { startDate: 'desc' },
      }),
      this.prisma.trainingRecord.count({ where }),
    ]);
    return paginate(data, total, page, limit);
  }

  async createRecord(dto: CreateTrainingRecordDto) {
    const program = await this.prisma.trainingProgram.findUnique({ where: { id: dto.programId } });
    if (!program) throw new NotFoundException('Chương trình đào tạo không tìm thấy');
    const emp = await this.prisma.employee.findUnique({ where: { id: dto.employeeId } });
    if (!emp) throw new NotFoundException('Nhân viên không tìm thấy');

    return this.prisma.trainingRecord.create({
      data: {
        programId: dto.programId,
        employeeId: dto.employeeId,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        status: (dto.status as TrainingStatus) ?? 'SCHEDULED',
        score: dto.score,
        notes: dto.notes,
      },
      include: {
        program:  { select: { id: true, title: true } },
        employee: { select: { id: true, fullName: true } },
      },
    });
  }

  async updateRecord(id: string, data: Partial<CreateTrainingRecordDto>) {
    const rec = await this.prisma.trainingRecord.findUnique({ where: { id } });
    if (!rec) throw new NotFoundException('Không tìm thấy bản ghi đào tạo');
    return this.prisma.trainingRecord.update({
      where: { id },
      data: {
        ...(data.status    ? { status: data.status as TrainingStatus } : {}),
        ...(data.score     !== undefined ? { score: data.score } : {}),
        ...(data.endDate   ? { endDate: new Date(data.endDate) } : {}),
        ...(data.notes     ? { notes: data.notes } : {}),
      },
    });
  }

  async getStats() {
    const [byStatus, byType] = await Promise.all([
      this.prisma.trainingRecord.groupBy({ by: ['status'], _count: true }),
      this.prisma.trainingProgram.groupBy({ by: ['type'], _count: true }),
    ]);
    return { byStatus, byType };
  }
}
