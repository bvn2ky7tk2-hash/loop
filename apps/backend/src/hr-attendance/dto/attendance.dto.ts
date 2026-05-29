import {
  IsOptional,
  IsDateString,
  IsEnum,
  IsUUID,
  IsString,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AttendanceStatus } from '../../generated/prisma';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class CreateAttendanceDto {
  @IsUUID()
  employeeId: string;

  @IsDateString()
  date: string;

  @IsOptional()
  @IsString()
  checkIn?: string; // ISO datetime

  @IsOptional()
  @IsString()
  checkOut?: string;

  @IsOptional()
  @IsEnum(AttendanceStatus)
  status?: AttendanceStatus;

  @IsOptional()
  @IsString()
  leaveType?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class AttendanceQueryDto extends PaginationDto {
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

  @IsOptional()
  @IsEnum(AttendanceStatus)
  status?: AttendanceStatus;
}

export class MonthlyAttendanceQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2020)
  @Max(2100)
  year?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  @IsOptional()
  @IsUUID()
  orgUnitId?: string;
}

export class LockMonthDto {
  @Type(() => Number)
  @IsInt()
  @Min(2020)
  year: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  @IsOptional()
  @IsUUID()
  orgUnitId?: string;
}

export class CalendarQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2020)
  @Max(2100)
  year?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;
}

export class SummarizeMonthDto {
  @Type(() => Number)
  @IsInt()
  @Min(2020)
  year: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  @IsOptional()
  @IsUUID()
  orgUnitId?: string;
}
