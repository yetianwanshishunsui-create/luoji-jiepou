import { randomInt } from 'node:crypto';

/** 订单号：前缀 + yyMMddHHmmss + 6 位随机数，共 19 位，满足微信 out_trade_no 6~32 位要求 */
export function genOrderNo(prefix: 'L' | 'R' = 'L', now = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  const ts =
    String(now.getFullYear()).slice(2) +
    p(now.getMonth() + 1) +
    p(now.getDate()) +
    p(now.getHours()) +
    p(now.getMinutes()) +
    p(now.getSeconds());
  return `${prefix}${ts}${String(randomInt(0, 1_000_000)).padStart(6, '0')}`;
}
