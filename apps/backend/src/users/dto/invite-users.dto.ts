import { IsArray, IsEmail, IsEnum, IsOptional, IsUUID, ArrayMaxSize } from 'class-validator';
import { Role } from '../../generated/prisma';

export class InviteUsersDto {
  @IsArray()
  @ArrayMaxSize(200)
  @IsEmail({}, { each: true })
  emails: string[];

  @IsEnum(Role)
  role: Role;

  @IsOptional()
  @IsUUID()
  orgUnitId?: string;
}
