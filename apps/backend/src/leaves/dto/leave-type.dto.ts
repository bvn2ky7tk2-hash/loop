import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsInt, Min, MaxLength } from 'class-validator';

export class CreateLeaveTypeDto {
  @IsString() @IsNotEmpty() @MaxLength(100)
  name: string;

  @IsOptional() @IsInt() @Min(0)
  maxDaysPerYear?: number;

  @IsOptional() @IsBoolean()
  isPaid?: boolean;

  @IsOptional() @IsString() @MaxLength(20)
  color?: string;

  @IsOptional() @IsInt() @Min(0)
  annualDays?: number;

  @IsOptional() @IsInt() @Min(0)
  maxCarryOver?: number;

  @IsOptional() @IsBoolean()
  deductsAnnualLeave?: boolean;

  @IsOptional() @IsString()
  processDefinitionKey?: string | null;

  @IsOptional() @IsBoolean()
  isActive?: boolean;
}

export class UpdateLeaveTypeDto extends CreateLeaveTypeDto {
  @IsOptional() @IsString() @MaxLength(100)
  declare name: string;
}
