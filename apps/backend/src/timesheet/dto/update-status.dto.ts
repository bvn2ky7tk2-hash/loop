import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WorkStatusType } from '../../generated/prisma';

export class UpdateStatusDto {
  @ApiProperty({ enum: WorkStatusType })
  @IsEnum(WorkStatusType)
  statusType: WorkStatusType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}
