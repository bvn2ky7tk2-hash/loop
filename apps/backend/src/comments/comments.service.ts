import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';

const AUTHOR_SELECT = { id: true, name: true } as const;

@Injectable()
export class CommentsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Lấy danh sách comments gốc kèm replies 1 cấp và thông tin tác giả */
  async listComments(entityType: string, entityId: string) {
    const comments = await this.prisma.comment.findMany({
      where: { entityType, entityId, parentId: null },
      include: {
        author: { select: AUTHOR_SELECT },
        replies: {
          include: { author: { select: AUTHOR_SELECT } },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
      // Giới hạn an toàn — tránh tải quá nhiều comment cho 1 entity
      take: 200,
    });
    return comments;
  }

  /** Tạo comment mới (hoặc reply nếu có parentId) */
  async createComment(dto: CreateCommentDto, authorId: string) {
    // Kiểm tra parent tồn tại nếu là reply
    if (dto.parentId) {
      const parent = await this.prisma.comment.findUnique({ where: { id: dto.parentId } });
      if (!parent) throw new NotFoundException('Comment cha không tồn tại');
    }

    return this.prisma.comment.create({
      data: {
        entityType: dto.entityType,
        entityId:   dto.entityId,
        content:    dto.content,
        parentId:   dto.parentId ?? null,
        authorId,
      },
      include: {
        author: { select: AUTHOR_SELECT },
      },
    });
  }

  /** Xóa comment — chỉ author hoặc ADMIN được phép */
  async deleteComment(id: string, requesterId: string, isAdmin: boolean) {
    const comment = await this.prisma.comment.findUnique({ where: { id } });
    if (!comment) throw new NotFoundException('Comment không tồn tại');
    if (!isAdmin && comment.authorId !== requesterId) {
      throw new ForbiddenException('Không có quyền xóa comment này');
    }
    await this.prisma.comment.delete({ where: { id } });
  }
}
