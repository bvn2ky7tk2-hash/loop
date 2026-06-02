import { IsString, IsNotEmpty, IsDateString, IsArray, ValidateNested, IsNumber, Min, Max, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class TaxBracketItemDto {
  @ApiProperty({ example: 0 })
  @IsNumber() @Min(0)
  from: number;

  @ApiPropertyOptional({ example: 10000000, nullable: true })
  @IsOptional()
  @IsNumber()
  to: number | null;

  @ApiProperty({ example: 0.05, description: 'Thuế suất (0.05 = 5%)' })
  @IsNumber() @Min(0) @Max(1)
  rate: number;
}

export class CreateTaxBracketDto {
  @ApiProperty({ example: 'Biểu thuế 5 bậc 2026' })
  @IsString() @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '2026-01-01', description: 'Ngày hiệu lực' })
  @IsDateString()
  effectiveFrom: string;

  @ApiProperty({ type: [TaxBracketItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaxBracketItemDto)
  brackets: TaxBracketItemDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tenantId?: string;
}

export class CreateTaxDeductionConfigDto {
  @ApiProperty({ example: '2026-01-01' })
  @IsDateString()
  effectiveFrom: string;

  @ApiProperty({ example: 15500000, description: 'Giảm trừ bản thân (VNĐ/tháng)' })
  @IsNumber() @Min(0)
  selfDeduction: number;

  @ApiProperty({ example: 6200000, description: 'Giảm trừ mỗi người phụ thuộc (VNĐ/tháng)' })
  @IsNumber() @Min(0)
  dependentDeduction: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tenantId?: string;
}
