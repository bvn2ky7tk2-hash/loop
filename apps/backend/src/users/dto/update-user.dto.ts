import { IsEmail, IsEnum, IsOptional, IsString, IsUUID, IsBoolean } from 'class-validator';
import { Role } from '../../generated/prisma';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @IsUUID()
  orgUnitId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
