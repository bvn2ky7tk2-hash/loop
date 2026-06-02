import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsObject, MaxLength } from 'class-validator';

export class CreateSavedReportDto {
  @IsString() @IsNotEmpty() @MaxLength(200)
  name: string;

  @IsOptional() @IsString() @MaxLength(500)
  description?: string;

  @IsString() @IsNotEmpty() @MaxLength(100)
  category: string;

  @IsObject()
  definition: Record<string, unknown>;

  @IsOptional() @IsBoolean()
  isPublic?: boolean;
}

export class UpdateSavedReportDto {
  @IsOptional() @IsString() @MaxLength(200)
  name?: string;

  @IsOptional() @IsString() @MaxLength(500)
  description?: string;

  @IsOptional() @IsString() @MaxLength(100)
  category?: string;

  @IsOptional() @IsObject()
  definition?: Record<string, unknown>;

  @IsOptional() @IsBoolean()
  isPublic?: boolean;
}
