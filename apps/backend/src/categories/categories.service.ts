import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(type?: string, parentId?: string, search?: string) {
    return this.prisma.category.findMany({
      where: {
        ...(type ? { type } : {}),
        ...(parentId !== undefined ? { parentId: parentId === 'null' ? null : parentId } : {}),
        ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      take: 5000,
    });
  }

  async types() {
    const rows = await this.prisma.category.groupBy({ by: ['type'], _count: { _all: true } });
    return rows.map((r) => ({ type: r.type, count: r._count._all }));
  }

  async create(dto: CreateCategoryDto) {
    return this.prisma.category.create({ data: dto });
  }

  async update(id: string, dto: UpdateCategoryDto) {
    await this.findOrThrow(id);
    return this.prisma.category.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOrThrow(id);
    await this.prisma.category.delete({ where: { id } });
    return { message: 'Đã xóa danh mục' };
  }

  private async findOrThrow(id: string) {
    const c = await this.prisma.category.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('Không tìm thấy danh mục');
    return c;
  }
}
