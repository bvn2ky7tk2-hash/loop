import { IsString, IsNotEmpty, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

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
}
