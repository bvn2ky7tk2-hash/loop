import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsDateString,
  IsUUID,
  MaxLength,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ExplanationType {
  MISSING_CHECKIN  = 'MISSING_CHECKIN',
  MISSING_CHECKOUT = 'MISSING_CHECKOUT',
  LATE_ARRIVAL     = 'LATE_ARRIVAL',
  EARLY_DEPARTURE  = 'EARLY_DEPARTURE',
  BUSINESS_TRIP    = 'BUSINESS_TRIP',
  ONSITE           = 'ONSITE',
  WFH              = 'WFH',
}

export class CreateExplanationDto {
  @IsUUID()
  @IsNotEmpty()
  employeeId: string;

  @IsDateString()
  date: string;

  @IsOptional()
  @IsUUID()
  attendanceRecordId?: string;

  @IsEnum(ExplanationType)
  type: ExplanationType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  reason: string;

  @IsOptional()
  @IsDateString()
  requestedCheckIn?: string;

  @IsOptional()
  @IsDateString()
  requestedCheckOut?: string;
}

export class ExplanationQueryDto {
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @IsOptional()
  @IsUUID()
  orgUnitId?: string;

  @IsOptional()
  @IsEnum(['PENDING', 'APPROVED', 'REJECTED'])
  status?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class ReviewExplanationDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  rejectReason?: string;
}
