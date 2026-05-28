import { IsString, IsOptional, MinLength, IsArray, Matches, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { FormFieldDto } from './create-definition.dto';

export class UpdateDefinitionDto {
  @ApiPropertyOptional({ description: 'Tên process definition' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @ApiPropertyOptional({ description: 'Mô tả' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'BPMN XML content' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  bpmnXml?: string;

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
