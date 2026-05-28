import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ReturnTaskDto {
  @ApiPropertyOptional({ description: 'Lý do trả lại task' })
  @IsOptional()
  @IsString()
  reason?: string;
}
