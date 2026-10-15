/**
 * 退款规则（纯函数）。支持部分退款：多次退款累计不超过实付金额；
 * 同一订单同一时间只能有一笔退款在处理中（订单状态 REFUNDING 时拒绝新的退款）。
 */
export function refundableCent(payCent: number, refundedCent: number): number {
  return Math.max(0, payCent - refundedCent);
}

export function refundProblem(input: { status: string; payCent: number; refundedCent: number; amountCent: number }): string | null {
  if (input.status === 'REFUNDING') return '该订单有退款正在处理中';
  if (input.status !== 'PAID') return '只有已支付的订单可以退款';
  const remaining = refundableCent(input.payCent, input.refundedCent);
  if (remaining <= 0) return '该订单已全额退款';
  if (!Number.isInteger(input.amountCent) || input.amountCent <= 0) return '退款金额必须大于 0';
  if (input.amountCent > remaining) return `退款金额不能超过可退金额 ¥${(remaining / 100).toFixed(2)}`;
  return null;
}

/** 退款成功后的订单状态：退完为 REFUNDED，部分退款回到 PAID */
export function statusAfterRefund(payCent: number, refundedCentAfter: number): 'PAID' | 'REFUNDED' {
  return refundedCentAfter >= payCent ? 'REFUNDED' : 'PAID';
}
