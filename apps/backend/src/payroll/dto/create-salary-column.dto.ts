import { IsString, IsNotEmpty, IsEnum, IsOptional, IsBoolean, IsNumber, IsInt, Min, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SalaryColumnSource, SalaryColumnType } from '../../generated/prisma';

const ALLOWED_FORMULA_VARS = [
  '{contractSalary}', '{workDays}', '{standardDays}',
  '{overtimeHours}', '{otWeekday}', '{otWeekend}', '{otHoliday}',
];

export class CreateSalaryColumnDto {
  @ApiProperty({ example: 'Lương cơ bản (HĐLĐ)' })
  @IsString() @IsNotEmpty() @MaxLength(100)
  name: string;

  @ApiProperty({ enum: SalaryColumnType })
  @IsEnum(SalaryColumnType)
  type: SalaryColumnType;

  @ApiProperty({ enum: SalaryColumnSource })
  @IsEnum(SalaryColumnSource)
  source: SalaryColumnSource;

  @ApiPropertyOptional({ example: 'at_uuid', description: 'ID của AllowanceType (bắt buộc nếu source=ALLOWANCE_TYPE)' })
  @IsOptional()
  @IsString()
  allowanceTypeId?: string;

  @ApiPropertyOptional({ example: 500000, description: 'Giá trị cố định (bắt buộc nếu source=FIXED_VALUE)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  fixedValue?: number;

  @ApiPropertyOptional({ example: '{contractSalary}/{standardDays}*{workDays}' })
  @IsOptional()
  @IsString()
  formula?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isBhxhExempt?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPitExempt?: boolean;

  @ApiPropertyOptional({ example: 730000, description: 'Trần miễn TNCN (null = miễn toàn bộ)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  pitExemptCeiling?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateSalaryColumnDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString() @IsNotEmpty() @MaxLength(100)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isBhxhExempt?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPitExempt?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber() @Min(0)
  pitExemptCeiling?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt() @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  formula?: string;
}

export { ALLOWED_FORMULA_VARS };
