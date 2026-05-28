import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExpenseCategory, BudgetCurrency } from '../../generated/prisma';
import { CreateExpenseItemDto } from './create-expense-item.dto';

export class CreateExpenseDto {
  @ApiProperty({ description: 'Tiêu đề phiếu chi', maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiProperty({ enum: ExpenseCategory, description: 'Loại chi phí' })
  @IsEnum(ExpenseCategory)
  category: ExpenseCategory;

  @ApiProperty({ description: 'Tổng số tiền', minimum: 0.01 })
  @IsNumber()
  @IsPositive()
  totalAmount: number;

  @ApiPropertyOptional({ enum: BudgetCurrency, description: 'Đơn vị tiền tệ' })
  @IsOptional()
  @IsEnum(BudgetCurrency)
  currency?: BudgetCurrency;

  @ApiPropertyOptional({ description: 'ID dự án liên quan' })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({ description: 'Ghi chú', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @ApiProperty({ type: [CreateExpenseItemDto], description: 'Danh sách khoản chi tiết' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateExpenseItemDto)
  items: CreateExpenseItemDto[];
}
