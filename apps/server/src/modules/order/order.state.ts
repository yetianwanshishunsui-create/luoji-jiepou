import { OrderStatus } from '@luoji/shared';

/**
 * 订单状态机（技术方案 4.4）
 * CREATED ─支付成功→ PAID ─发起退款→ REFUNDING ─退款成功→ REFUNDED
 *    ├─超时→ CLOSED                      └─退款失败→ PAID
 *    └─用户取消→ CANCELLED
 */
export type OrderAction = 'PAY' | 'CLOSE' | 'CANCEL' | 'REFUND' | 'REFUND_SUCCESS' | 'REFUND_FAIL';

const TRANSITIONS: Record<OrderAction, { from: OrderStatus[]; to: OrderStatus }> = {
  PAY: { from: [OrderStatus.CREATED], to: OrderStatus.PAID },
  CLOSE: { from: [OrderStatus.CREATED], to: OrderStatus.CLOSED },
  CANCEL: { from: [OrderStatus.CREATED], to: OrderStatus.CANCELLED },
  REFUND: { from: [OrderStatus.PAID], to: OrderStatus.REFUNDING },
  REFUND_SUCCESS: { from: [OrderStatus.REFUNDING], to: OrderStatus.REFUNDED },
  REFUND_FAIL: { from: [OrderStatus.REFUNDING], to: OrderStatus.PAID },
};

export function nextOrderStatus(current: OrderStatus, action: OrderAction): OrderStatus | null {
  const rule = TRANSITIONS[action];
  return rule.from.includes(current) ? rule.to : null;
}

/** 某动作允许的起始状态，用于条件更新（updateMany where status in ...） */
export function allowedFrom(action: OrderAction): OrderStatus[] {
  return TRANSITIONS[action].from;
}
