import { IsEnum, IsOptional, IsString } from 'class-validator';

export class ApproveBugDto {
  @IsEnum(['APPROVED', 'REJECTED'])
  decision: 'APPROVED' | 'REJECTED';

  @IsOptional()
  @IsString()
  note?: string;
}
