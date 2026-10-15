/**
 * 营销规则（纯函数）。金额单位均为“分”。
 */
import { couponDiscount, type CouponLike, type PriceRuleLike } from '../order/pricing';

export interface ScopedCoupon extends CouponLike {
  scope: 'ALL' | 'CATEGORY' | 'PRODUCT';
  scopeIds: unknown;
}

export interface ProductRef {
  id: string;
  /** 所属分类及其上级分类 */
  categoryIds: string[];
}

/** 券的适用范围是否覆盖该商品（分类券同时匹配二级分类和它的一级分类） */
export function couponInScope(coupon: Pick<ScopedCoupon, 'scope' | 'scopeIds'>, product: ProductRef): boolean {
  if (coupon.scope === 'ALL') return true;
  const ids = Array.isArray(coupon.scopeIds) ? (coupon.scopeIds as string[]) : [];
  if (coupon.scope === 'PRODUCT') return ids.includes(product.id);
  return product.categoryIds.some((c) => ids.includes(c));
}

export interface CouponOption<T> {
  item: T;
  discountCent: number;
  /** 不可用原因；可用为 null */
  reason: string | null;
}

/** 结算页：逐张计算可用性和优惠金额，可用的按优惠从高到低、同额先过期的排前 */
export function evaluateCoupons<T extends { coupon: ScopedCoupon }>(
  totalCent: number,
  product: ProductRef,
  userCoupons: T[],
  now = new Date(),
): CouponOption<T>[] {
  const options = userCoupons.map((uc): CouponOption<T> => {
    const c = uc.coupon;
    if (!c.enabled) return { item: uc, discountCent: 0, reason: '已停用' };
    if (now < c.validFrom) return { item: uc, discountCent: 0, reason: '未到使用时间' };
    if (now >= c.validTo) return { item: uc, discountCent: 0, reason: '已过期' };
    if (!couponInScope(c, product)) return { item: uc, discountCent: 0, reason: '不适用于该课程' };
    if (c.type === 'FULL_REDUCTION' && totalCent < c.thresholdCent) {
      return { item: uc, discountCent: 0, reason: `满 ¥${(c.thresholdCent / 100).toFixed(2).replace(/\.00$/, '')} 可用` };
    }
    const discountCent = couponDiscount(totalCent, c, now);
    return { item: uc, discountCent, reason: discountCent > 0 ? null : '不满足使用条件' };
  });
  return options.sort((a, b) => {
    if (!a.reason !== !b.reason) return a.reason ? 1 : -1;
    if (a.reason && b.reason) return 0; // 不可用的保持原顺序
    if (b.discountCent !== a.discountCent) return b.discountCent - a.discountCent;
    return a.item.coupon.validTo.getTime() - b.item.coupon.validTo.getTime();
  });
}

/** 当前生效的价格规则（价格最低的一条），用于展示早鸟 / 限时标签和倒计时 */
export function activeRule<T extends PriceRuleLike>(basePriceCent: number, rules: T[], now = new Date()): T | null {
  const active = rules
    .filter((r) => r.enabled && r.startAt <= now && now < r.endAt && r.priceCent < basePriceCent)
    .sort((a, b) => a.priceCent - b.priceCent);
  return active[0] ?? null;
}

/** 两个时间窗是否重叠（左闭右开） */
export function windowsOverlap(a: { startAt: Date; endAt: Date }, b: { startAt: Date; endAt: Date }): boolean {
  return a.startAt < b.endAt && b.startAt < a.endAt;
}

/** 领券校验 */
export function claimProblem(
  coupon: { enabled: boolean; claimable: boolean; validTo: Date; totalCount: number; issuedCount: number; perUserLimit: number },
  heldCount: number,
  now = new Date(),
): string | null {
  if (!coupon.enabled || !coupon.claimable) return '该优惠券不可领取';
  if (now >= coupon.validTo) return '该优惠券已过期';
  if (coupon.totalCount > 0 && coupon.issuedCount >= coupon.totalCount) return '优惠券已被领完';
  if (heldCount >= coupon.perUserLimit) return '已达到领取上限';
  return null;
}
