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
  IsBoolean,
} from 'class-validator';

export class UpdateScheduledReportDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @IsIn(['payroll-summary', 'headcount', 'okr-progress', 'leave-summary', 'expense-report'])
  template?: string;

  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  recipients?: string[];

  @IsOptional()
  @IsString()
  @IsIn(['WEEKLY', 'MONTHLY', 'QUARTERLY'])
  frequency?: string;

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

  @IsOptional()
  @IsString()
  @IsIn(['EXCEL', 'PDF'])
  format?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
