import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { FilterAssetDto } from './dto/filter-asset.dto';
import { AssignAssetDto, ReturnAssetDto } from './dto/assign-asset.dto';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { paginate } from '../common/dto/pagination.dto';

@Injectable()
export class AssetsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAssetDto) {
    const existing = await this.prisma.asset.findUnique({ where: { code: dto.code } });
    if (existing) throw new ConflictException(`Mã tài sản "${dto.code}" đã tồn tại`);

    return this.prisma.asset.create({
      data: {
        code:              dto.code,
        name:              dto.name,
        category:          dto.category as any,
        brand:             dto.brand,
        model:             dto.model,
        serialNumber:      dto.serialNumber,
        orgUnitId:         dto.orgUnitId,
        purchaseDate:      dto.purchaseDate ? new Date(dto.purchaseDate) : undefined,
        purchasePrice:     dto.purchasePrice,
        depreciationYears: dto.depreciationYears,
        notes:             dto.notes,
      },
      include: {
        orgUnit: true,
        assignments: {
          where: { returnedAt: null },
          include: { employee: { select: { id: true, fullName: true } } },
        },
      },
    });
  }

  async findAll(filter: FilterAssetDto) {
    const { category, status, orgUnitId, page = 1, limit = 20 } = filter;
    const where: any = {};
    if (category)  where.category  = category;
    if (status)    where.status    = status;
    if (orgUnitId) where.orgUnitId = orgUnitId;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.asset.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          orgUnit: { select: { id: true, name: true } },
          assignments: {
            where: { returnedAt: null },
            include: { employee: { select: { id: true, fullName: true } } },
          },
        },
      }),
      this.prisma.asset.count({ where }),
    ]);
    return paginate(data, total, page, limit);
  }

  async findOne(id: string) {
    const asset = await this.prisma.asset.findUnique({
      where: { id },
      include: {
        orgUnit: true,
        assignments: {
          orderBy: { assignedAt: 'desc' },
          include: { employee: { select: { id: true, fullName: true } } },
        },
        maintenanceLogs: { orderBy: { performedAt: 'desc' } },
      },
    });
    if (!asset) throw new NotFoundException('Không tìm thấy tài sản');
    return asset;
  }

  async update(id: string, dto: UpdateAssetDto) {
    await this.findOne(id);
    return this.prisma.asset.update({
      where: { id },
      data: {
        name:              dto.name,
        category:          dto.category as any,
        brand:             dto.brand,
        model:             dto.model,
        serialNumber:      dto.serialNumber,
        orgUnitId:         dto.orgUnitId,
        purchaseDate:      dto.purchaseDate ? new Date(dto.purchaseDate) : undefined,
        purchasePrice:     dto.purchasePrice,
        depreciationYears: dto.depreciationYears,
        notes:             dto.notes,
      },
      include: { orgUnit: true },
    });
  }

  async remove(id: string) {
    const asset = await this.findOne(id);
    if (asset.status === 'ASSIGNED') {
      throw new UnprocessableEntityException('Không thể xóa tài sản đang được cấp phát');
    }
    return this.prisma.asset.delete({ where: { id } });
  }

  // ─── Assignment ──────────────────────────────────────────────────────────────

  async assign(id: string, dto: AssignAssetDto) {
    const asset = await this.prisma.asset.findUnique({ where: { id } });
    if (!asset) throw new NotFoundException('Không tìm thấy tài sản');
    if (asset.status !== 'AVAILABLE') {
      throw new UnprocessableEntityException('Tài sản không ở trạng thái AVAILABLE');
    }

    const employee = await this.prisma.employee.findUnique({ where: { id: dto.employeeId } });
    if (!employee) throw new NotFoundException('Không tìm thấy nhân viên');

    const [, assignment] = await this.prisma.$transaction([
      this.prisma.asset.update({ where: { id }, data: { status: 'ASSIGNED' } }),
      this.prisma.assetAssignment.create({
        data: { assetId: id, employeeId: dto.employeeId, notes: dto.notes },
        include: {
          employee: { select: { id: true, fullName: true } },
          asset: true,
        },
      }),
    ]);
    return assignment;
  }

  async return(id: string, dto: ReturnAssetDto) {
    const asset = await this.prisma.asset.findUnique({ where: { id } });
    if (!asset) throw new NotFoundException('Không tìm thấy tài sản');
    if (asset.status !== 'ASSIGNED') {
      throw new UnprocessableEntityException('Tài sản không ở trạng thái ASSIGNED');
    }

    const active = await this.prisma.assetAssignment.findFirst({
      where: { assetId: id, returnedAt: null },
    });
    if (!active) throw new NotFoundException('Không tìm thấy bản ghi cấp phát');

    const [, updated] = await this.prisma.$transaction([
      this.prisma.assetAssignment.update({
        where: { id: active.id },
        data: { returnedAt: new Date(), notes: dto.notes ?? active.notes },
      }),
      this.prisma.asset.update({ where: { id }, data: { status: 'AVAILABLE' } }),
    ]);
    return updated;
  }

  async getAssignmentHistory(id: string) {
    await this.findOne(id);
    return this.prisma.assetAssignment.findMany({
      where: { assetId: id },
      orderBy: { assignedAt: 'desc' },
      include: { employee: { select: { id: true, fullName: true } } },
    });
  }

  // ─── Maintenance ─────────────────────────────────────────────────────────────

  async addMaintenance(id: string, dto: CreateMaintenanceDto) {
    const asset = await this.prisma.asset.findUnique({ where: { id } });
    if (!asset) throw new NotFoundException('Không tìm thấy tài sản');

    const log = await this.prisma.assetMaintenance.create({
      data: {
        assetId:     id,
        type:        dto.type,
        performedAt: new Date(dto.performedAt),
        cost:        dto.cost,
        performedBy: dto.performedBy,
        notes:       dto.notes,
      },
    });

    if (dto.type === 'repair') {
      await this.prisma.asset.update({ where: { id }, data: { status: 'UNDER_MAINTENANCE' } });
    }

    return log;
  }

  // ─── Depreciation ────────────────────────────────────────────────────────────

  async getDepreciation(id: string) {
    const asset = await this.prisma.asset.findUnique({ where: { id } });
    if (!asset) throw new NotFoundException('Không tìm thấy tài sản');

    const price = asset.purchasePrice ? Number(asset.purchasePrice) : null;
    const years = asset.depreciationYears;

    if (!price || !years) return { error: 'Insufficient data' };

    const purchaseDate    = asset.purchaseDate ?? asset.createdAt;
    const now             = new Date();
    const yearsElapsed    = (now.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    const annualDepreciation      = price / years;
    const accumulatedDepreciation = Math.min(price, annualDepreciation * yearsElapsed);
    const bookValue               = Math.max(0, price - accumulatedDepreciation);

    return {
      purchasePrice:           price,
      depreciationYears:       years,
      annualDepreciation:      Math.round(annualDepreciation * 100) / 100,
      accumulatedDepreciation: Math.round(accumulatedDepreciation * 100) / 100,
      bookValue:               Math.round(bookValue * 100) / 100,
      yearsElapsed:            Math.round(yearsElapsed * 100) / 100,
    };
  }

  // ─── Summary (for summary cards) ─────────────────────────────────────────────

  async getSummary() {
    const [total, assigned, underMaintenance, totalPriceResult] = await this.prisma.$transaction([
      this.prisma.asset.count(),
      this.prisma.asset.count({ where: { status: 'ASSIGNED' } }),
      this.prisma.asset.count({ where: { status: 'UNDER_MAINTENANCE' } }),
      this.prisma.asset.aggregate({ _sum: { purchasePrice: true } }),
    ]);

    return {
      total,
      assigned,
      underMaintenance,
      totalPurchaseValue: Number(totalPriceResult._sum.purchasePrice ?? 0),
    };
  }

  // ─── All Assignments (paginated) ─────────────────────────────────────────────

  async findAllAssignments(filter: {
    employeeId?: string;
    assetId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const { employeeId, assetId, status, page = 1, limit = 20 } = filter;
    const where: any = {};
    if (employeeId) where.employeeId = employeeId;
    if (assetId)    where.assetId    = assetId;
    if (status === 'active')   where.returnedAt = null;
    if (status === 'returned') where.returnedAt = { not: null };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.assetAssignment.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { assignedAt: 'desc' },
        include: {
          asset:    { select: { id: true, code: true, name: true, category: true } },
          employee: { select: { id: true, fullName: true } },
        },
      }),
      this.prisma.assetAssignment.count({ where }),
    ]);
    return paginate(data, total, page, limit);
  }

  // ─── All Maintenance (paginated) ─────────────────────────────────────────────

  async findAllMaintenance(filter: {
    assetId?: string;
    type?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }) {
    const { assetId, type, dateFrom, dateTo, page = 1, limit = 20 } = filter;
    const where: any = {};
    if (assetId) where.assetId = assetId;
    if (type)    where.type    = type;
    if (dateFrom || dateTo) {
      where.performedAt = {};
      if (dateFrom) where.performedAt.gte = new Date(dateFrom);
      if (dateTo)   where.performedAt.lte = new Date(dateTo);
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.assetMaintenance.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { performedAt: 'desc' },
        include: { asset: { select: { id: true, code: true, name: true } } },
      }),
      this.prisma.assetMaintenance.count({ where }),
    ]);
    return paginate(data, total, page, limit);
  }
}
