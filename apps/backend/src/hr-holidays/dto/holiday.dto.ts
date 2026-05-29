import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsEnum,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { HolidayType } from '../../generated/prisma';

export class CreateHolidayDto {
  @IsDateString()
  date: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(HolidayType)
  type: HolidayType;
}

export class BulkCreateHolidayDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateHolidayDto)
  holidays: CreateHolidayDto[];
}

export class HolidayQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2020)
  @Max(2100)
  year?: number;
}
