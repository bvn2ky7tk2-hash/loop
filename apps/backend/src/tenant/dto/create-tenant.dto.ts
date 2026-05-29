import { IsString, IsNotEmpty, IsOptional, IsBoolean, MaxLength } from 'class-validator';

export class CreateTenantDto {
  @IsString() @IsNotEmpty() @MaxLength(200)
  name!: string;

  @IsString() @IsNotEmpty() @MaxLength(100)
  slug!: string;

  @IsOptional() @IsString() logoUrl?: string;
  @IsOptional() @IsString() faviconUrl?: string;
  @IsOptional() @IsString() @MaxLength(7) primaryColor?: string;
  @IsOptional() @IsString() customDomain?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() timezone?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsBoolean() isDefault?: boolean;
}
