import { IsString, IsNotEmpty, IsOptional, MaxLength, IsInt, Min, IsUUID, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class CreatePositionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  declare code: string;

  @IsUUID()
  declare jobTitleId: string;

  @IsUUID()
  declare orgUnitId: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  headcount?: number;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdatePositionDto {
  @IsOptional()
  @IsUUID()
  jobTitleId?: string;

  @IsOptional()
  @IsUUID()
  orgUnitId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  headcount?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isHead?: boolean;
}

export class PositionQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsUUID()
  orgUnitId?: string;

  @IsOptional()
  @IsUUID()
  jobTitleId?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
