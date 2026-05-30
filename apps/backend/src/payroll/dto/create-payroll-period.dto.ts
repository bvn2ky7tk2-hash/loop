import { IsString, IsNotEmpty, IsDateString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PayrollPeriodType } from '../../generated/prisma';

export class CreatePayrollPeriodDto {
  @ApiProperty({ example: 'Lương tháng 5/2025' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '2025-05-01' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2025-05-31' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ enum: PayrollPeriodType, default: PayrollPeriodType.REGULAR })
  @IsOptional()
  @IsEnum(PayrollPeriodType)
  type?: PayrollPeriodType;
}
