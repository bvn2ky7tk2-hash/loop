import { IsString, IsNotEmpty, IsOptional, IsIn, MaxLength, IsNumber, Min, Max } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class CreatePerformanceReviewDto {
  @IsString() @IsNotEmpty()
  employeeId: string;

  @IsString() @IsNotEmpty()
  reviewerId: string;

  @IsString() @IsNotEmpty() @MaxLength(20)
  period: string;

  @IsOptional() @IsNumber() @Min(1) @Max(5)
  score?: number;

  @IsOptional() @IsString()
  strengths?: string;

  @IsOptional() @IsString()
  improvements?: string;

  @IsOptional() @IsString()
  goals?: string;
}

export class UpdatePerformanceReviewDto {
  @IsOptional() @IsNumber() @Min(1) @Max(5)
  score?: number;

  @IsOptional() @IsString()
  strengths?: string;

  @IsOptional() @IsString()
  improvements?: string;

  @IsOptional() @IsString()
  goals?: string;

  @IsOptional() @IsString()
  @IsIn(['DRAFT', 'SUBMITTED', 'APPROVED'])
  status?: string;
}

export class FilterPerformanceDto extends PaginationDto {
  @IsOptional() @IsString()
  employeeId?: string;

  @IsOptional() @IsString()
  reviewerId?: string;

  @IsOptional() @IsString()
  period?: string;

  @IsOptional() @IsString()
  status?: string;
}
