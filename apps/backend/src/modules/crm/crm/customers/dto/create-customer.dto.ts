import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateCustomerDto {
  @ApiProperty({ maxLength: 50 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code: string;

  @ApiProperty({ maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  industry?: string;

  @ApiPropertyOptional({ example: 'https://example.com' })
  @IsOptional()
  @IsUrl({}, { message: 'website phải là URL hợp lệ' })
  @MaxLength(500)
  website?: string;

  @ApiPropertyOptional({ example: '0123456789', description: '10 hoặc 13 chữ số' })
  @IsOptional()
  @Matches(/^\d{10}(\d{3})?$/, { message: 'taxCode phải là 10 hoặc 13 chữ số' })
  taxCode?: string;
}
