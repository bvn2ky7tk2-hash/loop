import {
  IsString, IsEnum, IsOptional, IsDateString, IsNumber, Min, IsUUID, MaxLength,
} from 'class-validator';
import { ProjectType, BudgetCurrency } from '../../generated/prisma';

export class CreateProjectDto {
  @IsString()
  @MaxLength(20)
  code: string;

  @IsString()
  @MaxLength(200)
  name: string;

  @IsEnum(ProjectType)
  type: ProjectType;

  @IsOptional()
  @IsString()
  customer?: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  budgetCost?: number;

  @IsOptional()
  @IsEnum(BudgetCurrency)
  currency?: BudgetCurrency;

  @IsOptional()
  @IsNumber()
  @Min(0)
  budgetEffortMm?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsUUID()
  pmId: string;

  @IsUUID()
  orgUnitId: string;
}
