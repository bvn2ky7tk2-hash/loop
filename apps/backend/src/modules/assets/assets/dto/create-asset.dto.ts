import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsInt,
  Min,
  MaxLength,
  IsDateString,
  IsNumber,
  IsPositive,
} from 'class-validator';
import { Type } from 'class-transformer';

enum AssetCategoryEnum {
  LAPTOP = 'LAPTOP',
  DESKTOP = 'DESKTOP',
  PHONE = 'PHONE',
  SERVER = 'SERVER',
  PERIPHERAL = 'PERIPHERAL',
  SOFTWARE = 'SOFTWARE',
  FURNITURE = 'FURNITURE',
  VEHICLE = 'VEHICLE',
  OTHER = 'OTHER',
}

export class CreateAssetDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @IsEnum(AssetCategoryEnum)
  category: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  brand?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  model?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  serialNumber?: string;

  @IsOptional()
  @IsString()
  orgUnitId?: string;

  @IsOptional()
  @IsDateString()
  purchaseDate?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  purchasePrice?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  depreciationYears?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
