import { IsDateString, IsNumber, IsEnum, IsOptional, Min } from 'class-validator';
import { BudgetCurrency } from '../../generated/prisma';

export class CreateRateDto {
  @IsDateString()
  effectiveDate: string;

  @IsNumber()
  @Min(0)
  ratePerDay: number;

  @IsOptional()
  @IsEnum(BudgetCurrency)
  currency?: BudgetCurrency;
}
