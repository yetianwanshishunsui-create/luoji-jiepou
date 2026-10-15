const UNIT: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };

/** '2h' / '30d' / '900' → 秒 */
export function ttlToSeconds(ttl: string): number {
  const m = /^(\d+)\s*([smhd]?)$/.exec(ttl.trim());
  if (!m) throw new Error(`无法解析的时长：${ttl}`);
  return parseInt(m[1], 10) * (UNIT[m[2] || 's'] ?? 1);
}
