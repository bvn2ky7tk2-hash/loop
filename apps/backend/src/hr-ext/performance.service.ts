import { Injectable, NotFoundException, ConflictException, BadRequestException, Inject } from '@nestjs/common';
import { Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { paginate } from '../common/dto/pagination.dto';
import { CreatePerformanceReviewDto, UpdatePerformanceReviewDto, FilterPerformanceDto } from './dto/performance.dto';
import { ReviewStatus } from '../generated/prisma';
import { TenantAwareService } from '../common/services/tenant-aware.service';

const INCLUDE = {
  employee: { select: { id: true, fullName: true, code: true } },
  reviewer: { select: { id: true, fullName: true, code: true } },
} as const;

@Injectable({ scope: Scope.REQUEST })
export class PerformanceService extends TenantAwareService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REQUEST) req?: any,
  ) {
    super(req);
  }

  async list(dto: FilterPerformanceDto) {
    const { page = 1, limit = 50, employeeId, reviewerId, period, status } = dto;
    // PerformanceReview chưa có tenantId (v6 task)
    const where = {
      ...(employeeId ? { employeeId } : {}),
      ...(reviewerId ? { reviewerId } : {}),
      ...(period     ? { period } : {}),
      ...(status     ? { status: status as ReviewStatus } : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.performanceReview.findMany({
        where, skip: (page - 1) * limit, take: limit,
        include: INCLUDE,
        orderBy: [{ period: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.performanceReview.count({ where }),
    ]);
    return paginate(data, total, page, limit);
  }

  async findOne(id: string) {
    const r = await this.prisma.performanceReview.findUnique({ where: { id }, include: INCLUDE });
    if (!r) throw new NotFoundException('Không tìm thấy đánh giá');

    // E19.3: Tích hợp OKR — tính avgProgress từ KeyResults trong cùng năm của kỳ đánh giá
    const okrData = await this._getOkrProgress(r.employeeId, r.period);
    return { ...r, okr: okrData };
  }

  /**
   * Lấy tiến độ OKR của employee trong cùng năm với kỳ đánh giá.
   * Trả về avgProgress (0–100) và suggestedScore (1–10 scale) để gợi ý điểm.
   */
  private async _getOkrProgress(employeeId: string, period: string) {
    // Lấy userId của employee để query OKR
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { userId: true },
    });
    if (!employee?.userId) return { objectives: [], avgProgress: null, suggestedScore: null };

    // Xác định năm từ period (format: "2026-Q1", "2026-H1", "2026")
    const yearMatch = period.match(/^(\d{4})/);
    const year = yearMatch ? parseInt(yearMatch[1], 10) : new Date().getFullYear();

    const objectives = await this.prisma.okrObjective.findMany({
      where: { ownerId: employee.userId, year },
      include: { keyResults: { select: { targetValue: true, currentValue: true } } },
      take: 20,
    });

    if (objectives.length === 0) return { objectives: [], avgProgress: null, suggestedScore: null };

    // Tính progress từng Objective = avg(keyResult.currentValue / targetValue * 100)
    const progressList = objectives.map((obj) => {
      if (obj.keyResults.length === 0) return 0;
      const krs = obj.keyResults;
      const sum = krs.reduce((acc, kr) => {
        const target = Number(kr.targetValue);
        if (target === 0) return acc;
        return acc + Math.min(100, (Number(kr.currentValue) / target) * 100);
      }, 0);
      return sum / krs.length;
    });

    const avgProgress = progressList.reduce((a, b) => a + b, 0) / progressList.length;

    // Gợi ý điểm: avgProgress ánh xạ vào thang 1-10
    // 0–50% → 1–5, 50–100% → 5–10 (linear)
    const suggestedScore = Math.min(10, Math.max(1, Math.round((avgProgress / 100) * 10)));

    return {
      objectives: objectives.map((o) => ({ id: o.id, title: o.title, cycle: o.cycle, status: o.status })),
      avgProgress: Math.round(avgProgress * 10) / 10,
      suggestedScore,
    };
  }

  async create(dto: CreatePerformanceReviewDto) {
    const exists = await this.prisma.performanceReview.findUnique({
      where: { employeeId_period: { employeeId: dto.employeeId, period: dto.period } },
    });
    if (exists) throw new ConflictException(`Đã có đánh giá kỳ ${dto.period} cho nhân viên này`);

    return this.prisma.performanceReview.create({
      data: {
        employeeId:  dto.employeeId,
        reviewerId:  dto.reviewerId,
        period:      dto.period,
        score:       dto.score,
        strengths:   dto.strengths,
        improvements: dto.improvements,
        goals:       dto.goals,
      },
      include: INCLUDE,
    });
  }

  async update(id: string, dto: UpdatePerformanceReviewDto) {
    const review = await this.findOne(id);

    if (review.status === 'APPROVED' && dto.status !== 'APPROVED') {
      throw new BadRequestException('Không thể chỉnh sửa đánh giá đã APPROVED');
    }

    const data: Record<string, unknown> = {};
    if (dto.score       !== undefined) data['score']       = dto.score;
    if (dto.strengths   !== undefined) data['strengths']   = dto.strengths;
    if (dto.improvements !== undefined) data['improvements'] = dto.improvements;
    if (dto.goals       !== undefined) data['goals']       = dto.goals;
    if (dto.status) {
      data['status'] = dto.status as ReviewStatus;
      if (dto.status === 'SUBMITTED') data['submittedAt'] = new Date();
      if (dto.status === 'APPROVED')  data['approvedAt']  = new Date();
    }

    return this.prisma.performanceReview.update({ where: { id }, data, include: INCLUDE });
  }

  async getStats(period?: string) {
    const where = period ? { period } : {};
    const [byStatus, avgScore] = await Promise.all([
      this.prisma.performanceReview.groupBy({ by: ['status'], where, _count: true }),
      this.prisma.performanceReview.aggregate({ where: { ...where, score: { not: null } }, _avg: { score: true } }),
    ]);
    return { byStatus, avgScore: Number(avgScore._avg.score ?? 0) };
  }
}
