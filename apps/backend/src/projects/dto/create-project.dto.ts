import {
  IsString, IsEnum, IsOptional, IsDateString, IsNumber, Min, IsUUID, MaxLength, ValidatorConstraint,
  ValidatorConstraintInterface, ValidationArguments, Validate,
} from 'class-validator';
import { ProjectType, BudgetCurrency } from '../../generated/prisma';

@ValidatorConstraint({ name: 'endDateAfterStart', async: false })
class EndDateAfterStartConstraint implements ValidatorConstraintInterface {
  validate(endDate: string, args: ValidationArguments) {
    const obj = args.object as CreateProjectDto;
    if (!obj.startDate || !endDate) return true;
    return new Date(endDate) > new Date(obj.startDate);
  }
  defaultMessage() { return 'endDate phải sau startDate'; }
}

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
  @IsUUID()
  customerId?: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  @Validate(EndDateAfterStartConstraint)
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
