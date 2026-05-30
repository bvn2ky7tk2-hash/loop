import {
  IsString, IsNotEmpty, IsOptional, IsArray,
  IsDateString, MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateJournalDto {
  @ApiProperty({ description: 'Ngày nhật ký (YYYY-MM-DD)' })
  @IsDateString()
  date: string;

  @ApiProperty({ description: 'Tiêu đề buổi họp/ngày' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  title: string;

  @ApiPropertyOptional({ description: 'Thời gian bắt đầu (HH:mm)' })
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiPropertyOptional({ description: 'Thời gian kết thúc (HH:mm)' })
  @IsOptional()
  @IsString()
  endTime?: string;

  @ApiPropertyOptional({ description: 'Địa điểm họp' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  location?: string;

  @ApiPropertyOptional({ description: 'Danh sách người tham dự' })
  @IsOptional()
  @IsArray()
  participants?: string[];

  @ApiProperty({ description: 'Nội dung nhật ký' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({ description: 'Danh sách vấn đề đã chốt (JSON array)' })
  @IsOptional()
  @IsArray()
  resolvedItems?: Array<{ id: string; text: string; status?: string }>;

  @ApiPropertyOptional({ description: 'Danh sách vấn đề chưa chốt (JSON array)' })
  @IsOptional()
  @IsArray()
  unresolvedItems?: Array<{ id: string; text: string; status?: string }>;

  @ApiPropertyOptional({ description: 'File đính kèm' })
  @IsOptional()
  attachments?: any;
}

export class UpdateJournalDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  participants?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  resolvedItems?: Array<{ id: string; text: string; status?: string }>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  unresolvedItems?: Array<{ id: string; text: string; status?: string }>;

  @ApiPropertyOptional()
  @IsOptional()
  attachments?: any;
}

export class ConvertToTaskDto {
  @ApiProperty({ description: 'Tiêu đề task mới' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  taskTitle: string;

  @ApiPropertyOptional({ description: 'ID nhân viên được giao task' })
  @IsOptional()
  @IsString()
  assigneeId?: string;
}
