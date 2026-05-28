import {
  IsString,
  IsEnum,
  IsOptional,
  IsUUID,
  IsDateString,
  IsArray,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InterviewType } from '../../../generated/prisma';

export class CreateInterviewDto {
  @ApiProperty()
  @IsUUID()
  candidateId: string;

  @ApiProperty({ enum: InterviewType })
  @IsEnum(InterviewType)
  type: InterviewType;

  @ApiProperty({ example: '2024-06-15T09:00:00.000Z' })
  @IsDateString()
  scheduledAt: string;

  @ApiPropertyOptional({ example: 'Văn phòng tầng 3 — phòng A' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  location?: string;

  @ApiPropertyOptional({ example: 'https://meet.google.com/abc-xyz' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  meetingUrl?: string;

  @ApiPropertyOptional({ type: [String], description: 'Danh sách userId của interviewer' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  interviewers?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
