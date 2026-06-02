import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CandidateStage } from '../../../generated/prisma';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class FilterCandidateDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  jobOpeningId?: string;

  @ApiPropertyOptional({ enum: CandidateStage })
  @IsOptional()
  @IsEnum(CandidateStage)
  stage?: CandidateStage;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assigneeId?: string;
}
