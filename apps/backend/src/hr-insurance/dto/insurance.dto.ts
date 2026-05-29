import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsDateString,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { InsuranceEventType } from '../../generated/prisma';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class CreateEnrollmentDto {
  @IsUUID()
  employeeId: string;

  @Type(() => Number)
  @IsNotEmpty()
  insuranceSalary: number;

  @IsDateString()
  startDate: string;

  @IsOptional()
  @IsString()
  bhxhBookNumber?: string;
}

export class CreateInsuranceEventDto {
  @IsUUID()
  enrollmentId: string;

  @IsEnum(InsuranceEventType)
  eventType: InsuranceEventType;

  @IsOptional()
  @Type(() => Number)
  insuranceSalary?: number;

  @IsDateString()
  effectiveDate: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsUUID()
  hrDecisionId?: string;
}

export class CreateSocialInsuranceBookDto {
  @IsUUID()
  employeeId: string;

  @IsString()
  @IsNotEmpty()
  bookNumber: string;

  @IsOptional()
  @IsDateString()
  issueDate?: string;

  @IsOptional()
  @IsString()
  issueAuthority?: string;
}

export class UpdateSocialInsuranceBookDto {
  @IsOptional()
  @IsString()
  issueAuthority?: string;

  @IsOptional()
  @IsBoolean()
  receivedByEmployee?: boolean;

  @IsOptional()
  @IsDateString()
  receivedDate?: string;
}

export class InsuranceQueryDto extends PaginationDto {
  @IsOptional()
  @IsUUID()
  orgUnitId?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  search?: string;
}

export class D02ExportDto {
  @IsNotEmpty()
  @Type(() => Number)
  year: number;

  @IsNotEmpty()
  @Type(() => Number)
  month: number;
}
