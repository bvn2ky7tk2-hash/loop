import { Injectable, ForbiddenException, NotFoundException, Inject, Optional } from '@nestjs/common';
import { Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { TenantAwareService } from '../common/services/tenant-aware.service';

const COMMENT_INCLUDE = {
  author: { select: { id: true, name: true } },
};

@Injectable({ scope: Scope.REQUEST })
export class BugCommentService extends TenantAwareService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() @Inject(REQUEST) req?: any,
  ) {
    super(req);
  }

  private getTenantFilter() {
    const tid = this.getTenantId();
    return tid ? { bug: { tenantId: tid } } : {};
  }

  async list(bugId: string) {
    const tenantFilter = this.getTenantFilter();
    return this.prisma.bugComment.findMany({
      where:   { bugId, ...tenantFilter },
      include: COMMENT_INCLUDE,
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(bugId: string, authorId: string, content: string) {
    const tid = this.getTenantId();
    const bugWhere = tid ? { id: bugId, tenantId: tid } : { id: bugId };
    const bug = await this.prisma.bug.findFirst({ where: bugWhere });
    if (!bug) throw new NotFoundException('Bug không tồn tại');

    return this.prisma.bugComment.create({
      data:    { bugId, authorId, content },
      include: COMMENT_INCLUDE,
    });
  }

  async update(commentId: string, authorId: string, content: string) {
    const tenantFilter = this.getTenantFilter();
    const comment = await this.prisma.bugComment.findFirst({ where: { id: commentId, ...tenantFilter } });
    if (!comment)           throw new NotFoundException('Comment không tồn tại');
    if (comment.authorId !== authorId) throw new ForbiddenException('Không có quyền sửa comment này');

    return this.prisma.bugComment.update({
      where:   { id: commentId },
      data:    { content },
      include: COMMENT_INCLUDE,
    });
  }

  async remove(commentId: string, authorId: string, isAdmin: boolean) {
    const tenantFilter = this.getTenantFilter();
    const comment = await this.prisma.bugComment.findFirst({ where: { id: commentId, ...tenantFilter } });
    if (!comment) throw new NotFoundException('Comment không tồn tại');
    if (comment.authorId !== authorId && !isAdmin) throw new ForbiddenException('Không có quyền xoá comment này');

    await this.prisma.bugComment.delete({ where: { id: commentId } });
  }
}
