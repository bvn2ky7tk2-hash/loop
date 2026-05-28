import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { OrgUnit } from '../generated/prisma';
import { CreateOrgUnitDto } from './dto/create-org-unit.dto';
import { UpdateOrgUnitDto } from './dto/update-org-unit.dto';
import { OrgScopeService } from '../common/services/org-scope.service';

export interface OrgUnitTree extends OrgUnit {
  children: OrgUnitTree[];
  _count?: { users: number; employees: number };
}

@Injectable()
export class OrgUnitsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orgScope: OrgScopeService,
  ) {}

  async create(dto: CreateOrgUnitDto): Promise<OrgUnit> {
    let level = 0;
    if (dto.parentId) {
      const parent = await this.prisma.orgUnit.findUnique({ where: { id: dto.parentId } });
      if (!parent) throw new NotFoundException('Đơn vị cha không tồn tại');
      level = parent.level + 1;
    }

    const unit = await this.prisma.orgUnit.create({
      data: { name: dto.name, code: dto.code, parentId: dto.parentId ?? null, level },
    });
    await this.orgScope.invalidateAll();
    return unit;
  }

  async findAll(): Promise<OrgUnitTree[]> {
    const units = await this.prisma.orgUnit.findMany({
      orderBy: [{ level: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { users: true, employees: true } } },
    });

    return this.buildTree(units as (OrgUnit & { _count: { users: number; employees: number } })[]);
  }

  private buildTree(
    units: (OrgUnit & { _count: { users: number; employees: number } })[],
    parentId: string | null = null,
  ): OrgUnitTree[] {
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

    const updated = await this.prisma.orgUnit.update({
      where: { id },
      data: { ...dto, level },
    });
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
