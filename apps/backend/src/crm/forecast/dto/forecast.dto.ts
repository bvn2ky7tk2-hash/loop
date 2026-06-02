import { IsString, IsNotEmpty, IsNumber, IsOptional, IsIn, Min, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRevenueTargetDto {
  @IsString() @IsNotEmpty() @MaxLength(20)
  period: string;

  @IsOptional() @IsString() @IsIn(['MONTHLY', 'QUARTERLY'])
  periodType?: string;

  @IsNumber() @Min(0)
  @Type(() => Number)
  target: number;

  @IsOptional() @IsString() @MaxLength(10)
  currency?: string;

  @IsOptional() @IsString() @MaxLength(500)
  notes?: string;
}

export class UpdateRevenueTargetDto {
  @IsOptional() @IsNumber() @Min(0) @Type(() => Number)
  target?: number;

  @IsOptional() @IsString() @MaxLength(500)
  notes?: string;
}
