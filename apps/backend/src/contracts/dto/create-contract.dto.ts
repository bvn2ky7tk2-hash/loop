import { IsString, IsEnum, IsDateString, IsNumber, IsOptional, IsPositive } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContractType, ContractStatus, BudgetCurrency } from '../../generated/prisma';

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
}
