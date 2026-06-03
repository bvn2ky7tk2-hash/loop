import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsArray,
  IsInt,
  Min,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Provision tenant mới: tạo tenant + cấu hình bật/tắt module + cấp admin tenant.
 * Chỉ platform admin được gọi.
 */
export class ProvisionTenantDto {
  // ── Tenant ──
  @IsString() @IsNotEmpty() @MaxLength(200)
  name!: string;

  @IsString() @IsNotEmpty() @MaxLength(100)
  slug!: string;

  @IsOptional() @IsString() customDomain?: string;
  @IsOptional() @IsString() @MaxLength(7) primaryColor?: string;
  @IsOptional() @IsString() timezone?: string;

  // ── Quota giới hạn gói (platform admin đặt; null/bỏ trống = không giới hạn) ──
  @IsOptional() @IsInt() @Min(0) maxUsers?: number;
  @IsOptional() @IsInt() @Min(0) maxStorageMb?: number;
  @IsOptional() @IsInt() @Min(0) maxProjects?: number;
  @IsOptional() @IsInt() @Min(0) maxEmployees?: number;

  // ── Module bật (ngoài core luôn bật). Bỏ trống = bật tất cả. ──
  // Giá trị: 'people' | 'finance' | 'crm' | 'asset' | 'ops' (module không-core).
  @IsOptional() @IsArray() @IsString({ each: true })
  enabledModules?: string[];

  // ── Admin tenant ──
  @IsEmail()
  adminEmail!: string;

  @IsString() @IsNotEmpty() @MaxLength(200)
  adminName!: string;

  @IsString() @MinLength(8) @MaxLength(100)
  adminPassword!: string;
}
