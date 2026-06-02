import {
  IsUUID,
  IsNumber,
  IsDateString,
  IsOptional,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSalaryRecordDto {
  @IsUUID()
  employeeId: string;

  @Type(() => Number) @IsNumber()
  basicSalary: number;

  @IsDateString()
  effectiveDate: string;

  @IsOptional() @IsString()
  source?: string;

  @IsOptional() @IsUUID()
  hrDecisionId?: string;

  @IsOptional() @IsString()
  note?: string;
}
