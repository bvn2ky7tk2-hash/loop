import { IsOptional, IsString, IsDateString } from 'class-validator';

export class GanttQueryDto {
  @IsOptional()
  @IsString()
  date?: string; // YYYY-MM-DD
}

export class AvailableRoomsQueryDto {
  @IsDateString()
  startTime: string;

  @IsDateString()
  endTime: string;
}
