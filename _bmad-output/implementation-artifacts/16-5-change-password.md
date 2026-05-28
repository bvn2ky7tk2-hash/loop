# Story 16.5: Change Password Feature

Status: ready

## Story

As a user,
I want to change my own password from the topbar user menu,
So that I can update my credentials without asking an admin.

## Acceptance Criteria

1. Backend: Endpoint mới `POST /auth/change-password` — yêu cầu JWT auth (tất cả user đều dùng được, không chỉ admin).
2. Backend: Request body gồm `oldPassword: string` (min 6 chars) + `newPassword: string` (min 6 chars).
3. Backend: Nếu `oldPassword` sai → trả `400 Bad Request` với message `'Mật khẩu cũ không đúng'`.
4. Backend: Khi đổi thành công → invalidate `refreshToken` của user (force logout trên các thiết bị khác) → trả `{ message: 'Đổi mật khẩu thành công' }`.
5. Frontend: User menu trong `AppTopbar` có thêm item "Đổi mật khẩu" — icon `KeyOutlined`, đặt trước divider Sign Out.
6. Frontend: Click "Đổi mật khẩu" mở `ChangePasswordModal` — form gồm 3 field: Mật khẩu hiện tại, Mật khẩu mới, Xác nhận mật khẩu mới.
7. Frontend: Validate client-side — Mật khẩu mới phải ≥ 6 ký tự, Xác nhận phải khớp Mật khẩu mới.
8. Frontend: Success → đóng modal + toast `'Đổi mật khẩu thành công'`.
9. Frontend: Error (mật khẩu cũ sai) → hiển thị lỗi trên field "Mật khẩu hiện tại" — không đóng modal.
10. `ChangePasswordDto` có `@MinLength(6)` validator trên cả hai fields.
11. TypeScript compile backend và frontend không lỗi.

## Tasks / Subtasks

- [ ] Task 1: Tạo `ChangePasswordSelfDto` trong `apps/backend/src/auth/dto/` (AC: 2, 10)
  - [ ] Tạo file `change-password-self.dto.ts` với `oldPassword` và `newPassword` — cả hai `@IsString() @MinLength(6)`

- [ ] Task 2: Thêm method `changePasswordSelf` vào `AuthService` (AC: 3, 4)
  - [ ] Tìm user theo `id` (từ JWT payload)
  - [ ] `bcrypt.compare(oldPassword, user.passwordHash)` — nếu false → throw `BadRequestException('Mật khẩu cũ không đúng')`
  - [ ] `bcrypt.hash(newPassword, BCRYPT_ROUNDS)` → update `passwordHash` + set `refreshToken = null`
  - [ ] Return `{ message: 'Đổi mật khẩu thành công' }`

- [ ] Task 3: Thêm endpoint `POST /auth/change-password` vào `AuthController` (AC: 1)
  - [ ] `@Post('change-password')` — không có `@Public()` (yêu cầu JWT)
  - [ ] Inject `user.id` từ `@Request() req` (JWT payload)
  - [ ] Gọi `authService.changePasswordSelf(req.user.id, dto)`

- [ ] Task 4: Tạo `ChangePasswordModal` component trong `apps/web/src/components/` (AC: 6, 7, 8, 9)
  - [ ] Tạo `apps/web/src/components/ChangePasswordModal.tsx`
  - [ ] Form 3 field theo spec
  - [ ] Mutation gọi `POST /auth/change-password`
  - [ ] Handle success và error theo AC

- [ ] Task 5: Thêm API method `changePassword` vào `apps/web/src/api/auth.ts` (AC: 6)
  - [ ] `changePassword: (data: { oldPassword: string; newPassword: string }) => apiClient.post('/auth/change-password', data)`

- [ ] Task 6: Thêm menu item + wire modal vào `AppTopbar.tsx` (AC: 5)
  - [ ] Import `KeyOutlined` từ `@ant-design/icons`
  - [ ] Import `ChangePasswordModal`
  - [ ] Thêm state `const [changePwOpen, setChangePwOpen] = useState(false)`
  - [ ] Thêm item `{ key: 'change-password', icon: <KeyOutlined />, label: 'Đổi mật khẩu', onClick: () => setChangePwOpen(true) }` vào `userMenuItems` — trước divider
  - [ ] Render `<ChangePasswordModal open={changePwOpen} onClose={() => setChangePwOpen(false)} />`

- [ ] Task 7: Verify TypeScript compile (AC: 11)
  - [ ] `cd apps/backend && npx tsc --noEmit`
  - [ ] `cd apps/web && npx tsc --noEmit`

## Dev Notes

### Backend — `change-password-self.dto.ts`

