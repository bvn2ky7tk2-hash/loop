import { IsUUID, IsNumber, IsDateString, IsOptional, IsEnum, IsString, IsBoolean, Min, Max } from 'class-validator';
import { EmployeeLevel } from '../../generated/prisma';

export class AddMemberDto {
  @IsUUID()
  employeeId: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsEnum(EmployeeLevel)
  level?: EmployeeLevel;

  @IsNumber()
  @Min(1)
  @Max(100)
  allocationPct: number;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  ratePerDay?: number;

  @IsOptional()
  @IsBoolean()
  forceOverride?: boolean;
}
