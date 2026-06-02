import { IsString, IsOptional, IsDateString } from 'class-validator';

export class CreateWorkExperienceDto {
  @IsString()
  companyName: string;

  @IsOptional()
  @IsString()
  position?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateWorkExperienceDto extends CreateWorkExperienceDto {}
