import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/modules': path.resolve(__dirname, './src/modules'),
      '@/shared': path.resolve(__dirname, './src/modules/shared'),
      '@/api': path.resolve(__dirname, './src/api'),
      '@/config': path.resolve(__dirname, './src/config'),
    },
  },
  optimizeDeps: {
    include: ['@loop/shared'],
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
