import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class KickoffWizardDto {
  @ApiProperty({ description: 'ID người dùng làm Project Manager' })
  @IsString()
  @IsNotEmpty()
  pmUserId!: string;

  @ApiProperty({ description: 'Ngày khởi động dự án (YYYY-MM-DD)' })
  @IsDateString()
  startDate!: string;

  @ApiPropertyOptional({ description: 'Tên template BPM nếu có' })
  @IsOptional()
  @IsString()
  templateName?: string;

  @ApiPropertyOptional({ description: 'Email khách hàng nhận thông báo qua portal' })
  @IsOptional()
  @IsEmail()
  portalEmail?: string;
}
