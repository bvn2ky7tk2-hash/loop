import { IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export type ImportTemplate = 'employees' | 'assets' | 'jobs' | 'leave_balances' | 'customers' | 'leads';

const ALL_TEMPLATES: ImportTemplate[] = ['employees', 'assets', 'jobs', 'leave_balances', 'customers', 'leads'];

export class ImportPreviewDto {
  @ApiProperty({ enum: ALL_TEMPLATES })
  @IsString()
  @IsIn(ALL_TEMPLATES)
  template: ImportTemplate;
}

export class ImportCommitDto {
  @ApiProperty({ enum: ALL_TEMPLATES })
  @IsString()
  @IsIn(ALL_TEMPLATES)
  template: ImportTemplate;
}

export interface ImportRow {
  [key: string]: string | number | undefined;
}

export interface ImportError {
  row: number;
  message: string;
}

export interface ImportPreviewResult {
  template: ImportTemplate;
  valid: ImportRow[];
  errors: ImportError[];
}