```typescript
import { IsString, MinLength } from 'class-validator';

export class ChangePasswordSelfDto {
  @IsString()
  @MinLength(6)
  oldPassword: string;

  @IsString()
  @MinLength(6)
  newPassword: string;
}
```

### Backend — Method trong `AuthService`

```typescript
async changePasswordSelf(userId: string, dto: ChangePasswordSelfDto) {
  const user = await this.prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundException('Không tìm thấy người dùng');

  const valid = await bcrypt.compare(dto.oldPassword, user.passwordHash);
  if (!valid) throw new BadRequestException('Mật khẩu cũ không đúng');

  const passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);
  await this.prisma.user.update({
    where: { id: userId },
    data: { passwordHash, refreshToken: null },
  });

  return { message: 'Đổi mật khẩu thành công' };
}
```

### Backend — Endpoint trong `AuthController`

```typescript
@Post('change-password')
@ApiOperation({ summary: 'Đổi mật khẩu tài khoản hiện tại' })
changePasswordSelf(@Request() req, @Body() dto: ChangePasswordSelfDto) {
  return this.authService.changePasswordSelf(req.user.id, dto);
}
```

> **Quan trọng:** Không thêm `@Public()` — endpoint này yêu cầu JWT. `JwtAuthGuard` global đã apply.

> **Tại sao tạo DTO mới thay vì dùng `ChangePasswordDto` có sẵn?**  
> `ChangePasswordDto` hiện tại ở `users/dto/` chỉ có `newPassword` (dành cho admin reset). Tính năng này cần thêm `oldPassword` để verify — khác use case, cần DTO riêng.

### Frontend — `ChangePasswordModal.tsx`

```tsx
import { Modal, Form, Input, App } from 'antd';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '../api/auth';
import { useThemeStore } from '../store/theme.store';

interface Props { open: boolean; onClose: () => void; }

export function ChangePasswordModal({ open, onClose }: Props) {
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const isDark = useThemeStore((s) => s.mode === 'dark');

  const mut = useMutation({
    mutationFn: authApi.changePassword,
    onSuccess: () => {
      message.success('Đổi mật khẩu thành công');
      form.resetFields();
      onClose();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Đổi mật khẩu thất bại';
      if (msg.includes('Mật khẩu cũ')) {
        form.setFields([{ name: 'oldPassword', errors: [msg] }]);
      } else {
        message.error(msg);
      }
    },
  });

  const handleFinish = (values: { oldPassword: string; newPassword: string }) => {
    mut.mutate({ oldPassword: values.oldPassword, newPassword: values.newPassword });
  };

  return (
    <Modal
      open={open}
      title="Đổi mật khẩu"
      okText="Cập nhật"
      cancelText="Hủy"
      onCancel={() => { form.resetFields(); onClose(); }}
      onOk={() => form.submit()}
      confirmLoading={mut.isPending}
      width={420}
    >
      <Form form={form} layout="vertical" onFinish={handleFinish} style={{ marginTop: 12 }}>
        <Form.Item
          name="oldPassword"
          label="Mật khẩu hiện tại"
          rules={[{ required: true, message: 'Nhập mật khẩu hiện tại' }]}
        >
          <Input.Password placeholder="Mật khẩu hiện tại" />
        </Form.Item>
        <Form.Item
          name="newPassword"
          label="Mật khẩu mới"
          rules={[
            { required: true, message: 'Nhập mật khẩu mới' },
            { min: 6, message: 'Mật khẩu tối thiểu 6 ký tự' },
          ]}
        >
          <Input.Password placeholder="Tối thiểu 6 ký tự" />
        </Form.Item>
        <Form.Item
          name="confirmPassword"
          label="Xác nhận mật khẩu mới"
          dependencies={['newPassword']}
          rules={[
            { required: true, message: 'Xác nhận mật khẩu mới' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('newPassword') === value) return Promise.resolve();
                return Promise.reject(new Error('Mật khẩu xác nhận không khớp'));
              },
            }),
          ]}
        >
          <Input.Password placeholder="Nhập lại mật khẩu mới" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
```

### Frontend — Thêm vào `auth.ts`

```typescript
changePassword: (data: { oldPassword: string; newPassword: string }) =>
  apiClient.post<{ data: { message: string } }>('/auth/change-password', data).then((r) => r.data.data),
```

### Thứ tự menu items trong userMenu sau story này

```
[Tên user]
[Email]
[Role]
─────────────────
[🔑] Đổi mật khẩu
─────────────────
[→] Đăng xuất       ← đỏ, danger
```

### References

- `apps/backend/src/auth/auth.controller.ts`
- `apps/backend/src/auth/auth.service.ts`
- `apps/backend/src/users/dto/change-password.dto.ts` — DTO admin (không sửa)
- `apps/web/src/components/layout/AppTopbar.tsx`
- `apps/web/src/api/auth.ts`
