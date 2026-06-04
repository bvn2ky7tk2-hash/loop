import { IsString, IsOptional, IsBoolean, IsInt, Min, MaxLength } from 'class-validator';

export class UpdateTenantDto {
  @IsOptional() @IsString() @MaxLength(200) name?: string;
  @IsOptional() @IsString() @MaxLength(100) slug?: string;
  @IsOptional() @IsString() logoUrl?: string;
  @IsOptional() @IsString() faviconUrl?: string;
  @IsOptional() @IsString() @MaxLength(7) primaryColor?: string; // "#RRGGBB"
  @IsOptional() @IsString() customDomain?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() timezone?: string;
  @IsOptional() @IsString() @MaxLength(8) currency?: string;

  // ── Quota giới hạn gói (null/bỏ trống = không giới hạn) ──
  @IsOptional() @IsInt() @Min(0) maxUsers?: number;
  @IsOptional() @IsInt() @Min(0) maxStorageMb?: number;
  @IsOptional() @IsInt() @Min(0) maxProjects?: number;
  @IsOptional() @IsInt() @Min(0) maxEmployees?: number;
}
