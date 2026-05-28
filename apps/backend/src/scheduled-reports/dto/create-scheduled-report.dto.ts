import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsEmail,
  IsIn,
  IsOptional,
  IsInt,
  Min,
  Max,
  MaxLength,
} from 'class-validator';

export class CreateScheduledReportDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['payroll-summary', 'headcount', 'okr-progress', 'leave-summary', 'expense-report'])
  template: string;

  @IsArray()
  @IsEmail({}, { each: true })
  recipients: string[];

  @IsString()
  @IsNotEmpty()
  @IsIn(['WEEKLY', 'MONTHLY', 'QUARTERLY'])
  frequency: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(28)
  dayOfMonth?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  hour?: number;

  @IsString()
  @IsNotEmpty()
  @IsIn(['EXCEL', 'PDF'])
  format: string;

  @IsOptional()
  isActive?: boolean;
}
