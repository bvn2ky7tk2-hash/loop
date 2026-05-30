import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsArray, MaxLength, IsDateString, IsIn } from 'class-validator';

export class CreatePortalDto {
  @IsString() @IsNotEmpty() @MaxLength(200)
  name: string;

  @IsString() @IsNotEmpty()
  customerId: string;

  @IsOptional() @IsArray() @IsString({ each: true })
  allowedContractIds?: string[];

  @IsOptional() @IsBoolean()
  isActive?: boolean;

  @IsOptional() @IsDateString()
  expiresAt?: string;

  @IsOptional() @IsString() @MaxLength(1000)
  welcomeMessage?: string;
}

export class UpdatePortalDto {
  @IsOptional() @IsString() @MaxLength(200)
  name?: string;

  @IsOptional() @IsArray() @IsString({ each: true })
  allowedContractIds?: string[];

  @IsOptional() @IsBoolean()
  isActive?: boolean;

  @IsOptional() @IsDateString()
  expiresAt?: string;

  @IsOptional() @IsString() @MaxLength(1000)
  welcomeMessage?: string;
}

export class SubmitTicketDto {
  @IsString() @IsNotEmpty() @MaxLength(300)
  title: string;

  @IsString() @IsNotEmpty()
  description: string;

  @IsOptional() @IsString() @IsIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
  priority?: string;

  @IsOptional() @IsString() @MaxLength(100)
  submittedBy?: string;
}

export class RespondTicketDto {
  @IsOptional() @IsString() @IsIn(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'])
  status?: string;

  @IsOptional() @IsString() @MaxLength(2000)
  response?: string;
}

export class LinkTicketToIssueDto {
  @IsString() @IsNotEmpty() @MaxLength(300)
  issueTitle: string;

  @IsString() @IsNotEmpty()
  issueDescription: string;

  @IsOptional() @IsString() @IsIn(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'])
  priority?: string;

  /** projectId để gắn bug/issue — nếu không truyền sẽ tự resolve từ customer */
  @IsOptional() @IsString()
  projectId?: string;

  /** userId của người thực hiện link (reporter) */
  @IsString() @IsNotEmpty()
  reporterId: string;
}

/** E22.1 — Tạo Bug từ CustomerTicket */
export class CreateBugFromTicketDto {
  @IsString() @IsNotEmpty()
  projectId: string;
}
