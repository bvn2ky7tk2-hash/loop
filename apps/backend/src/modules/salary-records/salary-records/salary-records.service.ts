import { Injectable, NotFoundException, Inject, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { TenantAwareService } from '../common/services/tenant-aware.service';
import { CreateSalaryRecordDto } from './dto/salary-record.dto';

@Injectable({ scope: Scope.REQUEST })
export class SalaryRecordsService extends TenantAwareService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REQUEST) req: any,
  ) {
    super(req);
  }

  async findByEmployee(employeeId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true },
    });
    if (!employee) throw new NotFoundException('Không tìm thấy nhân viên');

    const records = await this.prisma.salaryRecord.findMany({
      where: { employeeId },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    // Tính % tăng so với bản ghi trước
    return records.map((record, index) => {
      const prev = records[index + 1];
      const changePercent =
        prev && Number(prev.basicSalary) > 0
          ? ((Number(record.basicSalary) - Number(prev.basicSalary)) /
              Number(prev.basicSalary)) *
            100
          : null;
      return { ...record, changePercent };
    });
  }

  async create(dto: CreateSalaryRecordDto, userId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: dto.employeeId },
      select: { id: true },
    });
    if (!employee) throw new NotFoundException('Không tìm thấy nhân viên');

    return this.prisma.salaryRecord.create({
      data: {
        employeeId: dto.employeeId,
        basicSalary: dto.basicSalary,
        effectiveDate: new Date(dto.effectiveDate),
        source: dto.source,
        hrDecisionId: dto.hrDecisionId,
        note: dto.note,
        createdBy: userId,
      },
    });
  }

  async getLatest(employeeId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true },
    });
    if (!employee) throw new NotFoundException('Không tìm thấy nhân viên');

    const record = await this.prisma.salaryRecord.findFirst({
      where: { employeeId },
      orderBy: { effectiveDate: 'desc' },
    });
    if (!record) throw new NotFoundException('Chưa có bản ghi lương nào');
    return record;
  }
}
