import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SkillCategory } from '../generated/prisma';
import { CreateSkillDto, UpdateSkillDto, UpsertEmployeeSkillDto } from './dto/skill.dto';
import { paginate } from '../common/dto/pagination.dto';

@Injectable()
export class SkillsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Quản lý Skill (master data) ────────────────────────────────────────────
  async listSkills(category?: SkillCategory, includeInactive = false) {
    return this.prisma.skill.findMany({
      where: {
        ...(category ? { category } : {}),
        ...(!includeInactive ? { isActive: true } : {}),
      },
      include: { _count: { select: { employees: true } } },
      orderBy: [{ createdAt: 'desc' }, { category: 'asc' }, { name: 'asc' }],
    });
  }

  async createSkill(dto: CreateSkillDto) {
    return this.prisma.skill.create({
      data: {
        name: dto.name,
        category: dto.category ?? SkillCategory.TECHNICAL,
        description: dto.description,
      },
    });
  }

  async updateSkill(id: string, dto: UpdateSkillDto) {
    await this.prisma.skill.findUniqueOrThrow({ where: { id } });
    return this.prisma.skill.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.category !== undefined ? { category: dto.category } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }

  async deleteSkill(id: string) {
    await this.prisma.skill.findUniqueOrThrow({ where: { id } });
    return this.prisma.skill.delete({ where: { id } });
  }

  // ── Kỹ năng của nhân viên ──────────────────────────────────────────────────
  async getEmployeeSkills(employeeId: string) {
    return this.prisma.employeeSkill.findMany({
      where: { employeeId },
      include: { skill: true },
      orderBy: [{ skill: { category: 'asc' } }, { skill: { name: 'asc' } }],
    });
  }

  async upsertEmployeeSkill(employeeId: string, skillId: string, dto: UpsertEmployeeSkillDto) {
    const [employee, skill] = await Promise.all([
      this.prisma.employee.findUnique({ where: { id: employeeId } }),
      this.prisma.skill.findUnique({ where: { id: skillId } }),
    ]);
    if (!employee) throw new NotFoundException(`Employee ${employeeId} không tìm thấy`);
    if (!skill) throw new NotFoundException(`Skill ${skillId} không tìm thấy`);

    return this.prisma.employeeSkill.upsert({
      where: { employeeId_skillId: { employeeId, skillId } },
      update: {
        level: dto.level,
        ...(dto.yearsExp !== undefined ? { yearsExp: dto.yearsExp } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        ...(dto.certifiedAt !== undefined ? { certifiedAt: new Date(dto.certifiedAt) } : {}),
      },
      create: {
        employeeId,
        skillId,
        level: dto.level,
        yearsExp: dto.yearsExp ?? 0,
        notes: dto.notes,
        certifiedAt: dto.certifiedAt ? new Date(dto.certifiedAt) : null,
      },
      include: { skill: true },
    });
  }

  async removeEmployeeSkill(employeeId: string, skillId: string) {
    return this.prisma.employeeSkill.delete({
      where: { employeeId_skillId: { employeeId, skillId } },
    });
  }

  // ── Ma trận kỹ năng toàn tổ chức ──────────────────────────────────────────
  async getSkillMatrix(orgUnitId?: string, skillIds?: string[], page = 1, limit = 50) {
    const [employees, total] = await this.prisma.$transaction([
      this.prisma.employee.findMany({
        where: {
          isActive: true,
          ...(orgUnitId ? { orgUnitId } : {}),
        },
        select: {
          id: true,
          code: true,
          fullName: true,
          level: true,
          user: { select: { name: true } },
          orgUnit: { select: { name: true } },
          skills: {
            include: { skill: true },
            ...(skillIds?.length ? { where: { skillId: { in: skillIds } } } : {}),
          },
        },
        orderBy: { user: { name: 'asc' } },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.employee.count({
        where: { isActive: true, ...(orgUnitId ? { orgUnitId } : {}) },
      }),
    ]);

    return paginate(employees, total, page, limit);
  }

  // ── Resource availability ──────────────────────────────────────────────────
  async getResourceAvailability(skillId?: string, skillLevel?: string, date?: string) {
    const refDate = date ? new Date(date) : new Date();

    const employees = await this.prisma.employee.findMany({
      where: {
        isActive: true,
        ...(skillId ? {
          skills: {
            some: {
              skillId,
              ...(skillLevel ? { level: skillLevel as any } : {}),
            },
          },
        } : {}),
      },
      include: {
        user:    { select: { name: true } },
        orgUnit: { select: { name: true } },
        skills:  { include: { skill: true } },
        allocations: {
          where: { startDate: { lte: refDate }, endDate: { gte: refDate } },
          include: { project: { select: { id: true, name: true, code: true, status: true } } },
        },
      },
      orderBy: { user: { name: 'asc' } },
    });

    return employees.map(emp => {
      const totalAllocation = emp.allocations.reduce((s, a) => s + Number(a.allocationPct), 0);
      const available = Math.max(0, 100 - totalAllocation);
      return {
        id:          emp.id,
        code:        emp.code,
        fullName:    emp.fullName,
        level:       emp.level,
        user:        emp.user,
        orgUnit:     emp.orgUnit,
        skills:      emp.skills,
        allocations: emp.allocations.map(a => ({
          projectId:  a.projectId,
          projectName: a.project.name,
          projectCode: a.project.code,
          pct:         Number(a.allocationPct),
        })),
        totalAllocationPct: totalAllocation,
        availablePct:       available,
      };
    });
  }

  // ── Thống kê skill gap ─────────────────────────────────────────────────────
  async getSkillStats() {
    const skills = await this.prisma.skill.findMany({
      where: { isActive: true },
      include: {
        employees: { select: { level: true } },
        _count: { select: { employees: true } },
      },
      orderBy: { category: 'asc' },
    });

    return skills.map(s => ({
      id: s.id,
      name: s.name,
      category: s.category,
      totalEmployees: s._count.employees,
      levelDistribution: {
        BEGINNER:     s.employees.filter(e => e.level === 'BEGINNER').length,
        INTERMEDIATE: s.employees.filter(e => e.level === 'INTERMEDIATE').length,
        ADVANCED:     s.employees.filter(e => e.level === 'ADVANCED').length,
        EXPERT:       s.employees.filter(e => e.level === 'EXPERT').length,
      },
    }));
  }
}
