import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { TenantAwareService } from '../common/services/tenant-aware.service';
import { paginate } from '../common/dto/pagination.dto';
import { SalaryReviewStatus } from '../generated/prisma';
import { FilterSalaryReviewDto } from './dto/salary-review.dto';

@Injectable({ scope: Scope.REQUEST })
export class SalaryReviewService extends TenantAwareService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REQUEST) req?: any,
  ) {
    super(req);
  }

  async list(dto: FilterSalaryReviewDto) {
    const { page = 1, limit = 50, employeeId, status } = dto;
    // SalaryReviewSuggestion chưa có tenantId (v6 task)
    const where = {
      ...(employeeId ? { employeeId } : {}),
      ...(status     ? { status: status as SalaryReviewStatus } : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.salaryReviewSuggestion.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          employee: { select: { id: true, fullName: true, code: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.salaryReviewSuggestion.count({ where }),
    ]);
    return paginate(data, total, page, limit);
  }

  async findOne(id: string) {
    const r = await this.prisma.salaryReviewSuggestion.findUnique({
      where: { id },
      include: {
        employee: { select: { id: true, fullName: true, code: true, positionId: true } },
      },
    });
    if (!r) throw new NotFoundException('Không tìm thấy đề xuất điều chỉnh lương');
    return r;
  }

  /**
   * Tự động tạo SalaryReviewSuggestion từ kết quả đánh giá hiệu suất.
   * Điều kiện: score >= 7 AND currentSalary < band.midSalary → tạo PENDING suggestion
   */
  async suggestFromReview(reviewId: string, employeeId: string, score: number) {
    if (score < 7) return null;

    // Lấy Contract ACTIVE gần nhất của employee
    const contract = await this.prisma.contract.findFirst({
      where: { employeeId, status: 'ACTIVE', deletedAt: null },
      orderBy: { startDate: 'desc' },
    });
    if (!contract) throw new BadRequestException('Nhân viên không có hợp đồng đang hiệu lực');

    // Lấy positionId của employee
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { positionId: true },
    });
    if (!employee?.positionId) throw new BadRequestException('Nhân viên chưa được gán vị trí');

    // Lấy SalaryBand theo positionId
    const band = await this.prisma.salaryBand.findFirst({
      where: { positionId: employee.positionId },
    });
    if (!band) return null; // Không có band → không tạo suggestion

    const currentSalary = Number(contract.salaryMonthly);
    const midSalary = Number(band.midSalary);

    if (currentSalary >= midSalary) return null;

    // score >= 9 → tăng 12.5%, score 7-8 → tăng 7.5%
    const increasePercent = score >= 9 ? 12.5 : 7.5;
    const suggestedSalary = Math.round(currentSalary * (1 + increasePercent / 100));

    return this.prisma.salaryReviewSuggestion.create({
      data: {
        reviewId,
        employeeId,
        currentSalary,
        suggestedSalary,
        increasePercent,
        reason: `Điểm đánh giá hiệu suất: ${score} — tăng ${increasePercent}%`,
        status: 'PENDING',
      },
      include: {
        employee: { select: { id: true, fullName: true, code: true } },
      },
    });
  }

  /**
   * Duyệt đề xuất PENDING → APPROVED
   */
  async approveReview(id: string, approverId: string) {
    const suggestion = await this.findOne(id);
    if (suggestion.status !== 'PENDING') {
      throw new BadRequestException('Chỉ có thể duyệt đề xuất ở trạng thái PENDING');
    }
    return this.prisma.salaryReviewSuggestion.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedById: approverId,
      },
      include: {
        employee: { select: { id: true, fullName: true, code: true } },
      },
    });
  }

  /**
   * Áp dụng đề xuất APPROVED → cập nhật lương hợp đồng + set appliedAt
   */
  async applyReview(id: string) {
    const suggestion = await this.findOne(id);
    if (suggestion.status !== 'APPROVED') {
      throw new BadRequestException('Chỉ có thể áp dụng đề xuất ở trạng thái APPROVED');
    }

    // Cập nhật salaryMonthly của Contract ACTIVE
    const contract = await this.prisma.contract.findFirst({
      where: { employeeId: suggestion.employeeId, status: 'ACTIVE', deletedAt: null },
      orderBy: { startDate: 'desc' },
    });
    if (!contract) throw new BadRequestException('Không tìm thấy hợp đồng đang hiệu lực để áp dụng');

    const [updated] = await this.prisma.$transaction([
      this.prisma.salaryReviewSuggestion.update({
        where: { id },
        data: { status: 'APPLIED', appliedAt: new Date() },
        include: {
          employee: { select: { id: true, fullName: true, code: true } },
        },
      }),
      this.prisma.contract.update({
        where: { id: contract.id },
        data: { salaryMonthly: suggestion.suggestedSalary },
      }),
    ]);
    return updated;
  }
}
