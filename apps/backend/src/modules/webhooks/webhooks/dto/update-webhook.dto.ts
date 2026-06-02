import { IsString, IsNotEmpty, MaxLength, IsUrl, IsOptional, IsArray } from 'class-validator';

export class UpdateWebhookDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsUrl()
  url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  secret?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  events?: string[];
}
