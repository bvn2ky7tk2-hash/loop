import { IsEnum, IsOptional, IsNumber, IsBoolean, Min } from 'class-validator';
import { NotificationType } from '../../generated/prisma';

export class CreateAlertDto {
  @IsEnum(NotificationType)
  type: NotificationType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  threshold?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  daysBeforeDue?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
