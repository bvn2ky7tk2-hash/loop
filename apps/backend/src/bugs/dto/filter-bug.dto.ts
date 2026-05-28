import { IsOptional, IsEnum, IsUUID, IsInt, Min, IsDateString, IsBoolean, IsString } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { BugSeverity, BugStatus, BugItemType } from '../../generated/prisma';

export class FilterBugDto {
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @IsEnum(BugStatus, { each: true })
  status?: BugStatus | BugStatus[];

  @IsOptional()
  @IsEnum(BugSeverity, { each: true })
  severity?: BugSeverity | BugSeverity[];

  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @IsOptional()
  @IsUUID()
  reporterId?: string;

  @IsOptional()
  @IsDateString()
  createdFrom?: string;

  @IsOptional()
  @IsDateString()
  createdTo?: string;

  @IsOptional()
  @IsEnum(BugItemType)
  itemType?: BugItemType;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isCR?: boolean;

  @IsOptional()
  @IsString()
  requesterName?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  overdue?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number = 20;
}
