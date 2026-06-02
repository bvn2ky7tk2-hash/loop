import { IsString, IsNotEmpty, MaxLength, IsUrl, IsOptional, IsArray } from 'class-validator';

export class CreateWebhookDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @IsUrl()
  url: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  secret?: string;

  @IsArray()
  @IsString({ each: true })
  events: string[];
}
