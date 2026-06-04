import { IsOptional, IsDateString, IsUUID, IsString, MaxLength } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class PunchQueryDto extends PaginationDto {
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @IsOptional()
  @IsUUID()
  orgUnitId?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;
}

export class CreatePunchDto {
  @IsUUID()
  employeeId: string;

  @IsDateString()
  punchedAt: string; // ISO datetime

  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;
}

export interface PunchImportError {
  row: number;
  message: string;
}

export interface PunchImportPreviewResult {
  valid: { employeeId: string; code: string; fullName: string; punchedAt: string }[];
  errors: PunchImportError[];
}
