import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * E19.1 — Tính toán và phê duyệt thưởng hiệu suất từ kết quả đánh giá.
 */
@Injectable()
export class PerformanceBonusService {
  private readonly logger = new Logger(PerformanceBonusService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Tính toán thưởng từ kết quả review.
   * Upsert PerformanceBonus với trạng thái DRAFT.
   */
  async calculateFromReview(
    reviewId: string,
    employeeId: string,
    score: number,
    tenantId?: string,
  ) {
    // Tìm config phù hợp với điểm số
    const config = await this.prisma.performanceBonusConfig.findFirst({
      where: {
        isActive: true,
        scoreMin: { lte: score },
        scoreMax: { gte: score },
        ...(tenantId ? { tenantId } : {}),
      },
    });

    if (!config) {
      throw new NotFoundException(
        `Không tìm thấy cấu hình thưởng cho điểm ${score}. Vui lòng seed PerformanceBonusConfig.`,
      );
    }

    // Lấy lương cơ bản từ hợp đồng ACTIVE hiện tại
    const activeContract = await this.prisma.contract.findFirst({
      where: {
        employeeId,
        status: 'ACTIVE',
        deletedAt: null,
      },
      orderBy: { startDate: 'desc' },
      select: { salaryMonthly: true },
    });

    if (!activeContract) {
      throw new NotFoundException(
        `Nhân viên ${employeeId} không có hợp đồng ACTIVE để lấy lương cơ bản.`,
      );
    }

    const baseSalary = Number(activeContract.salaryMonthly);
    const coefficient = Number(config.coefficient);
    const bonusAmount = baseSalary * coefficient;

    // Upsert bonus record (tránh tạo duplicate)
    const bonus = await this.prisma.performanceBonus.upsert({
      where: { reviewId_employeeId: { reviewId, employeeId } },
      update: {
        score,
        baseSalary,
        coefficient,
        bonusAmount,
        status: 'DRAFT',
      },
      create: {
        reviewId,
        employeeId,
        score,
        baseSalary,
        coefficient,
        bonusAmount,
        status: 'DRAFT',
        ...(tenantId ? { tenantId } : {}),
      },
    });

    // Notify HR/Admin về bonus mới chờ phê duyệt
    const adminUsers = await this.prisma.user.findMany({
      where: { role: 'ADMIN', isActive: true },
      select: { id: true },
      take: 20,
    });

    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { fullName: true },
    });

    for (const admin of adminUsers) {
      await this.prisma.notification.create({
        data: {
          userId: admin.id,
          type: 'BONUS_PENDING' as any,
          title: 'Thưởng hiệu suất mới cần phê duyệt',
          body: `Thưởng hiệu suất của ${employee?.fullName ?? employeeId} (điểm ${score}) đang chờ phê duyệt.`,
          link: `/hr/performance-bonus/${bonus.id}`,
          entityType: 'PerformanceBonus',
          entityId: bonus.id,
        },
      });
    }

    this.logger.log(
      `[PerformanceBonus] Tính thưởng employeeId=${employeeId} score=${score} bonusAmount=${bonusAmount}`,
    );

    return bonus;
  }

  /**
   * Phê duyệt thưởng: DRAFT → APPROVED.
   */
  async approveBonus(id: string, approverId: string) {
    const bonus = await this.prisma.performanceBonus.findUnique({ where: { id } });
    if (!bonus) throw new NotFoundException(`Không tìm thấy bản ghi thưởng ${id}`);

    const updated = await this.prisma.performanceBonus.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedById: approverId,
        approvedAt: new Date(),
      },
    });

    this.logger.log(`[PerformanceBonus] Đã phê duyệt bonus id=${id} bởi approverId=${approverId}`);
    return updated;
  }

  async findAll(employeeId?: string, tenantId?: string, page = 1, limit = 20) {
    const where = {
      ...(employeeId ? { employeeId } : {}),
      ...(tenantId ? { tenantId } : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.performanceBonus.findMany({
        where,
        include: {
          employee: { select: { id: true, fullName: true, code: true } },
          review: { select: { id: true, period: true, score: true } },
          approvedBy: { select: { id: true, fullName: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.performanceBonus.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async findOne(id: string) {
    const bonus = await this.prisma.performanceBonus.findUnique({
      where: { id },
      include: {
        employee: { select: { id: true, fullName: true, code: true } },
        review: { select: { id: true, period: true, score: true } },
        approvedBy: { select: { id: true, fullName: true } },
      },
    });
    if (!bonus) throw new NotFoundException(`Không tìm thấy bản ghi thưởng ${id}`);
    return bonus;
  }

  /**
   * Seed 4 cấu hình thưởng mặc định theo tiêu chí đánh giá.
   * Idempotent — bỏ qua nếu đã có config cho tenantId.
   */
  async seedDefaultConfigs(tenantId?: string) {
    const existing = await this.prisma.performanceBonusConfig.count({
      where: { tenantId: tenantId ?? null, isActive: true },
    });

    if (existing > 0) {
      this.logger.log('[PerformanceBonus] Đã có config, bỏ qua seed.');
      return;
    }

    const configs = [
      { label: 'EXCELLENT', scoreMin: 9.0, scoreMax: 10.0, coefficient: 2.0 },
      { label: 'GOOD',      scoreMin: 7.0, scoreMax: 8.9,  coefficient: 1.5 },
      { label: 'AVERAGE',   scoreMin: 5.0, scoreMax: 6.9,  coefficient: 1.0 },
      { label: 'BELOW',     scoreMin: 0.0, scoreMax: 4.9,  coefficient: 0.0 },
    ];

    await this.prisma.performanceBonusConfig.createMany({
      data: configs.map(c => ({
        label: c.label,
        scoreMin: c.scoreMin,
        scoreMax: c.scoreMax,
        coefficient: c.coefficient,
        isActive: true,
        ...(tenantId ? { tenantId } : {}),
      })),
      skipDuplicates: true,
    });

    this.logger.log(`[PerformanceBonus] Đã seed 4 PerformanceBonusConfig (tenantId=${tenantId ?? 'null'})`);
  }
}
