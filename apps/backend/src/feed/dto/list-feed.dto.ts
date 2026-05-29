import { IsOptional, IsEnum } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { FeedPostType } from '../../generated/prisma';

export class ListFeedDto extends PaginationDto {
  @IsOptional()
  @IsEnum(FeedPostType)
  type?: FeedPostType;
}
