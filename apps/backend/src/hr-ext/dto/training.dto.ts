import { IsString, IsNotEmpty, IsInt, Min, IsOptional, IsDateString, IsIn, MaxLength, IsNumber, Max } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class CreateTrainingProgramDto {
  @IsString() @IsNotEmpty() @MaxLength(200)
  title: string;

  @IsString() @IsNotEmpty() @IsIn(['internal', 'external'])
  type: string;

  @IsInt() @Min(1)
  durationHours: number;

  @IsOptional() @IsString()
  description?: string;
}

export class CreateTrainingRecordDto {
  @IsString() @IsNotEmpty()
  programId: string;

  @IsString() @IsNotEmpty()
  employeeId: string;

  @IsDateString()
  startDate: string;

  @IsOptional() @IsDateString()
  endDate?: string;

  @IsOptional() @IsString()
  @IsIn(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'])
  status?: string;

  @IsOptional() @IsNumber() @Min(0) @Max(100)
  score?: number;

  @IsOptional() @IsString()
  notes?: string;
}

export class FilterTrainingDto extends PaginationDto {
  @IsOptional() @IsString()
  employeeId?: string;

  @IsOptional() @IsString()
  programId?: string;

  @IsOptional() @IsString()
  status?: string;
}
