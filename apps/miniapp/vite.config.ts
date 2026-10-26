import uni from '@dcloudio/vite-plugin-uni';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());
  if (process.env.UNI_PLATFORM === 'mp-weixin' && !env.VITE_API_BASE && env.VITE_DEMO !== 'true') {
    console.warn(`\n⚠ 未设置 VITE_API_BASE（mode=${mode}），小程序将无法请求后端。请创建 .env.${mode}（参考 .env.example）\n`);
  }
  return {
    plugins: [
      uni(),
      // 演示版页面标题加后缀，便于和正式环境区分
      ...(mode === 'demo'
        ? [{ name: 'demo-title', transformIndexHtml: (html: string) => html.replace('<title>逻辑解剖</title>', '<title>逻辑解剖 · 演示版</title>') }]
        : []),
      // 非演示构建把演示后端换成空实现，正式包里不带演示数据（在 load 阶段替换，避开 uni 自带的 @ 别名解析）
      ...(env.VITE_DEMO === 'true'
        ? []
        : [
            {
              name: 'demo-stub',
              enforce: 'pre' as const,
              load: (id: string) => (/[\\/]src[\\/]demo[\\/]mock\.ts$/.test(id) ? readFileSync(fileURLToPath(new URL('./src/demo/stub.ts', import.meta.url)), 'utf8') : null),
            },
          ]),
    ],
    // 演示版发布在任意路径下，资源用相对路径
    ...(mode === 'demo' ? { base: './' } : {}),
    // workspace 共享包不预构建，改动后重新 build 即可生效，无需清 Vite 缓存
    optimizeDeps: { exclude: ['@luoji/shared'] },
    server: {
      // H5 调试时代理到本地后端
      proxy: { '/api/v1': 'http://localhost:3000' },
    },
  };
});
