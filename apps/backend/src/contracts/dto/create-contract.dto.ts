import {
  IsString, IsEnum, IsDateString, IsNumber, IsOptional, IsPositive,
  IsUUID, IsArray, ValidateNested, IsNotEmpty, Min, IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContractType, ContractStatus, BudgetCurrency } from '../../generated/prisma';

export class ContractAllowanceItemDto {
  @ApiProperty({ description: 'UUID của AllowanceType' })
  @IsUUID()
  allowanceTypeId: string;

  @ApiProperty({ example: 500000 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

export class CreateContractDto {
  @ApiProperty()
  @IsString()
  employeeId: string;

  @ApiProperty({
    enum: ContractType,
    description: `Loại HĐ theo BLLĐ 2019:
      PROBATION=Thử việc (≤60/180 ngày),
      FIXED_12=Xác định thời hạn 12 tháng,
      FIXED_24=Xác định thời hạn 24 tháng,
      FIXED_36=Xác định thời hạn 36 tháng,
      INDEFINITE=Không xác định thời hạn,
      PART_TIME=Bán thời gian,
      SEASONAL=Thời vụ`,
  })
  @IsEnum(ContractType)
  type: ContractType;

  @ApiProperty({ example: '2024-01-01' })
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional({
    example: '2025-01-01',
    description: 'Ngày kết thúc. Để trống nếu INDEFINITE. Với PROBATION/FIXED_* hệ thống tự tính nếu không truyền.',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ example: 15000000 })
  @IsNumber()
  @IsPositive()
  salaryMonthly: number;

  @ApiPropertyOptional({ example: 10000000, description: 'Mức lương đóng BHXH (nếu khác lương HĐ). Bỏ trống → dùng lương HĐ' })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  insuranceSalary?: number;

  @ApiPropertyOptional({ enum: BudgetCurrency, default: BudgetCurrency.VND })
  @IsOptional()
  @IsEnum(BudgetCurrency)
  currency?: BudgetCurrency;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ example: '2024-01-01' })
  @IsOptional()
  @IsDateString()
  signedAt?: string;

  @ApiPropertyOptional({ description: 'UUID nhân viên ký hợp đồng' })
  @IsOptional()
  @IsUUID()
  signedById?: string;

  @ApiPropertyOptional({ type: [ContractAllowanceItemDto], description: 'Danh sách phụ cấp kèm hợp đồng' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContractAllowanceItemDto)
  allowances?: ContractAllowanceItemDto[];
}

export class RenewContractDto {
  @ApiProperty({
    enum: ContractType,
    description: 'Loại HĐ mới sau gia hạn. Theo luật: sau 2 HĐ có thời hạn phải ký INDEFINITE.',
  })
  @IsEnum(ContractType)
  type: ContractType;

  @ApiProperty({ example: '2025-01-02', description: 'Ngày bắt đầu HĐ mới (thường là ngày hôm sau khi HĐ cũ hết hạn)' })
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional({ example: '2026-01-01', description: 'Ngày kết thúc. Tự động tính nếu bỏ trống theo loại HĐ.' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ example: 18000000, description: 'Lương mới (giữ nguyên nếu không truyền)' })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  salaryMonthly?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ example: '2025-01-02' })
  @IsOptional()
  @IsDateString()
  signedAt?: string;

  @ApiPropertyOptional({ description: 'UUID nhân viên ký HĐ mới' })
  @IsOptional()
  @IsUUID()
  signedById?: string;

  @ApiPropertyOptional({ type: [ContractAllowanceItemDto], description: 'Phụ cấp HĐ mới (giữ nguyên nếu không truyền)' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContractAllowanceItemDto)
  allowances?: ContractAllowanceItemDto[];
}
