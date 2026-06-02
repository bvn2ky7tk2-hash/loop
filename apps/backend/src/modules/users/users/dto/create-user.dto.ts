import { IsEmail, IsString, IsEnum, IsUUID, IsOptional, MinLength } from 'class-validator';
import { Role } from '../../generated/prisma';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(1)
  name: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsEnum(Role)
  role: Role;

  @IsUUID()
  orgUnitId: string;

  @IsOptional()
  @IsUUID()
  employeeId?: string;
}
