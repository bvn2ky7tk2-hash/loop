import {
  IsString,
  IsEnum,
  IsOptional,
  IsUUID,
  IsEmail,
  IsNumber,
  Min,
  MinLength,
  MaxLength,
  IsPhoneNumber,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CandidateStage, LeadSource } from '../../../generated/prisma';

export class CreateCandidateDto {
  @ApiProperty({ example: 'Nguyễn Văn A' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ example: 'nguyenvana@email.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '0901234567' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiProperty()
  @IsUUID()
  jobOpeningId: string;

  @ApiPropertyOptional({ enum: CandidateStage, default: CandidateStage.APPLIED })
  @IsOptional()
  @IsEnum(CandidateStage)
  stage?: CandidateStage;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @ApiPropertyOptional({ enum: LeadSource })
  @IsOptional()
  @IsEnum(LeadSource)
  source?: LeadSource;

  @ApiPropertyOptional({ example: 25000000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  expectedSalary?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
