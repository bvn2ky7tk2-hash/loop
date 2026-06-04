import { IsStrongPassword } from '../../common/validators/strong-password.decorator';

export class ChangePasswordDto {
  @IsStrongPassword()
  newPassword: string;
}
