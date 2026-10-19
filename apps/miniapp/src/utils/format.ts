/** 带前缀的价格：虚拟¥299 / ¥299 */
export function money(cent: number | null | undefined, prefix?: string | null): string {
  return `${prefix ?? ''}¥${yuan(cent)}`;
}

/** 分 → 元 */
export function yuan(cent: number | null | undefined): string {
  if (cent == null) return '-';
  return (cent / 100).toFixed(cent % 100 === 0 ? 0 : 2);
}

export function duration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** 券面主文案：¥20 / 满150可用 */
export function couponCondition(c: { type: 'FULL_REDUCTION' | 'DIRECT'; thresholdCent: number }): string {
  return c.type === 'DIRECT' ? '无门槛' : `满${yuan(c.thresholdCent)}可用`;
}

/** 2026.10.16 14:30 */
export function dateTime(s: string): string {
  const d = new Date(s);
  return `${shortDate(s)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function shortDate(s: string): string {
  const d = new Date(s);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}
