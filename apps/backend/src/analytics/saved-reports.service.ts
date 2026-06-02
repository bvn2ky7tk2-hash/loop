import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSavedReportDto, UpdateSavedReportDto } from './dto/saved-report.dto';

@Injectable()
export class SavedReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, tenantId?: string) {
    const tid = tenantId ?? null;
    return this.prisma.savedReport.findMany({
      where: {
        ...(tid ? { tenantId: tid } : {}),
        OR: [{ createdBy: userId }, { isPublic: true }],
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async create(dto: CreateSavedReportDto, userId: string, tenantId?: string) {
    return this.prisma.savedReport.create({
      data: {
        name: dto.name,
        description: dto.description,
        category: dto.category,
        definition: dto.definition as object,
        isPublic: dto.isPublic ?? false,
        createdBy: userId,
        tenantId: tenantId ?? null,
      },
    });
  }

  async update(id: string, dto: UpdateSavedReportDto, userId: string) {
    const report = await this.prisma.savedReport.findUnique({ where: { id } });
    if (!report) throw new NotFoundException('Báo cáo không tồn tại');
    if (report.createdBy !== userId) throw new ForbiddenException('Không có quyền chỉnh sửa báo cáo này');
    return this.prisma.savedReport.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.definition !== undefined && { definition: dto.definition as object }),
        ...(dto.isPublic !== undefined && { isPublic: dto.isPublic }),
      },
    });
  }

  async remove(id: string, userId: string) {
    const report = await this.prisma.savedReport.findUnique({ where: { id } });
    if (!report) throw new NotFoundException('Báo cáo không tồn tại');
    if (report.createdBy !== userId) throw new ForbiddenException('Không có quyền xóa báo cáo này');
    await this.prisma.savedReport.delete({ where: { id } });
    return { message: 'Đã xóa báo cáo' };
  }
}
