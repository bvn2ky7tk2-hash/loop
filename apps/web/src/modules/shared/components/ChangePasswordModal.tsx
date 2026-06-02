import { Form, Input, Modal, App } from 'antd';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '../api/auth';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ChangePasswordModal({ open, onClose }: Props) {
  const { message } = App.useApp();
  const [form] = Form.useForm();

  const mutation = useMutation({
    mutationFn: ({ oldPassword, newPassword }: { oldPassword: string; newPassword: string }) =>
      authApi.changePassword(oldPassword, newPassword),
    onSuccess: () => {
      message.success('Đổi mật khẩu thành công');
      form.resetFields();
      onClose();
    },
    onError: () => {
      message.error('Mật khẩu cũ không đúng hoặc có lỗi xảy ra');
    },
  });

  const handleOk = () => form.submit();

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      open={open}
      title="Đổi mật khẩu"
      okText="Lưu"
      cancelText="Hủy"
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={mutation.isPending}
      width={420}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={(v) => mutation.mutate({ oldPassword: v.oldPassword, newPassword: v.newPassword })}
        style={{ marginTop: 12 }}
      >
        <Form.Item
          name="oldPassword"
          label="Mật khẩu hiện tại"
          rules={[{ required: true, message: 'Nhập mật khẩu hiện tại' }]}
        >
          <Input.Password placeholder="Mật khẩu hiện tại" autoComplete="current-password" />
        </Form.Item>
        <Form.Item
          name="newPassword"
          label="Mật khẩu mới"
          rules={[
            { required: true, message: 'Nhập mật khẩu mới' },
            { min: 6, message: 'Tối thiểu 6 ký tự' },
          ]}
        >
          <Input.Password placeholder="Mật khẩu mới (tối thiểu 6 ký tự)" autoComplete="new-password" />
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
          <Input.Password placeholder="Nhập lại mật khẩu mới" autoComplete="new-password" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
