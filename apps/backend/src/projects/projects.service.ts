import { Injectable, NotFoundException, ConflictException, ForbiddenException, Inject } from '@nestjs/common';
import { Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Prisma, ProjectStatus } from '../generated/prisma';
import type { Project } from '../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { EmployeesService } from '../employees/employees.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { TenantAwareService } from '../common/services/tenant-aware.service';

const WORK_DAYS = new Set([1, 2, 3, 4, 5]); // Mon–Fri

function eachWorkingDay(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    if (WORK_DAYS.has(cur.getDay())) days.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

@Injectable({ scope: Scope.REQUEST })
export class ProjectsService extends TenantAwareService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly employeesService: EmployeesService,
    @Inject(REQUEST) req?: any,
  ) {
    super(req);
  }

  async create(dto: CreateProjectDto): Promise<Project> {
    return this.prisma.project.create({
      data: {
        code: dto.code,
        name: dto.name,
        type: dto.type,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        budgetCost: dto.budgetCost,
        budgetEffortMm: dto.budgetEffortMm,
        currency: dto.currency ?? 'VND',
        description: dto.description,
        pmId: dto.pmId,
        orgUnitId: dto.orgUnitId,
        ...(dto.customerId ? { customerId: dto.customerId } : {}),
        tenantId: this.getTenantId(),
      },
    });
  }

  async findAll(orgUnitIds: string[] | null, page = 1, limit = 50) {
    const where: Prisma.ProjectWhereInput = this.tenantWhere({
      deletedAt: null,
      ...(orgUnitIds !== null ? { orgUnitId: { in: orgUnitIds } } : {}),
    });

    const skip = (page - 1) * limit;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.project.findMany({
        where,
        include: {
          pm: { select: { id: true, name: true } },
          customer: { select: { id: true, name: true } },
          _count: { select: { members: true, tasks: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.project.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string) {
    // Dùng findFirst để lọc cả deletedAt — không trả về dự án đã xóa mềm
    const project = await this.prisma.project.findFirst({
      where: { id, deletedAt: null },
      include: {
        pm: { select: { id: true, name: true } },
        orgUnit: { select: { id: true, name: true } },
        members: {
          include: { employee: { select: { id: true, fullName: true, code: true } } },
        },
      },
    });
    if (!project) throw new NotFoundException('Không tìm thấy dự án');
    return project;
  }

  async updateStatus(id: string, status: ProjectStatus, callerId: string) {
    // Kiểm tra deletedAt để tránh cập nhật trạng thái dự án đã xóa mềm
    const project = await this.prisma.project.findFirst({ where: { id, deletedAt: null } });
    if (!project) throw new NotFoundException('Không tìm thấy dự án');
    if (project.pmId !== callerId) throw new ForbiddenException('Chỉ PM của dự án mới được cập nhật trạng thái');

    return this.prisma.project.update({ where: { id }, data: { status } });
  }

  async addMember(projectId: string, dto: AddMemberDto) {
    // Không cho thêm thành viên vào dự án đã xóa mềm
    const project = await this.prisma.project.findFirst({ where: { id: projectId, deletedAt: null } });
    if (!project) throw new NotFoundException('Không tìm thấy dự án');

    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    // Auto-fill ratePerDay from employee history
    let ratePerDay = dto.ratePerDay;
    if (!ratePerDay) {
      const rate = await this.employeesService.getRateAtDate(dto.employeeId, startDate);
      ratePerDay = rate ? Number(rate.ratePerDay) : 0;
    }

    // Get employee level as default
    const employee = await this.prisma.employee.findUnique({ where: { id: dto.employeeId } });
    if (!employee) throw new NotFoundException('Không tìm thấy nhân sự');

    const level = dto.level ?? employee.level;
    const role = dto.role ?? 'MEMBER';

    // Allocation conflict check
    if (!dto.forceOverride) {
      const conflicts = await this.checkAllocationConflicts(
        dto.employeeId, projectId, startDate, endDate, dto.allocationPct,
      );
      if (conflicts.hasConflict) {
        throw new ConflictException(conflicts);
      }
    }

    return this.prisma.allocation.create({
      data: {
        projectId,
        employeeId: dto.employeeId,
        role,
        level,
        allocationPct: dto.allocationPct,
        ratePerDay,
        startDate,
        endDate,
      },
      include: { employee: { select: { id: true, fullName: true, code: true } } },
    });
  }

  async getMembers(projectId: string) {
    return this.prisma.allocation.findMany({
      where: { projectId },
      include: { employee: { select: { id: true, fullName: true, code: true, level: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async update(id: string, dto: Partial<import('./dto/create-project.dto').CreateProjectDto>) {
    const { pmId, orgUnitId, customerId, ...rest } = dto as any;
    return this.prisma.project.update({
      where: { id },
      data: {
        ...rest,
        ...(pmId      ? { pm:       { connect: { id: pmId } } }      : {}),
        ...(orgUnitId ? { orgUnit:  { connect: { id: orgUnitId } } } : {}),
        ...(customerId ? { customer: { connect: { id: customerId } } } : {}),
      },
    });
  }

  async remove(id: string) {
    // Kiểm tra dự án tồn tại và chưa bị xóa trước khi soft delete
    const project = await this.prisma.project.findFirst({ where: { id, deletedAt: null } });
    if (!project) throw new NotFoundException('Không tìm thấy dự án');
    return this.prisma.project.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async restore(id: string) {
    // restore cần tìm cả record đã bị xóa mềm nên không lọc deletedAt
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Không tìm thấy dự án');
    return this.prisma.project.update({ where: { id }, data: { deletedAt: null } });
  }

  async removeMember(projectId: string, memberId: string) {
    const member = await this.prisma.allocation.findFirst({ where: { id: memberId, projectId } });
    if (!member) throw new NotFoundException('Không tìm thấy thành viên dự án');
    return this.prisma.allocation.delete({ where: { id: memberId } });
  }

  async updateMember(projectId: string, memberId: string, dto: Partial<AddMemberDto>) {
    const member = await this.prisma.allocation.findFirst({ where: { id: memberId, projectId } });
    if (!member) throw new NotFoundException('Không tìm thấy thành viên dự án');

    const startDate = dto.startDate ? new Date(dto.startDate) : member.startDate;
    const endDate = dto.endDate ? new Date(dto.endDate) : member.endDate;
    const allocationPct = dto.allocationPct ?? Number(member.allocationPct);

    if (!dto.forceOverride) {
      const conflicts = await this.checkAllocationConflicts(
        member.employeeId, projectId, startDate, endDate, allocationPct, memberId,
      );
      if (conflicts.hasConflict) throw new ConflictException(conflicts);
    }

    return this.prisma.allocation.update({
      where: { id: memberId },
      data: {
        role: dto.role,
        level: dto.level,
        allocationPct: dto.allocationPct,
        ratePerDay: dto.ratePerDay,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    });
  }

  private async checkAllocationConflicts(
    employeeId: string,
    excludeProjectId: string,
    startDate: Date,
    endDate: Date,
    newPct: number,
    excludeMemberId?: string,
  ) {
    const existingAllocations = await this.prisma.allocation.findMany({
      where: {
        employeeId,
        id: excludeMemberId ? { not: excludeMemberId } : undefined,
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
      include: { project: { select: { name: true, id: true } } },
    });

    const workDays = eachWorkingDay(startDate, endDate);
    const conflictDays = [];

    for (const day of workDays) {
      const dayTotal = existingAllocations
        .filter((a) => a.startDate <= day && a.endDate >= day)
        .reduce((sum, a) => sum + Number(a.allocationPct), 0);

      if (dayTotal + newPct > 100) {
        const existingProjects = existingAllocations
          .filter((a) => a.startDate <= day && a.endDate >= day)
          .map((a) => ({ name: (a as { project?: { name: string } }).project?.name ?? '', pct: Number(a.allocationPct) }));

        conflictDays.push({
          date: day.toISOString().split('T')[0],
          existingProjects,
          newPct,
          totalPct: dayTotal + newPct,
        });
      }
    }

    return { hasConflict: conflictDays.length > 0, conflicts: conflictDays };
  }
}
