import { IsString, IsNotEmpty, IsOptional, IsIn, IsNumber, Min, Max } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class SuggestFromReviewDto {
  @IsString() @IsNotEmpty()
  reviewId: string;

  @IsString() @IsNotEmpty()
  employeeId: string;

  @IsNumber() @Min(1) @Max(10)
  score: number;
}

export class ApproveReviewDto {
  @IsString() @IsNotEmpty()
  approverId: string;
}

export class FilterSalaryReviewDto extends PaginationDto {
  @IsOptional() @IsString()
  employeeId?: string;

  @IsOptional() @IsString()
  @IsIn(['PENDING', 'APPROVED', 'REJECTED', 'APPLIED'])
  status?: string;
}
