import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const COMMENT_INCLUDE = {
  author: { select: { id: true, name: true } },
};

@Injectable()
export class BugCommentService {
  constructor(private readonly prisma: PrismaService) {}

  async list(bugId: string) {
    return this.prisma.bugComment.findMany({
      where:   { bugId },
      include: COMMENT_INCLUDE,
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(bugId: string, authorId: string, content: string) {
    const bug = await this.prisma.bug.findUnique({ where: { id: bugId } });
    if (!bug) throw new NotFoundException('Bug không tồn tại');

    return this.prisma.bugComment.create({
      data:    { bugId, authorId, content },
      include: COMMENT_INCLUDE,
    });
  }

  async update(commentId: string, authorId: string, content: string) {
    const comment = await this.prisma.bugComment.findUnique({ where: { id: commentId } });
    if (!comment)           throw new NotFoundException('Comment không tồn tại');
    if (comment.authorId !== authorId) throw new ForbiddenException('Không có quyền sửa comment này');

    return this.prisma.bugComment.update({
      where:   { id: commentId },
      data:    { content },
      include: COMMENT_INCLUDE,
    });
  }

  async remove(commentId: string, authorId: string, isAdmin: boolean) {
    const comment = await this.prisma.bugComment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Comment không tồn tại');
    if (comment.authorId !== authorId && !isAdmin) throw new ForbiddenException('Không có quyền xoá comment này');

    await this.prisma.bugComment.delete({ where: { id: commentId } });
  }
}
