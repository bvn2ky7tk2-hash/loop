import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class AssignAssetDto {
  @IsString()
  @IsNotEmpty()
  employeeId: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ReturnAssetDto {
  @IsOptional()
  @IsString()
  notes?: string;
}
