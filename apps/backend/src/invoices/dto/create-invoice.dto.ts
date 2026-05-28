import {
  IsEnum, IsString, IsOptional, IsDateString, IsArray,
  ValidateNested, IsNumber, Min, MaxLength, IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InvoiceType } from '../../generated/prisma';

export class InvoiceItemDto {
  @ApiProperty()
  @IsString() @IsNotEmpty() @MaxLength(300)
  description: string;

  @ApiProperty()
  @IsNumber() @Min(0.01)
  quantity: number;

  @ApiProperty()
  @IsNumber() @Min(0)
  unitPrice: number;

  @ApiPropertyOptional()
  @IsOptional() @IsNumber() @Min(0)
  taxRate?: number;
}

export class CreateInvoiceDto {
  @ApiProperty({ enum: InvoiceType })
  @IsEnum(InvoiceType)
  type: InvoiceType;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  projectId?: string;

  @ApiProperty()
  @IsDateString()
  issueDate: string;

  @ApiProperty()
  @IsDateString()
  dueDate: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(10)
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(1000)
  notes?: string;

  @ApiProperty({ type: [InvoiceItemDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => InvoiceItemDto)
  items: InvoiceItemDto[];
}
