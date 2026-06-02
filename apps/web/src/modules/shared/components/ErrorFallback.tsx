import { Button, Result } from 'antd';
import { useThemePalette } from '../hooks/useThemePalette';

interface Props {
  error?: Error;
  resetError?: () => void;
}

export const ErrorFallback: React.FC<Props> = ({ error, resetError }) => {
  const { bgContainer } = useThemePalette();
  return (
    <div
      style={{
        minHeight: '100vh',
        background: bgContainer,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Result
        status="error"
        title="Đã xảy ra lỗi"
        subTitle={error?.message ?? 'Vui lòng thử lại hoặc liên hệ hỗ trợ'}
        extra={
          <Button type="primary" onClick={resetError}>
            Thử lại
          </Button>
        }
      />
    </div>
  );
};
