// frontend/vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// 后端地址：本地默认 localhost:8000，容器内可用 backend:8000
const BACKEND = process.env.VITE_BACKEND || 'http://localhost:8000'

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      react: resolve(__dirname, 'node_modules/react'),
      'react-dom': resolve(__dirname, 'node_modules/react-dom'),
    },
    dedupe: ['react', 'react-dom'],
  },

  server: {
    host: true,            // 0.0.0.0，方便 Docker / 局域网访问
    proxy: {
      '/nodes': { target: BACKEND, changeOrigin: true },
      '/cards': { target: BACKEND, changeOrigin: true },
      '/ask':   { target: BACKEND, changeOrigin: true },
      '/api/v1': { target: BACKEND, changeOrigin: true },
      '/sessions': { target: BACKEND, changeOrigin: true },
    },
  },
})
