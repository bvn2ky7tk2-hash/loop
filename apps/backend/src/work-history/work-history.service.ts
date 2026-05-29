import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginatedResult, paginate } from '../common/dto/pagination.dto';
import { WorkHistoryEventType } from '../generated/prisma';
import { CreateWorkHistoryDto } from './dto/work-history.dto';

@Injectable()
export class WorkHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmployee(
    employeeId: string,
    page = 1,
    limit = 50,
    eventType?: WorkHistoryEventType,
  ): Promise<PaginatedResult<unknown>> {
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = { employeeId };
    if (eventType) where['eventType'] = eventType;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.workHistory.findMany({
        where,
        skip,
        take: limit,
        orderBy: { eventDate: 'desc' },
      }),
      this.prisma.workHistory.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async create(dto: CreateWorkHistoryDto) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: dto.employeeId },
      select: { id: true },
    });
    if (!employee) throw new NotFoundException('Không tìm thấy nhân viên');

    return this.prisma.workHistory.create({
      data: {
        employeeId: dto.employeeId,
        eventType: dto.eventType,
        eventDate: new Date(dto.eventDate),
        title: dto.title,
        description: dto.description,
      },
    });
  }
}
