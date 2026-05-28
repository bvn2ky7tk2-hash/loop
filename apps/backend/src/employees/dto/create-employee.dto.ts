import {
  IsString, IsEnum, IsOptional, IsUUID, IsArray, IsDateString,
  IsEmail, MinLength, MaxLength, Matches,
} from 'class-validator';
import { EmployeeLevel } from '../../generated/prisma';

export class CreateEmployeeDto {
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  @Matches(/^[A-Z0-9_-]+$/, { message: 'Code chỉ dùng chữ hoa, số, gạch ngang' })
  code: string;

  @IsString()
  @MinLength(1)
  fullName: string;

  @IsUUID()
  orgUnitId: string;

  @IsEnum(EmployeeLevel)
  level: EmployeeLevel;

  @IsDateString()
  startDate: string;

  @IsOptional()
  @IsDateString()
  birthdate?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  techStack?: string[];

  @IsOptional()
  @IsString()
  cccd?: string;

  @IsOptional()
  @IsDateString()
  cccdIssueDate?: string;

  @IsOptional()
  @IsString()
  cccdIssuePlace?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;
}
