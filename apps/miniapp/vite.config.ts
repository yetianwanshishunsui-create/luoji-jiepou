import uni from '@dcloudio/vite-plugin-uni';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());
  if (process.env.UNI_PLATFORM === 'mp-weixin' && !env.VITE_API_BASE) {
    console.warn(`\n⚠ 未设置 VITE_API_BASE（mode=${mode}），小程序将无法请求后端。请创建 .env.${mode}（参考 .env.example）\n`);
  }
  return {
    plugins: [uni()],
    // workspace 共享包不预构建，改动后重新 build 即可生效，无需清 Vite 缓存
    optimizeDeps: { exclude: ['@luoji/shared'] },
    server: {
      // H5 调试时代理到本地后端
      proxy: { '/api/v1': 'http://localhost:3000' },
    },
  };
});
