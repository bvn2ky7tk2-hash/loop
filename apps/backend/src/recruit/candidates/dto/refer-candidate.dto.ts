import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, IsNotEmpty, IsUUID, MaxLength } from 'class-validator';

// Self-service: nhân viên giới thiệu ứng viên. KHÔNG cần quyền recruit.
export class ReferCandidateDto {
  @ApiProperty({ example: 'Nguyễn Văn A' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional({ example: 'nguyenvana@email.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '0901234567' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiProperty({ description: 'Vị trí tuyển dụng muốn giới thiệu vào' })
  @IsUUID()
  jobOpeningId!: string;

  @ApiPropertyOptional({ description: 'Ghi chú / lý do giới thiệu' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
