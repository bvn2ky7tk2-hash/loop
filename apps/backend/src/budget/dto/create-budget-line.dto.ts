import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsNumberString,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBudgetLineDto {
  @ApiProperty({ description: 'Danh mục ngân sách (vd: Nhân sự, Công cụ IT)' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiPropertyOptional({ description: 'Mô tả chi tiết' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Số tiền phân bổ (VND)', example: '100000000' })
  @IsNumberString()
  allocatedAmount: string;

  @ApiPropertyOptional({
    description: 'Ngưỡng cảnh báo (%) — cảnh báo khi chi tiêu vượt ngưỡng này',
    minimum: 50,
    maximum: 100,
    example: 80,
  })
  @IsOptional()
  @IsInt()
  @Min(50)
  @Max(100)
  alertThreshold?: number;
}
