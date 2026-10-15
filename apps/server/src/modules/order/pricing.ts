/**
 * 纯函数定价：所有金额单位为“分”。前端只传商品和优惠券 ID，价格全部在服务端计算。
 */

export interface PriceRuleLike {
  priceCent: number;
  startAt: Date;
  endAt: Date;
  enabled: boolean;
}

export interface CouponLike {
  type: 'FULL_REDUCTION' | 'DIRECT';
  thresholdCent: number;
  discountCent: number;
  validFrom: Date;
  validTo: Date;
  enabled: boolean;
}

/** 当前生效价：时间窗内的早鸟 / 限时价取最低，否则取原价 */
export function effectivePrice(basePriceCent: number, rules: PriceRuleLike[], now = new Date()): number {
  const active = rules
    .filter((r) => r.enabled && r.startAt <= now && now < r.endAt)
    .map((r) => r.priceCent);
  return active.length ? Math.min(basePriceCent, ...active) : basePriceCent;
}

/** 返回优惠金额；不满足条件返回 0。优惠后金额不低于 1 分（微信支付最小金额）。 */
export function couponDiscount(totalCent: number, coupon: CouponLike, now = new Date()): number {
  if (!coupon.enabled || now < coupon.validFrom || now >= coupon.validTo) return 0;
  if (coupon.type === 'FULL_REDUCTION' && totalCent < coupon.thresholdCent) return 0;
  return Math.max(0, Math.min(coupon.discountCent, totalCent - 1));
}
