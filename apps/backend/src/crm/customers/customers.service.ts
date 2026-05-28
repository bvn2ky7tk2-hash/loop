import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate, PaginatedResult } from '../../common/dto/pagination.dto';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(page = 1, limit = 50): Promise<PaginatedResult<any>> {
    const skip = (page - 1) * limit;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.customer.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { contacts: true, deals: true },
          },
        },
      }),
      this.prisma.customer.count(),
    ]);
    return paginate(data, total, page, limit);
  }

  async findOne(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        contacts: true,
        deals: {
          select: { id: true, title: true, stage: true },
        },
      },
    });
    if (!customer) {
      throw new NotFoundException(`Không tìm thấy khách hàng #${id}`);
    }
    return customer;
  }

  async create(dto: CreateCustomerDto) {
    try {
      return await this.prisma.customer.create({ data: dto });
    } catch (err: any) {
      if (err?.code === 'P2002') {
        throw new ConflictException(
          `Mã khách hàng "${dto.code}" đã tồn tại`,
        );
      }
      throw err;
    }
  }

  async update(id: string, dto: UpdateCustomerDto) {
    await this.findOne(id);
    return this.prisma.customer.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    try {
      await this.prisma.customer.delete({ where: { id } });
    } catch (err: any) {
      if (err?.code === 'P2003') {
        throw new ConflictException(
          'Không thể xoá khách hàng đang có deal liên kết',
        );
      }
      throw err;
    }
  }
}
