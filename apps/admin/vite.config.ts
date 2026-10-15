import { fileURLToPath, URL } from 'node:url';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [vue()],
  // workspace 共享包不预构建，改动后重新 build 即可生效，无需清 Vite 缓存
  optimizeDeps: { exclude: ['@luoji/shared'] },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5173,
    proxy: {
      '/admin/v1': 'http://localhost:3000',
    },
  },
});
