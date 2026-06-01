import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsDateString,
  IsUUID,
  MaxLength,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { HrDecisionType, HrDecisionStatus } from '../../generated/prisma';

export class CreateHrDecisionDto {
  @IsEnum(HrDecisionType)
  type: HrDecisionType;

  @IsUUID()
  employeeId: string;

  @IsOptional() @IsString() @MaxLength(50)
  decisionNumber?: string;

  @IsDateString()
  effectiveDate: string;

  @IsOptional() @IsDateString()
  signedDate?: string;

  @IsOptional() @IsString()
  content?: string;

  @IsOptional() @IsString() @MaxLength(200)
  signedBy?: string;

  @IsOptional() @IsString()
  notes?: string;

  @IsOptional() @IsUUID()
  fromOrgUnitId?: string;

  @IsOptional() @IsUUID()
  toOrgUnitId?: string;

  @IsOptional() @IsUUID()
  fromPositionId?: string;

  @IsOptional() @IsUUID()
  toPositionId?: string;

  @IsOptional() @Type(() => Number) @IsNumber()
  fromSalary?: number;

  @IsOptional() @Type(() => Number) @IsNumber()
  toSalary?: number;
}

export class UpdateHrDecisionDto {
  @IsOptional() @IsString() @MaxLength(50)
  decisionNumber?: string;

  @IsOptional() @IsDateString()
  effectiveDate?: string;

  @IsOptional() @IsDateString()
  signedDate?: string;

  @IsOptional() @IsString()
  content?: string;

  @IsOptional() @IsString() @MaxLength(200)
  signedBy?: string;

  @IsOptional() @IsString()
  notes?: string;

  @IsOptional() @IsUUID()
  fromOrgUnitId?: string;

  @IsOptional() @IsUUID()
  toOrgUnitId?: string;

  @IsOptional() @IsUUID()
  fromPositionId?: string;

  @IsOptional() @IsUUID()
  toPositionId?: string;

  @IsOptional() @Type(() => Number) @IsNumber()
  fromSalary?: number;

  @IsOptional() @Type(() => Number) @IsNumber()
  toSalary?: number;
}

export class HrDecisionQueryDto extends PaginationDto {
  @IsOptional() @IsString()
  search?: string;

  @IsOptional() @IsUUID()
  employeeId?: string;

  @IsOptional() @IsEnum(HrDecisionType)
  type?: HrDecisionType;

  @IsOptional() @IsEnum(HrDecisionStatus)
  status?: HrDecisionStatus;

  @IsOptional() @IsDateString()
  effectiveDateFrom?: string;

  @IsOptional() @IsDateString()
  effectiveDateTo?: string;

  @IsOptional() @IsUUID()
  orgUnitId?: string;
}

export class RejectHrDecisionDto {
  @IsString() @IsNotEmpty()
  reason: string;
}
