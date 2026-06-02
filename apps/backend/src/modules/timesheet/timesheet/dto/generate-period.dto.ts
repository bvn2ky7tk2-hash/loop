import { IsDateString, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GeneratePeriodDto {
  @ApiProperty({ example: '2026-05-01' })
  @IsDateString()
  periodStart: string;

  @ApiProperty({ example: '2026-05-31' })
  @IsDateString()
  periodEnd: string;

  @ApiPropertyOptional({ description: 'Generate for specific user (HR only). Defaults to caller.' })
  @IsOptional()
  @IsString()
  userId?: string;
}

export class SubmitTimesheetDto {
  // intentionally empty — body not needed, ID comes from param
}

export class RejectTimesheetDto {
  @ApiProperty({ example: 'Thiếu ngày công 15/05' })
  @IsString()
  reason: string;
}
