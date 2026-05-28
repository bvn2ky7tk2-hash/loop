import { IsEnum, IsOptional, IsNumber, IsString, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InterviewResult } from '../../../generated/prisma';

export class UpdateInterviewResultDto {
  @ApiProperty({ enum: InterviewResult })
  @IsEnum(InterviewResult)
  result: InterviewResult;

  @ApiPropertyOptional({ minimum: 0, maximum: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  score?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
