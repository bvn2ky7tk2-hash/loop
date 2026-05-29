import { Injectable, BadRequestException, NotFoundException, Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import type { OrgUnit } from '../generated/prisma';
import { CreateOrgUnitDto } from './dto/create-org-unit.dto';
import { UpdateOrgUnitDto } from './dto/update-org-unit.dto';
import { OrgScopeService } from '../common/services/org-scope.service';

type HeadInfo = { id: string; fullName: string; jobTitleName: string } | null;
type LeaderInfo = { id: string; fullName: string; code: string } | null;

interface OrgUnitFlat extends OrgUnit {
  _count: { users: number; employees: number };
  head: HeadInfo;
  headJobTitle: { id: string; name: string } | null;
  leaderInfo: LeaderInfo;
}

export interface OrgUnitTree extends OrgUnit {
  children: OrgUnitTree[];
  _count?: { users: number; employees: number };
  head?: HeadInfo;
  headJobTitle?: { id: string; name: string } | null;
  leaderInfo?: LeaderInfo;
}

@Injectable()
export class OrgUnitsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orgScope: OrgScopeService,
    @Inject(REQUEST) private readonly request: any,
  ) {}

  private getTenantId(): string | undefined {
    return this.request?.user?.tenantId ?? this.request?.__tenantId ?? process.env.DEFAULT_TENANT_ID;
  }

  async create(dto: CreateOrgUnitDto): Promise<OrgUnit> {
    let level = 0;
    if (dto.parentId) {
      const parent = await this.prisma.orgUnit.findUnique({ where: { id: dto.parentId } });
      if (!parent) throw new NotFoundException('Đơn vị cha không tồn tại');
      level = parent.level + 1;
    }

    const unit = await this.prisma.orgUnit.create({
      data: {
        name: dto.name,
        code: dto.code,
        parentId: dto.parentId ?? null,
        level,
        headJobTitleId: dto.headJobTitleId ?? null,
        leaderId: dto.leaderId ?? null,
        tenantId: this.getTenantId(),
      },
    });
    await this.orgScope.invalidateAll();
    return unit;
  }

  async findAll(): Promise<OrgUnitTree[]> {
    const tenantId = this.getTenantId();
    const units = await this.prisma.orgUnit.findMany({
      where: tenantId ? { tenantId } : undefined,
      orderBy: [{ level: 'asc' }, { name: 'asc' }],
      include: {
        _count: { select: { users: true, employees: true } },
        headJobTitle: { select: { id: true, name: true } },
        // Lấy thông tin leader (người đứng đầu đơn vị)
        leader: { select: { id: true, fullName: true, code: true } },
        employees: {
          where: {
            isActive: true,
            position: { isNot: null },
          },
          select: {
            id: true,
            fullName: true,
            position: {
              select: { jobTitleId: true, jobTitle: { select: { name: true } } },
            },
          },
        },
      },
    });

    const unitsWithHead = units.map((u) => {
      let head: HeadInfo = null;
      if (u.headJobTitleId) {
        const headEmp = (u.employees as any[]).find(
          (e) => e.position?.jobTitleId === u.headJobTitleId,
        );
        if (headEmp) {
          head = {
            id: headEmp.id,
            fullName: headEmp.fullName,
            jobTitleName: headEmp.position?.jobTitle?.name ?? '',
          };
        }
      }
      const leaderInfo: LeaderInfo = (u as any).leader
        ? { id: (u as any).leader.id, fullName: (u as any).leader.fullName, code: (u as any).leader.code }
        : null;
      return {
        ...u,
        head,
        leaderInfo,
        leader: undefined,
        employees: undefined,
      };
    });

    return this.buildTree(unitsWithHead as unknown as OrgUnitFlat[]);
  }

  private buildTree(units: OrgUnitFlat[], parentId: string | null = null): OrgUnitTree[] {
    return units
      .filter((u) => u.parentId === parentId)
      .map((u) => ({ ...u, children: this.buildTree(units, u.id) }));
  }

  async update(id: string, dto: UpdateOrgUnitDto): Promise<OrgUnit> {
    const existing = await this.prisma.orgUnit.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Không tìm thấy đơn vị');

    let level = existing.level;
    if (dto.parentId !== undefined) {
      if (dto.parentId === null) {
        level = 0;
      } else {
        const parent = await this.prisma.orgUnit.findUnique({ where: { id: dto.parentId } });
        if (!parent) throw new NotFoundException('Đơn vị cha không tồn tại');
        level = parent.level + 1;
      }
    }

    // Validate leader phải thuộc đơn vị này
    if (dto.leaderId !== undefined && dto.leaderId !== null) {
      const emp = await this.prisma.employee.findUnique({
        where: { id: dto.leaderId },
        select: { id: true, orgUnitId: true },
      });
      if (!emp) throw new BadRequestException('Nhân viên không tồn tại');
      if (emp.orgUnitId !== id) throw new BadRequestException('Nhân viên không thuộc đơn vị này');
    }

    const updated = await this.prisma.orgUnit.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.code !== undefined && { code: dto.code }),
        ...(dto.parentId !== undefined && { parentId: dto.parentId }),
        ...(dto.headJobTitleId !== undefined && { headJobTitleId: dto.headJobTitleId }),
        ...(dto.leaderId !== undefined && { leaderId: dto.leaderId }),
        level,
      },
    });

    // Khi leaderId thay đổi, cập nhật directManagerId cho tất cả nhân viên trong đơn vị
    if (dto.leaderId !== undefined) {
      await this.prisma.employee.updateMany({
        where: { orgUnitId: id },
        data: { directManagerId: dto.leaderId },
      });
    }

    await this.orgScope.invalidateAll();
    return updated;
  }

  async remove(id: string): Promise<void> {
    const childCount = await this.prisma.orgUnit.count({ where: { parentId: id } });
    const userCount = await this.prisma.user.count({ where: { orgUnitId: id } });

    if (childCount > 0 || userCount > 0) {
      throw new BadRequestException(
        `Không thể xoá đơn vị đang có ${childCount} đơn vị con hoặc ${userCount} người dùng`,
      );
    }

    await this.prisma.orgUnit.delete({ where: { id } });
    await this.orgScope.invalidateAll();
  }
}
