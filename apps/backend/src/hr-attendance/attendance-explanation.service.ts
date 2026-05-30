import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
  Inject,
} from '@nestjs/common';
import { Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { PaginatedResult, paginate } from '../common/dto/pagination.dto';
import { TenantAwareService } from '../common/services/tenant-aware.service';
import {
  CreateExplanationDto,
  ExplanationQueryDto,
  ReviewExplanationDto,
} from './dto/attendance-explanation.dto';

const EXPLANATION_INCLUDE = {
  employee: { select: { id: true, fullName: true, userId: true } },
  attendanceRecord: {
    select: {
      id: true,
      date: true,
      checkIn: true,
      checkOut: true,
      status: true,
      lateMinutes: true,
      earlyLeaveMinutes: true,
      totalHours: true,
    },
  },
} as const;

@Injectable({ scope: Scope.REQUEST })
export class AttendanceExplanationService extends TenantAwareService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REQUEST) req?: any,
  ) {
    super(req);
  }

  // ─── Tạo giải trình chấm công ───────────────────────────────────────────────
  async create(dto: CreateExplanationDto): Promise<any> {
    const employee = await this.prisma.employee.findUnique({
      where: { id: dto.employeeId },
    });
    if (!employee) throw new NotFoundException('Không tìm thấy nhân viên');

    return this.prisma.attendanceExplanation.create({
      data: {
        employeeId: dto.employeeId,
        date: new Date(dto.date),
        attendanceRecordId: dto.attendanceRecordId ?? null,
        type: dto.type as any,
        reason: dto.reason,
        requestedCheckIn: dto.requestedCheckIn ? new Date(dto.requestedCheckIn) : null,
        requestedCheckOut: dto.requestedCheckOut ? new Date(dto.requestedCheckOut) : null,
        status: 'PENDING',
        ...(this.getTenantId() ? { tenantId: this.getTenantId() } : {}),
      },
      include: EXPLANATION_INCLUDE,
    });
  }

  // ─── Danh sách giải trình ────────────────────────────────────────────────────
  async list(query: ExplanationQueryDto): Promise<PaginatedResult<any>> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);

    const where: any = this.tenantWhere();
    if (query.employeeId) where.employeeId = query.employeeId;
    if (query.status) where.status = query.status;
    if (query.dateFrom || query.dateTo) {
      where.date = {};
      if (query.dateFrom) where.date.gte = new Date(query.dateFrom);
      if (query.dateTo) where.date.lte = new Date(query.dateTo);
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.attendanceExplanation.findMany({
        where,
        include: EXPLANATION_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.attendanceExplanation.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  // ─── Duyệt giải trình → cập nhật AttendanceRecord ──────────────────────────
  async approve(id: string, reviewerId: string, _dto?: ReviewExplanationDto): Promise<any> {
    const explanation = await this.prisma.attendanceExplanation.findUnique({
      where: { id },
      include: { attendanceRecord: true },
    });
    if (!explanation) throw new NotFoundException('Không tìm thấy giải trình');
    if (explanation.status !== 'PENDING') {
      throw new UnprocessableEntityException('Chỉ có thể duyệt giải trình ở trạng thái PENDING');
    }

    const updated = await this.prisma.attendanceExplanation.update({
      where: { id },
      data: {
        status: 'APPROVED',
        reviewedById: reviewerId,
        reviewedAt: new Date(),
      },
      include: EXPLANATION_INCLUDE,
    });

    // Áp dụng hiệu ứng lên AttendanceRecord (nếu có)
    if (explanation.attendanceRecordId) {
      await this.applyExplanationEffect(explanation);
    }

    return updated;
  }

  // ─── Từ chối giải trình ─────────────────────────────────────────────────────
  async reject(id: string, reviewerId: string, dto: ReviewExplanationDto): Promise<any> {
    const explanation = await this.prisma.attendanceExplanation.findUnique({
      where: { id },
    });
    if (!explanation) throw new NotFoundException('Không tìm thấy giải trình');
    if (explanation.status !== 'PENDING') {
      throw new UnprocessableEntityException('Chỉ có thể từ chối giải trình ở trạng thái PENDING');
    }

    return this.prisma.attendanceExplanation.update({
      where: { id },
      data: {
        status: 'REJECTED',
        reviewedById: reviewerId,
        reviewedAt: new Date(),
        rejectReason: dto.rejectReason ?? null,
      },
      include: EXPLANATION_INCLUDE,
    });
  }

  // ─── Áp dụng hiệu ứng giải trình lên AttendanceRecord ──────────────────────
  private async applyExplanationEffect(explanation: any): Promise<void> {
    const recordId = explanation.attendanceRecordId;
    if (!recordId) return;

    const updateData: any = {};

    switch (explanation.type) {
      case 'LATE_ARRIVAL':
        // Xóa phút đi trễ
        updateData.lateMinutes = 0;
        break;

      case 'EARLY_DEPARTURE':
        // Xóa phút về sớm
        updateData.earlyLeaveMinutes = 0;
        break;

      case 'MISSING_CHECKIN':
        // Ghi nhận giờ vào theo yêu cầu
        if (explanation.requestedCheckIn) {
          updateData.checkIn = explanation.requestedCheckIn;
          updateData.lateMinutes = 0;
        }
        break;

      case 'MISSING_CHECKOUT':
        // Ghi nhận giờ ra theo yêu cầu
        if (explanation.requestedCheckOut) {
          updateData.checkOut = explanation.requestedCheckOut;
          updateData.earlyLeaveMinutes = 0;
        }
        break;

      case 'BUSINESS_TRIP':
      case 'ONSITE':
        // Coi như ngày làm đủ: đặt status = PRESENT, clear late/early, totalHours = 8
        updateData.status = 'PRESENT';
        updateData.lateMinutes = 0;
        updateData.earlyLeaveMinutes = 0;
        updateData.totalHours = 8;
        break;

      case 'WFH':
        // WFH: đặt status = PRESENT, clear late/early, totalHours = 8
        updateData.status = 'PRESENT';
        updateData.lateMinutes = 0;
        updateData.earlyLeaveMinutes = 0;
        updateData.totalHours = 8;
        break;

      default:
        break;
    }

    if (Object.keys(updateData).length > 0) {
      await this.prisma.attendanceRecord.update({
        where: { id: recordId },
        data: updateData,
      });
    }
  }
}
