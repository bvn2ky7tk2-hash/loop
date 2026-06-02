import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateCommentDto } from './dto/create-comment.dto';

const AUTHOR_SELECT = { id: true, name: true } as const;

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

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

    const comment = await this.prisma.comment.create({
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

    // Parse @mention và gửi notification cho từng user được nhắc đến
    await this.notifyMentions(dto.content, authorId, dto.entityType, dto.entityId, comment.id);

    return comment;
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

  /** Parse @fullName mentions và tạo notification cho mỗi user được nhắc */
  private async notifyMentions(
    content: string,
    authorId: string,
    entityType: string,
    entityId: string,
    commentId: string,
  ) {
    // Tìm tất cả @mention trong nội dung comment
    const mentionPattern = /@([^\s@#[\]]+(?:\s[^\s@#[\]]+)*)/g;
    const mentionedNames = [...content.matchAll(mentionPattern)].map((m) => m[1].trim());
    if (!mentionedNames.length) return;

    const author = await this.prisma.user.findUnique({
      where: { id: authorId },
      select: { name: true },
    });

    for (const name of [...new Set(mentionedNames)]) {
      const user = await this.prisma.user.findFirst({
        where: { name: { contains: name, mode: 'insensitive' } },
        select: { id: true },
      });
      // Không gửi self-notification
      if (!user || user.id === authorId) continue;

      await this.notifications.createInApp(user.id, {
        type: 'TASK',
        title: 'Bạn được nhắc đến trong comment',
        body: `${author?.name ?? 'Ai đó'} đã đề cập đến bạn: "${content.slice(0, 80)}${content.length > 80 ? '…' : ''}"`,
        link: `/${entityType.toLowerCase()}s/${entityId}`,
        entityType,
        entityId,
      });
    }
  }
}
