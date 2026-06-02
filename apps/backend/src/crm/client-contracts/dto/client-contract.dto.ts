import {
  IsString, IsOptional, IsEnum, IsDateString, IsNumber, Min,
  IsNotEmpty, MaxLength, IsUUID,
} from 'class-validator';
import { ClientContractType, ClientContractStatus, MilestoneStatus } from '../../../generated/prisma';

export class CreateClientContractDto {
  @IsOptional() @IsString() @MaxLength(50)
  contractNo?: string;

  @IsString() @IsNotEmpty() @MaxLength(200)
  title: string;

  @IsUUID()
  customerId: string;

  @IsOptional() @IsUUID()
  dealId?: string;

  @IsEnum(ClientContractType)
  type: ClientContractType;

  @IsOptional() @IsNumber() @Min(0)
  value?: number;

  @IsOptional() @IsString()
  currency?: string;

  @IsDateString()
  startDate: string;

  @IsOptional() @IsDateString()
  endDate?: string;

  @IsOptional() @IsDateString()
  signedAt?: string;

  @IsOptional() @IsEnum(ClientContractStatus)
  status?: ClientContractStatus;

  @IsOptional() @IsString()
  notes?: string;
}

export class UpdateClientContractDto {
  @IsOptional() @IsString() @MaxLength(50)
  contractNo?: string;

  @IsOptional() @IsString() @MaxLength(200)
  title?: string;

  @IsOptional() @IsEnum(ClientContractType)
  type?: ClientContractType;

  @IsOptional() @IsNumber() @Min(0)
  value?: number;

  @IsOptional() @IsString()
  currency?: string;

  @IsOptional() @IsDateString()
  startDate?: string;

  @IsOptional() @IsDateString()
  endDate?: string;

  @IsOptional() @IsDateString()
  signedAt?: string;

  @IsOptional() @IsEnum(ClientContractStatus)
  status?: ClientContractStatus;

  @IsOptional() @IsString()
  notes?: string;
}

export class CreateMilestoneDto {
  @IsString() @IsNotEmpty() @MaxLength(200)
  name: string;

  @IsDateString()
  dueDate: string;

  @IsNumber() @Min(0)
  amount: number;

  @IsOptional() @IsEnum(MilestoneStatus)
  status?: MilestoneStatus;

  @IsOptional() @IsString()
  notes?: string;
}

export class UpdateMilestoneDto {
  @IsOptional() @IsString() @MaxLength(200)
  name?: string;

  @IsOptional() @IsDateString()
  dueDate?: string;

  @IsOptional() @IsNumber() @Min(0)
  amount?: number;

  @IsOptional() @IsEnum(MilestoneStatus)
  status?: MilestoneStatus;

  @IsOptional() @IsDateString()
  paidAt?: string;

  @IsOptional() @IsString()
  notes?: string;
}
