import { applyDecorators } from '@nestjs/common';
import { IsString, MaxLength, MinLength, Matches } from 'class-validator';

/**
 * Chính sách mật khẩu cho mọi luồng ĐẶT mật khẩu mới (tạo user, đổi mật khẩu,
 * cấp admin tenant). KHÔNG áp cho login/oldPassword (mật khẩu cũ có thể là legacy).
 * Yêu cầu: ≥8 ký tự, có cả chữ và số.
 */
export function IsStrongPassword(): PropertyDecorator {
  return applyDecorators(
    IsString(),
    MinLength(8, { message: 'Mật khẩu phải có tối thiểu 8 ký tự' }),
    MaxLength(128, { message: 'Mật khẩu tối đa 128 ký tự' }),
    Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, { message: 'Mật khẩu phải gồm cả chữ và số' }),
  );
}
