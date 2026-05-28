import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto, CreateArticleDto, UpdateArticleDto } from './dto/kb.dto';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 280);
}

async function uniqueSlug(prisma: PrismaService, base: string, excludeId?: string): Promise<string> {
  let slug = slugify(base);
  let attempt = 0;
  while (true) {
    const candidate = attempt === 0 ? slug : `${slug}-${attempt}`;
    const existing = await prisma.kbArticle.findUnique({ where: { slug: candidate } });
    if (!existing || existing.id === excludeId) return candidate;
    attempt++;
  }
}

@Injectable()
export class KbService {
  constructor(private readonly prisma: PrismaService) {}

  async stats() {
    const [total, published, categories, totalViews] = await Promise.all([
      this.prisma.kbArticle.count(),
      this.prisma.kbArticle.count({ where: { status: 'PUBLISHED' } }),
      this.prisma.kbCategory.count(),
      this.prisma.kbArticle.aggregate({ _sum: { viewCount: true } }),
    ]);
    return {
      totalArticles: total,
      publishedCount: published,
      draftCount: total - published,
      categoryCount: categories,
      totalViews: totalViews._sum.viewCount ?? 0,
    };
  }

  listCategories() {
    return this.prisma.kbCategory.findMany({
      include: {
        _count: { select: { articles: true } },
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  createCategory(dto: CreateCategoryDto) {
    return this.prisma.kbCategory.create({ data: dto });
  }

  updateCategory(id: string, dto: UpdateCategoryDto) {
    return this.prisma.kbCategory.update({ where: { id }, data: dto });
  }

  deleteCategory(id: string) {
    return this.prisma.kbCategory.delete({ where: { id } });
  }

  async listArticles(params: {
    categoryId?: string;
    status?: string;
    search?: string;
    pinned?: boolean;
    page?: number;
    limit?: number;
  }) {
    const { categoryId, status, search, pinned, page = 1, limit = 20 } = params;
    const where: any = {};
    if (categoryId) where.categoryId = categoryId;
    if (status) where.status = status;
    if (pinned !== undefined) where.isPinned = pinned;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { summary: { contains: search, mode: 'insensitive' } },
        { tags: { has: search } },
      ];
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.kbArticle.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, color: true, icon: true } },
          author:   { select: { id: true, name: true } },
        },
        orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.kbArticle.count({ where }),
    ]);

    return { data, total, totalPages: Math.ceil(total / limit) };
  }

  async getArticle(id: string) {
    const article = await this.prisma.kbArticle.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true, color: true, icon: true } },
        author:   { select: { id: true, name: true } },
      },
    });
    if (!article) throw new NotFoundException('Bài viết không tồn tại');
    // Increment view
    await this.prisma.kbArticle.update({ where: { id }, data: { viewCount: { increment: 1 } } });
    return article;
  }

  async createArticle(dto: CreateArticleDto, authorId: string) {
    const slug = await uniqueSlug(this.prisma, dto.title);
    const publishedAt = dto.status === 'PUBLISHED' ? new Date() : null;
    return this.prisma.kbArticle.create({
      data: {
        title:      dto.title,
        content:    dto.content,
        summary:    dto.summary,
        categoryId: dto.categoryId,
        status:     (dto.status ?? 'DRAFT') as any,
        isPinned:   dto.isPinned,
        slug,
        authorId,
        tags: dto.tags ?? [],
        publishedAt,
      },
      include: {
        category: { select: { id: true, name: true, color: true } },
        author:   { select: { id: true, name: true } },
      },
    });
  }

  async updateArticle(id: string, dto: UpdateArticleDto) {
    const existing = await this.prisma.kbArticle.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Bài viết không tồn tại');

    const data: any = { ...dto };
    if (dto.title && dto.title !== existing.title) {
      data.slug = await uniqueSlug(this.prisma, dto.title, id);
    }
    if (dto.status === 'PUBLISHED' && existing.status !== 'PUBLISHED') {
      data.publishedAt = new Date();
    }

    return this.prisma.kbArticle.update({
      where: { id },
      data,
      include: {
        category: { select: { id: true, name: true, color: true } },
        author:   { select: { id: true, name: true } },
      },
    });
  }

  deleteArticle(id: string) {
    return this.prisma.kbArticle.delete({ where: { id } });
  }
}
