import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class ReactFeedPostDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  emoji: string;
}
