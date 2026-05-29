import { IsOptional, IsString, IsEnum, IsDateString, MaxLength } from 'class-validator';
import { IdType } from '../../generated/prisma';

export class UpdatePersonalInfoDto {
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

  @IsOptional()
  @IsString()
  permanentAddress?: string;

  @IsOptional()
  @IsString()
  currentAddress?: string;

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
  @MaxLength(10)
  nationality?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  bankAccount?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  bankName?: string;
}
