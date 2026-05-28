import {
  IsString,
  IsEnum,
  IsOptional,
  IsUUID,
  IsInt,
  IsDateString,
  Min,
  MinLength,
  MaxLength,
  Matches,
  IsNumber,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EmployeeLevel, JobStatus } from '../../../generated/prisma';

export class CreateJobDto {
  @ApiProperty({ example: 'JOB-2024-001' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[A-Z0-9_-]+$/, { message: 'Code chỉ dùng chữ hoa, số, gạch ngang' })
  code: string;

  @ApiProperty({ example: 'Senior Backend Engineer' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title: string;

  @ApiProperty()
  @IsUUID()
  orgUnitId: string;

  @ApiPropertyOptional({ enum: EmployeeLevel })
  @IsOptional()
  @IsEnum(EmployeeLevel)
  level?: EmployeeLevel;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  headcount: number;

  @ApiPropertyOptional({ enum: JobStatus, default: JobStatus.OPEN })
  @IsOptional()
  @IsEnum(JobStatus)
  status?: JobStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  requirements?: string;

  @ApiPropertyOptional({ example: 20000000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  salaryFrom?: number;

  @ApiPropertyOptional({ example: 40000000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  salaryTo?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  closedAt?: string;
}
