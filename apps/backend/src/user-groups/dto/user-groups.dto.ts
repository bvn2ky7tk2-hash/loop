import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsArray, MaxLength } from 'class-validator';

export class CreateUserGroupDto {
  @IsString() @IsNotEmpty() @MaxLength(100)
  name: string;

  @IsOptional() @IsString() @MaxLength(300)
  description?: string;

  @IsOptional() @IsBoolean()
  isDefault?: boolean;
}

export class UpdateUserGroupDto {
  @IsOptional() @IsString() @MaxLength(100)
  name?: string;

  @IsOptional() @IsString() @MaxLength(300)
  description?: string;

  @IsOptional() @IsBoolean()
  isDefault?: boolean;
}

export class SetGroupPermissionsDto {
  @IsArray() @IsString({ each: true })
  permCodes: string[];
}

export class AddGroupMemberDto {
  @IsString() @IsNotEmpty()
  userId: string;
}

export class SetGroupOrgAccessDto {
  @IsArray()
  orgAccess: { orgUnitId: string; includeChildren: boolean }[];
}
