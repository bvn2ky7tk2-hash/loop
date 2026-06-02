import { IsOptional, IsUUID } from 'class-validator';

export class AssignBugDto {
  @IsOptional()
  @IsUUID()
  assigneeId?: string;
}
