import {
  IsString, IsEnum, IsDateString, IsNumber, IsOptional, IsPositive,
  IsUUID, IsArray, ValidateNested, IsNotEmpty, Min,
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

  @ApiProperty({ enum: ContractType })
  @IsEnum(ContractType)
  type: ContractType;

  @ApiProperty({ example: '2024-01-01' })
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional({ example: '2025-01-01' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ example: 15000000 })
  @IsNumber()
  @IsPositive()
  salaryMonthly: number;

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
