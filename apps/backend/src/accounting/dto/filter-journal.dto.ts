import { IsOptional, IsDateString, IsString } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class FilterJournalDto extends PaginationDto {
  @IsOptional() @IsDateString()
  dateFrom?: string;

  @IsOptional() @IsDateString()
  dateTo?: string;

  @IsOptional() @IsString()
  accountCode?: string;

  @IsOptional() @IsString()
  reference?: string;
}
