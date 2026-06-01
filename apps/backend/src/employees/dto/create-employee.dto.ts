import {
  IsString, IsEnum, IsOptional, IsUUID, IsArray, IsDateString,
  IsEmail, MinLength, MaxLength, Matches,
} from 'class-validator';
import { EmployeeLevel, Gender, MaritalStatus, IdType } from '../../generated/prisma';

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
  @Matches(/^\d{9}(\d{3})?$/, { message: 'CCCD phải là 9 hoặc 12 chữ số' })
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

  @IsOptional()
  @IsUUID()
  positionId?: string;

  @IsOptional()
  @IsUUID()
  leavePolicyId?: string;

  // Thông tin cá nhân mở rộng
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @IsEnum(MaritalStatus)
  maritalStatus?: MaritalStatus;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  hometown?: string;

  @IsOptional()
  @IsString()
  placeOfBirth?: string;

  @IsOptional()
  @IsEnum(IdType)
  idType?: IdType;

  @IsOptional()
  @IsString()
  idNumber?: string;

  @IsOptional()
  @IsDateString()
  idIssueDate?: string;

  @IsOptional()
  @IsString()
  idIssuePlace?: string;

  @IsOptional()
  @IsString()
  permanentAddress?: string;

  @IsOptional()
  @IsString()
  currentAddress?: string;

  @IsOptional()
  @IsString()
  ethnicity?: string;

  @IsOptional()
  @IsString()
  religion?: string;

  @IsOptional()
  @IsString()
  nationality?: string;

  @IsOptional()
  @IsString()
  bankAccount?: string;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsUUID()
  directManagerId?: string;
}
