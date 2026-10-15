/**
 * 优惠券配置校验（纯函数）。已发放的券锁定影响已领用户的字段，只能改名称、说明、
 * 总量（不低于已发放量）、每人限领、是否可领、结束时间和启停。
 */
export interface CouponConfig {
  type: 'FULL_REDUCTION' | 'DIRECT';
  thresholdCent: number;
  discountCent: number;
  scope: 'ALL' | 'CATEGORY' | 'PRODUCT';
  scopeIds: string[];
  totalCount: number;
  validFrom: Date;
  validTo: Date;
}

export function couponConfigProblem(c: CouponConfig): string | null {
  if (c.validTo <= c.validFrom) return '结束时间必须晚于开始时间';
  if (c.type === 'FULL_REDUCTION' && c.thresholdCent <= c.discountCent) return '满减门槛必须高于优惠金额';
  if (c.scope !== 'ALL' && c.scopeIds.length === 0) return '请选择适用的分类或课程';
  return null;
}

const LOCKED_FIELDS = ['type', 'thresholdCent', 'discountCent', 'scope', 'validFrom'] as const;

export function lockedChangeProblem(
  current: CouponConfig & { issuedCount: number },
  next: CouponConfig,
): string | null {
  if (current.issuedCount === 0) return null;
  const val = (v: unknown) => (v instanceof Date ? v.getTime() : v);
  const changed = LOCKED_FIELDS.filter((k) => val(current[k]) !== val(next[k]));
  const scopeChanged = [...current.scopeIds].sort().join() !== [...next.scopeIds].sort().join();
  if (changed.length || scopeChanged) return '已发放的优惠券不能修改类型、金额、门槛、适用范围和开始时间';
  if (next.totalCount !== 0 && next.totalCount < current.issuedCount) return `发放总量不能少于已发放数量（${current.issuedCount}）`;
  return null;
}
