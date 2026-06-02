import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsEnum,
  IsBoolean,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CarryOverExpiryAction } from '../../generated/prisma';

export class SeniorityBonusItemDto {
  @IsInt()
  @Min(1)
  yearsFrom: number;

  @IsInt()
  @Min(0)
  bonus: number;
}

export class CreateLeavePolicyDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsInt()
  @Min(12)
  @Max(30)
  baseAnnualDays: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SeniorityBonusItemDto)
  seniorityBonus?: SeniorityBonusItemDto[];

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(30)
  maxCarryOver?: number;

  @IsOptional()
  @IsString()
  carryOverExpiry?: string; // "MM-DD" e.g. "03-31"

  @IsOptional()
  @IsEnum(CarryOverExpiryAction)
  carryOverExpiryAction?: CarryOverExpiryAction;
}

export class UpdateLeavePolicyDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(12)
  @Max(30)
  baseAnnualDays?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SeniorityBonusItemDto)
  seniorityBonus?: SeniorityBonusItemDto[];

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(30)
  maxCarryOver?: number;

  @IsOptional()
  @IsString()
  carryOverExpiry?: string;

  @IsOptional()
  @IsEnum(CarryOverExpiryAction)
  carryOverExpiryAction?: CarryOverExpiryAction;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class AssignPolicyDto {
  @IsString()
  @IsNotEmpty()
  employeeId: string;

  @IsString()
  @IsNotEmpty()
  leavePolicyId: string;
}
