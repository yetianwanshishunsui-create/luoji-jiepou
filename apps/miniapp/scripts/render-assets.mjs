/**
 * 渲染小程序用到的图片素材（结果提交到仓库，平时不需要运行）：
 * - static/brand/wordmark*.png  「逻辑解剖」刀锋字标（思源宋体 Heavy + 斜切）
 * - static/parts/*.png          按部位分类的小图标
 * - static/demo/covers/*.jpg    演示版课程封面（按 src/demo/data.ts 中的 art() 描述生成）
 *
 * 依赖：全局安装的 playwright（含 Chromium）、curl（下载 Google Fonts 子集字体）。
 * 运行：node apps/miniapp/scripts/render-assets.mjs [brand|parts|covers]...（不带参数渲染全部）
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const STATIC = join(ROOT, 'src/static');
const require = createRequire(import.meta.url);
// playwright 不是项目依赖，从全局安装位置加载
const { chromium } = createRequire(execFileSync('npm', ['root', '-g']).toString().trim() + '/')('playwright');

const targets = new Set(process.argv.slice(2).length ? process.argv.slice(2) : ['brand', 'parts', 'covers']);

/** 按需下载 Google Fonts 子集（只含用到的字），返回 base64 data URI */
function font(family, text) {
  const url = `https://fonts.googleapis.com/css2?family=${family}&text=${encodeURIComponent([...new Set(text)].join(''))}`;
  const css = execFileSync('curl', ['-sS', '-A', 'Mozilla/5.0 Chrome/120', url]).toString();
  const src = css.match(/https:\/\/fonts\.gstatic\.com[^)]+/)?.[0];
  if (!src) throw new Error(`字体下载失败：${family}`);
  const buf = execFileSync('curl', ['-sS', src], { maxBuffer: 20 * 1024 * 1024 });
  return `data:font/woff2;base64,${buf.toString('base64')}`;
}

const browser = await chromium.launch();

/** 把一段 SVG 截成图片；PNG 保留透明背景 */
async function snap(svg, w, h, out, { scale = 1, type = 'png', fonts = '' } = {}) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: scale });
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${fonts}html,body{margin:0;background:transparent}</style></head><body>${svg}</body></html>`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(150);
  await page.locator('svg').screenshot({ path: out, type, omitBackground: type === 'png', ...(type === 'jpeg' ? { quality: 70 } : {}) });
  await page.close();
}

// ───────── 字标 ─────────
if (targets.has('brand')) {
  const dir = join(STATIC, 'brand');
  mkdirSync(dir, { recursive: true });
  const face = `@font-face{font-family:WM;src:url(${font('Noto+Serif+SC:wght@900', '逻辑解剖')})}`;
  const W = 404;
  const H = 108;
  const mark = (fill, cut) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="0.4"><stop offset="0" stop-color="#0f2a74"/><stop offset=".55" stop-color="#2a5bd7"/><stop offset="1" stop-color="#5f93f2"/></linearGradient>
    <mask id="m"><rect width="${W}" height="${H}" fill="#fff"/><polygon points="0,66 ${W},32.5 ${W},36.5 0,70" fill="#000"/></mask>
  </defs>
  <g mask="url(#m)"><text x="2" y="90" font-family="WM" font-size="92" letter-spacing="8" fill="${fill}">逻辑解剖</text></g>
  <polygon points="0,67.6 ${W - 6},34.6 ${W - 6},35.4 0,68.4" fill="${cut}"/>
</svg>`;
  await snap(mark('url(#g)', '#9cc0ff'), W, H, join(dir, 'wordmark.png'), { scale: 2, fonts: face });
  await snap(mark('#ffffff', 'rgba(255,255,255,.55)'), W, H, join(dir, 'wordmark-white.png'), { scale: 2, fonts: face });
  console.log('字标 → static/brand');
}

