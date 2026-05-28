import { IsString, IsNotEmpty, IsNumber, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateExpenseItemDto {
  @ApiProperty({ description: 'Mô tả khoản chi' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ description: 'Số tiền', minimum: 0.01 })
  @IsNumber()
  @IsPositive()
  amount: number;
}
