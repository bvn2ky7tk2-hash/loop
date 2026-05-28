import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { FeedPostType } from '../../generated/prisma';

export class CreateFeedPostDto {
  @IsEnum(FeedPostType)
  type: FeedPostType;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  title?: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsOptional()
  @IsString()
  targetOrgId?: string;

  @IsOptional()
  isPinned?: boolean;
}
