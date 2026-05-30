import {
  IsUUID,
  IsArray,
  IsString,
  IsNotEmpty,
  ArrayMinSize,
  IsOptional,
  IsDateString,
  MaxLength,
} from 'class-validator';

export class CreateDelegationDto {
  @IsUUID()
  delegateId: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  moduleTypes: string[];

  /** ISO date string YYYY-MM-DD */
  @IsDateString()
  startDate: string;

  /** ISO date string YYYY-MM-DD */
  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
