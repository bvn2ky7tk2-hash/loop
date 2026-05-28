import { IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export type ImportTemplate = 'employees' | 'assets' | 'jobs';

export class ImportPreviewDto {
  @ApiProperty({ enum: ['employees', 'assets', 'jobs'] })
  @IsString()
  @IsIn(['employees', 'assets', 'jobs'])
  template: ImportTemplate;
}

export class ImportCommitDto {
  @ApiProperty({ enum: ['employees', 'assets', 'jobs'] })
  @IsString()
  @IsIn(['employees', 'assets', 'jobs'])
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
