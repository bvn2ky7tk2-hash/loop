import { IsString, IsBoolean, IsArray, IsOptional } from 'class-validator';

export class SetRolePermissionsDto {
  @IsArray()
  @IsString({ each: true })
  codes: string[];
}

export class UpsertUserPermissionDto {
  @IsString()
  permissionCode: string;

  @IsBoolean()
  granted: boolean;
}

export class AssignModuleRoleDto {
  @IsString()
  roleCode: string;
}

export class CreateModuleRoleDto {
  @IsString()
  code: string;

  @IsString()
  name: string;

  @IsString()
  domain: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class SetModuleRolePermissionsDto {
  @IsArray()
  @IsString({ each: true })
  codes: string[];
}
