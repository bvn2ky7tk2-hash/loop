import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength, IsInt, Min, Max } from 'class-validator';
import { FeedPostType } from '../../generated/prisma';

export class CreateFeedPostDto {
  @IsEnum(FeedPostType)
  declare type: FeedPostType;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  title?: string;

  @IsString()
  @IsNotEmpty()
  declare content: string;

  @IsOptional()
  @IsString()
  targetOrgId?: string;

  @IsOptional()
  isPinned?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  targetYears?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  targetName?: string;
}
