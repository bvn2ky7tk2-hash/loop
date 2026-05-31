import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  Max,
  IsEnum,
  IsDateString,
  IsArray,
  ValidateNested,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../common/dto/pagination.dto';

export enum ShiftTypeDto {
  HANH_CHINH = 'HANH_CHINH',
  CA_SANG = 'CA_SANG',
  CA_CHIEU = 'CA_CHIEU',
  CA_DEM = 'CA_DEM',
  LINH_HOAT = 'LINH_HOAT',
}

export class CreateWorkShiftDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsEnum(ShiftTypeDto)
  type: ShiftTypeDto;

  @IsString()
  @IsNotEmpty()
  startTime: string; // "HH:mm"

  @IsString()
  @IsNotEmpty()
  endTime: string; // "HH:mm"

  @IsInt()
  @Min(0)
  @Max(120)
  @Type(() => Number)
  breakMinutes: number;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateWorkShiftDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsEnum(ShiftTypeDto)
  type?: ShiftTypeDto;

  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endTime?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(120)
  @Type(() => Number)
  breakMinutes?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateShiftAssignmentDto {
  @IsString()
  @IsNotEmpty()
  employeeId: string;

  @IsString()
  @IsNotEmpty()
  shiftId: string;

  @IsDateString()
  effectiveFrom: string;

  @IsOptional()
  @IsDateString()
  effectiveTo?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class ListShiftAssignmentDto {
  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsOptional()
  @IsString()
  shiftId?: string;

  @IsOptional()
  @IsString()
  date?: string; // find active assignment on this date

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 50;
}

// ── Lịch làm việc xoay ca (template + enrollment) ───────────────────────────

export class RotationPhaseDto {
  @IsOptional() @IsString()
  shiftId?: string;

  @IsInt() @Min(0)
  phaseOrder: number;
}

export class CreateWorkScheduleTemplateDto {
  @IsString() @IsNotEmpty() @MaxLength(100)
  name: string;

  @IsOptional() @IsString() @MaxLength(300)
  description?: string;

  @IsEnum(['DAILY', 'WEEKLY', 'MONTHLY'])
  repeatType: 'DAILY' | 'WEEKLY' | 'MONTHLY';

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RotationPhaseDto)
  phases: RotationPhaseDto[];
}

export class EnrollEmployeesDto {
  @IsOptional() @IsArray() @IsString({ each: true })
  employeeIds?: string[];

  @IsOptional() @IsString()
  orgUnitId?: string;

  @IsDateString()
  effectiveFrom: string;

  @IsOptional() @IsDateString()
  effectiveTo?: string;

  @IsOptional() @IsString()
  note?: string;
}

export class ListScheduleTemplateDto extends PaginationDto {
  @IsOptional() @IsString()
  search?: string;
}

export class SwapShiftDto {
  @IsString() @IsNotEmpty()
  employeeId: string;

  @IsArray() @IsString({ each: true })
  dates: string[];

  @IsString() @IsNotEmpty()
  newShiftId: string;

  @IsOptional() @IsString()
  reason?: string;
}

export class RecalculateDto {
  @IsString() @IsNotEmpty()
  employeeId: string;

  @IsInt() @Min(2020) @Max(2099)
  year: number;

  @IsInt() @Min(1) @Max(12)
  month: number;
}
