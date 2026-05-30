import { IsString, IsNotEmpty, IsArray, IsOptional, IsDateString, MaxLength, ArrayMinSize } from 'class-validator';

export type ApiKeyScope = 'READ_ONLY' | 'FULL_ACCESS' | 'WEBHOOK';

export class CreateApiKeyDto {
  @IsString() @IsNotEmpty() @MaxLength(200)
  name: string;

  @IsArray() @ArrayMinSize(1)
  @IsString({ each: true })
  scopes: ApiKeyScope[];

  @IsOptional() @IsDateString()
  expiresAt?: string;
}
