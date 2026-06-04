import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsStrongPassword } from '../../common/validators/strong-password.decorator';

export class ChangePasswordSelfDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  oldPassword: string;

  @ApiProperty()
  @IsStrongPassword()
  newPassword: string;
}
