import {
  IsString,
  IsUUID,
  IsDateString,
  IsNumber,
  Min,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class HireCandidateDto {
  @ApiProperty({ example: 'EMP-2024-042' })
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  @Matches(/^[A-Z0-9_-]+$/, { message: 'Code chỉ dùng chữ hoa, số, gạch ngang' })
  employeeCode: string;

  @ApiProperty({ example: '2024-06-01' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: 1200000 })
  @IsNumber()
  @Min(0)
  ratePerDay: number;

  @ApiProperty()
  @IsUUID()
  orgUnitId: string;
}
