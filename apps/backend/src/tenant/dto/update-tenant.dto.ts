import { IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator';

export class UpdateTenantDto {
  @IsOptional() @IsString() @MaxLength(200) name?: string;
  @IsOptional() @IsString() @MaxLength(100) slug?: string;
  @IsOptional() @IsString() logoUrl?: string;
  @IsOptional() @IsString() faviconUrl?: string;
  @IsOptional() @IsString() @MaxLength(7) primaryColor?: string; // "#RRGGBB"
  @IsOptional() @IsString() customDomain?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() timezone?: string;
}
