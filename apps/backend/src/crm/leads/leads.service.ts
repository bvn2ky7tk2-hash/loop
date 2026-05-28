import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LeadSource, LeadStatus, DealStage } from '../../generated/prisma';
import { paginate, PaginatedResult } from '../../common/dto/pagination.dto';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { ConvertLeadDto } from './dto/convert-lead.dto';

@Injectable()
export class LeadsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    status?: LeadStatus,
    assigneeId?: string,
    page = 1,
    limit = 50,
  ): Promise<PaginatedResult<any>> {
    const where: any = {};
    if (status) where.status = status;
    if (assigneeId) where.assigneeId = assigneeId;

    const skip = (page - 1) * limit;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.lead.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          contact: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.lead.count({ where }),
    ]);
    return paginate(data, total, page, limit);
  }

  async findOne(id: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: {
        contact: { select: { id: true, name: true, email: true } },
      },
    });
    if (!lead) {
      throw new NotFoundException(`Không tìm thấy lead #${id}`);
    }
    return lead;
  }

  async create(dto: CreateLeadDto) {
    return this.prisma.lead.create({ data: dto });
  }

  async update(id: string, dto: UpdateLeadDto) {
    const lead = await this.findOne(id);
    if (lead.status === LeadStatus.CONVERTED) {
      throw new BadRequestException('Lead đã chuyển thành deal, không thể cập nhật');
    }
    return this.prisma.lead.update({ where: { id }, data: dto });
  }

  async convertToDeal(id: string, dto: ConvertLeadDto) {
    const lead = await this.findOne(id);
    if (lead.status !== LeadStatus.QUALIFIED) {
      throw new UnprocessableEntityException(
        'Chỉ có thể chuyển lead ở trạng thái QUALIFIED thành deal',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      let customerId = dto.customerId;

      // Nếu không cung cấp customerId, tạo customer mới từ thông tin lead
      if (!customerId) {
        const customer = await tx.customer.create({
          data: {
            code: `CUST-${Date.now()}`,
            name: lead.title,
          },
        });
        customerId = customer.id;
      }

      const deal = await tx.deal.create({
        data: {
          code:       `DEAL-${Date.now()}`,
          title:      dto.dealTitle,
          customerId,
          assigneeId: lead.assigneeId,
          stage:      DealStage.QUALIFICATION,
          value:      dto.dealValue ?? lead.estimatedValue,
          currency:   lead.currency ?? 'VND',
        },
      });

      await tx.lead.update({
        where: { id },
        data: {
          status:           LeadStatus.CONVERTED,
          convertedDealId:  deal.id,
          convertedAt:      new Date(),
        },
      });

      return deal;
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.lead.delete({ where: { id } });
  }
}
