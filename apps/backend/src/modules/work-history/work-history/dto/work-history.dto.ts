import {
  IsUUID,
  IsEnum,
  IsString,
  IsNotEmpty,
  IsDateString,
  IsOptional,
} from 'class-validator';
import { WorkHistoryEventType } from '../../generated/prisma';

export class CreateWorkHistoryDto {
  @IsUUID()
  employeeId: string;

  @IsEnum(WorkHistoryEventType)
  eventType: WorkHistoryEventType;

  @IsDateString()
  eventDate: string;

  @IsString() @IsNotEmpty()
  title: string;

  @IsOptional() @IsString()
  description?: string;
}
