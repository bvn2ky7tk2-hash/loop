import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsOptional,
  IsNumber,
  IsEnum,
  IsInt,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OtStatus } from '../../generated/prisma';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class CreateOvertimeRequestDto {
  @ApiProperty({ description: 'UUID nhân viên' })
  @IsUUID()
  employeeId: string;

  @ApiProperty({ description: 'Ngày làm thêm (ISO date string, e.g. 2024-05-20)' })
  @IsString()
  @IsNotEmpty()
  date: string;

  @ApiPropertyOptional({ description: 'Giờ bắt đầu (HH:mm)', example: '18:00' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'fromTime phải theo định dạng HH:mm' })
  fromTime?: string;

  @ApiPropertyOptional({ description: 'Giờ kết thúc (HH:mm)', example: '21:00' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'toTime phải theo định dạng HH:mm' })
  toTime?: string;

  @ApiProperty({ description: 'Số giờ làm thêm (0.5–12)', minimum: 0.5, maximum: 12 })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0.5)
  @Max(12)
  hours: number;

  @ApiPropertyOptional({ description: 'Lý do làm thêm' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class ListOtQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Lọc theo nhân viên (UUID)' })
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @ApiPropertyOptional({ description: 'Lọc theo trạng thái', enum: OtStatus })
  @IsOptional()
  @IsEnum(OtStatus)
  status?: OtStatus;

  @ApiPropertyOptional({ description: 'Lọc theo tháng (1–12)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  @ApiPropertyOptional({ description: 'Lọc theo năm (e.g. 2024)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year?: number;
}

export class RejectOtDto {
  @ApiProperty({ description: 'Lý do từ chối' })
  @IsString()
  @IsNotEmpty()
  rejectedReason: string;
}
