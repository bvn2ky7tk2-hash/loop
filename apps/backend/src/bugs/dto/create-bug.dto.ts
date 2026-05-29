import { IsString, IsNotEmpty, IsOptional, IsEnum, IsArray, IsUUID, IsBoolean, IsDateString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { BugSeverity, BugItemType } from '../../generated/prisma';

export class CreateBugDto {
  @IsUUID()
  projectId: string;

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  taskIds?: string[];

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(BugSeverity)
  severity?: BugSeverity;

  @IsOptional()
  @IsUUID()
  assigneeId?: string;

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
  @IsUUID()
  reporterId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
