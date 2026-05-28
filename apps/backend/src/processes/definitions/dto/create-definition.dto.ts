import { IsString, IsOptional, MinLength, IsArray, Matches, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDefinitionDto {
  @ApiProperty({ description: 'Tên process definition' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiPropertyOptional({ description: 'Mô tả' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'BPMN XML content' })
  @IsString()
  @MinLength(1)
  bpmnXml: string;

  @ApiPropertyOptional({ description: 'Form fields schema cho start form' })
  @IsOptional()
  @IsArray()
  formFields?: FormFieldDto[];

  @ApiPropertyOptional({ description: 'Per-task form fields schema: { [activityId]: FormFieldDto[] }' })
  @IsOptional()
  taskFormFields?: Record<string, FormFieldDto[]>;

  @ApiPropertyOptional({ description: 'Unique key để reference process (e.g. leave-approval, expense-approval)' })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: 'key chỉ được chứa a-z, 0-9, dấu gạch ngang' })
  @MaxLength(100)
  key?: string;
}

export class CriterionDto {
  key: string;
  label: string;
  weight: number;
}

export class FormFieldDto {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'textarea' | 'select' | 'criteria_grid';
  required?: boolean;
  placeholder?: string;
  options?: { label: string; value: string }[];
  min?: number;
  max?: number;
  // criteria_grid specific
  criteria?: CriterionDto[];
  scoreMin?: number;
  scoreMax?: number;
}
