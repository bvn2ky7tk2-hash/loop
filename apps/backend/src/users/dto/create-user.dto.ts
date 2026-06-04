import { IsEmail, IsString, IsEnum, IsUUID, IsOptional, MinLength } from 'class-validator';
import { Role } from '../../generated/prisma';
import { IsStrongPassword } from '../../common/validators/strong-password.decorator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(1)
  name: string;

  @IsStrongPassword()
  password: string;

  @IsEnum(Role)
  role: Role;

  @IsUUID()
  orgUnitId: string;

  @IsOptional()
  @IsUUID()
  employeeId?: string;
}
