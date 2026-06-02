import {
  IsString, IsEnum, IsOptional, IsInt, IsBoolean, Min, Max,
} from 'class-validator';
import { DegreeLevel } from '../../generated/prisma';

export class CreateEducationRecordDto {
  @IsEnum(DegreeLevel)
  degreeLevel: DegreeLevel;

  @IsString()
  schoolName: string;

  @IsOptional()
  @IsString()
  major?: string;

  @IsOptional()
  @IsInt()
  @Min(1950)
  @Max(2100)
  startYear?: number;

  @IsOptional()
  @IsInt()
  @Min(1950)
  @Max(2100)
  endYear?: number;

  @IsOptional()
  @IsInt()
  @Min(1950)
  @Max(2100)
  graduationYear?: number;

  @IsOptional()
  @IsString()
  result?: string;

  @IsOptional()
  @IsString()
  certificateNumber?: string;

  @IsOptional()
  @IsBoolean()
  isMainDegree?: boolean;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateEducationRecordDto extends CreateEducationRecordDto {}
