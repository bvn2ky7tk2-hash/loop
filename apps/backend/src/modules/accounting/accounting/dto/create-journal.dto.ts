import { IsString, IsNotEmpty, IsDateString, IsOptional, IsArray, ValidateNested, IsNumber, Min, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class JournalLineDto {
  @IsString() @IsNotEmpty() @MaxLength(20)
  accountCode: string;

  @IsNumber() @Min(0)
  debit: number;

  @IsNumber() @Min(0)
  credit: number;

  @IsOptional() @IsString() @MaxLength(200)
  description?: string;
}

export class CreateJournalDto {
  @IsDateString()
  date: string;

  @IsString() @IsNotEmpty() @MaxLength(500)
  description: string;

  @IsOptional() @IsString() @MaxLength(100)
  reference?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JournalLineDto)
  lines: JournalLineDto[];
}
