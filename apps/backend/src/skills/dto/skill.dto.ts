import { IsString, IsNotEmpty, IsOptional, IsEnum, IsBoolean, IsNumber, Min, Max, IsDateString } from 'class-validator';
import { SkillCategory, SkillLevel } from '../../generated/prisma';

export class CreateSkillDto {
  @IsString() @IsNotEmpty()
  name: string;

  @IsOptional() @IsEnum(SkillCategory)
  category?: SkillCategory;

  @IsOptional() @IsString()
  description?: string;
}

export class UpdateSkillDto {
  @IsOptional() @IsString()
  name?: string;

  @IsOptional() @IsEnum(SkillCategory)
  category?: SkillCategory;

  @IsOptional() @IsString()
  description?: string;

  @IsOptional() @IsBoolean()
  isActive?: boolean;
}

export class UpsertEmployeeSkillDto {
  @IsEnum(SkillLevel)
  level: SkillLevel;

  @IsOptional() @IsNumber() @Min(0) @Max(50)
  yearsExp?: number;

  @IsOptional() @IsString()
  notes?: string;

  @IsOptional() @IsDateString()
  certifiedAt?: string;
}
