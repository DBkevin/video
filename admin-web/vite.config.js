import { defineConfig } from 'vite'

export default defineConfig({
  // 管理后台默认挂在站点的 /admin/ 子路径下，
  // 这样构建后的资源地址会是 /admin/assets/*，避免被解析到根路径 /assets/*。
  base: process.env.VITE_PUBLIC_BASE || '/admin/',
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_PROXY_TARGET || 'http://127.0.0.1:8080',
        changeOrigin: true
      }
    }
  }
})
