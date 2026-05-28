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

  @ApiPropertyOptional({ description: 'Per-step config (assignee + notification): { [activityId]: StepConfigItemDto }' })
  @IsOptional()
  stepConfig?: Record<string, StepConfigItemDto>;

  @ApiPropertyOptional({ description: 'Unique key để reference process (e.g. leave-approval, expense-approval)' })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: 'key chỉ được chứa a-z, 0-9, dấu gạch ngang' })
  @MaxLength(100)
  key?: string;
}

// ─── Step Config ─────────────────────────────────────────────────────────────

export type AssigneeMode = 'fixed' | 'orgunit' | 'requester_manager' | 'variable';
export type SystemRole = 'ADMIN' | 'PM' | 'MEMBER' | 'LEADERSHIP';

export class AssigneeConfigDto {
  mode: AssigneeMode;
  // mode=fixed
  userId?: string;
  // mode=orgunit
  orgUnitId?: string;
  role?: SystemRole;          // filter theo system role trong orgUnit
  // mode=variable
  variablePath?: string;      // tên biến trong instance.variables
}

export class NotificationTriggerDto {
  enabled: boolean;
  // Người nhận: 'assignee' | 'requester' | 'requester_manager' | 'user:{id}' | '{{variables.X}}'
  recipients: string[];
  subject: string;            // template với {{process.name}}, {{task.name}}, ...
  bodyTemplate: string;       // template HTML/text
}

export class StepNotificationConfigDto {
  taskAssigned?: NotificationTriggerDto;
  taskCompleted?: NotificationTriggerDto;
}

export class StepConfigItemDto {
  assigneeConfig?: AssigneeConfigDto;
  notificationConfig?: StepNotificationConfigDto;
}

// ─── Form Fields ─────────────────────────────────────────────────────────────

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
