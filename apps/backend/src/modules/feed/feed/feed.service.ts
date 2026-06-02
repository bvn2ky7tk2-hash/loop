import { Injectable, ForbiddenException, NotFoundException, Logger, Inject, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { TenantAwareService } from '../common/services/tenant-aware.service';
import { CreateFeedPostDto } from './dto/create-feed-post.dto';
import { paginate } from '../common/dto/pagination.dto';
import { FeedPostType } from '../generated/prisma';

const AUTHOR_SELECT = { id: true, name: true } as const;
const FEED_INCLUDE = {
  author: { select: AUTHOR_SELECT },
  reactions: {
    include: { user: { select: AUTHOR_SELECT } },
  },
} as const;

@Injectable({ scope: Scope.REQUEST })
export class FeedService extends TenantAwareService {
  private readonly logger = new Logger(FeedService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(REQUEST) req: any,
  ) {
    super(req);
  }

  private tenantFilter() {
    const tid = this.getTenantId();
    return tid ? { author: { tenantId: tid } } : {};
  }

  /** Danh sách bài đăng — pinned lên đầu, sau đó theo createdAt DESC */
  async listPosts(page = 1, limit = 20, type?: FeedPostType) {
    const where = { ...this.tenantFilter(), ...(type ? { type } : {}) };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.feedPost.findMany({
        where,
        skip:    (page - 1) * limit,
        take:    limit,
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        include: FEED_INCLUDE,
      }),
      this.prisma.feedPost.count({ where }),
    ]);
    return paginate(data, total, page, limit);
  }

  /** Tạo bài đăng mới (chỉ HR/ADMIN) */
  async createPost(dto: CreateFeedPostDto, authorId: string) {
    return this.prisma.feedPost.create({
      data: {
        type:        dto.type,
        title:       dto.title,
        content:     dto.content,
        targetOrgId: dto.targetOrgId,
        isPinned:    dto.isPinned ?? false,
        imageUrl:    dto.imageUrl,
        targetYears: dto.targetYears,
        targetName:  dto.targetName,
        authorId,
      },
      include: FEED_INCLUDE,
    });
  }

  /** Xóa bài đăng (chỉ author hoặc ADMIN) */
  async deletePost(id: string, requesterId: string, isAdmin: boolean) {
    const post = await this.prisma.feedPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('Bài đăng không tồn tại');
    if (!isAdmin && post.authorId !== requesterId) {
      throw new ForbiddenException('Không có quyền xóa bài đăng này');
    }
    await this.prisma.feedPost.delete({ where: { id } });
  }

  /** Toggle reaction — thêm nếu chưa có, xóa nếu đã có */
  async reactToPost(postId: string, userId: string, emoji: string) {
    const post = await this.prisma.feedPost.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Bài đăng không tồn tại');

    const existing = await this.prisma.feedReaction.findUnique({
      where: { postId_userId_emoji: { postId, userId, emoji } },
    });

    if (existing) {
      await this.prisma.feedReaction.delete({ where: { id: existing.id } });
      return { toggled: 'removed', emoji };
    } else {
      await this.prisma.feedReaction.create({ data: { postId, userId, emoji } });
      return { toggled: 'added', emoji };
    }
  }

  /** Tự động đăng BIRTHDAY — cron tách ra FeedTask (DEFAULT scope) */
  async autoPostBirthdays() {
    const today = new Date();
    const month = today.getMonth() + 1;
    const day   = today.getDate();

    try {
      const botUser = await this.prisma.user.findFirst({
        where: { role: 'ADMIN' },
        select: { id: true },
      });
      if (!botUser) return;

      const employees = await this.prisma.employee.findMany({
        where: { isActive: true, birthdate: { not: null } },
        select: { fullName: true, birthdate: true },
      });

      const birthdayEmployees = employees.filter((e) => {
        if (!e.birthdate) return false;
        const b = new Date(e.birthdate);
        return b.getMonth() + 1 === month && b.getDate() === day;
      });

      for (const emp of birthdayEmployees) {
        await this.prisma.feedPost.create({
          data: {
            type:     FeedPostType.BIRTHDAY,
            authorId: botUser.id,
            title:    `Chúc mừng sinh nhật ${emp.fullName}! 🎂`,
            content:  `Toàn thể Loop.vn xin gửi lời chúc mừng sinh nhật tới ${emp.fullName}. Chúc bạn luôn vui vẻ, sức khỏe và thành công!`,
            targetName: emp.fullName,
          },
        });
        this.logger.log(`Birthday post created for ${emp.fullName}`);
      }
    } catch (err) {
      this.logger.error('autoPostBirthdays failed', err);
    }
  }

  /** Tự động đăng ANNIVERSARY cho nhân viên đủ năm thâm niên — cron tách ra FeedTask */
  async autoPostAnniversaries() {
    const today = new Date();
    const month = today.getMonth() + 1;
    const day   = today.getDate();
    const year  = today.getFullYear();

    try {
      const botUser = await this.prisma.user.findFirst({
        where: { role: 'ADMIN' },
        select: { id: true },
      });
      if (!botUser) return;

      const employees = await this.prisma.employee.findMany({
        where: { isActive: true },
        select: { fullName: true, startDate: true },
      });

      const anniversaryEmployees = employees.filter((e) => {
        const s = new Date(e.startDate);
        return s.getMonth() + 1 === month && s.getDate() === day && s.getFullYear() < year;
      });

      for (const emp of anniversaryEmployees) {
        const years = year - new Date(emp.startDate).getFullYear();
        await this.prisma.feedPost.create({
          data: {
            type:        FeedPostType.ANNIVERSARY,
            authorId:    botUser.id,
            title:       `${years} năm đồng hành — ${emp.fullName} 🏆`,
            content:     `Xin chào mừng ${emp.fullName} đã gắn bó và cống hiến cho Loop.vn tròn ${years} năm! Hành trình ${years} năm qua là minh chứng rõ nhất cho sự tận tâm và nỗ lực của bạn. Cảm ơn bạn đã là một phần không thể thiếu của gia đình Loop.vn. Chúc bạn tiếp tục thành công và gặt hái thêm nhiều thành tựu mới! 🎉`,
            targetName:  emp.fullName,
            targetYears: years,
          },
        });
        this.logger.log(`Anniversary post created for ${emp.fullName} (${years} years)`);
      }
    } catch (err) {
      this.logger.error('autoPostAnniversaries failed', err);
    }
  }

  /** Thống kê nhanh cho FeedPage */
  async getStats() {
    const now   = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const tf    = this.tenantFilter();

    const [total, thisMonth, kudos, anniversary] = await Promise.all([
      this.prisma.feedPost.count({ where: { ...tf } }),
      this.prisma.feedPost.count({ where: { ...tf, createdAt: { gte: start } } }),
      this.prisma.feedPost.count({ where: { ...tf, type: FeedPostType.KUDOS } }),
      this.prisma.feedPost.count({ where: { ...tf, type: FeedPostType.ANNIVERSARY } }),
    ]);

    return { total, thisMonth, kudos, anniversary };
  }
}
