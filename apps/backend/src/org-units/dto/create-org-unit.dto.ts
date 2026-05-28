import { IsString, IsOptional, IsUUID, MinLength, MaxLength, Matches } from 'class-validator';

export class CreateOrgUnitDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @IsString()
  @MinLength(2)
  @MaxLength(20)
  @Matches(/^[A-Z0-9_-]+$/, { message: 'Code chỉ được dùng chữ hoa, số, gạch ngang, gạch dưới' })
  code: string;

  @IsOptional()
  @IsUUID()
  parentId?: string;
}
