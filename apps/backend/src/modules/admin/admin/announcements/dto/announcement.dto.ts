import { IsString, IsNotEmpty, IsOptional, IsIn, IsDateString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAnnouncementDto {
  @ApiProperty({ description: 'Nội dung thông báo', maxLength: 1000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  message: string;

  @ApiPropertyOptional({ enum: ['INFO', 'WARNING', 'CRITICAL'], default: 'INFO' })
  @IsOptional()
  @IsIn(['INFO', 'WARNING', 'CRITICAL'])
  type?: string = 'INFO';

  @ApiPropertyOptional({ description: 'Role đích (null = tất cả)' })
  @IsOptional()
  @IsString()
  targetRole?: string;

  @ApiProperty({ description: 'Thời gian bắt đầu hiển thị' })
  @IsDateString()
  startAt: string;

  @ApiPropertyOptional({ description: 'Thời gian kết thúc (null = không giới hạn)' })
  @IsOptional()
  @IsDateString()
  endAt?: string;
}

export class UpdateAnnouncementDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  message?: string;

  @ApiPropertyOptional({ enum: ['INFO', 'WARNING', 'CRITICAL'] })
  @IsOptional()
  @IsIn(['INFO', 'WARNING', 'CRITICAL'])
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  targetRole?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endAt?: string;
}
