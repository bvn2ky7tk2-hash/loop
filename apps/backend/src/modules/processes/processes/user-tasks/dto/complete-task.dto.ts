import { IsOptional, IsObject } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CompleteTaskDto {
  @ApiPropertyOptional({ description: 'Biến đầu ra khi hoàn thành task' })
  @IsOptional()
  @IsObject()
  variables?: Record<string, unknown>;
}
