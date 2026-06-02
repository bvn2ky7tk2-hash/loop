import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsEnum,
  IsOptional,
  IsUUID,
  IsNumberString,
  IsArray,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateBudgetLineDto } from './create-budget-line.dto';

export enum BudgetPlanType {
  DEPARTMENT = 'DEPARTMENT',
  PROJECT = 'PROJECT',
  COMPANY = 'COMPANY',
}

export class CreateBudgetPlanDto {
  @ApiProperty({ description: 'Tên kế hoạch ngân sách', example: 'Ngân sách CNTT 2026' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Năm tài chính', example: 2026 })
  @IsInt()
  @Min(2020)
  @Max(2099)
  fiscalYear: number;

  @ApiProperty({ enum: BudgetPlanType, description: 'Loại kế hoạch ngân sách' })
  @IsEnum(BudgetPlanType)
  type: BudgetPlanType;

  @ApiPropertyOptional({ description: 'ID phòng ban (khi type=DEPARTMENT)' })
  @IsOptional()
  @IsUUID()
  orgUnitId?: string;

  @ApiPropertyOptional({ description: 'ID dự án (khi type=PROJECT)' })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiProperty({ description: 'Tổng ngân sách (VND)', example: '400000000' })
  @IsNumberString()
  totalAmount: string;

  @ApiPropertyOptional({ description: 'Ghi chú' })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({ type: [CreateBudgetLineDto], description: 'Danh sách dòng ngân sách' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateBudgetLineDto)
  lines: CreateBudgetLineDto[];
}
