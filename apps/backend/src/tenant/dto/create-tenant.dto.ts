import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsInt, Min, MaxLength } from 'class-validator';

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

  // ── Quota giới hạn gói (null/bỏ trống = không giới hạn) ──
  @IsOptional() @IsInt() @Min(0) maxUsers?: number;
  @IsOptional() @IsInt() @Min(0) maxStorageMb?: number;
  @IsOptional() @IsInt() @Min(0) maxProjects?: number;
  @IsOptional() @IsInt() @Min(0) maxEmployees?: number;
}
