import { IsString, IsEnum, IsOptional, IsDateString, IsBoolean } from 'class-validator';
import { FamilyRelationship } from '../../generated/prisma';

export class CreateFamilyMemberDto {
  @IsEnum(FamilyRelationship)
  relationship: FamilyRelationship;

  @IsString()
  fullName: string;

  @IsOptional()
  @IsDateString()
  birthdate?: string;

  @IsOptional()
  @IsString()
  idNumber?: string;

  @IsOptional()
  @IsString()
  occupation?: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateFamilyMemberDto extends CreateFamilyMemberDto {}

// Đăng ký / hủy người phụ thuộc giảm trừ TNCN
export class RegisterDependentDto {
  @IsBoolean()
  isDependent: boolean;

  // Bắt buộc khi isDependent = true
  @IsOptional()
  @IsDateString()
  registeredFrom?: string;

  @IsOptional()
  @IsDateString()
  registeredTo?: string;

  @IsOptional()
  @IsString()
  taxId?: string;
}
