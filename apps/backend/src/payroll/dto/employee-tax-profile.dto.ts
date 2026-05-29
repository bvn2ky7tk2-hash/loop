import {
  IsString, IsOptional, IsEnum, IsInt, Min, Max,
  IsNotEmpty, IsDateString, MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ResidencyStatus, AllowanceCalculationMode } from '../../generated/prisma';

export class UpsertEmployeeTaxProfileDto {
  @ApiPropertyOptional({ example: '0123456789', description: 'Mã số thuế cá nhân' })
  @IsOptional()
  @IsString() @MaxLength(20)
  taxId?: string;

  @ApiProperty({ enum: ResidencyStatus, default: ResidencyStatus.RESIDENT })
  @IsEnum(ResidencyStatus)
  residencyStatus: ResidencyStatus;

  @ApiProperty({ example: 1, description: 'Vùng lương (1-4)' })
  @IsInt() @Min(1) @Max(4)
  wageZone: number;
}

export class CreateDependentDto {
  @ApiProperty({ example: 'Nguyễn Văn Con' })
  @IsString() @IsNotEmpty() @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'Con ruột', description: 'Quan hệ với người nộp thuế' })
  @IsString() @IsNotEmpty() @MaxLength(50)
  relationship: string;

  @ApiPropertyOptional({ example: '0987654321' })
  @IsOptional()
  @IsString() @MaxLength(20)
  taxId?: string;

  @ApiProperty({ example: '2026-01-01', description: 'Ngày bắt đầu tính giảm trừ' })
  @IsDateString()
  registeredFrom: string;
}

export class TerminateDependentDto {
  @ApiProperty({ example: '2026-12-31', description: 'Ngày kết thúc giảm trừ' })
  @IsDateString()
  registeredTo: string;
}

export class CreateAllowanceTypeDto {
  @ApiProperty({ example: 'Phụ cấp ăn ca' })
  @IsString() @IsNotEmpty() @MaxLength(100)
  name: string;

  @ApiProperty({ example: 730000, description: 'Số tiền mặc định (đ/tháng hoặc đ/ngày công tuỳ calculationMode)' })
  @IsInt() @Min(0)
  defaultAmount: number;

  @ApiPropertyOptional({
    enum: AllowanceCalculationMode,
    default: AllowanceCalculationMode.FIXED,
    description: 'FIXED: cố định hàng tháng; PER_WORK_DAY: tính theo ngày công thực tế',
  })
  @IsOptional()
  @IsEnum(AllowanceCalculationMode)
  calculationMode?: AllowanceCalculationMode;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  isBhxhExempt?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  isPitExempt?: boolean;

  @ApiPropertyOptional({ example: 730000, nullable: true })
  @IsOptional()
  pitExemptCeiling?: number;
}
