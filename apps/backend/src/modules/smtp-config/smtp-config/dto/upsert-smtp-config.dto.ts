import { IsString, IsNotEmpty, IsInt, IsBoolean, IsEmail, IsOptional, Min, Max, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class UpsertSmtpConfigDto {
  @IsString() @IsNotEmpty() @MaxLength(200)
  host: string;

  @Type(() => Number)
  @IsInt() @Min(1) @Max(65535)
  port: number;

  @IsString() @IsNotEmpty() @MaxLength(200)
  user: string;

  @IsString() @IsNotEmpty() @MaxLength(500)
  password: string;

  @IsEmail() @MaxLength(200)
  fromEmail: string;

  @IsString() @IsNotEmpty() @MaxLength(200)
  fromName: string;

  @IsOptional() @IsBoolean()
  isActive?: boolean;
}

export class TestSmtpDto {
  @IsEmail()
  to: string;
}
