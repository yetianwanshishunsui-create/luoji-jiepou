/** 分 → 元（保留两位小数，整数元不带小数） */
export function yuan(cent: number | null | undefined): string {
  if (cent == null) return '—';
  return (cent / 100).toFixed(cent % 100 === 0 ? 0 : 2);
}

export function fmtTime(s: string | Date | null | undefined): string {
  if (!s) return '—';
  return new Date(s).toLocaleString('zh-CN', { hour12: false });
}

export function fmtDate(s: string | Date | null | undefined): string {
  if (!s) return '—';
  return new Date(s).toISOString().slice(0, 10);
}

/** 秒 → mm:ss / h:mm:ss */
export function fmtDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const mm = String(m).padStart(h ? 2 : 1, '0');
  return `${h ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}`;
}

/** 列表用紧凑时间：2026-10-15 11:13 */
export function fmtShort(s: string | Date | null | undefined): string {
  if (!s) return '—';
  const d = new Date(s);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** 更紧凑的时间（不含年份）：10-15 11:13 */
export function fmtMd(s: string | Date | null | undefined): string {
  return s ? fmtShort(s).slice(5) : '—';
}
