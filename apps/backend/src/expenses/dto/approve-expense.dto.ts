import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const APPROVE_STATUSES = ['APPROVED', 'REJECTED'] as const;
type ApproveStatus = 'APPROVED' | 'REJECTED';

export class ApproveExpenseDto {
  @ApiProperty({ enum: APPROVE_STATUSES, description: 'Quyết định duyệt' })
  @IsEnum(APPROVE_STATUSES)
  status: ApproveStatus;

  @ApiPropertyOptional({ description: 'Lý do từ chối (bắt buộc khi REJECTED)' })
  @IsOptional()
  @IsString()
  rejectedReason?: string;
}
