import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/api': path.resolve(__dirname, './src/api'),
      '@/config': path.resolve(__dirname, './src/config'),
    },
  },
  optimizeDeps: {
    include: ['@loop/shared'],
  },
  build: {
    rollupOptions: {
      output: {
        // Tách vendor để tận dụng cache trình duyệt + giảm kích thước chunk chính.
        // Dùng dạng hàm (kiểm tra '/recharts/' trước '/react' để tránh trùng chuỗi).
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('/recharts/')) return 'charts';
          if (id.includes('/antd/') || id.includes('/@ant-design/')) return 'antd';
          if (id.includes('/@tanstack/') || id.includes('/axios/')) return 'query';
          if (id.includes('/react') || id.includes('/scheduler/')) return 'react';
          return undefined;
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        timeout: 30_000,
        proxyTimeout: 30_000,
        // Khi backend đang restart (watch mode) hoặc chưa sẵn sàng, trả 503 rõ ràng
        // kèm thông báo thay vì 502 thô khó hiểu — tránh nhầm là lỗi ứng dụng.
        configure: (proxy) => {
          proxy.on('error', (err, _req, res) => {
            const r = res as import('http').ServerResponse;
            if (r && !r.headersSent && typeof r.writeHead === 'function') {
              r.writeHead(503, { 'Content-Type': 'application/json' });
              r.end(JSON.stringify({
                statusCode: 503,
                message: 'Backend đang khởi động lại, vui lòng thử lại sau giây lát',
                detail: err.message,
              }));
            }
          });
        },
      },
    },
  },
});
