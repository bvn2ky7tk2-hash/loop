import {
  IsString, IsNotEmpty, MaxLength, IsOptional, IsIn, IsArray,
  ValidateNested, IsNumber, Min, IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PoItemDto {
  @IsString() @IsNotEmpty() @MaxLength(300)
  description: string;

  @IsOptional() @IsString() @MaxLength(50)
  unit?: string;

  @IsNumber() @Min(0.001)
  quantity: number;

  @IsNumber() @Min(0)
  unitPrice: number;
}

export class CreatePoDto {
  @IsString() @IsNotEmpty()
  vendorId: string;

  @IsOptional() @IsString()
  notes?: string;

  @IsOptional() @IsString() @MaxLength(10)
  currency?: string;

  @IsOptional() @IsDateString()
  deliveryDate?: string;

  @IsArray() @ValidateNested({ each: true }) @Type(() => PoItemDto)
  items: PoItemDto[];
}

export class UpdatePoStatusDto {
  @IsIn(['SUBMITTED', 'APPROVED', 'REJECTED', 'ORDERED', 'RECEIVED', 'CANCELLED'])
  status: string;

  @IsOptional() @IsString()
  notes?: string;
}

export class ReceiveItemDto {
  @IsString() @IsNotEmpty()
  itemId: string;

  @IsNumber() @Min(0)
  receivedQty: number;
}
