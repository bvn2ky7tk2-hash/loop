import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsNumber,
  IsPositive,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMaintenanceDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  type: string;

  @IsDateString()
  performedAt: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  cost?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  performedBy?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
