import { IsString, IsNotEmpty, MaxLength, IsOptional, IsIn, IsInt, Min, Max } from 'class-validator';

export class CreateVendorDto {
  @IsString() @IsNotEmpty() @MaxLength(50)
  code: string;

  @IsString() @IsNotEmpty() @MaxLength(200)
  name: string;

  @IsOptional() @IsString() @MaxLength(100)
  category?: string;

  @IsOptional() @IsString() @MaxLength(100)
  contactName?: string;

  @IsOptional() @IsString() @MaxLength(200)
  email?: string;

  @IsOptional() @IsString() @MaxLength(50)
  phone?: string;

  @IsOptional() @IsString()
  address?: string;

  @IsOptional() @IsString() @MaxLength(30)
  taxCode?: string;

  @IsOptional() @IsString() @MaxLength(50)
  bankAccount?: string;

  @IsOptional() @IsString() @MaxLength(100)
  bankName?: string;

  @IsOptional() @IsInt() @Min(1) @Max(5)
  rating?: number;

  @IsOptional() @IsIn(['ACTIVE', 'INACTIVE', 'BLOCKED'])
  status?: string;

  @IsOptional() @IsString()
  notes?: string;
}

export class UpdateVendorDto extends CreateVendorDto {}
