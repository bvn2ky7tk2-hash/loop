import {
  IsString, IsNotEmpty, IsOptional, IsBoolean, IsIn,
  IsArray, MaxLength,
} from 'class-validator';

export class CreateCategoryDto {
  @IsString() @IsNotEmpty() @MaxLength(100)
  name: string;

  @IsOptional() @IsString() @MaxLength(500)
  description?: string;

  @IsOptional() @IsString() @MaxLength(50)
  icon?: string;

  @IsOptional() @IsString() @MaxLength(20)
  color?: string;

  @IsOptional()
  sortOrder?: number;
}

export class UpdateCategoryDto {
  @IsOptional() @IsString() @MaxLength(100)
  name?: string;

  @IsOptional() @IsString() @MaxLength(500)
  description?: string;

  @IsOptional() @IsString() @MaxLength(50)
  icon?: string;

  @IsOptional() @IsString() @MaxLength(20)
  color?: string;

  @IsOptional()
  sortOrder?: number;
}

export class CreateArticleDto {
  @IsString() @IsNotEmpty() @MaxLength(300)
  title: string;

  @IsString() @IsNotEmpty()
  content: string;

  @IsOptional() @IsString() @MaxLength(500)
  summary?: string;

  @IsString() @IsNotEmpty()
  categoryId: string;

  @IsOptional() @IsString() @IsIn(['DRAFT', 'PUBLISHED', 'ARCHIVED'])
  status?: string;

  @IsOptional() @IsArray() @IsString({ each: true })
  tags?: string[];

  @IsOptional() @IsBoolean()
  isPinned?: boolean;
}

export class UpdateArticleDto {
  @IsOptional() @IsString() @MaxLength(300)
  title?: string;

  @IsOptional() @IsString()
  content?: string;

  @IsOptional() @IsString() @MaxLength(500)
  summary?: string;

  @IsOptional() @IsString()
  categoryId?: string;

  @IsOptional() @IsString() @IsIn(['DRAFT', 'PUBLISHED', 'ARCHIVED'])
  status?: string;

  @IsOptional() @IsArray() @IsString({ each: true })
  tags?: string[];

  @IsOptional() @IsBoolean()
  isPinned?: boolean;
}
