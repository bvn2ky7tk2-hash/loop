import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { paginate, PaginatedResult } from '../common/dto/pagination.dto';
import { CreateInsuranceConfigDto } from './dto/create-insurance-config.dto';
import { CreateTaxBracketDto, CreateTaxDeductionConfigDto } from './dto/create-tax-bracket.dto';
import {
  CreateSalaryColumnDto,
  UpdateSalaryColumnDto,
  ALLOWED_FORMULA_VARS,
} from './dto/create-salary-column.dto';
import { SalaryColumnSource } from '../generated/prisma';

@Injectable()
export class PayrollConfigService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Insurance Config ───────────────────────────────────────────────────────

  async listInsuranceConfigs(page = 1, limit = 20): Promise<PaginatedResult<any>> {
    const [data, total] = await this.prisma.$transaction([
      this.prisma.insuranceConfig.findMany({
        orderBy: { effectiveFrom: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.insuranceConfig.count(),
    ]);
    return paginate(
      data.map((c) => ({
        ...c,
        bhxhCeiling: Number(c.wageBase) * c.bhxhCeilingMultiple,
      })),
      total,
      page,
      limit,
    );
  }

  async getActiveInsuranceConfig(date?: string) {
    const refDate = date ? new Date(date) : new Date();
    const config = await this.prisma.insuranceConfig.findFirst({
      where: { effectiveFrom: { lte: refDate } },
      orderBy: { effectiveFrom: 'desc' },
    });
    if (!config) throw new NotFoundException('Không tìm thấy cấu hình bảo hiểm nào');
    return { ...config, bhxhCeiling: Number(config.wageBase) * config.bhxhCeilingMultiple };
  }

  async createInsuranceConfig(dto: CreateInsuranceConfigDto, actorId: string) {
    const effectiveFrom = new Date(dto.effectiveFrom);

    const exists = await this.prisma.insuranceConfig.findFirst({
      where: { tenantId: dto.tenantId ?? null, effectiveFrom },
    });
    if (exists) {
      throw new ConflictException(`Đã có cấu hình bảo hiểm có hiệu lực từ ${dto.effectiveFrom}`);
    }

    const config = await this.prisma.insuranceConfig.create({
      data: {
        tenantId: dto.tenantId ?? null,
        effectiveFrom,
        bhxhEmployeeRate: dto.bhxhEmployeeRate,
        bhytEmployeeRate: dto.bhytEmployeeRate,
        bhtnEmployeeRate: dto.bhtnEmployeeRate,
        bhxhEmployerRate: dto.bhxhEmployerRate,
        bhytEmployerRate: dto.bhytEmployerRate,
        bhtnEmployerRate: dto.bhtnEmployerRate,
        tnldRate: dto.tnldRate,
        bhxhCeilingMultiple: dto.bhxhCeilingMultiple,
        wageBase: dto.wageBase,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: actorId,
        action: 'CREATE',
        entity: 'InsuranceConfig',
        entityId: config.id,
        newValues: config as any,
      },
    });

    return { ...config, bhxhCeiling: Number(config.wageBase) * config.bhxhCeilingMultiple };
  }

  async updateInsuranceConfig(id: string, dto: Partial<{
    effectiveFrom: string;
    bhxhEmployeeRate: number;
    bhytEmployeeRate: number;
    bhtnEmployeeRate: number;
    bhxhEmployerRate: number;
    bhytEmployerRate: number;
    bhtnEmployerRate: number;
    tnldRate: number;
    bhxhCeilingMultiple: number;
    wageBase: number;
    bhxhExemptForProbation: boolean;
  }>) {
    const existing = await this.prisma.insuranceConfig.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Không tìm thấy cấu hình bảo hiểm');

    const inUse = await this.prisma.payrollRecord.findFirst({
      where: { configSnapshot: { path: ['insuranceConfigId'], equals: id } },
    });
    if (inUse) {
      throw new ConflictException('Config đã được dùng trong kỳ lương, không thể cập nhật');
    }

    const updated = await this.prisma.insuranceConfig.update({
      where: { id },
      data: {
        ...(dto.effectiveFrom !== undefined && { effectiveFrom: new Date(dto.effectiveFrom) }),
        ...(dto.bhxhEmployeeRate !== undefined && { bhxhEmployeeRate: dto.bhxhEmployeeRate }),
        ...(dto.bhytEmployeeRate !== undefined && { bhytEmployeeRate: dto.bhytEmployeeRate }),
        ...(dto.bhtnEmployeeRate !== undefined && { bhtnEmployeeRate: dto.bhtnEmployeeRate }),
        ...(dto.bhxhEmployerRate !== undefined && { bhxhEmployerRate: dto.bhxhEmployerRate }),
        ...(dto.bhytEmployerRate !== undefined && { bhytEmployerRate: dto.bhytEmployerRate }),
        ...(dto.bhtnEmployerRate !== undefined && { bhtnEmployerRate: dto.bhtnEmployerRate }),
        ...(dto.tnldRate !== undefined && { tnldRate: dto.tnldRate }),
        ...(dto.bhxhCeilingMultiple !== undefined && { bhxhCeilingMultiple: dto.bhxhCeilingMultiple }),
        ...(dto.wageBase !== undefined && { wageBase: dto.wageBase }),
        ...(dto.bhxhExemptForProbation !== undefined && { bhxhExemptForProbation: dto.bhxhExemptForProbation }),
      },
    });

    return { ...updated, bhxhCeiling: Number(updated.wageBase) * updated.bhxhCeilingMultiple };
  }

  async deleteInsuranceConfig(id: string) {
    const config = await this.prisma.insuranceConfig.findUnique({ where: { id } });
    if (!config) throw new NotFoundException('Không tìm thấy cấu hình bảo hiểm');

    // Check if in use: any PayrollRecord with configSnapshot referencing this effectiveFrom
    const inUse = await this.prisma.payrollRecord.findFirst({
      where: {
        configSnapshot: { path: ['insuranceConfigId'], equals: id },
      },
    });
    if (inUse) {
      throw new ConflictException('Config đã được dùng trong kỳ lương, không thể xóa');
    }

    await this.prisma.insuranceConfig.delete({ where: { id } });
    return { success: true };
  }

  // ─── Tax Bracket ────────────────────────────────────────────────────────────

  async listTaxBrackets(page = 1, limit = 20): Promise<PaginatedResult<any>> {
    const [data, total] = await this.prisma.$transaction([
      this.prisma.taxBracket.findMany({
        orderBy: { effectiveFrom: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.taxBracket.count(),
    ]);

    // Mark which are in use
    const inUseIds = await this.getInUseTaxBracketIds();
    return paginate(
      data.map((b) => ({ ...b, isInUse: inUseIds.has(b.id) })),
      total,
      page,
      limit,
    );
  }

  async getActiveTaxBracket(date?: string) {
    const refDate = date ? new Date(date) : new Date();
    const bracket = await this.prisma.taxBracket.findFirst({
      where: { effectiveFrom: { lte: refDate } },
      orderBy: { effectiveFrom: 'desc' },
    });
    if (!bracket) throw new NotFoundException('Không tìm thấy biểu thuế nào');
    return bracket;
  }

  async createTaxBracket(dto: CreateTaxBracketDto, actorId: string) {
    const effectiveFrom = new Date(dto.effectiveFrom);

    const exists = await this.prisma.taxBracket.findFirst({
      where: { tenantId: dto.tenantId ?? null, effectiveFrom },
    });
    if (exists) {
      throw new ConflictException(`Đã có biểu thuế có hiệu lực từ ${dto.effectiveFrom}`);
    }

    // Validate brackets: from[i] = to[i-1], rates are valid
    for (let i = 1; i < dto.brackets.length; i++) {
      if (dto.brackets[i].from !== dto.brackets[i - 1].to) {
        throw new BadRequestException(
          `Bậc ${i + 1}: ngưỡng "từ" (${dto.brackets[i].from}) phải bằng ngưỡng "đến" của bậc trước (${dto.brackets[i - 1].to})`,
        );
      }
    }

    const bracket = await this.prisma.taxBracket.create({
      data: {
        tenantId: dto.tenantId ?? null,
        name: dto.name,
        effectiveFrom,
        brackets: dto.brackets as any,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: actorId,
        action: 'CREATE',
        entity: 'TaxBracket',
        entityId: bracket.id,
        newValues: bracket as any,
      },
    });

    return bracket;
  }

  async updateTaxBracket(id: string, dto: Partial<{
    name: string;
    effectiveFrom: string;
    brackets: any[];
  }>) {
    const existing = await this.prisma.taxBracket.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Không tìm thấy biểu thuế');

    const inUseIds = await this.getInUseTaxBracketIds();
    if (inUseIds.has(id)) {
      throw new ConflictException('Biểu thuế đã được dùng trong kỳ lương, không thể cập nhật');
    }

    if (dto.brackets && dto.brackets.length > 1) {
      for (let i = 1; i < dto.brackets.length; i++) {
        if (dto.brackets[i].from !== dto.brackets[i - 1].to) {
          throw new BadRequestException(
            `Bậc ${i + 1}: ngưỡng "từ" (${dto.brackets[i].from}) phải bằng ngưỡng "đến" của bậc trước (${dto.brackets[i - 1].to})`,
          );
        }
      }
    }

    const updated = await this.prisma.taxBracket.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.effectiveFrom !== undefined && { effectiveFrom: new Date(dto.effectiveFrom) }),
        ...(dto.brackets !== undefined && { brackets: dto.brackets as any }),
      },
    });

    return updated;
  }

  async deleteTaxBracket(id: string) {
    const bracket = await this.prisma.taxBracket.findUnique({ where: { id } });
    if (!bracket) throw new NotFoundException('Không tìm thấy biểu thuế');

    const inUseIds = await this.getInUseTaxBracketIds();
    if (inUseIds.has(id)) {
      throw new ConflictException('Biểu thuế đã được dùng trong kỳ lương, không thể xóa');
    }

    await this.prisma.taxBracket.delete({ where: { id } });
    return { success: true };
  }

  // ─── Tax Deduction Config ────────────────────────────────────────────────────

  async listTaxDeductions(page = 1, limit = 20): Promise<PaginatedResult<any>> {
    const [data, total] = await this.prisma.$transaction([
      this.prisma.taxDeductionConfig.findMany({
        orderBy: { effectiveFrom: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.taxDeductionConfig.count(),
    ]);
    return paginate(data, total, page, limit);
  }

  async getActiveTaxDeduction(date?: string) {
    const refDate = date ? new Date(date) : new Date();
    const config = await this.prisma.taxDeductionConfig.findFirst({
      where: { effectiveFrom: { lte: refDate } },
      orderBy: { effectiveFrom: 'desc' },
    });
    if (!config) throw new NotFoundException('Không tìm thấy cấu hình giảm trừ gia cảnh');
    return config;
  }

  async createTaxDeduction(dto: CreateTaxDeductionConfigDto, actorId: string) {
    const effectiveFrom = new Date(dto.effectiveFrom);

    const exists = await this.prisma.taxDeductionConfig.findFirst({
      where: { tenantId: dto.tenantId ?? null, effectiveFrom },
    });
    if (exists) {
      throw new ConflictException(`Đã có cấu hình giảm trừ có hiệu lực từ ${dto.effectiveFrom}`);
    }

    const config = await this.prisma.taxDeductionConfig.create({
      data: {
        tenantId: dto.tenantId ?? null,
        effectiveFrom,
        selfDeduction: dto.selfDeduction,
        dependentDeduction: dto.dependentDeduction,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: actorId,
        action: 'CREATE',
        entity: 'TaxDeductionConfig',
        entityId: config.id,
        newValues: config as any,
      },
    });

    return config;
  }

  // ─── Salary Column ───────────────────────────────────────────────────────────

  async listSalaryColumns(): Promise<any[]> {
    return this.prisma.salaryColumn.findMany({
      orderBy: [{ isActive: 'desc' }, { sortOrder: 'asc' }],
      include: { allowanceType: { select: { id: true, name: true } } },
    });
  }

  async createSalaryColumn(dto: CreateSalaryColumnDto, actorId: string) {
    this.validateSalaryColumnDto(dto);

    const column = await this.prisma.salaryColumn.create({
      data: {
        tenantId: null,
        name: dto.name,
        type: dto.type,
        source: dto.source,
        allowanceTypeId: dto.allowanceTypeId ?? null,
        fixedValue: dto.fixedValue ?? null,
        formula: dto.formula ?? null,
        isBhxhExempt: dto.isBhxhExempt ?? false,
        isPitExempt: dto.isPitExempt ?? false,
        pitExemptCeiling: dto.pitExemptCeiling ?? null,
        sortOrder: dto.sortOrder ?? 0,
      },
      include: { allowanceType: { select: { id: true, name: true } } },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: actorId,
        action: 'CREATE',
        entity: 'SalaryColumn',
        entityId: column.id,
        newValues: column as any,
      },
    });

    return column;
  }

  async updateSalaryColumn(id: string, dto: UpdateSalaryColumnDto, actorId: string) {
    const existing = await this.prisma.salaryColumn.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Không tìm thấy cột bảng lương');

    if (dto.formula) this.validateFormula(dto.formula);

    const updated = await this.prisma.salaryColumn.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.isBhxhExempt !== undefined && { isBhxhExempt: dto.isBhxhExempt }),
        ...(dto.isPitExempt !== undefined && { isPitExempt: dto.isPitExempt }),
        ...(dto.pitExemptCeiling !== undefined && { pitExemptCeiling: dto.pitExemptCeiling }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.formula !== undefined && { formula: dto.formula }),
      },
      include: { allowanceType: { select: { id: true, name: true } } },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: actorId,
        action: 'UPDATE',
        entity: 'SalaryColumn',
        entityId: id,
        oldValues: existing as any,
        newValues: updated as any,
      },
    });

    return updated;
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private validateSalaryColumnDto(dto: CreateSalaryColumnDto) {
    if (dto.source === SalaryColumnSource.ALLOWANCE_TYPE && !dto.allowanceTypeId) {
      throw new BadRequestException('allowanceTypeId là bắt buộc khi source=ALLOWANCE_TYPE');
    }
    if (dto.source === SalaryColumnSource.FIXED_VALUE && dto.fixedValue === undefined) {
      throw new BadRequestException('fixedValue là bắt buộc khi source=FIXED_VALUE');
    }
    if (dto.source === SalaryColumnSource.FORMULA) {
      if (!dto.formula) throw new BadRequestException('formula là bắt buộc khi source=FORMULA');
      this.validateFormula(dto.formula);
    }
  }

  private validateFormula(formula: string) {
    const vars = formula.match(/\{[^}]+\}/g) ?? [];
    const invalid = vars.filter((v) => !ALLOWED_FORMULA_VARS.includes(v));
    if (invalid.length > 0) {
      throw new BadRequestException(`Biến không hợp lệ trong công thức: ${invalid.join(', ')}`);
    }
  }

  private async getInUseTaxBracketIds(): Promise<Set<string>> {
    const records = await this.prisma.payrollRecord.findMany({
      where: { configSnapshot: { not: undefined } },
      select: { configSnapshot: true },
    });
    const ids = new Set<string>();
    for (const r of records) {
      const snap = r.configSnapshot as any;
      if (snap?.taxBracketId) ids.add(snap.taxBracketId);
    }
    return ids;
  }
}
