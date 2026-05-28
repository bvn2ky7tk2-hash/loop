import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DefinitionStatus } from '../../../generated/prisma';

export class PatchDefinitionStatusDto {
  @ApiProperty({ enum: ['DRAFT', 'ACTIVE', 'DEPRECATED'], description: 'Trạng thái mới' })
  @IsEnum(DefinitionStatus)
  status: DefinitionStatus;
}
