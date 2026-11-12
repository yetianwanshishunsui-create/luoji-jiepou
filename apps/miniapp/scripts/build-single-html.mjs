/**
 * 打包单文件 HTML 演示版：脚本、样式、图片全部内嵌进一个 .html，双击即可在浏览器打开，也方便直接发给别人。
 * 运行：pnpm --filter @luoji/miniapp build:demo-html
 * 产物：apps/miniapp/dist/逻辑解剖演示版.html
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'dist/build/h5');

// 1. 演示模式构建，所有页面打进一个脚本（见 vite.config.ts 的 demo-single-file）
execFileSync('npx', ['uni', 'build', '--mode', 'demo'], { cwd: ROOT, stdio: 'inherit', env: { ...process.env, DEMO_SINGLE_FILE: '1' } });

const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml' };
const cache = new Map();
/** 把代码里引用的 static/ 图片换成 data URI */
function inlineStatic(code) {
  return code.replace(/(?:\.\/|\/)?static\/[\w\-/.]+\.(?:png|jpe?g|svg)/g, (ref) => {
    const file = join(OUT_DIR, ref.replace(/^\.?\//, ''));
    if (!existsSync(file)) return ref;
    if (!cache.has(file)) cache.set(file, `data:${MIME[extname(file)]};base64,${readFileSync(file).toString('base64')}`);
    return cache.get(file);
  });
}

let html = readFileSync(join(OUT_DIR, 'index.html'), 'utf8');

html = html.replace(/<link rel="stylesheet"[^>]*href="\.\/(assets\/[^"]+\.css)"[^>]*>/g, (_m, href) => {
  const css = inlineStatic(readFileSync(join(OUT_DIR, href), 'utf8'));
  return `<style>${css}</style>`;
});

html = html.replace(/<script type="module"[^>]*src="\.\/(assets\/[^"]+\.js)"[^>]*><\/script>/g, (_m, src) => {
  // 内嵌脚本里出现 </script 会提前结束标签，需要转义
  const js = inlineStatic(readFileSync(join(OUT_DIR, src), 'utf8')).replace(/<\/script/gi, '<\\/script');
  return `<script type="module">${js}</script>`;
});

// 2. 运行时拼出来的图片路径（课程封面、图标等）通过 window.__STATIC__ 查表，见 src/utils/static.ts
const table = {};
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const file = join(dir, name);
    if (statSync(file).isDirectory()) walk(file);
    else if (MIME[extname(file)]) table['/' + relative(OUT_DIR, file).split(sep).join('/')] = inlineStatic('static/' + relative(join(OUT_DIR, 'static'), file).split(sep).join('/'));
  }
};
walk(join(OUT_DIR, 'static'));
html = html.replace('<head>', `<head><script>window.__STATIC__=${JSON.stringify(table)}</script>`);

if (/src="\.\/assets\//.test(html) || /href="\.\/assets\//.test(html)) throw new Error('仍有未内嵌的资源');

const out = join(ROOT, 'dist/逻辑解剖演示版.html');
writeFileSync(out, html);
console.log(`单文件演示版 → ${out}（${(statSync(out).size / 1024 / 1024).toFixed(1)} MB，内嵌图片 ${cache.size} 张）`);
