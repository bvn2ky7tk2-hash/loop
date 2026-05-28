import { Injectable, ForbiddenException, NotFoundException, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
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

@Injectable()
export class FeedService {
  private readonly logger = new Logger(FeedService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Danh sách bài đăng — pinned lên đầu, sau đó theo createdAt DESC */
  async listPosts(page = 1, limit = 20) {
    const [data, total] = await this.prisma.$transaction([
      this.prisma.feedPost.findMany({
        skip:    (page - 1) * limit,
        take:    limit,
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        include: FEED_INCLUDE,
      }),
      this.prisma.feedPost.count(),
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

  /** Cron job hằng ngày lúc 8h sáng — tự động đăng BIRTHDAY cho nhân viên có sinh nhật hôm nay */
  @Cron('0 8 * * *')
  async autoPostBirthdays() {
    const today = new Date();
    const month = today.getMonth() + 1; // 1-12
    const day   = today.getDate();

    try {
      // Lấy bot user (ADMIN đầu tiên) để post birthday
      const botUser = await this.prisma.user.findFirst({
        where: { role: 'ADMIN' },
        select: { id: true },
      });
      if (!botUser) return;

      // Tìm nhân viên có sinh nhật hôm nay (chỉ so tháng và ngày)
      const employees = await this.prisma.employee.findMany({
        where: {
          isActive:  true,
          birthdate: { not: null },
        },
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
          },
        });
        this.logger.log(`Birthday post created for ${emp.fullName}`);
      }
    } catch (err) {
      this.logger.error('autoPostBirthdays failed', err);
    }
  }

  /** Thống kê nhanh cho FeedPage */
  async getStats() {
    const now   = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);

    const [total, thisMonth, kudos, pinned] = await Promise.all([
      this.prisma.feedPost.count(),
      this.prisma.feedPost.count({ where: { createdAt: { gte: start } } }),
      this.prisma.feedPost.count({ where: { type: FeedPostType.KUDOS } }),
      this.prisma.feedPost.count({ where: { isPinned: true } }),
    ]);

    return { total, thisMonth, kudos, pinned };
  }
}
