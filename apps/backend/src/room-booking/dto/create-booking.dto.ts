import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsDateString,
  MaxLength,
} from 'class-validator';

export class CreateBookingDto {
  @IsString()
  @IsNotEmpty()
  roomId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  title: string;

  @IsDateString()
  startTime: string;

  @IsDateString()
  endTime: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attendees?: string[];

  @IsOptional()
  @IsString()
  note?: string;
}
