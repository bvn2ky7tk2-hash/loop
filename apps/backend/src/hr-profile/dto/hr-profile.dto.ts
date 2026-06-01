import { IsOptional, IsString, IsEnum, IsDateString, IsEmail, MaxLength } from 'class-validator';
import { IdType, Gender, MaritalStatus } from '../../generated/prisma';

export class UpdatePersonalInfoDto {
  // Thông tin cơ bản
  @IsOptional()
  @IsString()
  @MaxLength(200)
  fullName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsDateString()
  birthdate?: string;

  // Giới tính & hôn nhân
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @IsEnum(MaritalStatus)
  maritalStatus?: MaritalStatus;

  // Liên lạc & xuất xứ
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  hometown?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  placeOfBirth?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  ethnicity?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  religion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  nationality?: string;

  // Giấy tờ tùy thân
  @IsOptional()
  @IsEnum(IdType)
  idType?: IdType;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  idNumber?: string;

  @IsOptional()
  @IsDateString()
  idIssueDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  idIssuePlace?: string;

  // Địa chỉ
  @IsOptional()
  @IsString()
  permanentAddress?: string;

  @IsOptional()
  @IsString()
  currentAddress?: string;

  // Tài khoản ngân hàng
  @IsOptional()
  @IsString()
  @MaxLength(30)
  bankAccount?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  bankName?: string;
}
