import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDelegationDto } from './dto/create-delegation.dto';
import { PaginationDto, PaginatedResult, paginate } from '../common/dto/pagination.dto';

@Injectable()
export class DelegationService {
  constructor(private readonly prisma: PrismaService) {}

  async listRules(
    delegatorId: string,
    pagination: PaginationDto,
  ): Promise<PaginatedResult<any>> {
    const { page = 1, limit = 50 } = pagination;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.delegationRule.findMany({
        where: { delegatorId },
        include: {
          delegate: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.delegationRule.count({ where: { delegatorId } }),
    ]);

    return paginate(data, total, page, limit);
  }

  async create(delegatorId: string, dto: CreateDelegationDto) {
    // Không cho tự ủy quyền cho chính mình
    if (delegatorId === dto.delegateId) {
      throw new BadRequestException('Không thể ủy quyền cho chính mình');
    }

    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (endDate <= startDate) {
      throw new BadRequestException('Ngày kết thúc phải sau ngày bắt đầu');
    }

    // Validate delegate user exists
    const delegate = await this.prisma.user.findUnique({
      where: { id: dto.delegateId },
      select: { id: true, isActive: true },
    });
    if (!delegate) throw new NotFoundException('Người được ủy quyền không tồn tại');
    if (!delegate.isActive) throw new BadRequestException('Người được ủy quyền đã bị vô hiệu hóa');

    // Kiểm tra circular delegation: delegate đang ủy quyền cho delegator không?
    const circular = await this.prisma.delegationRule.findFirst({
      where: {
        delegatorId: dto.delegateId,
        delegateId: delegatorId,
        isActive: true,
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
    });
    if (circular) {
      throw new BadRequestException(
        'Phát hiện ủy quyền vòng tròn: người được ủy quyền đang ủy quyền lại cho bạn',
      );
    }

    return this.prisma.delegationRule.create({
      data: {
        delegatorId,
        delegateId: dto.delegateId,
        moduleTypes: dto.moduleTypes,
        startDate,
        endDate,
        note: dto.note,
        isActive: true,
      },
      include: {
        delegate: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async delete(id: string, requesterId: string) {
    const rule = await this.prisma.delegationRule.findUnique({ where: { id } });
    if (!rule) throw new NotFoundException('Quy tắc ủy quyền không tồn tại');

    // Chỉ người tạo mới có thể xóa
    if (rule.delegatorId !== requesterId) {
      throw new ForbiddenException('Bạn không có quyền xóa quy tắc ủy quyền này');
    }

    return this.prisma.delegationRule.delete({ where: { id } });
  }

  /** Tìm delegation rule đang active cho userId + moduleType tại thời điểm hiện tại */
  async findActiveDelegation(userId: string, moduleType: string) {
    const now = new Date();
    return this.prisma.delegationRule.findFirst({
      where: {
        delegatorId: userId,
        moduleTypes: { has: moduleType },
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      include: {
        delegate: { select: { id: true, name: true, email: true } },
      },
    });
  }
}
