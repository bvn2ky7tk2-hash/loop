import { IsNumber, IsDateString, IsInt, Min, Max, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateInsuranceConfigDto {
  @ApiPropertyOptional({ example: '2026-07-01', description: 'Ngày hiệu lực' })
  @IsDateString()
  effectiveFrom: string;

  @ApiProperty({ example: 0.08, description: 'Tỷ lệ BHXH người lao động (0.08 = 8%)' })
  @IsNumber() @Min(0) @Max(1)
  bhxhEmployeeRate: number;

  @ApiProperty({ example: 0.015 })
  @IsNumber() @Min(0) @Max(1)
  bhytEmployeeRate: number;

  @ApiProperty({ example: 0.01 })
  @IsNumber() @Min(0) @Max(1)
  bhtnEmployeeRate: number;

  @ApiProperty({ example: 0.17, description: 'Tỷ lệ BHXH người sử dụng lao động' })
  @IsNumber() @Min(0) @Max(1)
  bhxhEmployerRate: number;

  @ApiProperty({ example: 0.03 })
  @IsNumber() @Min(0) @Max(1)
  bhytEmployerRate: number;

  @ApiProperty({ example: 0.01 })
  @IsNumber() @Min(0) @Max(1)
  bhtnEmployerRate: number;

  @ApiProperty({ example: 0.005, description: 'Tỷ lệ TNLĐ-BNN người sử dụng lao động' })
  @IsNumber() @Min(0) @Max(1)
  tnldRate: number;

  @ApiProperty({ example: 20, description: 'Hệ số trần BHXH (mặc định 20 lần lương cơ sở)' })
  @IsInt() @Min(1)
  bhxhCeilingMultiple: number;

  @ApiProperty({ example: 2530000, description: 'Lương cơ sở (VNĐ)' })
  @IsNumber() @Min(0)
  wageBase: number;

  @ApiPropertyOptional({ description: 'Tenant ID (null = áp dụng toàn hệ thống)' })
  @IsOptional()
  @IsString()
  tenantId?: string;
}
