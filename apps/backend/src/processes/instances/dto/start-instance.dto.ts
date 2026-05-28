import { IsString, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StartInstanceDto {
  @ApiProperty({ description: 'ID của ProcessDefinition' })
  @IsString()
  definitionId: string;

  @ApiPropertyOptional({ description: 'ID của Project liên kết (optional)' })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({ description: 'Biến khởi đầu cho process' })
  @IsOptional()
  @IsObject()
  variables?: Record<string, unknown>;
}
