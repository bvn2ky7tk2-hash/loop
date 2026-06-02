import { IsEnum, IsOptional, IsString, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { InvoiceType, InvoiceStatus } from '../../generated/prisma';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class FilterInvoiceDto extends PaginationDto {
  @ApiPropertyOptional({ enum: InvoiceType })
  @IsOptional() @IsEnum(InvoiceType)
  type?: InvoiceType;

  @ApiPropertyOptional({ enum: InvoiceStatus })
  @IsOptional() @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsDateString()
  dateTo?: string;
}
