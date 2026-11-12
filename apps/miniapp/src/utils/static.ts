/**
 * 拼接出来的 static 图片路径统一走这里。
 * 单文件 HTML 演示版会把所有图片内嵌成 window.__STATIC__（路径 → data URI），其余环境原样返回路径。
 */
export function staticUrl(path: string): string {
  const table = (globalThis as { __STATIC__?: Record<string, string> }).__STATIC__;
  return table?.[path] ?? path;
}
