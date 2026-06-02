import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsInt, MaxLength } from 'class-validator';

export class CreateCategoryDto {
  @IsString() @IsNotEmpty() @MaxLength(50)
  type: string;

  @IsString() @IsNotEmpty() @MaxLength(50)
  code: string;

  @IsString() @IsNotEmpty() @MaxLength(200)
  name: string;

  @IsOptional() @IsString()
  parentId?: string;

  @IsOptional() @IsInt()
  sortOrder?: number;

  @IsOptional() @IsBoolean()
  isActive?: boolean;
}

export class UpdateCategoryDto {
  @IsOptional() @IsString() @MaxLength(50)
  code?: string;

  @IsOptional() @IsString() @MaxLength(200)
  name?: string;

  @IsOptional() @IsString()
  parentId?: string | null;

  @IsOptional() @IsInt()
  sortOrder?: number;

  @IsOptional() @IsBoolean()
  isActive?: boolean;
}
