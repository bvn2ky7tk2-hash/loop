import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { EmployeeLevel, JobStatus } from '../../../generated/prisma';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class FilterJobDto extends PaginationDto {
  @ApiPropertyOptional({ enum: JobStatus })
  @IsOptional()
  @IsEnum(JobStatus)
  status?: JobStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  orgUnitId?: string;

  @ApiPropertyOptional({ enum: EmployeeLevel })
  @IsOptional()
  @IsEnum(EmployeeLevel)
  level?: EmployeeLevel;
}
