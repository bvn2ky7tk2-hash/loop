import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GeneratePayrollDto {
  @ApiProperty({ description: 'ID của kỳ lương cần tính' })
  @IsString()
  @IsNotEmpty()
  periodId: string;
}
