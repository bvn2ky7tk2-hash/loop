import { IsString, IsOptional, IsEnum, IsArray, IsBoolean, IsDateString, IsInt, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { BugSeverity, BugItemType } from '../../generated/prisma';

export class UpdateBugDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(BugSeverity)
  severity?: BugSeverity;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  taskIds?: string[];

  @IsOptional()
  @IsUUID()
  assigneeId?: string | null;

  @IsOptional()
  @IsEnum(BugItemType)
  itemType?: BugItemType;

  @IsOptional()
  @IsBoolean()
  isCR?: boolean;

  @IsOptional()
  @IsString()
  requesterName?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  estimatedHours?: number;

  @IsOptional()
  @IsString()
  affectedModule?: string;

  @IsOptional()
  @IsString()
  resolutionNote?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
