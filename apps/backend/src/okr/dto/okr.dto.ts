import { IsString, IsOptional, IsEnum, IsInt, IsNumber, IsUUID, IsNotEmpty, Min, Max, MaxLength } from 'class-validator';
import { PartialType } from '@nestjs/swagger';

export enum OkrStatusEnum { DRAFT = 'DRAFT', ACTIVE = 'ACTIVE', COMPLETED = 'COMPLETED', CANCELLED = 'CANCELLED' }
export enum OkrCycleEnum { Q1='Q1', Q2='Q2', Q3='Q3', Q4='Q4', H1='H1', H2='H2', ANNUAL='ANNUAL' }
export enum KpiFrequencyEnum { MONTHLY='MONTHLY', QUARTERLY='QUARTERLY', YEARLY='YEARLY' }

export class CreateObjectiveDto {
  @IsString() @IsNotEmpty() @MaxLength(300)
  title: string;

  @IsOptional() @IsString()
  description?: string;

  @IsEnum(OkrCycleEnum)
  cycle: OkrCycleEnum;

  @IsInt() @Min(2020) @Max(2100)
  year: number;

  @IsUUID()
  ownerId: string;

  @IsOptional() @IsUUID()
  orgUnitId?: string;

  @IsOptional() @IsEnum(OkrStatusEnum)
  status?: OkrStatusEnum;
}

export class UpdateObjectiveDto extends PartialType(CreateObjectiveDto) {}

export class CreateKeyResultDto {
  @IsString() @IsNotEmpty() @MaxLength(300)
  title: string;

  @IsOptional() @IsString()
  unit?: string;

  @IsOptional() @IsNumber()
  startValue?: number;

  @IsNumber()
  targetValue: number;

  @IsOptional() @IsNumber()
  currentValue?: number;
}

export class UpdateKeyResultDto extends PartialType(CreateKeyResultDto) {}

export class CreateKpiMetricDto {
  @IsString() @IsNotEmpty() @MaxLength(200)
  name: string;

  @IsOptional() @IsString()
  description?: string;

  @IsOptional() @IsString()
  unit?: string;

  @IsOptional() @IsNumber()
  targetValue?: number;

  @IsOptional() @IsEnum(KpiFrequencyEnum)
  frequency?: KpiFrequencyEnum;

  @IsOptional() @IsUUID()
  orgUnitId?: string;
}

export class UpdateKpiMetricDto extends PartialType(CreateKpiMetricDto) {}

export class CreateKpiRecordDto {
  @IsString() @IsNotEmpty()
  period: string;

  @IsNumber()
  value: number;

  @IsOptional() @IsString()
  notes?: string;
}
