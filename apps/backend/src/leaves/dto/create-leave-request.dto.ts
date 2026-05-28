import { IsString, IsDateString, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLeaveRequestDto {
  @ApiProperty()
  @IsString()
  employeeId: string;

  @ApiProperty()
  @IsString()
  leaveTypeId: string;

  @ApiProperty({ example: '2024-06-01' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2024-06-03' })
  @IsDateString()
  endDate: string;

  @ApiProperty({ example: 2.5, minimum: 0.5 })
  @IsNumber()
  @Min(0.5)
  days: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}