// ───────── 部位图标 ─────────
if (targets.has('parts')) {
  const dir = join(STATIC, 'parts');
  mkdirSync(dir, { recursive: true });
  const FACE = 'M32 7C21 7 15 15.5 15 27c0 10.5 4.8 19 11.5 23.2 3.4 2.1 7.6 2.1 11 0C44.2 46 49 37.5 49 27 49 15.5 43 7 32 7Z';
  const base = `
    <path d="M26.6 50.4 25.5 60M37.4 50.4 38.5 60" stroke="#9db4dc" stroke-width="1.6" stroke-linecap="round" fill="none"/>
    <path d="${FACE}" fill="#fff" stroke="#9db4dc" stroke-width="1.6"/>
    <path d="M20.5 23.5q3.5-2 7 0M36.5 23.5q3.5-2 7 0" stroke="#b7c8e6" stroke-width="1.3" fill="none" stroke-linecap="round"/>
    <path d="M21.5 28.5q2.5-1.8 5 0M37.5 28.5q2.5-1.8 5 0" stroke="#b7c8e6" stroke-width="1.3" fill="none" stroke-linecap="round"/>
    <path d="M32 28v9.5l-2.5 1.6" stroke="#b7c8e6" stroke-width="1.3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M28 44.2q4 2.2 8 0" stroke="#b7c8e6" stroke-width="1.3" fill="none" stroke-linecap="round"/>`;
  const hi = 'fill="url(#hg)" fill-opacity=".9"';
  const parts = {
    FOREHEAD: `<rect x="10" y="4" width="44" height="17" ${hi} clip-path="url(#face)"/>`,
    EYE: `<ellipse cx="24" cy="28.4" rx="6.2" ry="3.6" ${hi}/><ellipse cx="40" cy="28.4" rx="6.2" ry="3.6" ${hi}/>`,
    NOSE: `<path d="M32 25.5c-1.4 4.5-4.6 9-5 12.6 1.6 1.8 8.4 1.8 10 0-.4-3.6-3.6-8.1-5-12.6Z" ${hi}/>`,
    MIDFACE: `<ellipse cx="22.5" cy="36.5" rx="5.4" ry="4.4" ${hi}/><ellipse cx="41.5" cy="36.5" rx="5.4" ry="4.4" ${hi}/>`,
    LIP: `<ellipse cx="32" cy="44.6" rx="6.6" ry="3.4" ${hi}/>`,
    JAW: `<path d="M15.6 33c1.4 8 5.2 13.8 10.9 17.2 3.4 2.1 7.6 2.1 11 0C43.2 46.8 47 41 48.4 33" stroke="url(#hg)" stroke-width="4.6" fill="none" stroke-linecap="round"/>`,
    NECK: `<path d="M26.7 50.6c3.4 1.9 7.2 1.9 10.6 0L38.5 60h-13Z" ${hi}/>`,
    FULLFACE: `<path d="${FACE}" ${hi} fill-opacity=".55"/>`,
  };
  for (const [name, mark] of Object.entries(parts)) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="hg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6d9cff"/><stop offset="1" stop-color="#2a5bd7"/></linearGradient>
    <clipPath id="face"><path d="${FACE}"/></clipPath>
  </defs>
  ${base}${mark}
</svg>`;
    await snap(svg, 64, 64, join(dir, `${name.toLowerCase()}.png`), { scale: 3 });
  }
  console.log('部位图标 → static/parts');
}

// ───────── 演示封面 ─────────
if (targets.has('covers')) {
  const esbuild = require('esbuild');
  const tmp = join(tmpdir(), `luoji-covers-${process.pid}.mjs`);
  await esbuild.build({ entryPoints: [join(ROOT, 'src/demo/data.ts')], bundle: true, format: 'esm', platform: 'node', outfile: tmp, logLevel: 'error' });
  const { COVER_SPECS } = await import(tmp);
  rmSync(tmp);

  const text = COVER_SPECS.flatMap((c) => [...c.lines, c.sub, c.tag]).join('') + '逻辑解剖LOGIC ANATOMY';
  const fonts = `@font-face{font-family:T;src:url(${font('Noto+Serif+SC:wght@700', text)})}@font-face{font-family:S;src:url(${font('Noto+Sans+SC:wght@400;500', text)})}`;
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

  const dir = join(STATIC, 'demo/covers');
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  for (const c of COVER_SPECS) {
    const { w, h, theme: t } = c;
    const wide = w / h > 2;
    const dark = t.title === '#ffffff';
    const pad = w * (wide ? 0.06 : 0.075);
    const size = Math.min(h * (wide ? 0.15 : 0.12), (w * (wide ? 0.6 : 0.82)) / Math.max(...c.lines.map((l) => l.length)));
    const top = h * 0.47 - ((c.lines.length - 1) * size * 1.28) / 2;
    const titles = c.lines.map((l, i) => `<text x="${pad}" y="${top + i * size * 1.28}" font-family="T" font-weight="700" font-size="${size}" letter-spacing="${size * 0.04}" fill="${t.title}">${esc(l)}</text>`).join('');
    const lineY = top + (c.lines.length - 1) * size * 1.28 + size * 0.55;
    const tagW = c.tag.length * h * 0.05 + h * 0.07;
    // 右侧的层次弧线：呼应「逐层解剖」
    const arcs = [0.28, 0.4, 0.52, 0.64, 0.76]
      .map((r, i) => `<circle cx="${w * 0.98}" cy="${h * 0.5}" r="${h * r}" fill="none" stroke="${t.line}" stroke-opacity="${0.55 - i * 0.08}" stroke-width="${i === 1 ? 2 : 1}"/>`)
      .join('');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t.bg[0]}"/><stop offset="1" stop-color="${t.bg[1]}"/></linearGradient>
    <radialGradient id="glow" cx=".85" cy=".2" r=".6"><stop offset="0" stop-color="#ffffff" stop-opacity="${dark ? 0.12 : 0.55}"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  <rect width="${w}" height="${h}" fill="url(#glow)"/>
  ${arcs}
  <circle cx="${w * 0.98 - h * 0.4}" cy="${h * 0.5}" r="${h * 0.012}" fill="${t.accent}"/>
  <text x="${pad}" y="${h * 0.16}" font-family="S" font-weight="500" font-size="${h * 0.048}" letter-spacing="${h * 0.012}" fill="${t.accent}">逻辑解剖 · LOGIC ANATOMY</text>
  ${titles}
  <rect x="${pad}" y="${lineY}" width="${h * 0.12}" height="${h * 0.012}" rx="${h * 0.006}" fill="${t.accent}"/>
  <text x="${pad}" y="${lineY + h * 0.1}" font-family="S" font-size="${h * 0.052}" fill="${t.sub}">${esc(c.sub)}</text>
  ${
    c.tag
      ? `<rect x="${w - pad - tagW}" y="${h - pad * 0.7 - h * 0.1}" width="${tagW}" height="${h * 0.1}" rx="${h * 0.05}" fill="${dark ? '#ffffff' : t.accent}"/><text x="${w - pad - tagW / 2}" y="${h - pad * 0.7 - h * 0.034}" text-anchor="middle" font-family="S" font-weight="500" font-size="${h * 0.048}" fill="${dark ? '#1d3c8f' : '#ffffff'}">${esc(c.tag)}</text>`
      : ''
  }
</svg>`;
    await snap(svg, w, h, join(dir, `${c.key}.jpg`), { type: 'jpeg', fonts });
  }
  const kb = readdirSync(dir).reduce((n, f) => n + readFileSync(join(dir, f)).length, 0) / 1024;
  console.log(`封面 ${COVER_SPECS.length} 张 → static/demo/covers（共 ${kb.toFixed(0)} KB）`);
}

await browser.close();
